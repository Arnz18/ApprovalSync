/**
 * ApprovalSync — Workflow Service
 * Milestone: BE-06
 *
 * Implements atomic FSM state transitions, pessimistic locking concurrency control,
 * role and tenant guards, and structured workflow timeline event persistence.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Application } from '../database/entities/application.entity';
import { WorkflowTimelineEvent } from './entities/workflow-timeline-event.entity';
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
    private readonly dataSource: DataSource,
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
    return this.dataSource.transaction(async (manager: EntityManager) => {
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

      this.logger.log(
        `Application ${savedApplication.applicationNumber} (${savedApplication.id}) transitioned from ${previousStatus} to ${dto.targetStatus} [event: ${rule.eventType}] by user ${currentUser.id} (${currentUser.role})`,
      );

      return {
        success: true,
        applicationId: savedApplication.id,
        applicationNumber: savedApplication.applicationNumber,
        previousStatus,
        currentStatus: savedApplication.status,
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
    });
  }

  /**
   * Retrieves the workflow timeline history for an application with tenant protection.
   */
  async getTimeline(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    queryDto: TimelineQueryDto,
  ): Promise<{ items: WorkflowTimelineEvent[]; pagination: PaginationMeta }> {
    // 1. Verify access to application
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
}
