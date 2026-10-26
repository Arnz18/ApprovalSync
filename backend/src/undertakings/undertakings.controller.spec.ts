/**
 * ApprovalSync — Undertakings Controller Unit Tests
 * Milestone: BE-09
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UndertakingsController } from './undertakings.controller';
import { UndertakingsService } from './undertakings.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from './enums';
import {
  CreateUndertakingDto,
  UpdateUndertakingDto,
  ReviewUndertakingDto,
  RenewUndertakingDto,
  UndertakingResponseDto,
  UndertakingHistoryResponseDto,
  UndertakingReconcileResponseDto,
} from './dto';
import { ILLUSTRATIVE_UNDERTAKING_DISCLAIMER } from './utils/date-calculations';

describe('UndertakingsController', () => {
  let controller: UndertakingsController;
  let service: jest.Mocked<UndertakingsService>;

  const mockApplicant: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'principal@apex.edu',
    name: 'Dr. Principal',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'i0000000-0000-0000-0000-000000000001',
  };

  const mockOfficer: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'officer@aicte.gov.in',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const sampleUndertakingResponse: UndertakingResponseDto = {
    id: 'e0000000-0000-0000-0000-000000000001',
    institutionId: 'i0000000-0000-0000-0000-000000000001',
    applicationId: 'a0000000-0000-0000-0000-000000000001',
    type: UndertakingType.LAND_LEASE,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: '30-Year Registered Land Lease',
    description: 'Contiguous campus land parcel',
    documentNumber: 'LL-2024-999',
    issuingAuthority: 'Sub-Registrar',
    counterpartyName: 'State Industrial Dev Corp',
    startDate: '2024-01-01',
    expiryDate: '2054-01-01',
    renewalDueDate: '2053-07-05',
    renewalLeadDays: 180,
    daysRemaining: 10000,
    isExpiringSoon: false,
    isRenewalDue: false,
    isExpired: false,
    documentId: null,
    supersededById: null,
    supersedesId: null,
    reviewedById: 'u0000000-0000-0000-0000-000000000002',
    reviewedAt: new Date().toISOString(),
    reviewNotes: 'Verified compliant with land norms',
    metadataJsonb: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    disclaimer: ILLUSTRATIVE_UNDERTAKING_DISCLAIMER,
  };

  beforeEach(async () => {
    const mockService = {
      createUndertaking: jest.fn().mockResolvedValue(sampleUndertakingResponse),
      getUndertakings: jest.fn().mockResolvedValue({
        items: [sampleUndertakingResponse],
        pagination: {
          totalItems: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      getUndertakingById: jest
        .fn()
        .mockResolvedValue(sampleUndertakingResponse),
      updateUndertaking: jest.fn().mockResolvedValue(sampleUndertakingResponse),
      submitUndertaking: jest.fn().mockResolvedValue({
        ...sampleUndertakingResponse,
        status: UndertakingStatus.SUBMITTED,
      }),
      reviewUndertaking: jest.fn().mockResolvedValue(sampleUndertakingResponse),
      renewUndertaking: jest.fn().mockResolvedValue({
        ...sampleUndertakingResponse,
        id: 'e0000000-0000-0000-0000-000000000002',
        supersedesId: 'e0000000-0000-0000-0000-000000000001',
      }),
      getUndertakingHistory: jest.fn().mockResolvedValue([
        {
          id: 'h0000000-0000-0000-0000-000000000001',
          undertakingId: 'e0000000-0000-0000-0000-000000000001',
          action: 'CREATED',
          fromStatus: null,
          toStatus: UndertakingStatus.DRAFT,
          fromReviewStatus: null,
          toReviewStatus: UndertakingReviewStatus.PENDING_REVIEW,
          actorId: mockApplicant.id,
          actorRole: mockApplicant.role,
          actorEmail: mockApplicant.email,
          changeReason: 'Initial creation',
          snapshotJsonb: {},
          createdAt: new Date().toISOString(),
        } as UndertakingHistoryResponseDto,
      ]),
      reconcileUndertakings: jest.fn().mockResolvedValue({
        evaluationDate: '2024-06-01',
        scannedCount: 10,
        activeCount: 7,
        expiringSoonCount: 1,
        renewalDueCount: 1,
        expiredCount: 1,
        transitionedCount: 1,
        transitionedIds: ['e0000000-0000-0000-0000-000000000001'],
        disclaimer: ILLUSTRATIVE_UNDERTAKING_DISCLAIMER,
      } as UndertakingReconcileResponseDto),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UndertakingsController],
      providers: [
        {
          provide: UndertakingsService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<UndertakingsController>(UndertakingsController);
    service = module.get(UndertakingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUndertaking', () => {
    it('delegates to service.createUndertaking with currentUser', async () => {
      const dto: CreateUndertakingDto = {
        type: UndertakingType.LAND_LEASE,
        title: '30-Year Registered Land Lease',
        startDate: '2024-01-01',
        expiryDate: '2054-01-01',
      };

      const result = await controller.createUndertaking(dto, mockApplicant);
      expect(service.createUndertaking).toHaveBeenCalledWith(
        dto,
        mockApplicant,
      );
      expect(result).toEqual(sampleUndertakingResponse);
    });
  });

  describe('getUndertakings', () => {
    it('delegates to service.getUndertakings with query filters and currentUser', async () => {
      const query = { page: 1, limit: 10, status: UndertakingStatus.ACTIVE };
      const result = await controller.getUndertakings(query, mockApplicant);
      expect(service.getUndertakings).toHaveBeenCalledWith(
        query,
        mockApplicant,
      );
      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('getApplicationUndertakings', () => {
    it('injects applicationId into query and delegates to service', async () => {
      const appId = 'a0000000-0000-0000-0000-000000000001';
      const query = { page: 1, limit: 10 };
      await controller.getApplicationUndertakings(appId, query, mockApplicant);
      expect(service.getUndertakings).toHaveBeenCalledWith(
        { ...query, applicationId: appId },
        mockApplicant,
      );
    });
  });

  describe('getUndertakingById', () => {
    it('delegates to service.getUndertakingById with id, user, and asOfDate', async () => {
      const id = sampleUndertakingResponse.id;
      const result = await controller.getUndertakingById(
        id,
        '2024-06-01',
        mockApplicant,
      );
      expect(service.getUndertakingById).toHaveBeenCalledWith(
        id,
        mockApplicant,
        '2024-06-01',
      );
      expect(result.id).toBe(id);
    });
  });

  describe('updateUndertaking', () => {
    it('delegates to service.updateUndertaking', async () => {
      const id = sampleUndertakingResponse.id;
      const dto: UpdateUndertakingDto = {
        title: 'Updated Lease Title',
      };
      const result = await controller.updateUndertaking(id, dto, mockApplicant);
      expect(service.updateUndertaking).toHaveBeenCalledWith(
        id,
        dto,
        mockApplicant,
      );
      expect(result).toBeDefined();
    });
  });

  describe('submitUndertaking', () => {
    it('delegates to service.submitUndertaking', async () => {
      const id = sampleUndertakingResponse.id;
      const result = await controller.submitUndertaking(id, mockApplicant);
      expect(service.submitUndertaking).toHaveBeenCalledWith(id, mockApplicant);
      expect(result.status).toBe(UndertakingStatus.SUBMITTED);
    });
  });

  describe('reviewUndertaking', () => {
    it('delegates to service.reviewUndertaking with regulatory officer', async () => {
      const id = sampleUndertakingResponse.id;
      const dto: ReviewUndertakingDto = {
        reviewStatus: UndertakingReviewStatus.VERIFIED,
        reviewNotes: 'Verified compliant with land norms',
      };
      const result = await controller.reviewUndertaking(id, dto, mockOfficer);
      expect(service.reviewUndertaking).toHaveBeenCalledWith(
        id,
        dto,
        mockOfficer,
      );
      expect(result).toEqual(sampleUndertakingResponse);
    });
  });

  describe('renewUndertaking', () => {
    it('delegates to service.renewUndertaking', async () => {
      const id = sampleUndertakingResponse.id;
      const dto: RenewUndertakingDto = {
        startDate: '2054-01-02',
        expiryDate: '2084-01-01',
        documentNumber: 'DEED-RENEW-2054',
      };
      const result = await controller.renewUndertaking(id, dto, mockApplicant);
      expect(service.renewUndertaking).toHaveBeenCalledWith(
        id,
        dto,
        mockApplicant,
      );
      expect(result.supersedesId).toBe(id);
    });
  });

  describe('getUndertakingHistory', () => {
    it('delegates to service.getUndertakingHistory', async () => {
      const id = sampleUndertakingResponse.id;
      const result = await controller.getUndertakingHistory(id, mockApplicant);
      expect(service.getUndertakingHistory).toHaveBeenCalledWith(
        id,
        mockApplicant,
      );
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CREATED');
    });
  });

  describe('reconcileUndertakings', () => {
    it('delegates to service.reconcileUndertakings', async () => {
      const result = await controller.reconcileUndertakings(
        '2024-06-01',
        mockOfficer,
      );
      expect(service.reconcileUndertakings).toHaveBeenCalledWith(
        '2024-06-01',
        mockOfficer,
      );
      expect(result.scannedCount).toBe(10);
      expect(result.transitionedCount).toBe(1);
    });
  });
});
