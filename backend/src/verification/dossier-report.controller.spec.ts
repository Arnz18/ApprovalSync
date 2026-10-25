/**
 * ApprovalSync — Dossier Report Controller Unit Tests
 * Milestone: DOC-07
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DossierReportController } from './dossier-report.controller';
import { DossierOrchestratorService } from './services/dossier-orchestrator.service';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { OverallValidationStatus } from './enums';
import { DossierReportDto, DossierSummaryDto } from './dto';

describe('DossierReportController', () => {
  let controller: DossierReportController;
  let orchestratorService: {
    evaluateDossier: jest.Mock;
    getDossierReport: jest.Mock;
    getDossierSummary: jest.Mock;
  };

  const mockUser: AuthUserPrincipal = {
    id: 'user-officer-1',
    name: 'Scrutiny Officer',
    email: 'officer@aicte.gov.in',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const mockReport: DossierReportDto = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'AICTE-2026-ENGG-0042',
    institutionId: 'inst-1',
    institutionName: 'Apex Institute of Technology',
    programType: 'Undergraduate Engineering',
    academicYear: '2026-2027',
    overallStatus: OverallValidationStatus.COMPLIANT,
    evaluatedAt: '2026-10-25T10:00:00.000Z',
    isAdvisory: true,
    summary: {
      totalDocuments: 3,
      totalRulesEvaluated: 15,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 0,
      compliantCount: 15,
      hasCriticalDeficiency: false,
      duplicateMatchCount: 0,
      integrityAnomalyCount: 0,
      issuerVerificationSummary: {
        totalEligible: 2,
        verifiedCount: 2,
        discrepancyCount: 0,
        simulatedCount: 2,
        pendingCount: 0,
      },
      infrastructureReviewSummary: {
        landCompliant: true,
        builtUpAreaCompliant: true,
        barrierFreeDeclared: true,
        fireSafetyValid: true,
        evcInspectionRecommended: false,
        inspectionTriggerReasons: [],
        heuristicLimitations: [],
      },
      requiresPhysicalInspection: false,
    },
    documentMatrix: [],
    findings: [],
    disclaimer: 'Advisory only',
  };

  const mockSummary: DossierSummaryDto = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'AICTE-2026-ENGG-0042',
    institutionId: 'inst-1',
    institutionName: 'Apex Institute of Technology',
    programType: 'Undergraduate Engineering',
    academicYear: '2026-2027',
    overallStatus: OverallValidationStatus.COMPLIANT,
    evaluatedAt: '2026-10-25T10:00:00.000Z',
    isAdvisory: true,
    summary: mockReport.summary,
  };

  beforeEach(async () => {
    orchestratorService = {
      evaluateDossier: jest.fn().mockResolvedValue(mockReport),
      getDossierReport: jest.fn().mockResolvedValue(mockReport),
      getDossierSummary: jest.fn().mockResolvedValue(mockSummary),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossierReportController],
      providers: [
        {
          provide: DossierOrchestratorService,
          useValue: orchestratorService,
        },
      ],
    }).compile();

    controller = module.get<DossierReportController>(DossierReportController);
  });

  describe('evaluateDossier', () => {
    it('should invoke evaluateDossier with id, user, and query options', async () => {
      const result = await controller.evaluateDossier('app-uuid-1', mockUser, {
        recalculate: true,
      });

      expect(orchestratorService.evaluateDossier).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        { recalculate: true },
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('evaluateDossierAction', () => {
    it('should invoke evaluateDossier for the explicit evaluate action route', async () => {
      const result = await controller.evaluateDossierAction(
        'app-uuid-1',
        mockUser,
        { recalculate: true },
      );

      expect(orchestratorService.evaluateDossier).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        { recalculate: true },
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('getDossierReport', () => {
    it('should invoke getDossierReport with id, user, and query options', async () => {
      const result = await controller.getDossierReport('app-uuid-1', mockUser, {
        recalculate: false,
      });

      expect(orchestratorService.getDossierReport).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        { recalculate: false },
      );
      expect(result).toEqual(mockReport);
    });
  });

  describe('getDossierSummary', () => {
    it('should invoke getDossierSummary with id, user, and query options', async () => {
      const result = await controller.getDossierSummary('app-uuid-1', mockUser);

      expect(orchestratorService.getDossierSummary).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        undefined,
      );
      expect(result).toEqual(mockSummary);
    });
  });
});
