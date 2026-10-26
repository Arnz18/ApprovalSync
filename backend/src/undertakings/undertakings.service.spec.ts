/**
 * ApprovalSync — Undertakings Service Unit Tests
 * Milestone: BE-09
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UndertakingsService } from './undertakings.service';
import { Undertaking } from './entities/undertaking.entity';
import { UndertakingHistory } from './entities/undertaking-history.entity';
import { Institution } from '../database/entities/institution.entity';
import { Application } from '../database/entities/application.entity';
import { UndertakingsClockService } from './clock/undertakings-clock.service';
import { AuditService } from '../audit/audit.service';
import { SlaQueueService } from '../sla/queue/sla-queue.service';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from './enums';
import { CreateUndertakingDto, ReviewUndertakingDto } from './dto';

describe('UndertakingsService', () => {
  let service: UndertakingsService;
  let clock: UndertakingsClockService;

  const mockInstitution: Institution = {
    id: 'inst-1111-uuid',
    name: 'Apex Institute of Technology',
    registrationNumber: 'REG-101',
    institutionType: 'TECHNICAL',
    state: 'Delhi',
    district: 'New Delhi',
    pincode: '110001',
    address: '123 College Road',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    applications: [],
  };

  const mockApplication: Application = {
    id: 'app-2222-uuid',
    applicationNumber: 'APP-2024-11112222',
    institutionId: 'inst-1111-uuid',
    academicYear: '2024-2025',
    programType: 'ENGINEERING',
    status: 'SUBMITTED' as any,
    payloadJsonb: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    submittedAt: new Date(),
    institution: mockInstitution,
    documents: [],
    auditLogs: [],
    slaTimers: [],
    timelineEvents: [],
  };

  const mockApplicant: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'principal@apex.edu',
    name: 'Dr. Principal',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1111-uuid',
  };

  const mockOfficer: AuthUserPrincipal = {
    id: 'user-officer-1',
    email: 'officer@aicte.gov.in',
    name: 'Scrutiny Officer Sharma',
    role: UserRole.SCRUTINY_OFFICER,
  };

  let undertakingsStorage: Undertaking[] = [];
  let historyStorage: UndertakingHistory[] = [];

  const mockUndertakingRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      const match = undertakingsStorage.find((u) => u.id === where.id);
      return Promise.resolve(match || null);
    }),
    find: jest.fn().mockImplementation(() => {
      return Promise.resolve([...undertakingsStorage]);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockImplementation(() => {
        return Promise.resolve([
          [...undertakingsStorage],
          undertakingsStorage.length,
        ]);
      }),
    }),
  };

  const mockHistoryRepo = {
    find: jest.fn().mockImplementation(({ where }) => {
      const matches = historyStorage.filter(
        (h) => h.undertakingId === where.undertakingId,
      );
      return Promise.resolve(matches);
    }),
  };

  const mockInstitutionRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === mockInstitution.id)
        return Promise.resolve(mockInstitution);
      return Promise.resolve(null);
    }),
  };

  const mockApplicationRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === mockApplication.id)
        return Promise.resolve(mockApplication);
      return Promise.resolve(null);
    }),
  };

  const mockAuditService = {
    appendInTransaction: jest.fn().mockResolvedValue({}),
  };

  const mockSlaQueueService = {
    enqueueTimerCheck: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (cb) => {
      const mockManager = {
        create: (entityClass: any, plain: any) => {
          return { id: `generated-${Date.now()}-${Math.random()}`, ...plain };
        },
        save: jest.fn().mockImplementation((entityClass: any, entity: any) => {
          if (entityClass === Undertaking || entity.startDate) {
            const idx = undertakingsStorage.findIndex(
              (u) => u.id === entity.id,
            );
            if (idx >= 0) {
              undertakingsStorage[idx] = {
                ...undertakingsStorage[idx],
                ...entity,
                updatedAt: new Date(),
              };
              return Promise.resolve(undertakingsStorage[idx]);
            }
            const saved = {
              id: entity.id || `u-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...entity,
            };
            undertakingsStorage.push(saved);
            return Promise.resolve(saved);
          }
          if (entityClass === UndertakingHistory || entity.undertakingId) {
            const saved = {
              id: `hist-${Date.now()}`,
              createdAt: new Date(),
              ...entity,
            };
            historyStorage.push(saved);
            return Promise.resolve(saved);
          }
          return Promise.resolve(entity);
        }),
        findOne: jest
          .fn()
          .mockImplementation((entityClass: any, options: any) => {
            const match = undertakingsStorage.find(
              (u) => u.id === options.where.id,
            );
            return Promise.resolve(match || null);
          }),
      };
      return cb(mockManager);
    }),
  };

  beforeEach(async () => {
    undertakingsStorage = [];
    historyStorage = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UndertakingsService,
        UndertakingsClockService,
        {
          provide: getRepositoryToken(Undertaking),
          useValue: mockUndertakingRepo,
        },
        {
          provide: getRepositoryToken(UndertakingHistory),
          useValue: mockHistoryRepo,
        },
        {
          provide: getRepositoryToken(Institution),
          useValue: mockInstitutionRepo,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
        { provide: SlaQueueService, useValue: mockSlaQueueService },
      ],
    }).compile();

    service = module.get<UndertakingsService>(UndertakingsService);
    clock = module.get<UndertakingsClockService>(UndertakingsClockService);
    clock.setDate('2024-06-01');
  });

  describe('createUndertaking', () => {
    const validDto: CreateUndertakingDto = {
      type: UndertakingType.LAND_LEASE,
      title: '30-Year Registered Land Lease',
      description: 'Survey No. 452/1 comprising 7.5 contiguous acres',
      documentNumber: 'DEED-2024-001',
      issuingAuthority: 'Sub-Registrar Haveli',
      counterpartyName: 'MIDC',
      startDate: '2024-01-15',
      expiryDate: '2054-01-14',
      renewalLeadDays: 180,
    };

    it('creates undertaking in DRAFT status with default renewalDueDate', async () => {
      const result = await service.createUndertaking(validDto, mockApplicant);

      expect(result.id).toBeDefined();
      expect(result.status).toBe(UndertakingStatus.DRAFT);
      expect(result.reviewStatus).toBe(UndertakingReviewStatus.PENDING_REVIEW);
      expect(result.institutionId).toBe(mockApplicant.institutionId);
      expect(result.renewalDueDate).toBe('2053-07-18'); // 2054-01-14 minus 180 days
      expect(result.disclaimer).toContain('Illustrative demonstration');
      expect(historyStorage.length).toBe(1);
      expect(historyStorage[0].action).toBe('CREATED');
    });

    it('rejects cross-tenant institution ID manipulation by applicant user', async () => {
      await expect(
        service.createUndertaking(
          { ...validDto, institutionId: 'foreign-inst-uuid' },
          mockApplicant,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects invalid date range where expiry is before start date', async () => {
      await expect(
        service.createUndertaking(
          { ...validDto, startDate: '2025-01-01', expiryDate: '2024-01-01' },
          mockApplicant,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('appends audit log when applicationId is provided', async () => {
      await service.createUndertaking(
        { ...validDto, applicationId: mockApplication.id },
        mockApplicant,
      );

      expect(mockAuditService.appendInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          applicationId: mockApplication.id,
          eventType: 'UNDERTAKING_RECORD_CREATED',
        }),
      );
    });
  });

  describe('submitUndertaking', () => {
    it('transitions DRAFT to SUBMITTED state', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.FIRE_SAFETY_CLEARANCE,
          title: 'Fire Safety Certificate',
          startDate: '2024-01-01',
          expiryDate: '2025-01-01',
        },
        mockApplicant,
      );

      const submitted = await service.submitUndertaking(
        created.id,
        mockApplicant,
      );
      expect(submitted.status).toBe(UndertakingStatus.SUBMITTED);
      expect(submitted.reviewStatus).toBe(
        UndertakingReviewStatus.PENDING_REVIEW,
      );
    });

    it('rejects submitting a non-DRAFT undertaking', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.FIRE_SAFETY_CLEARANCE,
          title: 'Fire Safety Certificate',
          startDate: '2024-01-01',
          expiryDate: '2025-01-01',
        },
        mockApplicant,
      );
      await service.submitUndertaking(created.id, mockApplicant);

      // Attempt to submit again
      await expect(
        service.submitUndertaking(created.id, mockApplicant),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewUndertaking', () => {
    it('allows regulatory review officer to verify undertaking and activate it', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.AFFIDAVIT_UNDERTAKING,
          title: 'Anti-Ragging Undertaking',
          startDate: '2024-01-01',
          expiryDate: '2025-01-01',
        },
        mockApplicant,
      );
      await service.submitUndertaking(created.id, mockApplicant);

      const reviewDto: ReviewUndertakingDto = {
        reviewStatus: UndertakingReviewStatus.VERIFIED,
        reviewNotes:
          'Document notary seal and stamps verified per statutory norms.',
      };

      const reviewed = await service.reviewUndertaking(
        created.id,
        reviewDto,
        mockOfficer,
      );

      expect(reviewed.reviewStatus).toBe(UndertakingReviewStatus.VERIFIED);
      expect(reviewed.status).toBe(UndertakingStatus.ACTIVE);
      expect(reviewed.reviewedById).toBe(mockOfficer.id);
      expect(reviewed.reviewNotes).toBe(reviewDto.reviewNotes);
    });

    it('rejects review attempts by institution users with HTTP 403 Forbidden', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.AFFIDAVIT_UNDERTAKING,
          title: 'Anti-Ragging Undertaking',
          startDate: '2024-01-01',
          expiryDate: '2025-01-01',
        },
        mockApplicant,
      );

      await expect(
        service.reviewUndertaking(
          created.id,
          {
            reviewStatus: UndertakingReviewStatus.VERIFIED,
            reviewNotes: 'Attempted self-review',
          },
          mockApplicant,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('renewUndertaking', () => {
    it('supersedes existing active undertaking and creates renewal record', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.FIRE_SAFETY_CLEARANCE,
          title: 'Annual Fire NOC',
          startDate: '2023-01-01',
          expiryDate: '2024-01-01',
        },
        mockApplicant,
      );
      await service.submitUndertaking(created.id, mockApplicant);
      await service.reviewUndertaking(
        created.id,
        {
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Verified original NOC',
        },
        mockOfficer,
      );

      const renewed = await service.renewUndertaking(
        created.id,
        {
          startDate: '2024-01-02',
          expiryDate: '2025-01-01',
          documentNumber: 'FIRE-NOC-2024-RENEWED',
          renewalNotes: 'Extended for year 2024-2025',
        },
        mockApplicant,
      );

      expect(renewed.id).toBeDefined();
      expect(renewed.supersedesId).toBe(created.id);
      expect(renewed.documentNumber).toBe('FIRE-NOC-2024-RENEWED');

      // Verify old record is superseded
      const old = undertakingsStorage.find((u) => u.id === created.id);
      expect(old?.status).toBe(UndertakingStatus.SUPERSEDED);
      expect(old?.supersededById).toBe(renewed.id);
    });

    it('rejects renewing an already superseded undertaking', async () => {
      const created = await service.createUndertaking(
        {
          type: UndertakingType.FIRE_SAFETY_CLEARANCE,
          title: 'Annual Fire NOC',
          startDate: '2023-01-01',
          expiryDate: '2024-01-01',
        },
        mockApplicant,
      );
      await service.submitUndertaking(created.id, mockApplicant);

      await service.renewUndertaking(
        created.id,
        { startDate: '2024-01-02', expiryDate: '2025-01-01' },
        mockApplicant,
      );

      // Attempt second renewal on the same superseded record
      await expect(
        service.renewUndertaking(
          created.id,
          { startDate: '2025-01-02', expiryDate: '2026-01-01' },
          mockApplicant,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('anti-enumeration security', () => {
    it('returns HTTP 404 when applicant requests an undertaking belonging to another institution', async () => {
      // Seed undertaking for another institution
      const foreignRecord: Undertaking = {
        id: 'foreign-undertaking-uuid',
        institutionId: 'other-inst-uuid',
        type: UndertakingType.LAND_LEASE,
        status: UndertakingStatus.ACTIVE,
        reviewStatus: UndertakingReviewStatus.VERIFIED,
        title: 'Foreign Lease',
        startDate: '2020-01-01',
        expiryDate: '2050-01-01',
        renewalDueDate: '2049-07-01',
        renewalLeadDays: 180,
        metadataJsonb: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [],
      } as any;
      undertakingsStorage.push(foreignRecord);

      await expect(
        service.getUndertakingById(foreignRecord.id, mockApplicant),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reconcileUndertakings', () => {
    it('evaluates status and transitions expired records', async () => {
      // Set clock to 2024-01-01 when record is active and not yet expired
      clock.setDate('2024-01-01');

      const expiredRecord = await service.createUndertaking(
        {
          type: UndertakingType.AFFIDAVIT_UNDERTAKING,
          title: 'Expiring Affidavit',
          startDate: '2023-05-01',
          expiryDate: '2024-05-01',
        },
        mockApplicant,
      );
      await service.submitUndertaking(expiredRecord.id, mockApplicant);
      await service.reviewUndertaking(
        expiredRecord.id,
        {
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Verified originally',
        },
        mockOfficer,
      );

      const reconcileResult = await service.reconcileUndertakings(
        '2024-06-01',
        mockOfficer,
      );

      expect(reconcileResult.scannedCount).toBeGreaterThan(0);
      expect(reconcileResult.expiredCount).toBeGreaterThanOrEqual(1);
      expect(reconcileResult.transitionedIds).toContain(expiredRecord.id);

      const updated = undertakingsStorage.find(
        (u) => u.id === expiredRecord.id,
      );
      expect(updated?.status).toBe(UndertakingStatus.EXPIRED);
    });
  });
});
