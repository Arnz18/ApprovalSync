/**
 * ApprovalSync — Applications Controller Unit Tests
 * Milestone: BE-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: jest.Mocked<ApplicationsService>;

  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const appId1 = 'b0000000-0000-0000-0000-000000000001';

  const mockInstitution: Institution = {
    id: instId1,
    name: 'Apex Institute of Technology & Engineering',
    registrationNumber: 'DEMO-INST-2026-001',
    institutionType: 'Engineering & Technology',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411001',
    address: 'Plot 42, Knowledge Park, Pune',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    users: [],
    applications: [],
  };

  const mockApp: Application = {
    id: appId1,
    applicationNumber: 'APP-2026-TEST001',
    institutionId: instId1,
    institution: mockInstitution,
    academicYear: '2026-2027',
    status: ApplicationStatus.DRAFT,
    programType: 'Undergraduate Engineering',
    payloadJsonb: { facultyCount: 48 },
    submittedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    documents: [],
    auditLogs: [],
    slaTimers: [],
  };

  const mockProjection = {
    id: appId1,
    applicationNumber: 'APP-2026-TEST001',
    institutionId: instId1,
    academicYear: '2026-2027',
    status: ApplicationStatus.DRAFT,
    programType: 'Undergraduate Engineering',
    payloadJsonb: { facultyCount: 48 },
    submittedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    institution: {
      id: instId1,
      name: 'Apex Institute of Technology & Engineering',
      registrationNumber: 'DEMO-INST-2026-001',
    },
  };

  const institutionUserPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'rep@synthetic.local',
    name: 'College Rep',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: {
            createApplication: jest.fn(),
            getApplications: jest.fn(),
            getApplicationByIdForUser: jest.fn(),
            updateDraftApplication: jest.fn(),
            submitDraftApplication: jest.fn(),
            getApplicationDocuments: jest.fn(),
            toProjection: jest.fn().mockReturnValue(mockProjection),
          },
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

    controller = module.get<ApplicationsController>(ApplicationsController);
    service = module.get(ApplicationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApplication', () => {
    it('creates draft application for institution user', async () => {
      service.createApplication.mockResolvedValue(mockApp);

      const result = await controller.createApplication(
        institutionUserPrincipal,
        {
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
          payloadJsonb: { facultyCount: 48 },
        },
      );

      expect(result).toEqual(mockProjection);
      expect(service.createApplication).toHaveBeenCalledWith(instId1, {
        academicYear: '2026-2027',
        programType: 'Undergraduate Engineering',
        payloadJsonb: { facultyCount: 48 },
      });
    });

    it('throws BadRequestException if user has no assigned institutionId', async () => {
      const userWithoutInst: AuthUserPrincipal = {
        ...institutionUserPrincipal,
        institutionId: null,
      };

      await expect(
        controller.createApplication(userWithoutInst, {
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getApplications', () => {
    it('returns paginated list of applications', async () => {
      service.getApplications.mockResolvedValue({
        items: [mockApp],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.getApplications(
        institutionUserPrincipal,
        { page: 1, limit: 20 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(service.getApplications).toHaveBeenCalledWith(
        institutionUserPrincipal,
        { page: 1, limit: 20 },
      );
    });
  });

  describe('getApplicationById', () => {
    it('returns application details by ID', async () => {
      service.getApplicationByIdForUser.mockResolvedValue(mockApp);

      const result = await controller.getApplicationById(
        appId1,
        institutionUserPrincipal,
      );

      expect(result).toEqual(mockProjection);
      expect(service.getApplicationByIdForUser).toHaveBeenCalledWith(
        appId1,
        institutionUserPrincipal,
      );
    });
  });

  describe('updateApplication', () => {
    it('updates editable draft application', async () => {
      service.updateDraftApplication.mockResolvedValue(mockApp);

      const result = await controller.updateApplication(
        appId1,
        institutionUserPrincipal,
        { programType: 'New Program' },
      );

      expect(result).toEqual(mockProjection);
      expect(service.updateDraftApplication).toHaveBeenCalledWith(
        appId1,
        institutionUserPrincipal,
        { programType: 'New Program' },
      );
    });
  });

  describe('submitApplication', () => {
    it('submits draft application', async () => {
      const submittedApp: Application = {
        ...mockApp,
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date('2026-10-02T10:00:00.000Z'),
      };
      service.submitDraftApplication.mockResolvedValue(submittedApp);

      const result = await controller.submitApplication(
        appId1,
        institutionUserPrincipal,
      );

      expect(result).toEqual(mockProjection);
      expect(service.submitDraftApplication).toHaveBeenCalledWith(
        appId1,
        institutionUserPrincipal,
      );
    });
  });

  describe('getApplicationDocuments', () => {
    it('retrieves document metadata for an application', async () => {
      const mockDocs = [
        {
          id: 'd0000000-0000-0000-0000-000000000001',
          applicationId: appId1,
          documentType: 'LAND_DOCUMENT',
          fileName: 'deed.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1048576,
          sha256Checksum: 'hash-abc',
          processingStatus: 'UPLOADED' as any,
          uploadedAt: '2026-10-01T00:00:00.000Z',
        },
      ];
      service.getApplicationDocuments.mockResolvedValue(mockDocs);

      const result = await controller.getApplicationDocuments(
        appId1,
        institutionUserPrincipal,
      );

      expect(result).toEqual(mockDocs);
      expect(service.getApplicationDocuments).toHaveBeenCalledWith(
        appId1,
        institutionUserPrincipal,
      );
    });
  });
});
