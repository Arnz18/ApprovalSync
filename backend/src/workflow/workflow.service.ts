/**
 * ApprovalSync — Workflow Service
 * Milestone: BE-06 / AICTE-26262
 *
 * Implements atomic FSM state transitions, pessimistic locking concurrency control,
 * role and tenant guards, structured workflow timeline events, EVC scheduling,
 * and stage-wise pendency metrics.
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
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Application } from '../database/entities/application.entity';
import { WorkflowTimelineEvent } from './entities/workflow-timeline-event.entity';
import { EvcSchedule } from './entities/evc-schedule.entity';
import { AuditService } from '../audit/audit.service';
import { SlaService } from '../sla/sla.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotificationSeverity } from '../notifications/enums/notification-severity.enum';
import {
  ApplicationStatus,
  UserRole,
  PaginationMeta,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import {
  TransitionRequestDto,
  TimelineQueryDto,
  TransitionExecutionResultDto,
  AllowedTransitionResponseDto,
  CreateEvcScheduleDto,
  EvcScheduleResponseDto,
} from './dto';
import {
  findTransitionRule,
  getAllowedTransitions,
  isTerminalStatus,
} from './fsm/workflow-fsm';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(WorkflowTimelineEvent)
    private readonly timelineRepository: Repository<WorkflowTimelineEvent>,
    @InjectRepository(EvcSchedule)
    private readonly evcScheduleRepository: Repository<EvcSchedule>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly slaService?: SlaService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Executes an atomic state transition on an application within a database transaction.
   * Uses a pessimistic write lock to eliminate concurrent race conditions.
   */
  async executeTransition(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    dto: TransitionRequestDto,
    correlationId?: string,
  ): Promise<TransitionExecutionResultDto> {
    const result = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        // 1. Acquire row-level pessimistic write lock on application record
        const application = await manager.findOne(Application, {
          where: { id: applicationId },
          lock: { mode: 'pessimistic_write' },
        });

        // 2. Tenant isolation & IDOR anti-enumeration defense
        if (currentUser.role === UserRole.INSTITUTION_USER) {
          if (
            !application ||
            !currentUser.institutionId ||
            application.institutionId !== currentUser.institutionId
          ) {
            throw new ForbiddenException(
              'Access denied: cannot access application from another institution.',
            );
          }
        }

        if (!application) {
          throw new NotFoundException('Application not found.');
        }

        const previousStatus = application.status;

        // 3. Terminal state invariant
        if (isTerminalStatus(previousStatus)) {
          throw new BadRequestException(
            `Cannot transition application: application is in terminal status ${previousStatus}.`,
          );
        }

        // 4. Validate transition in FSM matrix
        const rule = findTransitionRule(previousStatus, dto.targetStatus);
        if (!rule) {
          throw new BadRequestException(
            `Invalid state transition: cannot transition application from ${previousStatus} to ${dto.targetStatus}.`,
          );
        }

        // 5. Authorize caller role for this transition
        if (!rule.allowedRoles.includes(currentUser.role)) {
          throw new ForbiddenException(
            `Role ${currentUser.role} is not authorized to transition application from ${previousStatus} to ${dto.targetStatus}.`,
          );
        }

        // 6. Enforce mandatory comments for transitions that require human justification
        if (
          rule.requiresComment &&
          (!dto.comment || dto.comment.trim().length === 0)
        ) {
          throw new BadRequestException(
            `Comment is required for transition from ${previousStatus} to ${dto.targetStatus}.`,
          );
        }

        // 7. Check specific preconditions
        if (dto.targetStatus === ApplicationStatus.SUBMITTED) {
          if (!application.programType || !application.academicYear) {
            throw new BadRequestException(
              'Cannot submit application: missing required program or academic year data.',
            );
          }
          application.submittedAt = new Date();
        }

        // 8. Update application status
        application.status = dto.targetStatus;
        const savedApplication = await manager.save(Application, application);

        // 9. Persist timeline event in the exact same transaction
        const timelineEvent = manager.create(WorkflowTimelineEvent, {
          applicationId: savedApplication.id,
          fromStatus: previousStatus,
          toStatus: dto.targetStatus,
          eventType: rule.eventType,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          comment: dto.comment ? dto.comment.trim() : null,
          correlationId: correlationId || null,
          metadata: dto.metadata || {},
        });

        const savedTimelineEvent = await manager.save(
          WorkflowTimelineEvent,
          timelineEvent,
        );

        if (this.auditService) {
          await this.auditService.appendInTransaction(manager, {
            applicationId: savedApplication.id,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            eventType: rule.eventType,
            payloadSnapshot: {
              applicationNumber: savedApplication.applicationNumber,
              fromStatus: previousStatus,
              toStatus: dto.targetStatus,
              comment: dto.comment ? dto.comment.trim() : null,
              correlationId: correlationId || null,
            },
          });
        }

        if (this.slaService) {
          await this.slaService.handleWorkflowTransitionInTransaction(manager, {
            applicationId: savedApplication.id,
            fromStatus: previousStatus,
            toStatus: dto.targetStatus,
            actorId: currentUser.id,
            actorRole: currentUser.role,
            comment: dto.comment ? dto.comment.trim() : null,
          });
        }

        this.logger.log(
          `Application ${savedApplication.applicationNumber} (${savedApplication.id}) transitioned from ${previousStatus} to ${dto.targetStatus} [event: ${rule.eventType}] by user ${currentUser.id} (${currentUser.role})`,
        );

        return {
          success: true,
          applicationId: savedApplication.id,
          applicationNumber: savedApplication.applicationNumber,
          previousStatus,
          currentStatus: savedApplication.status,
          institutionId: savedApplication.institutionId,
          timelineEvent: {
            id: savedTimelineEvent.id,
            applicationId: savedTimelineEvent.applicationId,
            fromStatus: savedTimelineEvent.fromStatus,
            toStatus: savedTimelineEvent.toStatus,
            eventType: savedTimelineEvent.eventType,
            actorId: savedTimelineEvent.actorId,
            actorRole: savedTimelineEvent.actorRole,
            comment: savedTimelineEvent.comment,
            correlationId: savedTimelineEvent.correlationId,
            metadata: savedTimelineEvent.metadata,
            createdAt: savedTimelineEvent.createdAt,
          },
        };
      },
    );

    // 10. Post-transition asynchronous alert dispatch (non-blocking)
    if (this.notificationsService) {
      try {
        if (dto.targetStatus === ApplicationStatus.DEFICIENCY_ISSUED) {
          await this.notificationsService.createNotification({
            targetRole: UserRole.INSTITUTION_USER,
            institutionId: result.institutionId,
            applicationId: result.applicationId,
            type: NotificationType.DEFICIENCY_NOTICE,
            severity: NotificationSeverity.WARNING,
            title: `Deficiency Notice: ${result.applicationNumber}`,
            message: `Scrutiny officer flagged compliance deficiencies on application ${result.applicationNumber}. Please review and submit clarifications.`,
            link: `/applications`,
          });
        } else if (dto.targetStatus === ApplicationStatus.RECOMMENDED_FOR_EVC) {
          await this.notificationsService.createNotification({
            targetRole: UserRole.REGIONAL_OFFICER,
            institutionId: result.institutionId,
            applicationId: result.applicationId,
            type: NotificationType.EVC_SCHEDULED,
            severity: NotificationSeverity.INFO,
            title: `EVC Queue: ${result.applicationNumber}`,
            message: `Application ${result.applicationNumber} cleared scrutiny and is ready for Expert Visit Committee (EVC) scheduling.`,
            link: `/evc/${result.applicationId}`,
          });
        } else if (dto.targetStatus === ApplicationStatus.RECOMMENDED_FOR_SHC) {
          await this.notificationsService.createNotification({
            targetRole: UserRole.SHC_SAC_MEMBER,
            institutionId: result.institutionId,
            applicationId: result.applicationId,
            type: NotificationType.SLA_WARNING,
            severity: NotificationSeverity.CRITICAL,
            title: `SHC Hearing: ${result.applicationNumber}`,
            message: `Application ${result.applicationNumber} escalated to Standing Hearing Committee (SHC) for appellate review.`,
            link: `/evc/${result.applicationId}`,
          });
        } else if (dto.targetStatus === ApplicationStatus.APPROVED) {
          await this.notificationsService.createNotification({
            targetRole: UserRole.INSTITUTION_USER,
            institutionId: result.institutionId,
            applicationId: result.applicationId,
            type: NotificationType.STAGE_TRANSITION,
            severity: NotificationSeverity.INFO,
            title: `Approval Issued: ${result.applicationNumber}`,
            message: `Statutory Approval granted for application ${result.applicationNumber}. Official Letter of Approval (LoA) generated.`,
            link: `/applications`,
          });
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to dispatch transition notification: ${(err as Error).message}`,
        );
      }
    }

    return {
      success: result.success,
      applicationId: result.applicationId,
      applicationNumber: result.applicationNumber,
      previousStatus: result.previousStatus,
      currentStatus: result.currentStatus,
      timelineEvent: result.timelineEvent,
    };
  }

  /**
   * Retrieves the workflow timeline history for an application with tenant protection.
   */
  async getTimeline(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    queryDto: TimelineQueryDto,
  ): Promise<{ items: WorkflowTimelineEvent[]; pagination: PaginationMeta }> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !application ||
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException(
          'Access denied: cannot access application from another institution.',
        );
      }
    }

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;
    const sortOrder = (queryDto.sortOrder || 'ASC').toUpperCase() as
      'ASC' | 'DESC';

    const [items, total] = await this.timelineRepository.findAndCount({
      where: { applicationId },
      order: { createdAt: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Returns list of currently allowed next transitions from the application's current state
   * for the authenticated user's role.
   */
  async getAllowedTransitions(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<AllowedTransitionResponseDto[]> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !application ||
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException(
          'Access denied: cannot access application from another institution.',
        );
      }
    }

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const rules = getAllowedTransitions(application.status, currentUser.role);

    return rules.map((r) => ({
      toStatus: r.toStatus,
      eventType: r.eventType,
      description: r.description,
      requiresComment: r.requiresComment,
      allowedRoles: r.allowedRoles,
    }));
  }

  /**
   * EVC Scheduling: Retrieve the current inspection schedule for an application.
   */
  async getEvcSchedule(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<EvcScheduleResponseDto | null> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    if (
      currentUser.role === UserRole.INSTITUTION_USER &&
      application.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException('Access denied to application.');
    }

    const schedule = await this.evcScheduleRepository.findOne({
      where: { applicationId },
    });
    return schedule ? this.mapEvcScheduleToDto(schedule) : null;
  }

  /**
   * EVC Scheduling: Create or update an EVC visit schedule and committee roster.
   */
  async saveEvcSchedule(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    dto: CreateEvcScheduleDto,
  ): Promise<EvcScheduleResponseDto> {
    if (
      currentUser.role !== UserRole.REGIONAL_OFFICER &&
      currentUser.role !== UserRole.SYSTEM_ADMIN &&
      currentUser.role !== UserRole.EVC_INSPECTOR
    ) {
      throw new ForbiddenException(
        'Only Regional Officers, Admins, or EVC Inspectors can schedule visits.',
      );
    }

    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['institution'],
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    let schedule = await this.evcScheduleRepository.findOne({
      where: { applicationId },
    });

    if (!schedule) {
      schedule = this.evcScheduleRepository.create({
        applicationId,
        institutionId: application.institutionId,
        proposedVisitDate: new Date(dto.proposedVisitDate),
        scheduledVisitDate: dto.scheduledVisitDate
          ? new Date(dto.scheduledVisitDate)
          : new Date(dto.proposedVisitDate),
        visitType: dto.visitType,
        status: dto.status || 'SCHEDULED',
        committeeMembersJsonb: dto.committeeMembers || [],
        visitNotes: dto.visitNotes || null,
        outcomeSummary: dto.outcomeSummary || null,
        recommendation: dto.recommendation || 'PENDING',
        scheduledBy: `${currentUser.role} (${currentUser.email || currentUser.id})`,
      });
    } else {
      schedule.proposedVisitDate = new Date(dto.proposedVisitDate);
      if (dto.scheduledVisitDate) {
        schedule.scheduledVisitDate = new Date(dto.scheduledVisitDate);
      }
      schedule.visitType = dto.visitType;
      if (dto.status) schedule.status = dto.status;
      schedule.committeeMembersJsonb = dto.committeeMembers || [];
      if (dto.visitNotes !== undefined) schedule.visitNotes = dto.visitNotes;
      if (dto.outcomeSummary !== undefined)
        schedule.outcomeSummary = dto.outcomeSummary;
      if (dto.recommendation !== undefined)
        schedule.recommendation = dto.recommendation;
      schedule.scheduledBy = `${currentUser.role} (${currentUser.email || currentUser.id})`;
    }

    const saved = await this.evcScheduleRepository.save(schedule);

    if (this.notificationsService) {
      await this.notificationsService.createNotification({
        targetRole: UserRole.INSTITUTION_USER,
        institutionId: application.institutionId,
        applicationId: application.id,
        type: NotificationType.EVC_SCHEDULED,
        severity: NotificationSeverity.INFO,
        title: `EVC Inspection Scheduled: ${application.applicationNumber}`,
        message: `An Expert Visit Committee inspection has been scheduled on ${new Date(saved.proposedVisitDate).toLocaleDateString()} (${saved.visitType.replace('_', ' ')}).`,
        link: `/applications`,
        idempotencyKey: `evc_sched_${saved.id}_${saved.status}_${saved.proposedVisitDate.toISOString().split('T')[0]}`,
      });
    }

    return this.mapEvcScheduleToDto(saved);
  }

  /**
   * EVC Scheduling: List all inspection schedules.
   */
  async listEvcSchedules(
    currentUser: AuthUserPrincipal,
    status?: string,
  ): Promise<EvcScheduleResponseDto[]> {
    const qb = this.evcScheduleRepository.createQueryBuilder('evc');
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (currentUser.institutionId) {
        qb.where('evc.institution_id = :instId', {
          instId: currentUser.institutionId,
        });
      } else {
        return [];
      }
    }
    if (status && status !== 'ALL') {
      qb.andWhere('evc.status = :status', { status });
    }
    qb.orderBy('evc.proposed_visit_date', 'ASC');
    const items = await qb.getMany();
    return items.map((s) => this.mapEvcScheduleToDto(s));
  }

  /**
   * Stage-wise Pendency Metrics: Computes real database-backed metrics for each approval stage.
   */
  async getStagePendencyMetrics(): Promise<
    {
      stage: ApplicationStatus;
      label: string;
      count: number;
      avgHoursInStage: number;
      breachedCount: number;
    }[]
  > {
    const apps = await this.applicationRepository.find();
    const stageLabels: Record<ApplicationStatus, string> = {
      [ApplicationStatus.DRAFT]: 'Draft & Preparation',
      [ApplicationStatus.SUBMITTED]: 'Awaiting Scrutiny Assignment',
      [ApplicationStatus.UNDER_SCRUTINY]: 'Documentary Scrutiny Desk',
      [ApplicationStatus.DEFICIENCY_ISSUED]:
        'Clarification / Deficiency Issued',
      [ApplicationStatus.RESUBMITTED]: 'Awaiting Re-Scrutiny',
      [ApplicationStatus.RECOMMENDED_FOR_EVC]: 'EVC Scheduling Queue',
      [ApplicationStatus.EVC_IN_PROGRESS]: 'EVC Ground Inspection Active',
      [ApplicationStatus.RECOMMENDED_FOR_SHC]:
        'Standing Hearing Committee (SHC)',
      [ApplicationStatus.APPROVED]: 'Statutory Approval Granted',
      [ApplicationStatus.REJECTED]: 'Statutory Rejection Issued',
      [ApplicationStatus.WITHDRAWN]: 'Application Withdrawn',
    };

    const stages = Object.values(ApplicationStatus);
    const now = Date.now();

    return stages.map((stage) => {
      const stageApps = apps.filter((a) => a.status === stage);
      const count = stageApps.length;
      let totalHours = 0;
      let breached = 0;

      for (const app of stageApps) {
        const timeInStageMs =
          now - new Date(app.updatedAt || app.createdAt).getTime();
        totalHours += timeInStageMs / (1000 * 60 * 60);
        if (
          [
            ApplicationStatus.UNDER_SCRUTINY,
            ApplicationStatus.DEFICIENCY_ISSUED,
            ApplicationStatus.EVC_IN_PROGRESS,
            ApplicationStatus.RECOMMENDED_FOR_SHC,
          ].includes(stage) &&
          timeInStageMs > 7 * 24 * 60 * 60 * 1000
        ) {
          breached++;
        }
      }

      const avgHours = count > 0 ? Math.round(totalHours / count) : 0;

      return {
        stage,
        label: stageLabels[stage] || stage,
        count,
        avgHoursInStage: avgHours,
        breachedCount: breached,
      };
    });
  }

  /**
   * Records a timeline event inside an existing transactional entity manager.
   * Used by intake and submission workflows to maintain transactional consistency.
   */
  async recordTimelineEventInTransaction(
    manager: EntityManager,
    params: {
      applicationId: string;
      fromStatus: ApplicationStatus;
      toStatus: ApplicationStatus;
      eventType: string;
      actorId: string;
      actorRole: UserRole;
      comment?: string | null;
      correlationId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<WorkflowTimelineEvent> {
    const event = manager.create(WorkflowTimelineEvent, {
      applicationId: params.applicationId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      eventType: params.eventType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      comment: params.comment || null,
      correlationId: params.correlationId || null,
      metadata: params.metadata || {},
    });
    return manager.save(WorkflowTimelineEvent, event);
  }

  private mapEvcScheduleToDto(s: EvcSchedule): EvcScheduleResponseDto {
    return {
      id: s.id,
      applicationId: s.applicationId,
      institutionId: s.institutionId,
      status: s.status,
      visitType: s.visitType,
      proposedVisitDate: new Date(s.proposedVisitDate).toISOString(),
      scheduledVisitDate: s.scheduledVisitDate
        ? new Date(s.scheduledVisitDate).toISOString()
        : null,
      committeeMembers: s.committeeMembersJsonb || [],
      visitNotes: s.visitNotes || null,
      outcomeSummary: s.outcomeSummary || null,
      recommendation: s.recommendation,
      scheduledBy: s.scheduledBy || null,
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    };
  }
}
