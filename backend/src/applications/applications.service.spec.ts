/**
 * ApprovalSync — Applications Service Unit Tests
 * Milestone: BE-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { Document } from '../database/entities/document.entity';
import {
  ApplicationStatus,
  UserRole,
  DocumentProcessingStatus,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let institutionRepo: jest.Mocked<Repository<Institution>>;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let dataSource: jest.Mocked<DataSource>;

  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const instId2 = 'a0000000-0000-0000-0000-000000000002';
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

  const mockDraftApp: Application = {
    id: appId1,
    applicationNumber: 'APP-2026-TEST001',
    institutionId: instId1,
    institution: mockInstitution,
    academicYear: '2026-2027',
    status: ApplicationStatus.DRAFT,
    programType: 'Undergraduate Engineering',
    payloadJsonb: { facultyCount: 48, landAreaAcres: 12.5 },
    submittedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    documents: [],
    auditLogs: [],
    slaTimers: [],
  };

  const institutionUserPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'rep@synthetic.local',
    name: 'College Rep',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  const otherInstitutionUserPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'other.rep@synthetic.local',
    name: 'Other College Rep',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId2,
  };

  const scrutinyOfficerPrincipal: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000003',
    email: 'officer@synthetic.local',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
    regionalOffice: 'Western Regional Office',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Institution),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    institutionRepo = module.get(getRepositoryToken(Institution));
    documentRepo = module.get(getRepositoryToken(Document));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateApplicationNumber', () => {
    it('generates predictable prefix with entropy', () => {
      const appNum = service.generateApplicationNumber('2026-2027');
      expect(appNum).toMatch(/^APP-2026-[A-F0-9]{8}$/);
    });
  });

  describe('sanitizePayload', () => {
    it('strips reserved server keys from dynamic payload', () => {
      const dirty = {
        facultyCount: 50,
        status: 'APPROVED',
        institutionId: 'hacked-id',
        submittedAt: 'yesterday',
        validDetail: 'preserved',
        dossierReport: { status: 'CLEARED' },
        documentValidation: { status: 'PASSED' },
        __proto__: { isAdmin: true },
      };
      const clean = service.sanitizePayload(dirty);
      expect(clean).toEqual({
        facultyCount: 50,
        validDetail: 'preserved',
      });
      expect(clean.status).toBeUndefined();
      expect(clean.institutionId).toBeUndefined();
      expect(clean.dossierReport).toBeUndefined();
      expect(clean.documentValidation).toBeUndefined();
    });
  });

  describe('createApplication', () => {
    it('creates draft application with status DRAFT bound to institution', async () => {
      institutionRepo.findOne.mockResolvedValue(mockInstitution);
      applicationRepo.create.mockImplementation(
        (dto) =>
          ({
            ...dto,
            id: appId1,
            createdAt: new Date(),
            updatedAt: new Date(),
            documents: [],
            auditLogs: [],
            slaTimers: [],
          }) as unknown as Application,
      );
      applicationRepo.save.mockImplementation(
        async (app) => app as Application,
      );

      const result = await service.createApplication(instId1, {
        academicYear: '2026-2027',
        programType: 'Undergraduate Engineering',
        payloadJsonb: { facultyCount: 48 },
      });

      expect(result.status).toBe(ApplicationStatus.DRAFT);
      expect(result.institutionId).toBe(instId1);
      expect(result.applicationNumber).toMatch(/^APP-2026-[A-F0-9]{8}$/);
      expect(applicationRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when institution does not exist', async () => {
      institutionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createApplication('missing-inst', {
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getApplicationByIdForUser (Tenant Isolation)', () => {
    it('returns application when caller belongs to the same institution', async () => {
      applicationRepo.findOne.mockResolvedValue(mockDraftApp);

      const result = await service.getApplicationByIdForUser(
        appId1,
        institutionUserPrincipal,
      );
      expect(result).toEqual(mockDraftApp);
    });

    it('rejects access with 403 Forbidden when caller belongs to a different institution', async () => {
      applicationRepo.findOne.mockResolvedValue(mockDraftApp);

      await expect(
        service.getApplicationByIdForUser(
          appId1,
          otherInstitutionUserPrincipal,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects nonexistent application with 403 Forbidden for INSTITUTION_USER to prevent enumeration', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getApplicationByIdForUser(
          'missing-app-id',
          institutionUserPrincipal,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns application for scrutiny officer regardless of institution', async () => {
      applicationRepo.findOne.mockResolvedValue(mockDraftApp);

      const result = await service.getApplicationByIdForUser(
        appId1,
        scrutinyOfficerPrincipal,
      );
      expect(result).toEqual(mockDraftApp);
    });

    it('returns 404 NotFoundException for scrutiny officer when application is not found', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getApplicationByIdForUser(
          'missing-app-id',
          scrutinyOfficerPrincipal,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDraftApplication', () => {
    it('updates editable fields when application is in DRAFT status', async () => {
      const cloned = { ...mockDraftApp };
      applicationRepo.findOne.mockResolvedValue(cloned);
      applicationRepo.save.mockImplementation(
        async (app) => app as Application,
      );

      const result = await service.updateDraftApplication(
        appId1,
        institutionUserPrincipal,
        {
          programType: 'Postgraduate Engineering',
          payloadJsonb: { facultyCount: 60 },
        },
      );

      expect(result.programType).toBe('Postgraduate Engineering');
      expect(result.payloadJsonb).toEqual({
        facultyCount: 60,
        landAreaAcres: 12.5,
      });
      expect(applicationRepo.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when updating an application not in DRAFT status', async () => {
      const submittedApp: Application = {
        ...mockDraftApp,
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      };
      applicationRepo.findOne.mockResolvedValue(submittedApp);

      await expect(
        service.updateDraftApplication(appId1, institutionUserPrincipal, {
          programType: 'New Type',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitDraftApplication (Atomic Transaction)', () => {
    it('transitions status from DRAFT to SUBMITTED, sets submittedAt, and uses pessimistic_write lock', async () => {
      const cloned = { ...mockDraftApp };
      const findOneMock = jest.fn().mockImplementation((entity, opts) => {
        if (opts?.lock) {
          return Promise.resolve(cloned);
        }
        return Promise.resolve(mockInstitution);
      });
      const saveMock = jest.fn().mockImplementation(async (_cls, app) => app);

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: findOneMock,
            save: saveMock,
          };
          return cb(mockManager);
        },
      );

      const result = await service.submitDraftApplication(
        appId1,
        institutionUserPrincipal,
      );

      expect(result.status).toBe(ApplicationStatus.SUBMITTED);
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(findOneMock).toHaveBeenCalledWith(
        Application,
        expect.objectContaining({
          where: { id: appId1 },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('throws BadRequestException when submitting an application that is already SUBMITTED', async () => {
      const alreadySubmitted: Application = {
        ...mockDraftApp,
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(alreadySubmitted),
            save: jest.fn(),
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.submitDraftApplication(appId1, institutionUserPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when application is missing required program data', async () => {
      const invalidApp: Application = {
        ...mockDraftApp,
        programType: '',
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(invalidApp),
            save: jest.fn(),
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.submitDraftApplication(appId1, institutionUserPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when another institution attempts submission', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(mockDraftApp),
            save: jest.fn(),
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.submitDraftApplication(appId1, otherInstitutionUserPrincipal),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getApplicationDocuments', () => {
    it('retrieves sanitized document metadata and excludes internal storagePath', async () => {
      applicationRepo.findOne.mockResolvedValue(mockDraftApp);
      const mockDoc: Document = {
        id: 'd0000000-0000-0000-0000-000000000001',
        applicationId: appId1,
        application: mockDraftApp,
        documentType: 'LAND_DOCUMENT',
        fileName: 'land_deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1048576,
        storagePath: '/secure/backend/storage/secrets/land_deed.pdf',
        fileHashSha256: 'hash-abc-64-chars',
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: { pages: 4 },
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      };
      documentRepo.find.mockResolvedValue([mockDoc]);

      const docs = await service.getApplicationDocuments(
        appId1,
        institutionUserPrincipal,
      );

      expect(docs).toHaveLength(1);
      expect(docs[0].fileName).toBe('land_deed.pdf');
      expect(docs[0].fileSizeBytes).toBe(1048576);
      expect(typeof docs[0].fileSizeBytes).toBe('number');
      expect(docs[0].sha256Checksum).toBe('hash-abc-64-chars');
      expect(docs[0].uploadedAt).toBe('2026-10-01T00:00:00.000Z');
      expect((docs[0] as any).storagePath).toBeUndefined();
    });
  });

  describe('getApplications', () => {
    it('scopes query to institutionId for INSTITUTION_USER', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockDraftApp], 1]),
      };
      applicationRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getApplications(institutionUserPrincipal, {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'applications.institutionId = :instId',
        { instId: instId1 },
      );
    });

    it('returns empty set if INSTITUTION_USER has no institutionId', async () => {
      const userWithoutInst: AuthUserPrincipal = {
        ...institutionUserPrincipal,
        institutionId: null,
      };

      const result = await service.getApplications(userWithoutInst, {});
      expect(result.items).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(applicationRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rejects unsupported sortBy field with BadRequestException', async () => {
      await expect(
        service.getApplications(institutionUserPrincipal, {
          sortBy: 'maliciousColumn',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unsupported sortOrder with BadRequestException', async () => {
      await expect(
        service.getApplications(institutionUserPrincipal, {
          sortOrder: 'SIDEWAYS' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid page number (< 1) with BadRequestException', async () => {
      await expect(
        service.getApplications(institutionUserPrincipal, {
          page: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects limit exceeding maximum 100 with BadRequestException', async () => {
      await expect(
        service.getApplications(institutionUserPrincipal, {
          limit: 101,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
