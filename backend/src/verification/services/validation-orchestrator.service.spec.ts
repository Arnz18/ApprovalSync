/**
 * ApprovalSync — Validation Orchestrator Service Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ValidationOrchestratorService } from './validation-orchestrator.service';
import { DocumentCompletenessService } from './document-completeness.service';
import { FieldCompletenessService } from './field-completeness.service';
import { DocumentExpiryService } from './document-expiry.service';
import { CrossRecordConsistencyService } from './cross-record-consistency.service';
import { DocumentDuplicateDetectionService } from './document-duplicate-detection.service';
import { DocumentIntegrityService } from './document-integrity.service';
import { DateProviderService } from './date-provider.service';
import { DATE_PROVIDER_TOKEN } from '../interfaces/date-provider.interface';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { UserRole, ComplianceSeverity } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import {
  ValidationOutcome,
  ValidationCategory,
  OverallValidationStatus,
} from '../enums';

describe('ValidationOrchestratorService', () => {
  let service: ValidationOrchestratorService;
  let applicationRepo: { findOne: jest.Mock; save: jest.Mock };
  let institutionRepo: { findOne: jest.Mock };
  let documentRepo: { find: jest.Mock };

  let mockCompletenessService: { evaluateCompleteness: jest.Mock };
  let mockFieldService: { evaluateFields: jest.Mock };
  let mockExpiryService: { evaluateExpiry: jest.Mock };
  let mockConsistencyService: { evaluateConsistency: jest.Mock };

  const institutionUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    name: 'Apex Applicant',
    email: 'applicant@apex.edu',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const otherInstitutionUser: AuthUserPrincipal = {
    id: 'user-other',
    name: 'Poly Applicant',
    email: 'other@poly.edu',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-2', // Different institution
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'officer-1',
    name: 'Dr. Officer',
    email: 'officer@aicte.gov.in',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const mockApp: Application = {
    id: 'app-uuid-1',
    applicationNumber: 'APP-2026-0001',
    institutionId: 'inst-1',
    programType: 'Undergraduate Engineering',
    academicYear: '2026-2027',
    payloadJsonb: {},
    institution: {
      id: 'inst-1',
      name: 'Apex Institute',
      registrationNumber: 'DEMO-INST-2026-001',
    } as Institution,
    documents: [],
  } as unknown as Application;

  beforeEach(async () => {
    applicationRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };
    institutionRepo = {
      findOne: jest.fn(),
    };
    documentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockCompletenessService = {
      evaluateCompleteness: jest.fn().mockReturnValue([]),
    };
    mockFieldService = {
      evaluateFields: jest.fn().mockReturnValue([]),
    };
    mockExpiryService = {
      evaluateExpiry: jest.fn().mockReturnValue([]),
    };
    mockConsistencyService = {
      evaluateConsistency: jest.fn().mockReturnValue([]),
    };
    const mockDuplicateService = {
      evaluateDuplicates: jest.fn().mockResolvedValue({
        applicationId: 'app-uuid-1',
        totalDocumentsEvaluated: 0,
        exactDuplicatesCount: 0,
        nearDuplicatesCount: 0,
        findings: [],
        evaluatedAt: new Date().toISOString(),
      }),
    };
    const mockIntegrityService = {
      evaluateApplicationIntegrity: jest.fn().mockResolvedValue([]),
      evaluateDocumentIntegrity: jest.fn().mockResolvedValue({
        documentId: 'doc-uuid-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        overallStatus: 'PASS',
        findings: [],
        evaluatedAt: new Date().toISOString(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationOrchestratorService,
        {
          provide: getRepositoryToken(Application),
          useValue: applicationRepo,
        },
        {
          provide: getRepositoryToken(Institution),
          useValue: institutionRepo,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepo,
        },
        {
          provide: DocumentCompletenessService,
          useValue: mockCompletenessService,
        },
        {
          provide: FieldCompletenessService,
          useValue: mockFieldService,
        },
        {
          provide: DocumentExpiryService,
          useValue: mockExpiryService,
        },
        {
          provide: CrossRecordConsistencyService,
          useValue: mockConsistencyService,
        },
        {
          provide: DocumentDuplicateDetectionService,
          useValue: mockDuplicateService,
        },
        {
          provide: DocumentIntegrityService,
          useValue: mockIntegrityService,
        },
        {
          provide: DATE_PROVIDER_TOKEN,
          useValue: new DateProviderService(),
        },
      ],
    }).compile();

    service = module.get<ValidationOrchestratorService>(
      ValidationOrchestratorService,
    );
  });

  describe('findAndAuthorizeApplication', () => {
    it('should throw NotFoundException if application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findAndAuthorizeApplication('non-existent-id', institutionUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation and block institution users from accessing other applications', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);

      await expect(
        service.findAndAuthorizeApplication(mockApp.id, otherInstitutionUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow scrutiny officers and authorized users across tenant boundaries', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);

      const result = await service.findAndAuthorizeApplication(
        mockApp.id,
        scrutinyOfficer,
      );
      expect(result.application.id).toBe(mockApp.id);
    });
  });

  describe('validateApplicationDocuments', () => {
    it('should orchestrate all sub-services and return DEFICIENT when critical deficiencies exist', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);

      mockCompletenessService.evaluateCompleteness.mockReturnValue([
        {
          ruleId: 'DOC-COMP-MISSING-FIRE_SAFETY_CERTIFICATE',
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.DEFICIENT,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: 'Fire Safety Certificate missing',
          isAdvisory: true,
        },
      ]);

      const result = await service.validateApplicationDocuments(
        mockApp.id,
        institutionUser,
      );

      expect(result.applicationId).toBe(mockApp.id);
      expect(result.overallStatus).toBe(OverallValidationStatus.DEFICIENT);
      expect(result.summary.totalDeficiencies).toBe(1);
      expect(result.summary.totalRulesEvaluated).toBe(1);
      expect(applicationRepo.save).toHaveBeenCalled();
    });

    it('should return REQUIRES_REVIEW when only advisory flags are detected', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);

      mockExpiryService.evaluateExpiry.mockReturnValue([
        {
          ruleId: 'DOC-EXP-FIRE-NOC-EXPIRING-SOON',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.EXPIRING_SOON,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: 'Certificate expiring in 30 days',
          isAdvisory: true,
        },
      ]);

      const result = await service.validateApplicationDocuments(
        mockApp.id,
        institutionUser,
      );

      expect(result.overallStatus).toBe(
        OverallValidationStatus.REQUIRES_REVIEW,
      );
      expect(result.summary.totalDeficiencies).toBe(0);
      expect(result.summary.totalAdvisories).toBe(1);
    });

    it('should return COMPLIANT when all checks pass without deficiency or advisory flags', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);

      mockCompletenessService.evaluateCompleteness.mockReturnValue([
        {
          ruleId: 'DOC-COMP-SATISFIED-LAND_TITLE_DEED',
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.VALID,
          severity: ComplianceSeverity.COMPLIANT,
          message: 'Title deed uploaded and verified',
          isAdvisory: true,
        },
      ]);

      const result = await service.validateApplicationDocuments(
        mockApp.id,
        institutionUser,
      );

      expect(result.overallStatus).toBe(OverallValidationStatus.COMPLIANT);
      expect(result.summary.totalCompliant).toBe(1);
      expect(result.summary.totalDeficiencies).toBe(0);
      expect(result.summary.totalAdvisories).toBe(0);
    });
  });

  describe('getValidationReport', () => {
    it('should return cached result if present and recalculate is false', async () => {
      const cachedResult = {
        applicationId: mockApp.id,
        applicationNumber: mockApp.applicationNumber,
        overallStatus: OverallValidationStatus.COMPLIANT,
        findings: [],
      };

      const appWithCache = {
        ...mockApp,
        payloadJsonb: {
          documentValidation: {
            cachedResult,
          },
        },
      };

      applicationRepo.findOne.mockResolvedValue(appWithCache);

      const result = await service.getValidationReport(
        mockApp.id,
        institutionUser,
        { recalculate: false },
      );

      expect(result).toEqual(cachedResult);
      expect(
        mockCompletenessService.evaluateCompleteness,
      ).not.toHaveBeenCalled();
    });

    it('should re-evaluate rules if recalculate is true', async () => {
      const cachedResult = {
        applicationId: mockApp.id,
        overallStatus: OverallValidationStatus.COMPLIANT,
      };

      const appWithCache = {
        ...mockApp,
        payloadJsonb: {
          documentValidation: {
            cachedResult,
          },
        },
      };

      applicationRepo.findOne.mockResolvedValue(appWithCache);

      await service.getValidationReport(mockApp.id, institutionUser, {
        recalculate: true,
      });

      expect(mockCompletenessService.evaluateCompleteness).toHaveBeenCalled();
    });
  });
});
