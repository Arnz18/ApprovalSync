/**
 * ApprovalSync — RulesController Unit Tests
 * Milestone: BE-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { UserRole } from '../shared/contracts';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
} from './enums';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { CreateRuleSetDto } from './dto/create-rule-set.dto';
import { CreateRuleVersionDto } from './dto/create-rule-version.dto';
import { CreateRegulatoryRuleDto } from './dto/create-regulatory-rule.dto';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

describe('RulesController', () => {
  let controller: RulesController;
  let service: jest.Mocked<RulesService>;

  const adminPrincipal: AuthUserPrincipal = {
    id: 'admin-uuid-1',
    email: 'admin@synthetic.local',
    name: 'Admin User',
    role: UserRole.SYSTEM_ADMIN,
    institutionId: null,
    regionalOffice: null,
  };

  beforeEach(async () => {
    service = {
      createRuleSet: jest.fn(),
      getRuleSets: jest.fn(),
      getRuleSetById: jest.fn(),
      createRuleVersion: jest.fn(),
      getRuleVersionById: jest.fn(),
      updateRuleVersion: jest.fn(),
      createRegulatoryRule: jest.fn(),
      updateRegulatoryRule: jest.fn(),
      deleteRegulatoryRule: jest.fn(),
      createChecklistTemplate: jest.fn(),
      createChecklistItem: jest.fn(),
      publishRuleVersion: jest.fn(),
      retireRuleVersion: jest.fn(),
      resolveApplicableRules: jest.fn(),
    } as unknown as jest.Mocked<RulesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RulesController],
      providers: [
        {
          provide: RulesService,
          useValue: service,
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

    controller = module.get<RulesController>(RulesController);
  });

  it('delegates createRuleSet to service', async () => {
    const dto: CreateRuleSetDto = {
      code: 'RULESET-ENGG-UG',
      name: 'UG Engineering',
      applicationCategory: 'Undergraduate Engineering',
    };
    const expected = {
      id: 'rs-1',
      ...dto,
      issuingAuthority: 'AICTE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.createRuleSet.mockResolvedValue(expected);

    const result = await controller.createRuleSet(dto);
    expect(result).toBe(expected);
    expect(service.createRuleSet).toHaveBeenCalledWith(dto);
  });

  it('delegates getRuleSets to service', async () => {
    const query = { page: 1, limit: 10 };
    const expected = {
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    service.getRuleSets.mockResolvedValue(expected);

    const result = await controller.getRuleSets(query, adminPrincipal);
    expect(result).toBe(expected);
    expect(service.getRuleSets).toHaveBeenCalledWith(query, adminPrincipal);
  });

  it('delegates getRuleSetById to service', async () => {
    const expected = {
      id: 'rs-1',
      code: 'RULESET-1',
      name: 'Name',
      applicationCategory: 'Cat',
      issuingAuthority: 'AICTE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.getRuleSetById.mockResolvedValue(expected);

    const result = await controller.getRuleSetById('rs-1', adminPrincipal);
    expect(result).toBe(expected);
    expect(service.getRuleSetById).toHaveBeenCalledWith('rs-1', adminPrincipal);
  });

  it('delegates createRuleVersion to service', async () => {
    const dto: CreateRuleVersionDto = {
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      sourceTitle: 'Handbook',
      sourceReference: 'Clause 1',
      sourceClassification:
        RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
    };
    const expected = {
      id: 'v-1',
      ruleSetId: 'rs-1',
      versionNumber: 1,
      status: RuleLifecycleStatus.DRAFT,
      effectiveFrom: new Date(dto.effectiveFrom),
      sourceTitle: dto.sourceTitle,
      sourceReference: dto.sourceReference,
      sourceClassification: dto.sourceClassification,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.createRuleVersion.mockResolvedValue(expected);

    const result = await controller.createRuleVersion(
      'rs-1',
      dto,
      adminPrincipal,
    );
    expect(result).toBe(expected);
    expect(service.createRuleVersion).toHaveBeenCalledWith(
      'rs-1',
      dto,
      adminPrincipal,
    );
  });

  it('delegates createRegulatoryRule to service', async () => {
    const dto: CreateRegulatoryRuleDto = {
      ruleCode: 'RULE-LAND-01',
      title: 'Land',
      description: 'Land rule',
      ruleType: RuleType.INFRASTRUCTURE_LAND,
      parametersJsonb: { minLandAcres: 5 },
    };
    const expected = {
      id: 'r-1',
      ruleVersionId: 'v-1',
      ruleCode: dto.ruleCode,
      title: dto.title,
      description: dto.description,
      ruleType: dto.ruleType,
      severity: dto.severity!,
      parametersJsonb: dto.parametersJsonb,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.createRegulatoryRule.mockResolvedValue(expected);

    const result = await controller.createRegulatoryRule(
      'v-1',
      dto,
      adminPrincipal,
    );
    expect(result).toBe(expected);
    expect(service.createRegulatoryRule).toHaveBeenCalledWith(
      'v-1',
      dto,
      adminPrincipal,
    );
  });

  it('delegates publishRuleVersion to service', async () => {
    const expected = {
      id: 'v-1',
      ruleSetId: 'rs-1',
      versionNumber: 1,
      status: RuleLifecycleStatus.PUBLISHED,
      effectiveFrom: new Date(),
      sourceTitle: 'HB',
      sourceReference: 'Cl 1',
      sourceClassification:
        RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    service.publishRuleVersion.mockResolvedValue(expected);

    const result = await controller.publishRuleVersion('v-1', adminPrincipal);
    expect(result).toBe(expected);
    expect(service.publishRuleVersion).toHaveBeenCalledWith(
      'v-1',
      adminPrincipal,
    );
  });

  it('delegates resolveApplicable to service', async () => {
    const query = {
      category: 'Undergraduate Engineering',
      evaluationDate: '2026-10-24T00:00:00.000Z',
    };
    const expected = {
      ruleSet: {
        id: 'rs-1',
        code: 'RS',
        name: 'Name',
        applicationCategory: query.category,
        issuingAuthority: 'AICTE',
      },
      ruleVersion: {
        id: 'v-1',
        versionNumber: 1,
        status: RuleLifecycleStatus.PUBLISHED,
        effectiveFrom: new Date(),
        sourceTitle: 'HB',
        sourceReference: 'Cl',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      },
      evaluationDate: query.evaluationDate,
      rules: [],
      checklists: [],
    };
    service.resolveApplicableRules.mockResolvedValue(expected);

    const result = await controller.resolveApplicable(query);
    expect(result).toBe(expected);
    expect(service.resolveApplicableRules).toHaveBeenCalledWith(query);
  });
});
