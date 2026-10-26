/**
 * ApprovalSync — Applications Service
 * Application intake, draft management, submission transactions, and tenant isolation.
 * Milestone: BE-04
 */

import {
  Injectable,
  Optional,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { Document } from '../database/entities/document.entity';
import {
  ApplicationStatus,
  UserRole,
  PaginationMeta,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { WorkflowService } from '../workflow/workflow.service';
import { AuditService } from '../audit/audit.service';
import { SlaService } from '../sla/sla.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import {
  ApplicationProjection,
  DocumentMetadataProjection,
} from './dto/application-response.dto';

const RESERVED_PAYLOAD_KEYS = [
  'id',
  'applicationNumber',
  'institutionId',
  'status',
  'submittedAt',
  'createdAt',
  'updatedAt',
  'approvalOutcome',
  'reviewDisposition',
  'verified',
];

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly workflowService?: WorkflowService,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly slaService?: SlaService,
  ) {}

  /**
   * Generates a collision-resistant unique application number.
   * Format: APP-<YYYY>-<8-char-uppercase-hex>
   */
  generateApplicationNumber(academicYear: string): string {
    const yearPrefix =
      academicYear.split('-')[0] || new Date().getFullYear().toString();
    const entropy = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `APP-${yearPrefix}-${entropy}`;
  }

  /**
   * Sanitizes dynamic payload JSONB by removing reserved server-managed keys.
   */
  sanitizePayload(payload?: Record<string, unknown>): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!RESERVED_PAYLOAD_KEYS.includes(key)) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Create a new draft application bound to the authenticated institution.
   */
  async createApplication(
    institutionId: string,
    createDto: CreateApplicationDto,
  ): Promise<Application> {
    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found.');
    }

    const applicationNumber = this.generateApplicationNumber(
      createDto.academicYear,
    );
    const sanitizedPayload = this.sanitizePayload(createDto.payloadJsonb);

    const application = this.applicationRepository.create({
      applicationNumber,
      institutionId,
      academicYear: createDto.academicYear.trim(),
      programType: createDto.programType.trim(),
      status: ApplicationStatus.DRAFT,
      payloadJsonb: sanitizedPayload,
      submittedAt: null,
    });

    const saved = await this.applicationRepository.save(application);
    saved.institution = institution;
    return saved;
  }

  /**
   * Retrieve applications with tenant isolation, status filtering, search, and pagination.
   */
  async getApplications(
    currentUser: AuthUserPrincipal,
    queryDto: ApplicationQueryDto,
  ): Promise<{ items: Application[]; pagination: PaginationMeta }> {
    if (queryDto.page !== undefined && queryDto.page < 1) {
      throw new BadRequestException('Page must be a positive integer.');
    }
    if (
      queryDto.limit !== undefined &&
      (queryDto.limit < 1 || queryDto.limit > 100)
    ) {
      throw new BadRequestException('Limit must be between 1 and 100.');
    }

    // Sort column mapping (safeguarding against SQL injection)
    const allowedSortFields: Record<string, string> = {
      createdAt: 'applications.createdAt',
      updatedAt: 'applications.updatedAt',
      applicationNumber: 'applications.applicationNumber',
      academicYear: 'applications.academicYear',
      submittedAt: 'applications.submittedAt',
      status: 'applications.status',
    };

    if (queryDto.sortBy && !allowedSortFields[queryDto.sortBy]) {
      throw new BadRequestException(
        `Invalid sortBy field: ${queryDto.sortBy}. Allowed: ${Object.keys(allowedSortFields).join(', ')}`,
      );
    }

    if (
      queryDto.sortOrder &&
      !['ASC', 'DESC'].includes(queryDto.sortOrder.toUpperCase())
    ) {
      throw new BadRequestException(
        `Invalid sortOrder: ${queryDto.sortOrder}. Allowed: ASC, DESC`,
      );
    }

    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.min(100, Math.max(1, queryDto.limit || 20));

    // If an institution user has no assigned institutionId, return an empty set immediately
    if (
      currentUser.role === UserRole.INSTITUTION_USER &&
      !currentUser.institutionId
    ) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const qb = this.applicationRepository
      .createQueryBuilder('applications')
      .leftJoinAndSelect('applications.institution', 'institution');

    // Tenant isolation: INSTITUTION_USER is strictly scoped to their own institution
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      qb.andWhere('applications.institutionId = :instId', {
        instId: currentUser.institutionId,
      });
    } else {
      // Regulatory and administrative roles may filter by institutionId if supplied
      if (queryDto.institutionId) {
        qb.andWhere('applications.institutionId = :filterInstId', {
          filterInstId: queryDto.institutionId,
        });
      }
    }

    // Filter by ApplicationStatus lifecycle state
    if (queryDto.status) {
      qb.andWhere('applications.status = :status', { status: queryDto.status });
    }

    // Search by applicationNumber, programType, academicYear, or institution name
    if (queryDto.search) {
      qb.andWhere(
        '(applications.applicationNumber ILIKE :search OR applications.programType ILIKE :search OR applications.academicYear ILIKE :search OR institution.name ILIKE :search)',
        { search: `%${queryDto.search.trim()}%` },
      );
    }

    const sortColumn =
      (queryDto.sortBy && allowedSortFields[queryDto.sortBy]) ||
      'applications.createdAt';
    const sortOrder =
      queryDto.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
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
   * Find an application by UUID including its institution relation.
   */
  async findById(id: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: { id },
      relations: ['institution'],
    });
  }

  /**
   * Retrieve a single application with strict tenant isolation.
   * Uniformly returns 403 Forbidden to INSTITUTION_USER on nonexistent or foreign application IDs
   * to prevent application enumeration / IDOR attacks.
   */
  async getApplicationByIdForUser(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['institution'],
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

    return application;
  }

  /**
   * Partially update an editable draft application.
   * Only applications in DRAFT status can be modified.
   */
  async updateDraftApplication(
    id: string,
    currentUser: AuthUserPrincipal,
    updateDto: UpdateApplicationDto,
  ): Promise<Application> {
    const application = await this.getApplicationByIdForUser(id, currentUser);

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot update application: only applications in DRAFT status can be modified.',
      );
    }

    if (updateDto.academicYear !== undefined) {
      application.academicYear = updateDto.academicYear.trim();
    }
    if (updateDto.programType !== undefined) {
      application.programType = updateDto.programType.trim();
    }
    if (updateDto.payloadJsonb !== undefined) {
      const sanitized = this.sanitizePayload(updateDto.payloadJsonb);
      application.payloadJsonb = {
        ...application.payloadJsonb,
        ...sanitized,
      };
    }

    return this.applicationRepository.save(application);
  }

  /**
   * Submits a draft application for scrutiny review within an atomic transaction.
   * Acquires a pessimistic write lock on the application row to prevent race conditions.
   * Transitions status from DRAFT to SUBMITTED and stamps submittedAt.
   */
  async submitDraftApplication(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Application> {
    return this.dataSource.transaction(async (manager) => {
      // Row-level lock without outer-joining institution to comply with PostgreSQL FOR UPDATE rules
      const application = await manager.findOne(Application, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (currentUser.role === UserRole.INSTITUTION_USER) {
        if (
          !application ||
          !currentUser.institutionId ||
          application.institutionId !== currentUser.institutionId
        ) {
          throw new ForbiddenException(
            'Access denied: cannot submit application from another institution.',
          );
        }
      }

      if (!application) {
        throw new NotFoundException('Application not found.');
      }

      // Re-check DRAFT status under the row lock to guarantee idempotency and concurrency protection
      if (application.status !== ApplicationStatus.DRAFT) {
        throw new BadRequestException(
          'Cannot submit application: only applications in DRAFT status can be submitted.',
        );
      }

      // Validate mandatory program data
      if (!application.programType || !application.academicYear) {
        throw new BadRequestException(
          'Cannot submit application: missing required program or academic year data.',
        );
      }

      application.status = ApplicationStatus.SUBMITTED;
      application.submittedAt = new Date();

      const saved = await manager.save(Application, application);

      if (this.workflowService) {
        await this.workflowService.recordTimelineEventInTransaction(manager, {
          applicationId: saved.id,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.SUBMITTED,
          eventType: 'APPLICATION_SUBMITTED',
          actorId: currentUser.id,
          actorRole: currentUser.role,
          comment: 'Application submitted for scrutiny review',
        });
      }

      if (this.auditService) {
        await this.auditService.appendInTransaction(manager, {
          applicationId: saved.id,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          eventType: 'APPLICATION_SUBMITTED',
          payloadSnapshot: {
            applicationNumber: saved.applicationNumber,
            fromStatus: ApplicationStatus.DRAFT,
            toStatus: ApplicationStatus.SUBMITTED,
            submittedAt: saved.submittedAt?.toISOString(),
          },
        });
      }

      if (this.slaService) {
        await this.slaService.handleWorkflowTransitionInTransaction(manager, {
          applicationId: saved.id,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.SUBMITTED,
          actorId: currentUser.id,
          actorRole: currentUser.role,
          comment: 'Application submitted for scrutiny review',
        });
      }

      // Load institution association for complete projection return
      const institution = await manager.findOne(Institution, {
        where: { id: saved.institutionId },
      });
      if (institution) {
        saved.institution = institution;
      }

      this.logger.log(
        `Application ${saved.applicationNumber} (${saved.id}) submitted by user ${currentUser.id}`,
      );
      return saved;
    });
  }

  /**
   * Retrieves document attachment metadata for an application with tenant verification.
   * Returns only safe metadata fields matching the DocumentMetadata contract;
   * never exposes storage paths, keys, or credentials.
   */
  async getApplicationDocuments(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<DocumentMetadataProjection[]> {
    // Verifies tenant access and application existence
    await this.getApplicationByIdForUser(id, currentUser);

    const documents = await this.documentRepository.find({
      where: { applicationId: id },
      order: { createdAt: 'ASC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      applicationId: doc.applicationId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSizeBytes: Number(doc.fileSizeBytes),
      sha256Checksum: doc.fileHashSha256,
      processingStatus: doc.processingStatus,
      uploadedAt:
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : String(doc.createdAt),
    }));
  }

  /**
   * Maps an Application entity to a safe, explicit response projection.
   */
  toProjection(application: Application): ApplicationProjection {
    const projection: ApplicationProjection = {
      id: application.id,
      applicationNumber: application.applicationNumber,
      institutionId: application.institutionId,
      academicYear: application.academicYear,
      status: application.status,
      programType: application.programType,
      payloadJsonb: application.payloadJsonb || {},
      submittedAt:
        application.submittedAt instanceof Date
          ? application.submittedAt.toISOString()
          : application.submittedAt
            ? String(application.submittedAt)
            : null,
      createdAt:
        application.createdAt instanceof Date
          ? application.createdAt.toISOString()
          : String(application.createdAt),
      updatedAt:
        application.updatedAt instanceof Date
          ? application.updatedAt.toISOString()
          : String(application.updatedAt),
    };

    if (application.institution) {
      projection.institution = {
        id: application.institution.id,
        name: application.institution.name,
        registrationNumber: application.institution.registrationNumber,
        state: application.institution.state,
        district: application.institution.district,
      };
    }

    if (
      typeof (application as unknown as { documentsCount?: number })
        .documentsCount === 'number'
    ) {
      projection.documentsCount = (
        application as unknown as { documentsCount?: number }
      ).documentsCount;
    }

    return projection;
  }
}
