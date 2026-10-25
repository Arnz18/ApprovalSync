/**
 * ApprovalSync — Compliance Controller Unit Tests
 * Milestone: DOC-06
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './services/compliance.service';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { ComplianceAssessmentResultDto } from './dto';

describe('ComplianceController', () => {
  let controller: ComplianceController;
  let complianceService: any;

  const mockUser: AuthUserPrincipal = {
    id: 'user-officer-1',
    name: 'Scrutiny Officer',
    email: 'officer@test.local',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const mockResult: ComplianceAssessmentResultDto = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'APP-2026-TEST-001',
    institutionId: 'inst-uuid-1',
    programType: 'Undergraduate Engineering',
    academicYear: '2026-2027',
    evaluatedAt: new Date().toISOString(),
    isAdvisory: true,
    ruleSetCode: 'RULESET-ENGG-UG',
    summary: {
      totalRulesEvaluated: 5,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 1,
      compliantCount: 4,
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
    disclaimer: 'Advisory only.',
  };

  beforeEach(async () => {
    complianceService = {
      evaluateCompliance: jest.fn().mockResolvedValue(mockResult),
      getApplicationCompliance: jest.fn().mockResolvedValue(mockResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceController],
      providers: [
        {
          provide: ComplianceService,
          useValue: complianceService,
        },
      ],
    }).compile();

    controller = module.get<ComplianceController>(ComplianceController);
  });

  it('evaluates compliance via POST endpoint', async () => {
    const result = await controller.evaluateCompliance('app-uuid-1', mockUser, {
      ruleSetCode: 'RULESET-ENGG-UG',
    });

    expect(result).toEqual(mockResult);
    expect(complianceService.evaluateCompliance).toHaveBeenCalledWith(
      'app-uuid-1',
      mockUser,
      { ruleSetCode: 'RULESET-ENGG-UG' },
    );
  });

  it('evaluates compliance via alias endpoint', async () => {
    const result = await controller.evaluateComplianceAlias(
      'app-uuid-1',
      mockUser,
    );

    expect(result).toEqual(mockResult);
    expect(complianceService.evaluateCompliance).toHaveBeenCalledWith(
      'app-uuid-1',
      mockUser,
      undefined,
    );
  });

  it('retrieves compliance assessment via GET endpoint', async () => {
    const result = await controller.getApplicationCompliance(
      'app-uuid-1',
      mockUser,
    );

    expect(result).toEqual(mockResult);
    expect(complianceService.getApplicationCompliance).toHaveBeenCalledWith(
      'app-uuid-1',
      mockUser,
    );
  });
});
