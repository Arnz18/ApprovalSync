/**
 * ApprovalSync — Undertakings, Lease & Expiry Tracking Service
 * Milestone: BE-09
 *
 * Implements durable tracking for institutional undertakings and lease deeds,
 * deterministic calendar expiry calculations, human review recording (ADR-004),
 * cycle-free supersession/renewal chains, multi-tenant isolation,
 * cryptographic audit integration (BE-07), and SLA follow-up seams (BE-08).
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
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { Undertaking } from './entities/undertaking.entity';
import { UndertakingHistory } from './entities/undertaking-history.entity';
import { Institution } from '../database/entities/institution.entity';
import { Application } from '../database/entities/application.entity';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole, ApplicationStatus, SlaTier } from '../shared/contracts';
import { AuditService } from '../audit/audit.service';
import { SlaQueueService } from '../sla/queue/sla-queue.service';
import { UndertakingsClockService } from './clock/undertakings-clock.service';
import {
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingType,
} from './enums';
import {
  CreateUndertakingDto,
  UpdateUndertakingDto,
  ReviewUndertakingDto,
  RenewUndertakingDto,
  UndertakingQueryDto,
  UndertakingResponseDto,
  UndertakingHistoryResponseDto,
  UndertakingReconcileResponseDto,
} from './dto';
import {
  isValidDateRange,
  calculateRenewalDueDate,
  calculateUndertakingDerivedStatus,
  ILLUSTRATIVE_UNDERTAKING_DISCLAIMER,
} from './utils/date-calculations';
import { PaginationMeta } from '../shared/contracts';

const DEFAULT_LAND_LEASE_LEAD_DAYS = 180; // 6 months for land lease covenants
const DEFAULT_GENERAL_LEAD_DAYS = 60; // 2 months for general undertakings

@Injectable()
export class UndertakingsService {
  private readonly logger = new Logger(UndertakingsService.name);

  constructor(
    @InjectRepository(Undertaking)
    private readonly undertakingRepo: Repository<Undertaking>,
    @InjectRepository(UndertakingHistory)
    private readonly historyRepo: Repository<UndertakingHistory>,
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    private readonly dataSource: DataSource,
    private readonly clock: UndertakingsClockService,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly slaQueueService?: SlaQueueService,
  ) {}

  /**
   * Creates a new undertaking or lease record with tenant isolation and audit logging.
   */
  async createUndertaking(
    dto: CreateUndertakingDto,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    const institutionId = this.resolveInstitutionId(
      dto.institutionId,
      currentUser,
    );

    const institution = await this.institutionRepo.findOne({
      where: { id: institutionId },
    });
    if (!institution) {
      throw new NotFoundException(
        `Institution with ID ${institutionId} not found`,
      );
    }

    if (dto.applicationId) {
      await this.verifyApplicationBelongsToInstitution(
        dto.applicationId,
        institutionId,
      );
    }

    if (!isValidDateRange(dto.startDate, dto.expiryDate)) {
      throw new BadRequestException(
        'Expiry date must be strictly after start date',
      );
    }

    const defaultLead =
      dto.type === UndertakingType.LAND_LEASE
        ? DEFAULT_LAND_LEASE_LEAD_DAYS
        : DEFAULT_GENERAL_LEAD_DAYS;
    const renewalLeadDays = dto.renewalLeadDays || defaultLead;
    const renewalDueDate = calculateRenewalDueDate(
      dto.expiryDate,
      renewalLeadDays,
    );

    if (renewalDueDate < dto.startDate) {
      throw new BadRequestException(
        'Renewal lead time exceeds the total validity period of the undertaking',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const undertaking = manager.create(Undertaking, {
        institutionId,
        applicationId: dto.applicationId || null,
        type: dto.type,
        status: UndertakingStatus.DRAFT,
        reviewStatus: UndertakingReviewStatus.PENDING_REVIEW,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        documentNumber: dto.documentNumber?.trim() || null,
        issuingAuthority: dto.issuingAuthority?.trim() || null,
        counterpartyName: dto.counterpartyName?.trim() || null,
        startDate: dto.startDate,
        expiryDate: dto.expiryDate,
        renewalDueDate,
        renewalLeadDays,
        documentId: dto.documentId || null,
        metadataJsonb: dto.metadataJsonb || {},
        createdById: currentUser.id,
      });

      const saved = await manager.save(Undertaking, undertaking);

      await this.recordHistoryInTransaction(manager, {
        undertakingId: saved.id,
        action: 'CREATED',
        fromStatus: null,
        toStatus: saved.status,
        fromReviewStatus: null,
        toReviewStatus: saved.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason: 'Initial undertaking record created in DRAFT state.',
        snapshot: saved,
      });

      if (saved.applicationId && this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: saved.applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'UNDERTAKING_RECORD_CREATED',
          payloadSnapshot: {
            undertakingId: saved.id,
            type: saved.type,
            title: saved.title,
            expiryDate: saved.expiryDate,
            renewalDueDate: saved.renewalDueDate,
          },
        });
      }

      this.logger.log(
        `Created undertaking ${saved.id} (type: ${saved.type}, inst: ${saved.institutionId})`,
      );

      return this.mapToDto(saved);
    });
  }

  /**
   * Retrieves paginated undertakings with tenant isolation and date filters.
   */
  async getUndertakings(
    query: UndertakingQueryDto,
    currentUser: AuthUserPrincipal,
  ): Promise<{ items: UndertakingResponseDto[]; pagination: PaginationMeta }> {
    const qb = this.undertakingRepo.createQueryBuilder('u');

    // Multi-tenant scoping: INSTITUTION_USER is strictly confined to own institution
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (!currentUser.institutionId) {
        throw new ForbiddenException(
          'User is not associated with any institution',
        );
      }
      qb.andWhere('u.institution_id = :instId', {
        instId: currentUser.institutionId,
      });
    } else if (query.institutionId) {
      qb.andWhere('u.institution_id = :instId', {
        instId: query.institutionId,
      });
    }

    if (query.applicationId) {
      qb.andWhere('u.application_id = :appId', { appId: query.applicationId });
    }

    if (query.type) {
      qb.andWhere('u.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    if (query.reviewStatus) {
      qb.andWhere('u.review_status = :reviewStatus', {
        reviewStatus: query.reviewStatus,
      });
    }

    const evalDate = query.asOfDate || this.clock.getTodayDateString();

    if (query.isExpired === true) {
      qb.andWhere('u.expiry_date < :evalDate', { evalDate });
    } else if (query.isExpired === false) {
      qb.andWhere('u.expiry_date >= :evalDate', { evalDate });
    }

    if (query.expiringWithinDays) {
      const targetWindowDate = calculateRenewalDueDate(
        evalDate,
        -query.expiringWithinDays,
      );
      qb.andWhere(
        'u.expiry_date >= :evalDate AND u.expiry_date <= :targetWindowDate',
        {
          evalDate,
          targetWindowDate,
        },
      );
    }

    if (query.documentNumber) {
      qb.andWhere('u.document_number = :docNum', {
        docNum: query.documentNumber.trim(),
      });
    }

    if (query.search) {
      qb.andWhere(
        '(u.title ILIKE :search OR u.document_number ILIKE :search OR u.issuing_authority ILIKE :search OR u.counterparty_name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    const allowedSortFields: Record<string, string> = {
      expiryDate: 'u.expiry_date',
      renewalDueDate: 'u.renewal_due_date',
      startDate: 'u.start_date',
      createdAt: 'u.created_at',
      title: 'u.title',
    };

    const sortColumn =
      (query.sortBy && allowedSortFields[query.sortBy]) || 'u.expiry_date';
    const sortDirection =
      query.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.orderBy(sortColumn, sortDirection).skip(skip).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: items.map((u) => this.mapToDto(u, evalDate)),
      pagination: {
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
   * Retrieves a single undertaking by ID with anti-enumeration tenant isolation.
   */
  async getUndertakingById(
    id: string,
    currentUser: AuthUserPrincipal,
    asOfDate?: string,
  ): Promise<UndertakingResponseDto> {
    const undertaking = await this.undertakingRepo.findOne({
      where: { id },
    });

    if (!undertaking) {
      throw new NotFoundException({
        errorCode: 'ERR_RESOURCE_NOT_FOUND',
        message: `Undertaking with ID ${id} not found`,
      });
    }

    this.assertTenantAccess(undertaking, currentUser);

    return this.mapToDto(undertaking, asOfDate);
  }

  /**
   * Updates non-validity descriptive fields while preserving validity history.
   */
  async updateUndertaking(
    id: string,
    dto: UpdateUndertakingDto,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const undertaking = await manager.findOne(Undertaking, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!undertaking) {
        throw new NotFoundException({
          errorCode: 'ERR_RESOURCE_NOT_FOUND',
          message: `Undertaking with ID ${id} not found`,
        });
      }

      this.assertTenantAccess(undertaking, currentUser);

      if (
        undertaking.status === UndertakingStatus.SUPERSEDED ||
        undertaking.status === UndertakingStatus.TERMINATED
      ) {
        throw new BadRequestException(
          `Cannot modify an undertaking in ${undertaking.status} state. Submit a renewal instrument instead.`,
        );
      }

      if (dto.title !== undefined) undertaking.title = dto.title.trim();
      if (dto.description !== undefined)
        undertaking.description = dto.description?.trim() || null;
      if (dto.documentNumber !== undefined)
        undertaking.documentNumber = dto.documentNumber?.trim() || null;
      if (dto.issuingAuthority !== undefined)
        undertaking.issuingAuthority = dto.issuingAuthority?.trim() || null;
      if (dto.counterpartyName !== undefined)
        undertaking.counterpartyName = dto.counterpartyName?.trim() || null;
      if (dto.documentId !== undefined)
        undertaking.documentId = dto.documentId || null;
      if (dto.metadataJsonb !== undefined)
        undertaking.metadataJsonb = {
          ...undertaking.metadataJsonb,
          ...dto.metadataJsonb,
        };

      const saved = await manager.save(Undertaking, undertaking);

      await this.recordHistoryInTransaction(manager, {
        undertakingId: saved.id,
        action: 'UPDATED',
        fromStatus: saved.status,
        toStatus: saved.status,
        fromReviewStatus: saved.reviewStatus,
        toReviewStatus: saved.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason: 'Updated descriptive parameters of undertaking record.',
        snapshot: saved,
      });

      if (saved.applicationId && this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: saved.applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'UNDERTAKING_RECORD_UPDATED',
          payloadSnapshot: {
            undertakingId: saved.id,
            title: saved.title,
            documentNumber: saved.documentNumber,
          },
        });
      }

      return this.mapToDto(saved);
    });
  }

  /**
   * Submits a DRAFT undertaking for formal regulatory review.
   */
  async submitUndertaking(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const undertaking = await manager.findOne(Undertaking, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!undertaking) {
        throw new NotFoundException({
          errorCode: 'ERR_RESOURCE_NOT_FOUND',
          message: `Undertaking with ID ${id} not found`,
        });
      }

      this.assertTenantAccess(undertaking, currentUser);

      if (undertaking.status !== UndertakingStatus.DRAFT) {
        throw new BadRequestException(
          `Only DRAFT undertakings can be submitted for review (current status: ${undertaking.status})`,
        );
      }

      const prevStatus = undertaking.status;
      undertaking.status = UndertakingStatus.SUBMITTED;
      undertaking.reviewStatus = UndertakingReviewStatus.PENDING_REVIEW;

      const saved = await manager.save(Undertaking, undertaking);

      await this.recordHistoryInTransaction(manager, {
        undertakingId: saved.id,
        action: 'SUBMITTED',
        fromStatus: prevStatus,
        toStatus: saved.status,
        fromReviewStatus: null,
        toReviewStatus: saved.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason:
          'Submitted by institution for formal compliance scrutiny.',
        snapshot: saved,
      });

      if (saved.applicationId && this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: saved.applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'UNDERTAKING_SUBMITTED_FOR_REVIEW',
          payloadSnapshot: {
            undertakingId: saved.id,
            status: saved.status,
            reviewStatus: saved.reviewStatus,
          },
        });
      }

      return this.mapToDto(saved);
    });
  }

  /**
   * Records human review officer disposition (ADR-004 Human Sovereignty).
   */
  async reviewUndertaking(
    id: string,
    dto: ReviewUndertakingDto,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    this.assertCanReview(currentUser);

    return this.dataSource.transaction(async (manager) => {
      const undertaking = await manager.findOne(Undertaking, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!undertaking) {
        throw new NotFoundException({
          errorCode: 'ERR_RESOURCE_NOT_FOUND',
          message: `Undertaking with ID ${id} not found`,
        });
      }

      const prevStatus = undertaking.status;
      const prevReviewStatus = undertaking.reviewStatus;

      undertaking.reviewStatus = dto.reviewStatus;
      undertaking.reviewedById = currentUser.id;
      undertaking.reviewedAt = this.clock.getNow();
      undertaking.reviewNotes = dto.reviewNotes.trim();

      if (dto.reviewStatus === UndertakingReviewStatus.VERIFIED) {
        const derived = calculateUndertakingDerivedStatus({
          startDate: undertaking.startDate,
          expiryDate: undertaking.expiryDate,
          renewalDueDate: undertaking.renewalDueDate,
          renewalLeadDays: undertaking.renewalLeadDays,
          currentStatus: UndertakingStatus.ACTIVE,
          asOfDate: this.clock.getTodayDateString(),
        });
        undertaking.status = dto.effectiveStatus || derived.status;
      } else if (dto.reviewStatus === UndertakingReviewStatus.REJECTED) {
        if (dto.effectiveStatus) {
          undertaking.status = dto.effectiveStatus;
        }
      }

      const saved = await manager.save(Undertaking, undertaking);

      await this.recordHistoryInTransaction(manager, {
        undertakingId: saved.id,
        action: 'REVIEWED',
        fromStatus: prevStatus,
        toStatus: saved.status,
        fromReviewStatus: prevReviewStatus,
        toReviewStatus: saved.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason: dto.reviewNotes.trim(),
        snapshot: saved,
      });

      if (saved.applicationId && this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: saved.applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'UNDERTAKING_REVIEWED_BY_OFFICER',
          payloadSnapshot: {
            undertakingId: saved.id,
            reviewStatus: saved.reviewStatus,
            status: saved.status,
            reviewNotes: saved.reviewNotes,
          },
        });
      }

      return this.mapToDto(saved);
    });
  }

  /**
   * Renews and supersedes an undertaking with cycle prevention and atomic linking.
   */
  async renewUndertaking(
    id: string,
    dto: RenewUndertakingDto,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    if (!isValidDateRange(dto.startDate, dto.expiryDate)) {
      throw new BadRequestException(
        'Renewal expiry date must be strictly after start date',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const oldUndertaking = await manager.findOne(Undertaking, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!oldUndertaking) {
        throw new NotFoundException({
          errorCode: 'ERR_RESOURCE_NOT_FOUND',
          message: `Undertaking with ID ${id} not found`,
        });
      }

      this.assertTenantAccess(oldUndertaking, currentUser);

      if (
        oldUndertaking.status === UndertakingStatus.SUPERSEDED ||
        oldUndertaking.status === UndertakingStatus.TERMINATED ||
        oldUndertaking.status === UndertakingStatus.DRAFT
      ) {
        throw new BadRequestException(
          `Cannot renew an undertaking in ${oldUndertaking.status} state. Only active, expiring, or expired records can be renewed.`,
        );
      }

      const renewalLeadDays =
        dto.renewalLeadDays || oldUndertaking.renewalLeadDays;
      const renewalDueDate = calculateRenewalDueDate(
        dto.expiryDate,
        renewalLeadDays,
      );

      if (renewalDueDate < dto.startDate) {
        throw new BadRequestException(
          'Renewal lead time exceeds the validity period of the renewed instrument',
        );
      }

      // Cycle prevention: verify that oldUndertaking does not already supersede the new target
      if (oldUndertaking.supersededById) {
        throw new BadRequestException(
          'This undertaking has already been superseded by another renewal record',
        );
      }

      // Determine initial status of renewal record
      const isOfficer = [
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_HEAD,
        UserRole.SYSTEM_ADMIN,
      ].includes(currentUser.role);

      const newRecord = manager.create(Undertaking, {
        institutionId: oldUndertaking.institutionId,
        applicationId: oldUndertaking.applicationId,
        type: oldUndertaking.type,
        status: isOfficer
          ? UndertakingStatus.ACTIVE
          : UndertakingStatus.SUBMITTED,
        reviewStatus: isOfficer
          ? UndertakingReviewStatus.VERIFIED
          : UndertakingReviewStatus.PENDING_REVIEW,
        title: oldUndertaking.title,
        description: oldUndertaking.description,
        documentNumber: dto.documentNumber || oldUndertaking.documentNumber,
        issuingAuthority: oldUndertaking.issuingAuthority,
        counterpartyName:
          dto.counterpartyName || oldUndertaking.counterpartyName,
        startDate: dto.startDate,
        expiryDate: dto.expiryDate,
        renewalDueDate,
        renewalLeadDays,
        documentId: dto.documentId || oldUndertaking.documentId,
        supersedesId: oldUndertaking.id,
        createdById: currentUser.id,
        metadataJsonb: {
          ...oldUndertaking.metadataJsonb,
          ...(dto.metadataJsonb || {}),
          renewalNotes:
            dto.renewalNotes || 'Supersedes previous validity period',
        },
      });

      const savedNew = await manager.save(Undertaking, newRecord);

      // Supersede old record
      const prevOldStatus = oldUndertaking.status;
      oldUndertaking.status = UndertakingStatus.SUPERSEDED;
      oldUndertaking.supersededById = savedNew.id;
      await manager.save(Undertaking, oldUndertaking);

      // Record history for both records
      await this.recordHistoryInTransaction(manager, {
        undertakingId: oldUndertaking.id,
        action: 'SUPERSEDED',
        fromStatus: prevOldStatus,
        toStatus: UndertakingStatus.SUPERSEDED,
        fromReviewStatus: oldUndertaking.reviewStatus,
        toReviewStatus: oldUndertaking.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason:
          `Superseded by renewal record ${savedNew.id}. ${dto.renewalNotes || ''}`.trim(),
        snapshot: oldUndertaking,
      });

      await this.recordHistoryInTransaction(manager, {
        undertakingId: savedNew.id,
        action: 'RENEWED',
        fromStatus: null,
        toStatus: savedNew.status,
        fromReviewStatus: null,
        toReviewStatus: savedNew.reviewStatus,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        changeReason: `Renewed from prior undertaking ${oldUndertaking.id}.`,
        snapshot: savedNew,
      });

      // Audit ledger logging
      if (oldUndertaking.applicationId && this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: oldUndertaking.applicationId,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'UNDERTAKING_SUPERSEDED_AND_RENEWED',
          payloadSnapshot: {
            priorUndertakingId: oldUndertaking.id,
            renewalUndertakingId: savedNew.id,
            newExpiryDate: savedNew.expiryDate,
          },
        });
      }

      this.logger.log(
        `Renewed undertaking ${oldUndertaking.id} -> ${savedNew.id} (new expiry: ${savedNew.expiryDate})`,
      );

      return this.mapToDto(savedNew);
    });
  }

  /**
   * Retrieves chronological history of an undertaking.
   */
  async getUndertakingHistory(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<UndertakingHistoryResponseDto[]> {
    const undertaking = await this.undertakingRepo.findOne({
      where: { id },
    });

    if (!undertaking) {
      throw new NotFoundException({
        errorCode: 'ERR_RESOURCE_NOT_FOUND',
        message: `Undertaking with ID ${id} not found`,
      });
    }

    this.assertTenantAccess(undertaking, currentUser);

    const history = await this.historyRepo.find({
      where: { undertakingId: id },
      order: { createdAt: 'ASC' },
    });

    return history.map((h) => ({
      id: h.id,
      undertakingId: h.undertakingId,
      action: h.action,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      fromReviewStatus: h.fromReviewStatus,
      toReviewStatus: h.toReviewStatus,
      actorId: h.actorId,
      actorRole: h.actorRole,
      actorEmail: h.actorEmail,
      changeReason: h.changeReason,
      snapshotJsonb: h.snapshotJsonb,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  /**
   * Periodic or on-demand reconciliation sweep recalculating status relative to evaluation date.
   */
  async reconcileUndertakings(
    asOfDate?: string,
    currentUser?: AuthUserPrincipal,
  ): Promise<UndertakingReconcileResponseDto> {
    if (currentUser) {
      this.assertCanReview(currentUser);
    }

    const evalDate = asOfDate || this.clock.getTodayDateString();

    const candidates = await this.undertakingRepo.find({
      where: {
        status: In([
          UndertakingStatus.ACTIVE,
          UndertakingStatus.EXPIRING_SOON,
          UndertakingStatus.RENEWAL_DUE,
          UndertakingStatus.SUBMITTED,
        ]),
      },
    });

    let activeCount = 0;
    let expiringSoonCount = 0;
    let renewalDueCount = 0;
    let expiredCount = 0;
    let transitionedCount = 0;
    const transitionedIds: string[] = [];

    for (const item of candidates) {
      const derived = calculateUndertakingDerivedStatus({
        startDate: item.startDate,
        expiryDate: item.expiryDate,
        renewalDueDate: item.renewalDueDate,
        renewalLeadDays: item.renewalLeadDays,
        currentStatus: item.status,
        asOfDate: evalDate,
      });

      if (derived.status === UndertakingStatus.ACTIVE) activeCount++;
      else if (derived.status === UndertakingStatus.EXPIRING_SOON)
        expiringSoonCount++;
      else if (derived.status === UndertakingStatus.RENEWAL_DUE)
        renewalDueCount++;
      else if (derived.status === UndertakingStatus.EXPIRED) expiredCount++;

      if (derived.status !== item.status) {
        await this.dataSource.transaction(async (manager) => {
          const locked = await manager.findOne(Undertaking, {
            where: { id: item.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!locked || locked.status === derived.status) return;

          const prevStatus = locked.status;
          locked.status = derived.status;
          await manager.save(Undertaking, locked);

          await this.recordHistoryInTransaction(manager, {
            undertakingId: locked.id,
            action: 'RECONCILED',
            fromStatus: prevStatus,
            toStatus: locked.status,
            fromReviewStatus: locked.reviewStatus,
            toReviewStatus: locked.reviewStatus,
            actorId: currentUser
              ? currentUser.id
              : 'SYSTEM_RECONCILIATION_DAEMON',
            actorRole: currentUser ? currentUser.role : UserRole.SYSTEM_ADMIN,
            actorEmail: currentUser
              ? currentUser.email
              : 'system@approvalsync.local',
            changeReason: `Reconciled against calendar date ${evalDate}. Days remaining: ${derived.daysRemaining}.`,
            snapshot: locked,
          });

          if (locked.applicationId && this.auditService) {
            await this.auditService.appendInTransaction(manager, {
              applicationId: locked.applicationId,
              actorId: currentUser
                ? currentUser.id
                : 'SYSTEM_RECONCILIATION_DAEMON',
              actorRole: currentUser ? currentUser.role : UserRole.SYSTEM_ADMIN,
              eventType: 'UNDERTAKING_EXPIRY_RECONCILED',
              payloadSnapshot: {
                undertakingId: locked.id,
                fromStatus: prevStatus,
                toStatus: locked.status,
                evaluationDate: evalDate,
                daysRemaining: derived.daysRemaining,
              },
            });
          }

          // BE-08 SLA queue integration seam for critical renewal/expiry alerts
          if (
            (derived.status === UndertakingStatus.RENEWAL_DUE ||
              derived.status === UndertakingStatus.EXPIRED) &&
            locked.applicationId &&
            this.slaQueueService
          ) {
            await this.slaQueueService.enqueueTimerCheck({
              timerId: locked.id,
              applicationId: locked.applicationId,
              stage: ApplicationStatus.UNDER_SCRUTINY,
              tier: SlaTier.TIER_1_RO_ALERT,
              checkType:
                derived.status === UndertakingStatus.EXPIRED
                  ? 'BREACH_CHECK'
                  : 'WARNING_CHECK',
            });
          }

          transitionedCount++;
          transitionedIds.push(locked.id);
        });
      }
    }

    return {
      scannedCount: candidates.length,
      activeCount,
      expiringSoonCount,
      renewalDueCount,
      expiredCount,
      transitionedCount,
      transitionedIds,
      evaluationDate: evalDate,
      disclaimer: ILLUSTRATIVE_UNDERTAKING_DISCLAIMER,
    };
  }

  // --- Helpers ---

  private resolveInstitutionId(
    requestedId: string | undefined,
    currentUser: AuthUserPrincipal,
  ): string {
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (!currentUser.institutionId) {
        throw new ForbiddenException(
          'Institution user is not associated with an institution',
        );
      }
      if (requestedId && requestedId !== currentUser.institutionId) {
        throw new ForbiddenException(
          'Institution user cannot create records for another institution',
        );
      }
      return currentUser.institutionId;
    }

    if (!requestedId) {
      throw new BadRequestException(
        'institutionId is required for this operation',
      );
    }
    return requestedId;
  }

  private async verifyApplicationBelongsToInstitution(
    applicationId: string,
    institutionId: string,
  ): Promise<void> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!app || app.institutionId !== institutionId) {
      throw new NotFoundException({
        errorCode: 'ERR_RESOURCE_NOT_FOUND',
        message: `Application with ID ${applicationId} not found for institution ${institutionId}`,
      });
    }
  }

  private assertTenantAccess(
    undertaking: Undertaking,
    currentUser: AuthUserPrincipal,
  ): void {
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (undertaking.institutionId !== currentUser.institutionId) {
        // Uniform 404 anti-enumeration
        throw new NotFoundException({
          errorCode: 'ERR_RESOURCE_NOT_FOUND',
          message: `Undertaking with ID ${undertaking.id} not found`,
        });
      }
    }
  }

  private assertCanReview(currentUser: AuthUserPrincipal): void {
    const authorizedRoles = [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
    ];
    if (!authorizedRoles.includes(currentUser.role)) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN',
        message:
          'Only authorized regulatory review officers may perform this action',
      });
    }
  }

  private async recordHistoryInTransaction(
    manager: EntityManager,
    params: {
      undertakingId: string;
      action: string;
      fromStatus: UndertakingStatus | null;
      toStatus: UndertakingStatus;
      fromReviewStatus: UndertakingReviewStatus | null;
      toReviewStatus: UndertakingReviewStatus | null;
      actorId: string;
      actorRole: UserRole;
      actorEmail?: string | null;
      changeReason?: string | null;
      snapshot: Undertaking;
    },
  ): Promise<UndertakingHistory> {
    const history = manager.create(UndertakingHistory, {
      undertakingId: params.undertakingId,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      fromReviewStatus: params.fromReviewStatus,
      toReviewStatus: params.toReviewStatus,
      actorId: params.actorId,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail || null,
      changeReason: params.changeReason || null,
      snapshotJsonb: {
        id: params.snapshot.id,
        institutionId: params.snapshot.institutionId,
        applicationId: params.snapshot.applicationId,
        type: params.snapshot.type,
        status: params.snapshot.status,
        reviewStatus: params.snapshot.reviewStatus,
        title: params.snapshot.title,
        startDate: params.snapshot.startDate,
        expiryDate: params.snapshot.expiryDate,
        renewalDueDate: params.snapshot.renewalDueDate,
        supersedesId: params.snapshot.supersedesId,
        supersededById: params.snapshot.supersededById,
      },
    });

    return manager.save(UndertakingHistory, history);
  }

  private mapToDto(u: Undertaking, asOfDate?: string): UndertakingResponseDto {
    const derived = calculateUndertakingDerivedStatus({
      startDate: u.startDate,
      expiryDate: u.expiryDate,
      renewalDueDate: u.renewalDueDate,
      renewalLeadDays: u.renewalLeadDays,
      currentStatus: u.status,
      asOfDate: asOfDate || this.clock.getTodayDateString(),
    });

    return {
      id: u.id,
      institutionId: u.institutionId,
      applicationId: u.applicationId,
      type: u.type,
      status: u.status,
      reviewStatus: u.reviewStatus,
      title: u.title,
      description: u.description,
      documentNumber: u.documentNumber,
      issuingAuthority: u.issuingAuthority,
      counterpartyName: u.counterpartyName,
      startDate: u.startDate,
      expiryDate: u.expiryDate,
      renewalDueDate: u.renewalDueDate,
      renewalLeadDays: u.renewalLeadDays,
      daysRemaining: derived.daysRemaining,
      isExpiringSoon: derived.isExpiringSoon,
      isRenewalDue: derived.isRenewalDue,
      isExpired: derived.isExpired,
      documentId: u.documentId,
      supersededById: u.supersededById,
      supersedesId: u.supersedesId,
      reviewedById: u.reviewedById,
      reviewedAt: u.reviewedAt ? u.reviewedAt.toISOString() : null,
      reviewNotes: u.reviewNotes,
      metadataJsonb: u.metadataJsonb || {},
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      disclaimer: ILLUSTRATIVE_UNDERTAKING_DISCLAIMER,
    };
  }
}
