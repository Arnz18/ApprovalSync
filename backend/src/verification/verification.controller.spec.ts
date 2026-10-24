/**
 * ApprovalSync — Verification Controller Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { OverallValidationStatus } from './enums';
import { ApplicationValidationResultDto } from './dto';

describe('VerificationController', () => {
  let controller: VerificationController;
  let orchestratorService: {
    validateApplicationDocuments: jest.Mock;
    getValidationReport: jest.Mock;
  };

  const mockUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    name: 'Apex Officer',
    email: 'user@apex.edu',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const mockResult: ApplicationValidationResultDto = {
    applicationId: 'app-uuid-1',
    applicationNumber: 'APP-2026-0001',
    institutionId: 'inst-1',
    programType: 'Undergraduate Engineering',
    overallStatus: OverallValidationStatus.COMPLIANT,
    summary: {
      totalRulesEvaluated: 5,
      totalCompliant: 5,
      totalDeficiencies: 0,
      totalAdvisories: 0,
      totalSourceUnavailable: 0,
    },
    findings: [],
    evaluatedAt: '2026-10-24T00:00:00.000Z',
    ruleVersion: '1.0.0',
  };

  beforeEach(async () => {
    orchestratorService = {
      validateApplicationDocuments: jest.fn().mockResolvedValue(mockResult),
      getValidationReport: jest.fn().mockResolvedValue(mockResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: ValidationOrchestratorService,
          useValue: orchestratorService,
        },
      ],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
  });

  describe('validateDocuments', () => {
    it('should invoke validateApplicationDocuments with id, user, and query options', async () => {
      const result = await controller.validateDocuments(
        'app-uuid-1',
        mockUser,
        { recalculate: true },
      );

      expect(
        orchestratorService.validateApplicationDocuments,
      ).toHaveBeenCalledWith('app-uuid-1', mockUser, { recalculate: true });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getValidationReport', () => {
    it('should invoke getValidationReport with id, user, and query options', async () => {
      const result = await controller.getValidationReport(
        'app-uuid-1',
        mockUser,
        { recalculate: false },
      );

      expect(orchestratorService.getValidationReport).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        { recalculate: false },
      );
      expect(result).toEqual(mockResult);
    });
  });
});
