/**
 * ApprovalSync — Durable SLA Service
 * Milestone: BE-08
 *
 * Implements durable timer lifecycle tracking, restart-safe reconciliation,
 * deterministic deadline calculations, pause/resume calculations, and
 * idempotent escalation event emission against live PostgreSQL 16.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { SlaTimer } from '../database/entities/sla-timer.entity';
import { Application } from '../database/entities/application.entity';
import { SlaEscalation } from './entities/sla-escalation.entity';
import { SlaTimerStatus } from './enums/sla-timer-status.enum';
import { SlaEscalationLevel } from './enums/sla-escalation-level.enum';
import {
  DEFAULT_SLA_POLICIES,
  resolvePolicyForStage,
  calculateDeadlines,
  ILLUSTRATIVE_DISCLAIMER,
} from './policies/sla-policies.config';
import { SlaClockService } from './clock/sla-clock.service';
import { SlaQueueService } from './queue/sla-queue.service';
import { AuditService } from '../audit/audit.service';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import {
  ApplicationStatus,
  UserRole,
  PaginationMeta,
} from '../shared/contracts';
import {
  PauseTimerDto,
  SlaTimerQueryDto,
  SlaEscalationQueryDto,
  SlaTimerResponseDto,
  SlaEscalationResponseDto,
  SlaPolicyResponseDto,
  SlaReconcileResponseDto,
} from './dto';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaTimer)
    private readonly slaTimerRepo: Repository<SlaTimer>,
    @InjectRepository(SlaEscalation)
    private readonly escalationRepo: Repository<SlaEscalation>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    private readonly dataSource: DataSource,
    private readonly clock: SlaClockService,
    private readonly queueService: SlaQueueService,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  /**
   * Transaction-aware workflow stage transition integration.
   * Atomically completes/cancels previous timers and initializes the next stage timer.
   */
  async handleWorkflowTransitionInTransaction(
    manager: EntityManager,
    context: {
      applicationId: string;
      fromStatus: ApplicationStatus;
      toStatus: ApplicationStatus;
      actorId: string;
      actorRole: UserRole;
      comment?: string | null;
    },
  ): Promise<SlaTimer | null> {
    const now = this.clock.getNow();

    // 1. Locate and complete/cancel any existing active or paused timers for this application
    const existingTimers = await manager.find(SlaTimer, {
      where: {
        applicationId: context.applicationId,
        status: In([SlaTimerStatus.ACTIVE, SlaTimerStatus.PAUSED]),
      },
      lock: { mode: 'pessimistic_write' },
    });

    const isTerminalStatus = [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ].includes(context.toStatus);

    for (const timer of existingTimers) {
      if (isTerminalStatus) {
        timer.status = SlaTimerStatus.CANCELLED;
        timer.cancelledAt = now;
      } else {
        timer.status = SlaTimerStatus.COMPLETED;
        timer.completedAt = now;
      }
      timer.lastEvaluatedAt = now;
      await manager.save(SlaTimer, timer);
      this.logger.debug(
        `Transition [${context.fromStatus} -> ${context.toStatus}]: Timer ${timer.id} marked ${timer.status}`,
      );
    }

    // 2. If transitioning to a terminal state, no new SLA timer is initialized
    if (isTerminalStatus) {
      this.logger.log(
        `Application ${context.applicationId} reached terminal state ${context.toStatus}. All SLA timers stopped.`,
      );
      return null;
    }

    // 3. Resolve active policy for the destination stage
    const policy = resolvePolicyForStage(context.toStatus);
    if (!policy) {
      this.logger.debug(
        `No configured active SLA policy for workflow stage: ${context.toStatus}`,
      );
      return null;
    }

    // 4. Calculate deterministic target and warning deadlines
    const deadlines = calculateDeadlines(policy, now);

    const newTimer = manager.create(SlaTimer, {
      applicationId: context.applicationId,
      stage: context.toStatus,
      tier: policy.tier,
      status: SlaTimerStatus.ACTIVE,
      policyId: policy.id,
      startedAt: now,
      targetDeadline: deadlines.targetDeadline,
      warningDeadline: deadlines.warningDeadline,
      isWarningSent: false,
      isBreached: false,
      totalPausedMs: 0,
      createdAt: now,
      updatedAt: now,
    });

    const savedTimer = await manager.save(SlaTimer, newTimer);

    // 5. Register scheduling hint with queue service
    const warningDelayMs = Math.max(
      0,
      deadlines.warningDeadline.getTime() - now.getTime(),
    );
    await this.queueService.enqueueTimerCheck(
      {
        timerId: savedTimer.id,
        applicationId: savedTimer.applicationId,
        stage: savedTimer.stage,
        tier: savedTimer.tier,
        checkType: 'WARNING_CHECK',
      },
      warningDelayMs,
    );

    this.logger.log(
      `Started SLA timer ${savedTimer.id} for application ${context.applicationId} [stage: ${savedTimer.stage}, deadline: ${savedTimer.targetDeadline.toISOString()}]`,
    );

    return savedTimer;
  }

  /**
   * Pauses an active SLA timer.
   * Requires authorized regulatory role and mandatory justification reason.
   */
  async pauseTimer(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    dto: PauseTimerDto,
  ): Promise<SlaTimer> {
    this.assertCanManageTimers(currentUser);

    return await this.dataSource.transaction(async (manager) => {
      await this.verifyApplicationAccess(manager, applicationId, currentUser);

      const timer = await manager.findOne(SlaTimer, {
        where: {
          applicationId,
          status: SlaTimerStatus.ACTIVE,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!timer) {
        // Check if already paused
        const pausedTimer = await manager.findOne(SlaTimer, {
          where: { applicationId, status: SlaTimerStatus.PAUSED },
        });
        if (pausedTimer) {
          throw new BadRequestException(
            `SLA timer for application ${applicationId} is already paused`,
          );
        }
        throw new NotFoundException(
          `No active SLA timer found to pause for application ${applicationId}`,
        );
      }

      const policy = resolvePolicyForStage(timer.stage);
      if (policy && !policy.canPause) {
        throw new BadRequestException(
          `SLA policy ${policy.id} does not permit pausing for workflow stage ${timer.stage}`,
        );
      }

      const now = this.clock.getNow();
      timer.status = SlaTimerStatus.PAUSED;
      timer.pausedAt = now;
      timer.pauseReason = dto.reason.trim();
      timer.pausedById = currentUser.id;
      timer.updatedAt = now;

      const saved = await manager.save(SlaTimer, timer);

      if (this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'SLA_TIMER_PAUSED',
          payloadSnapshot: {
            timerId: saved.id,
            stage: saved.stage,
            reason: saved.pauseReason,
            pausedAt: now.toISOString(),
          },
        });
      }

      this.logger.log(
        `SLA timer ${saved.id} paused by user ${currentUser.id} (${currentUser.role}). Reason: ${dto.reason}`,
      );

      return saved;
    });
  }

  /**
   * Resumes a paused SLA timer.
   * Extends deadlines forward by the exact pause duration, preserving remaining time.
   */
  async resumeTimer(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<SlaTimer> {
    this.assertCanManageTimers(currentUser);

    return await this.dataSource.transaction(async (manager) => {
      await this.verifyApplicationAccess(manager, applicationId, currentUser);

      const timer = await manager.findOne(SlaTimer, {
        where: {
          applicationId,
          status: SlaTimerStatus.PAUSED,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!timer) {
        throw new NotFoundException(
          `No paused SLA timer found to resume for application ${applicationId}`,
        );
      }

      const now = this.clock.getNow();
      const pausedAt = timer.pausedAt ? new Date(timer.pausedAt) : now;
      const pauseDurationMs = Math.max(0, now.getTime() - pausedAt.getTime());

      // Shift target and warning deadlines forward by exact elapsed pause duration
      timer.targetDeadline = new Date(
        new Date(timer.targetDeadline).getTime() + pauseDurationMs,
      );
      if (timer.warningDeadline) {
        timer.warningDeadline = new Date(
          new Date(timer.warningDeadline).getTime() + pauseDurationMs,
        );
      }

      timer.totalPausedMs = Number(timer.totalPausedMs || 0) + pauseDurationMs;
      timer.status = SlaTimerStatus.ACTIVE;
      timer.resumedAt = now;
      timer.pausedAt = null;
      timer.updatedAt = now;

      const saved = await manager.save(SlaTimer, timer);

      if (this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'SLA_TIMER_RESUMED',
          payloadSnapshot: {
            timerId: saved.id,
            stage: saved.stage,
            pauseDurationMs,
            newTargetDeadline: saved.targetDeadline.toISOString(),
            resumedAt: now.toISOString(),
          },
        });
      }

      this.logger.log(
        `SLA timer ${saved.id} resumed by user ${currentUser.id} (${currentUser.role}). Adjusted target: ${saved.targetDeadline.toISOString()}`,
      );

      return saved;
    });
  }

  /**
   * Evaluates an individual timer against the injected clock.
   * Emits idempotent warning or breach escalation records without duplicates.
   */
  async evaluateTimerInTransaction(
    manager: EntityManager,
    timerId: string,
  ): Promise<{ warningEmitted: boolean; breachEmitted: boolean }> {
    const timer = await manager.findOne(SlaTimer, {
      where: { id: timerId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!timer || timer.status !== SlaTimerStatus.ACTIVE) {
      return { warningEmitted: false, breachEmitted: false };
    }

    const now = this.clock.getNow();
    const policy = resolvePolicyForStage(timer.stage);
    let warningEmitted = false;
    let breachEmitted = false;

    // 1. Check Warning Threshold
    if (
      timer.warningDeadline &&
      now >= new Date(timer.warningDeadline) &&
      !timer.isWarningSent
    ) {
      const warningKey = `sla-esc:${timer.id}:${timer.tier}:WARNING`;
      const existingWarning = await manager.findOne(SlaEscalation, {
        where: { idempotencyKey: warningKey },
      });

      if (!existingWarning) {
        const escalation = manager.create(SlaEscalation, {
          timerId: timer.id,
          applicationId: timer.applicationId,
          stage: timer.stage,
          tier: timer.tier,
          escalationLevel: SlaEscalationLevel.WARNING,
          idempotencyKey: warningKey,
          targetRole: policy?.warningTargetRole || UserRole.REGIONAL_OFFICER,
          policyId: timer.policyId,
          policyVersion: policy?.version || '1.0.0',
          targetDeadline: timer.targetDeadline,
          detectedAt: now,
          recipientDetailsJsonb: {
            notificationType: 'SLA_WARNING',
            stage: timer.stage,
            targetDeadline: timer.targetDeadline.toISOString(),
          },
          isDispatched: true,
        });

        await manager.save(SlaEscalation, escalation);
        timer.isWarningSent = true;
        warningEmitted = true;
        this.logger.warn(
          `[SLA Warning] Timer ${timer.id} reached warning threshold for app ${timer.applicationId}`,
        );
      }
    }

    // 2. Check Breach Threshold
    if (now >= new Date(timer.targetDeadline) && !timer.isBreached) {
      const breachKey = `sla-esc:${timer.id}:${timer.tier}:BREACH`;
      const existingBreach = await manager.findOne(SlaEscalation, {
        where: { idempotencyKey: breachKey },
      });

      if (!existingBreach) {
        const escalation = manager.create(SlaEscalation, {
          timerId: timer.id,
          applicationId: timer.applicationId,
          stage: timer.stage,
          tier: timer.tier,
          escalationLevel: SlaEscalationLevel.BREACH,
          idempotencyKey: breachKey,
          targetRole: policy?.breachTargetRole || UserRole.BUREAU_HEAD,
          policyId: timer.policyId,
          policyVersion: policy?.version || '1.0.0',
          targetDeadline: timer.targetDeadline,
          detectedAt: now,
          recipientDetailsJsonb: {
            notificationType: 'SLA_BREACH',
            stage: timer.stage,
            breachedAt: now.toISOString(),
          },
          isDispatched: true,
        });

        await manager.save(SlaEscalation, escalation);
        timer.isBreached = true;
        timer.status = SlaTimerStatus.BREACHED;
        timer.escalatedAt = now;
        breachEmitted = true;

        if (this.auditService) {
          await this.auditService.appendInTransaction(manager, {
            applicationId: timer.applicationId,
            actorId: 'SYSTEM',
            actorRole: UserRole.SYSTEM_ADMIN,
            eventType: 'SLA_DEADLINE_BREACHED',
            payloadSnapshot: {
              timerId: timer.id,
              stage: timer.stage,
              tier: timer.tier,
              targetDeadline: timer.targetDeadline.toISOString(),
              breachedAt: now.toISOString(),
            },
          });
        }

        this.logger.error(
          `[SLA Breach] Timer ${timer.id} BREACHED deadline for app ${timer.applicationId}! Escalated to ${escalation.targetRole}`,
        );
      }
    }

    timer.lastEvaluatedAt = now;
    timer.updatedAt = now;
    await manager.save(SlaTimer, timer);

    return { warningEmitted, breachEmitted };
  }

  /**
   * Periodic / restart-safe reconciliation sweep.
   * Evaluates all overdue active timers directly from authoritative PostgreSQL state.
   */
  async reconcileOverdueTimers(): Promise<SlaReconcileResponseDto> {
    const now = this.clock.getNow();
    this.logger.debug(
      `Executing SLA reconciliation sweep at ${now.toISOString()}...`,
    );

    // Find all active timers that may have reached warning or breach deadlines
    const overdueTimers = await this.slaTimerRepo
      .createQueryBuilder('timer')
      .where('timer.status = :status', { status: SlaTimerStatus.ACTIVE })
      .andWhere(
        '(timer.target_deadline <= :now OR (timer.warning_deadline IS NOT NULL AND timer.warning_deadline <= :now AND timer.is_warning_sent = false))',
        { now },
      )
      .getMany();

    let warningsEmitted = 0;
    let breachesEmitted = 0;

    for (const timer of overdueTimers) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const res = await this.evaluateTimerInTransaction(manager, timer.id);
          if (res.warningEmitted) warningsEmitted++;
          if (res.breachEmitted) breachesEmitted++;
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to reconcile timer ${timer.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(
      `Reconciliation complete: evaluated=${overdueTimers.length}, warnings=${warningsEmitted}, breaches=${breachesEmitted}`,
    );

    return {
      evaluatedCount: overdueTimers.length,
      warningsEmitted,
      breachesEmitted,
      reconciledAt: now.toISOString(),
    };
  }

  /**
   * Retrieves paginated SLA timers for an application with tenant isolation.
   */
  async getTimersForApplication(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    query: SlaTimerQueryDto,
  ): Promise<{ data: SlaTimerResponseDto[]; meta: PaginationMeta }> {
    await this.verifyApplicationAccess(
      this.dataSource.manager,
      applicationId,
      currentUser,
    );

    const qb = this.slaTimerRepo
      .createQueryBuilder('timer')
      .where('timer.application_id = :applicationId', { applicationId });

    if (query.status) {
      qb.andWhere('timer.status = :status', { status: query.status });
    }
    if (query.stage) {
      qb.andWhere('timer.stage = :stage', { stage: query.stage });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.orderBy('timer.created_at', 'DESC').skip(skip).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: items.map((t) => this.mapTimerToDto(t)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retrieves the current active or paused timer for an application.
   */
  async getActiveTimerForApplication(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<SlaTimerResponseDto | null> {
    await this.verifyApplicationAccess(
      this.dataSource.manager,
      applicationId,
      currentUser,
    );

    const timer = await this.slaTimerRepo.findOne({
      where: {
        applicationId,
        status: In([SlaTimerStatus.ACTIVE, SlaTimerStatus.PAUSED]),
      },
      order: { createdAt: 'DESC' },
    });

    return timer ? this.mapTimerToDto(timer) : null;
  }

  /**
   * Lists all configured SLA policies with illustrative demo disclaimers.
   */
  getPolicies(): SlaPolicyResponseDto[] {
    return DEFAULT_SLA_POLICIES.map((p) => ({
      ...p,
      disclaimer: ILLUSTRATIVE_DISCLAIMER,
    }));
  }

  /**
   * Retrieves paginated escalation records for regulatory review officers.
   */
  async getEscalations(
    query: SlaEscalationQueryDto,
    currentUser: AuthUserPrincipal,
  ): Promise<{ data: SlaEscalationResponseDto[]; meta: PaginationMeta }> {
    this.assertCanViewEscalations(currentUser);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.escalationRepo.findAndCount({
      order: { detectedAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: items.map((e) => this.mapEscalationToDto(e)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Strict anti-enumeration tenant access verification.
   */
  private async verifyApplicationAccess(
    manager: EntityManager,
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Application> {
    const app = await manager.findOne(Application, {
      where: { id: applicationId },
    });

    if (!app) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !currentUser.institutionId ||
        app.institutionId !== currentUser.institutionId
      ) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }
    }

    return app;
  }

  private assertCanManageTimers(currentUser: AuthUserPrincipal): void {
    const authorizedRoles = [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
    ];
    if (!authorizedRoles.includes(currentUser.role)) {
      throw new ForbiddenException(
        'Only designated regulatory officers can pause or resume SLA timers',
      );
    }
  }

  private assertCanViewEscalations(currentUser: AuthUserPrincipal): void {
    const authorizedRoles = [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ];
    if (!authorizedRoles.includes(currentUser.role)) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view SLA escalation logs',
      );
    }
  }

  public mapTimerToDto(timer: SlaTimer): SlaTimerResponseDto {
    return {
      id: timer.id,
      applicationId: timer.applicationId,
      stage: timer.stage,
      tier: timer.tier,
      status: timer.status,
      policyId: timer.policyId,
      startedAt: timer.startedAt ? new Date(timer.startedAt).toISOString() : '',
      targetDeadline: timer.targetDeadline
        ? new Date(timer.targetDeadline).toISOString()
        : '',
      warningDeadline: timer.warningDeadline
        ? new Date(timer.warningDeadline).toISOString()
        : null,
      isWarningSent: timer.isWarningSent,
      isBreached: timer.isBreached,
      escalatedAt: timer.escalatedAt
        ? new Date(timer.escalatedAt).toISOString()
        : null,
      pausedAt: timer.pausedAt ? new Date(timer.pausedAt).toISOString() : null,
      resumedAt: timer.resumedAt
        ? new Date(timer.resumedAt).toISOString()
        : null,
      totalPausedMs: Number(timer.totalPausedMs || 0),
      pauseReason: timer.pauseReason || null,
      pausedById: timer.pausedById || null,
      completedAt: timer.completedAt
        ? new Date(timer.completedAt).toISOString()
        : null,
      cancelledAt: timer.cancelledAt
        ? new Date(timer.cancelledAt).toISOString()
        : null,
      lastEvaluatedAt: timer.lastEvaluatedAt
        ? new Date(timer.lastEvaluatedAt).toISOString()
        : null,
      createdAt: timer.createdAt ? new Date(timer.createdAt).toISOString() : '',
      updatedAt: timer.updatedAt ? new Date(timer.updatedAt).toISOString() : '',
    };
  }

  private mapEscalationToDto(
    escalation: SlaEscalation,
  ): SlaEscalationResponseDto {
    return {
      id: escalation.id,
      timerId: escalation.timerId,
      applicationId: escalation.applicationId,
      stage: escalation.stage,
      tier: escalation.tier,
      escalationLevel: escalation.escalationLevel,
      idempotencyKey: escalation.idempotencyKey,
      targetRole: escalation.targetRole,
      policyId: escalation.policyId,
      policyVersion: escalation.policyVersion,
      targetDeadline: escalation.targetDeadline
        ? new Date(escalation.targetDeadline).toISOString()
        : '',
      detectedAt: escalation.detectedAt
        ? new Date(escalation.detectedAt).toISOString()
        : '',
      recipientDetailsJsonb: escalation.recipientDetailsJsonb || {},
      isDispatched: escalation.isDispatched,
      createdAt: escalation.createdAt
        ? new Date(escalation.createdAt).toISOString()
        : '',
    };
  }
}
