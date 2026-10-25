/**
 * ApprovalSync — Dossier Orchestrator Service Unit Tests
 * Milestone: DOC-07
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { UserRole, DocumentProcessingStatus } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { OverallValidationStatus } from '../enums';
import { DATE_PROVIDER_TOKEN } from '../interfaces/date-provider.interface';
import { ValidationOrchestratorService } from './validation-orchestrator.service';
import { ComplianceService } from '../../compliance/services/compliance.service';
import { IssuerVerificationService } from '../../providers/services/issuer-verification.service';
import {
  DossierOrchestratorService,
  DOSSIER_REPORT_DISCLAIMER,
} from './dossier-orchestrator.service';

describe('DossierOrchestratorService', () => {
  let service: DossierOrchestratorService;
  let applicationRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let institutionRepo: {
    findOne: jest.Mock;
  };
  let documentRepo: {
    find: jest.Mock;
  };
  let validationOrchestrator: {
    validateApplicationDocuments: jest.Mock;
  };
  let complianceService: {
    evaluateCompliance: jest.Mock;
  };
  let issuerVerificationService: {
    verifyDocumentIssuer: jest.Mock;
  };

  const fixedDate = new Date('2026-10-25T10:00:00.000Z');
  const mockDateProvider = {
    getNow: () => fixedDate,
  };

  const mockOfficerUser: AuthUserPrincipal = {
    id: 'user-officer-1',
    name: 'Scrutiny Officer',
    email: 'officer@aicte.gov.in',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const mockInstUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    name: 'Apex Principal',
    email: 'principal@apex.edu',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-uuid-1',
  };

  const mockInstitution: Partial<Institution> = {
    id: 'inst-uuid-1',
    name: 'Apex Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
  };

  const mockDocument: Partial<Document> = {
    id: 'doc-uuid-1',
    applicationId: 'app-uuid-1',
    documentType: 'LAND_TITLE_DEED',
    fileName: 'LandTitle.pdf',
    fileSizeBytes: 1048576,
    mimeType: 'application/pdf',
    fileHashSha256: 'a'.repeat(64),
    processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
    metadata: {
      ocrConfidence: 0.95,
      analysisReport: {
        ocrConfidence: 0.95,
        extractedFields: {
          landAreaAcres: 7.5,
          deedNumber: 'DEED-12345',
        },
      },
      issuerVerification: {
        status: 'VERIFIED',
        outcome: 'VERIFIED',
        sourceId: 'SIMULATED_ISSUER_ADAPTER',
        sourceName: 'Simulated DigiLocker & State Registry Sandbox',
        isSimulated: true,
        verifiedAt: '2026-10-25T09:00:00.000Z',
        matchedFields: ['deedNumber'],
        discrepantFields: [],
        comparisonSummary: 'All statutory registry fields match',
      },
    },
  };

  const mockApplication: Partial<Application> = {
    id: 'app-uuid-1',
    applicationNumber: 'AICTE-2026-0001',
    institutionId: 'inst-uuid-1',
    programType: 'ENGINEERING_UNDERGRADUATE',
    academicYear: '2026-2027',
    institution: mockInstitution as Institution,
    documents: [mockDocument as Document],
    payloadJsonb: {},
  };

  const mockValidationResult = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'AICTE-2026-0001',
    institutionId: 'inst-uuid-1',
    programType: 'ENGINEERING_UNDERGRADUATE',
    overallStatus: OverallValidationStatus.COMPLIANT,
    summary: {
      totalRulesEvaluated: 10,
      totalCompliant: 10,
      totalDeficiencies: 0,
      totalAdvisories: 0,
      totalSourceUnavailable: 0,
    },
    findings: [],
    evaluatedAt: fixedDate.toISOString(),
    ruleVersion: '1.0.0',
  };

  const mockComplianceResult = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'AICTE-2026-0001',
    institutionId: 'inst-uuid-1',
    programType: 'ENGINEERING_UNDERGRADUATE',
    academicYear: '2026-2027',
    evaluatedAt: fixedDate.toISOString(),
    isAdvisory: true,
    ruleSetCode: 'AICTE-APH-2026',
    ruleSetName: 'AICTE Handbook 2026',
    ruleVersionNumber: '1.0.0',
    summary: {
      totalRulesEvaluated: 12,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 0,
      compliantCount: 12,
      inspectionRecommendedCount: 0,
      hasCriticalDeficiency: false,
      requiresPhysicalInspection: false,
    },
    findings: [],
    infrastructureReview: {
      landCompliant: true,
      builtUpAreaCompliant: true,
      barrierFreeDeclared: true,
      fireSafetyValid: true,
      evcInspectionRecommended: false,
      inspectionTriggerReasons: [],
      heuristicLimitations: [],
    },
  };

  beforeEach(async () => {
    applicationRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(JSON.parse(JSON.stringify(mockApplication))),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };
    institutionRepo = {
      findOne: jest.fn().mockResolvedValue(mockInstitution),
    };
    documentRepo = {
      find: jest.fn().mockResolvedValue([mockDocument]),
    };
    validationOrchestrator = {
      validateApplicationDocuments: jest
        .fn()
        .mockResolvedValue(mockValidationResult),
    };
    complianceService = {
      evaluateCompliance: jest.fn().mockResolvedValue(mockComplianceResult),
    };
    issuerVerificationService = {
      verifyDocumentIssuer: jest.fn().mockResolvedValue({
        status: 'VERIFIED',
        outcome: 'VERIFIED',
        isSimulated: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossierOrchestratorService,
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
          provide: ValidationOrchestratorService,
          useValue: validationOrchestrator,
        },
        {
          provide: ComplianceService,
          useValue: complianceService,
        },
        {
          provide: IssuerVerificationService,
          useValue: issuerVerificationService,
        },
        {
          provide: DATE_PROVIDER_TOKEN,
          useValue: mockDateProvider,
        },
      ],
    }).compile();

    service = module.get<DossierOrchestratorService>(
      DossierOrchestratorService,
    );
  });

  describe('evaluateDossier', () => {
    it('should orchestrate validation, compliance, and issuer verification into a compliant dossier report', async () => {
      const result = await service.evaluateDossier(
        'app-uuid-1',
        mockOfficerUser,
      );

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('app-uuid-1');
      expect(result.applicationNumber).toBe('AICTE-2026-0001');
      expect(result.institutionId).toBe('inst-uuid-1');
      expect(result.overallStatus).toBe(OverallValidationStatus.COMPLIANT);
      expect(result.isAdvisory).toBe(true);
      expect(result.disclaimer).toBe(DOSSIER_REPORT_DISCLAIMER);
      expect(result.documentMatrix).toHaveLength(1);
      expect(result.documentMatrix[0].documentType).toBe('LAND_TITLE_DEED');
      expect(result.documentMatrix[0].issuerStatus).toBe('SIMULATED');
      expect(result.summary.criticalDeficienciesCount).toBe(0);
      expect(result.summary.hasCriticalDeficiency).toBe(false);

      expect(
        validationOrchestrator.validateApplicationDocuments,
      ).toHaveBeenCalled();
      expect(complianceService.evaluateCompliance).toHaveBeenCalled();
      expect(applicationRepo.save).toHaveBeenCalled();
    });

    it('should aggregate critical deficiencies and mark overallStatus as DEFICIENT', async () => {
      complianceService.evaluateCompliance.mockResolvedValueOnce({
        ...mockComplianceResult,
        summary: {
          ...mockComplianceResult.summary,
          criticalDeficienciesCount: 1,
          hasCriticalDeficiency: true,
        },
        findings: [
          {
            ruleCode: 'RULE-LAND-DEFICIT',
            ruleDescription: 'Land shortfall',
            severity: 'CRITICAL_DEFICIENCY',
            message: 'Land is below minimum',
            requiresPhysicalInspection: true,
          },
        ],
      });

      const result = await service.evaluateDossier(
        'app-uuid-1',
        mockOfficerUser,
      );

      expect(result.overallStatus).toBe(OverallValidationStatus.DEFICIENT);
      expect(result.summary.criticalDeficienciesCount).toBe(1);
      expect(result.summary.hasCriticalDeficiency).toBe(true);
      expect(result.summary.requiresPhysicalInspection).toBe(true);
    });

    it('should throw NotFoundException if application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.evaluateDossier('non-existent', mockOfficerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if institution user does not own application', async () => {
      const otherInstUser: AuthUserPrincipal = {
        id: 'user-inst-2',
        name: 'Other Principal',
        email: 'principal@other.edu',
        role: UserRole.INSTITUTION_USER,
        institutionId: 'inst-uuid-other',
      };

      await expect(
        service.evaluateDossier('app-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow institution user to evaluate application for their own institution', async () => {
      const result = await service.evaluateDossier('app-uuid-1', mockInstUser);
      expect(result).toBeDefined();
      expect(result.applicationId).toBe('app-uuid-1');
    });
  });

  describe('getDossierReport', () => {
    it('should return cached report when available and recalculate is false', async () => {
      const cachedResult = {
        applicationId: 'app-uuid-1',
        overallStatus: OverallValidationStatus.COMPLIANT,
        evaluatedAt: '2026-10-25T08:00:00.000Z',
      };

      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockApplication,
        payloadJsonb: {
          dossierReport: {
            cachedResult,
          },
        },
      });

      const result = await service.getDossierReport(
        'app-uuid-1',
        mockOfficerUser,
        {
          recalculate: false,
        },
      );

      expect(result).toEqual(cachedResult);
      expect(
        validationOrchestrator.validateApplicationDocuments,
      ).not.toHaveBeenCalled();
    });

    it('should re-evaluate when recalculate is true even if cache exists', async () => {
      const cachedResult = {
        applicationId: 'app-uuid-1',
        overallStatus: OverallValidationStatus.COMPLIANT,
      };

      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockApplication,
        payloadJsonb: {
          dossierReport: {
            cachedResult,
          },
        },
      });

      const result = await service.getDossierReport(
        'app-uuid-1',
        mockOfficerUser,
        {
          recalculate: true,
        },
      );

      expect(result).toBeDefined();
      expect(
        validationOrchestrator.validateApplicationDocuments,
      ).toHaveBeenCalled();
    });
  });

  describe('getDossierSummary', () => {
    it('should return lightweight summary DTO', async () => {
      const summary = await service.getDossierSummary(
        'app-uuid-1',
        mockOfficerUser,
      );

      expect(summary).toBeDefined();
      expect(summary.applicationId).toBe('app-uuid-1');
      expect(summary.overallStatus).toBe(OverallValidationStatus.COMPLIANT);
      expect(summary.isAdvisory).toBe(true);
      expect(summary.summary).toBeDefined();
      expect((summary as any).findings).toBeUndefined();
      expect((summary as any).documentMatrix).toBeUndefined();
    });
  });
});
