/**
 * ApprovalSync — Compliance Service Tests
 * Milestone: DOC-06
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceEvidenceEvaluatorService } from './compliance-evidence-evaluator.service';
import { InfrastructureReviewAssistService } from './infrastructure-review-assist.service';
import { RulesService } from '../../rules/rules.service';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { UserRole, ComplianceSeverity } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let applicationRepo: any;
  let rulesService: any;
  let evaluatorService: any;
  let infraAssistService: any;

  const mockInstitution: Institution = {
    id: 'inst-uuid-1',
    name: 'Apex Institute of Technology',
    registrationNumber: 'REG-101',
    state: 'Maharashtra',
    district: 'Pune',
  } as unknown as Institution;

  const mockApplication: Application = {
    id: 'app-uuid-1',
    applicationNumber: 'APP-2026-TEST-001',
    institutionId: 'inst-uuid-1',
    programType: 'Undergraduate Engineering',
    academicYear: '2026-2027',
    institution: mockInstitution,
    documents: [],
    payloadJsonb: {
      landAreaAcres: 8.0,
      builtUpAreaSqMeters: 5000,
    },
  } as unknown as Application;

  const instUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    name: 'Institution User',
    email: 'inst@test.local',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-uuid-1',
  };

  const otherInstUser: AuthUserPrincipal = {
    id: 'user-inst-2',
    name: 'Other Institution User',
    email: 'other@test.local',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-uuid-2',
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'user-officer-1',
    name: 'Scrutiny Officer',
    email: 'officer@test.local',
    role: UserRole.SCRUTINY_OFFICER,
  };

  beforeEach(async () => {
    applicationRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };

    rulesService = {
      resolveApplicableRules: jest.fn(),
    };

    evaluatorService = {
      evaluateRulesAndChecklists: jest.fn().mockReturnValue([
        {
          id: 'find-uuid-1',
          findingCode: 'COMPL_LAND_NORM_SATISFIED',
          title: 'Compliant Land',
          description: 'Land area meets norm',
          severity: ComplianceSeverity.COMPLIANT,
          isAdvisory: true,
          category: 'INFRASTRUCTURE',
          evidence: [],
          requiresPhysicalInspection: false,
          recommendedAction: 'None',
          limitations: [],
        },
      ]),
    };

    infraAssistService = {
      reviewInfrastructureEvidence: jest.fn().mockReturnValue({
        summary: {
          landCompliant: true,
          builtUpAreaCompliant: true,
          barrierFreeDeclared: true,
          fireSafetyValid: true,
          evcInspectionRecommended: false,
          inspectionTriggerReasons: [],
          heuristicLimitations: [],
        },
        comparisons: [],
        findings: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: getRepositoryToken(Application),
          useValue: applicationRepo,
        },
        {
          provide: getRepositoryToken(Institution),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {},
        },
        {
          provide: RulesService,
          useValue: rulesService,
        },
        {
          provide: ComplianceEvidenceEvaluatorService,
          useValue: evaluatorService,
        },
        {
          provide: InfrastructureReviewAssistService,
          useValue: infraAssistService,
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  it('evaluates compliance, persists summary in payloadJsonb, and returns result DTO', async () => {
    applicationRepo.findOne.mockResolvedValue({
      ...mockApplication,
      payloadJsonb: { landAreaAcres: 8.0 },
    });

    rulesService.resolveApplicableRules.mockResolvedValue({
      ruleSet: { code: 'RULESET-ENGG-UG', name: 'UG Norms' },
      ruleVersion: { versionNumber: 1, id: 'rv-1' },
      rules: [{ id: 'r1' }],
      checklists: [{ code: 'CHK-1', items: [{ id: 'i1' }] }],
    });

    const result = await service.evaluateCompliance('app-uuid-1', instUser);

    expect(result.applicationId).toBe('app-uuid-1');
    expect(result.isAdvisory).toBe(true);
    expect(result.ruleSetCode).toBe('RULESET-ENGG-UG');
    expect(result.findings.length).toBe(1);
    expect(result.summary.compliantCount).toBe(1);
    expect(result.summary.hasCriticalDeficiency).toBe(false);

    // Verify persistence
    expect(applicationRepo.save).toHaveBeenCalled();
    const savedApp = applicationRepo.save.mock.calls[0][0];
    expect(savedApp.payloadJsonb.complianceAssessment).toBeDefined();
    expect(savedApp.payloadJsonb.complianceAssessment.ruleSetCode).toBe(
      'RULESET-ENGG-UG',
    );
  });

  it('rejects evaluation attempt from a different institution user with 403 Forbidden', async () => {
    applicationRepo.findOne.mockResolvedValue(mockApplication);

    await expect(
      service.evaluateCompliance('app-uuid-1', otherInstUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows SCRUTINY_OFFICER to evaluate applications across any institution', async () => {
    applicationRepo.findOne.mockResolvedValue({
      ...mockApplication,
      payloadJsonb: {},
    });
    rulesService.resolveApplicableRules.mockResolvedValue(null);

    const result = await service.evaluateCompliance(
      'app-uuid-1',
      scrutinyOfficer,
    );
    expect(result).toBeDefined();
    expect(result.applicationId).toBe('app-uuid-1');
  });

  it('throws 404 NotFoundException when application does not exist', async () => {
    applicationRepo.findOne.mockResolvedValue(null);

    await expect(
      service.evaluateCompliance('app-uuid-nonexistent', instUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('handles RulesService failure gracefully and produces assessment with fallback', async () => {
    applicationRepo.findOne.mockResolvedValue({
      ...mockApplication,
      payloadJsonb: {},
    });
    rulesService.resolveApplicableRules.mockRejectedValue(
      new Error('No published rule version found'),
    );

    const result = await service.evaluateCompliance('app-uuid-1', instUser);

    expect(result).toBeDefined();
    expect(result.ruleSetCode).toBeUndefined();
    expect(evaluatorService.evaluateRulesAndChecklists).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      expect.any(String),
    );
  });
});
