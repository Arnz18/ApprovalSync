/**
 * ApprovalSync — RulesService Unit Tests
 * Milestone: BE-05
 *
 * Verifies version lifecycle invariants, publication checks, immutability defenses,
 * date overlap prevention, and deterministic applicable-version resolution.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import {
  RuleSet,
  RuleVersion,
  RegulatoryRule,
  ChecklistTemplate,
  ChecklistItem,
} from './entities';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
  ChecklistItemType,
} from './enums';
import { ComplianceSeverity, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';

describe('RulesService', () => {
  let service: RulesService;
  let ruleSetRepo: jest.Mocked<Repository<RuleSet>>;
  let ruleVersionRepo: jest.Mocked<Repository<RuleVersion>>;
  let regulatoryRuleRepo: jest.Mocked<Repository<RegulatoryRule>>;
  let checklistTemplateRepo: jest.Mocked<Repository<ChecklistTemplate>>;
  let checklistItemRepo: jest.Mocked<Repository<ChecklistItem>>;
  let dataSource: jest.Mocked<DataSource>;

  const adminPrincipal: AuthUserPrincipal = {
    id: 'admin-uuid-1',
    email: 'admin@synthetic.local',
    name: 'Admin User',
    role: UserRole.SYSTEM_ADMIN,
    institutionId: null,
    regionalOffice: null,
  };

  const institutionPrincipal: AuthUserPrincipal = {
    id: 'inst-user-uuid-1',
    email: 'inst@synthetic.local',
    name: 'Institution User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
    regionalOffice: null,
  };

  beforeEach(async () => {
    ruleSetRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<RuleSet>>;

    ruleVersionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<RuleVersion>>;

    regulatoryRuleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<RegulatoryRule>>;

    checklistTemplateRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChecklistTemplate>>;

    checklistItemRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChecklistItem>>;

    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: getRepositoryToken(RuleSet),
          useValue: ruleSetRepo,
        },
        {
          provide: getRepositoryToken(RuleVersion),
          useValue: ruleVersionRepo,
        },
        {
          provide: getRepositoryToken(RegulatoryRule),
          useValue: regulatoryRuleRepo,
        },
        {
          provide: getRepositoryToken(ChecklistTemplate),
          useValue: checklistTemplateRepo,
        },
        {
          provide: getRepositoryToken(ChecklistItem),
          useValue: checklistItemRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  describe('createRuleSet', () => {
    it('creates a new RuleSet when code does not already exist', async () => {
      ruleSetRepo.findOne.mockResolvedValue(null);
      const createdEntity = {
        id: 'rs-uuid-1',
        code: 'RULESET-ENGG-UG',
        name: 'UG Engineering Norms',
        description: 'Test description',
        applicationCategory: 'Undergraduate Engineering',
        issuingAuthority: 'AICTE',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RuleSet;

      ruleSetRepo.create.mockReturnValue(createdEntity);
      ruleSetRepo.save.mockResolvedValue(createdEntity);

      const result = await service.createRuleSet({
        code: 'RULESET-ENGG-UG',
        name: 'UG Engineering Norms',
        description: 'Test description',
        applicationCategory: 'Undergraduate Engineering',
      });

      expect(result.id).toBe('rs-uuid-1');
      expect(result.code).toBe('RULESET-ENGG-UG');
      expect(ruleSetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RULESET-ENGG-UG',
          issuingAuthority: 'AICTE',
        }),
      );
    });

    it('throws ConflictException if code already exists', async () => {
      ruleSetRepo.findOne.mockResolvedValue({ id: 'existing-id' } as RuleSet);

      await expect(
        service.createRuleSet({
          code: 'RULESET-ENGG-UG',
          name: 'Duplicate',
          applicationCategory: 'Undergraduate Engineering',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createRuleVersion', () => {
    it('monotonically assigns versionNumber = 1 for the first version in a RuleSet', async () => {
      ruleSetRepo.findOne.mockResolvedValue({
        id: 'rs-1',
        code: 'RULESET-ENGG-UG',
      } as RuleSet);
      ruleVersionRepo.findOne.mockResolvedValue(null);

      const createdVersion = {
        id: 'v-1',
        ruleSetId: 'rs-1',
        versionNumber: 1,
        status: RuleLifecycleStatus.DRAFT,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        sourceTitle: 'APH 2024-27',
        sourceReference: 'Chapter 1',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RuleVersion;

      ruleVersionRepo.create.mockReturnValue(createdVersion);
      ruleVersionRepo.save.mockResolvedValue(createdVersion);

      const result = await service.createRuleVersion(
        'rs-1',
        {
          effectiveFrom: '2024-01-01T00:00:00.000Z',
          sourceTitle: 'APH 2024-27',
          sourceReference: 'Chapter 1',
          sourceClassification:
            RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        },
        adminPrincipal,
      );

      expect(result.versionNumber).toBe(1);
      expect(result.status).toBe(RuleLifecycleStatus.DRAFT);
    });

    it('monotonically increments versionNumber when previous versions exist', async () => {
      ruleSetRepo.findOne.mockResolvedValue({ id: 'rs-1' } as RuleSet);
      ruleVersionRepo.findOne.mockResolvedValue({
        versionNumber: 3,
      } as RuleVersion);

      const createdVersion = {
        id: 'v-4',
        ruleSetId: 'rs-1',
        versionNumber: 4,
        status: RuleLifecycleStatus.DRAFT,
        effectiveFrom: new Date('2025-01-01'),
        sourceTitle: 'APH 2025',
        sourceReference: 'Chapter 2',
        sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RuleVersion;

      ruleVersionRepo.create.mockReturnValue(createdVersion);
      ruleVersionRepo.save.mockResolvedValue(createdVersion);

      const result = await service.createRuleVersion(
        'rs-1',
        {
          effectiveFrom: '2025-01-01T00:00:00.000Z',
          sourceTitle: 'APH 2025',
          sourceReference: 'Chapter 2',
          sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
        },
        adminPrincipal,
      );

      expect(result.versionNumber).toBe(4);
    });

    it('throws BadRequestException if effectiveTo is prior to effectiveFrom', async () => {
      ruleSetRepo.findOne.mockResolvedValue({ id: 'rs-1' } as RuleSet);

      await expect(
        service.createRuleVersion(
          'rs-1',
          {
            effectiveFrom: '2025-01-01T00:00:00.000Z',
            effectiveTo: '2024-01-01T00:00:00.000Z',
            sourceTitle: 'APH',
            sourceReference: 'Clause 1',
            sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
          },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Immutability Protections', () => {
    const publishedVersion = {
      id: 'v-published',
      ruleSetId: 'rs-1',
      versionNumber: 1,
      status: RuleLifecycleStatus.PUBLISHED,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      sourceTitle: 'Official Handbook',
      sourceReference: 'Section 1',
      sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
      rules: [],
      checklistTemplates: [],
    } as unknown as RuleVersion;

    const retiredVersion = {
      ...publishedVersion,
      id: 'v-retired',
      status: RuleLifecycleStatus.RETIRED,
    } as unknown as RuleVersion;

    it('rejects metadata modification on a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.updateRuleVersion(
          'v-published',
          { sourceTitle: 'Tampered Title' },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects metadata modification on a RETIRED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(retiredVersion);

      await expect(
        service.updateRuleVersion(
          'v-retired',
          { sourceTitle: 'Tampered Title' },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adding a regulatory rule to a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.createRegulatoryRule(
          'v-published',
          {
            ruleCode: 'RULE-NEW-01',
            title: 'New Rule',
            description: 'New Description',
            ruleType: RuleType.INFRASTRUCTURE_LAND,
            parametersJsonb: { minLandAcres: 5 },
          },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects modifying a rule in a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.updateRegulatoryRule(
          'v-published',
          'rule-1',
          { title: 'Altered Title' },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects deleting a rule from a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.deleteRegulatoryRule('v-published', 'rule-1', adminPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adding a checklist template to a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.createChecklistTemplate(
          'v-published',
          {
            code: 'CHK-NEW',
            name: 'New Checklist',
            applicationCategory: 'Undergraduate Engineering',
          },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects adding a checklist item to a PUBLISHED version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue(publishedVersion);

      await expect(
        service.createChecklistItem(
          'v-published',
          'template-1',
          {
            itemCode: 'CHK-ITEM-01',
            description: 'Item',
            itemType: ChecklistItemType.DOCUMENT_UPLOAD,
          },
          adminPrincipal,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishRuleVersion Invariants', () => {
    it('rejects publication if version is not in DRAFT status', async () => {
      const draftVersion = {
        id: 'v-1',
        status: RuleLifecycleStatus.PUBLISHED,
      } as RuleVersion;

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: any) => {
          const mockManager = {
            getRepository: (entity: unknown) => {
              if (entity === RuleVersion) {
                return {
                  findOne: jest.fn().mockResolvedValue(draftVersion),
                };
              }
              return {};
            },
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.publishRuleVersion('v-1', adminPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects publication if version has 0 regulatory rules', async () => {
      const draftVersion = {
        id: 'v-1',
        status: RuleLifecycleStatus.DRAFT,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
      } as RuleVersion;

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: any) => {
          const mockManager = {
            getRepository: (entity: unknown) => {
              if (entity === RuleVersion) {
                return {
                  findOne: jest.fn().mockResolvedValue(draftVersion),
                };
              }
              if (entity === RegulatoryRule) {
                return {
                  count: jest.fn().mockResolvedValue(0),
                };
              }
              return {};
            },
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.publishRuleVersion('v-1', adminPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects publication if effective date range overlaps with an existing published version', async () => {
      const draftVersion = {
        id: 'v-2',
        ruleSetId: 'rs-1',
        versionNumber: 2,
        status: RuleLifecycleStatus.DRAFT,
        effectiveFrom: new Date('2024-06-01T00:00:00.000Z'),
        effectiveTo: new Date('2025-06-01T00:00:00.000Z'),
        sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
      } as RuleVersion;

      const existingPublished = {
        id: 'v-1',
        ruleSetId: 'rs-1',
        versionNumber: 1,
        status: RuleLifecycleStatus.PUBLISHED,
        effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
        effectiveTo: new Date('2024-12-31T23:59:59.000Z'),
      } as RuleVersion;

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: any) => {
          const mockManager = {
            getRepository: (entity: unknown) => {
              if (entity === RuleVersion) {
                return {
                  findOne: jest.fn().mockResolvedValue(draftVersion),
                  find: jest.fn().mockResolvedValue([existingPublished]),
                };
              }
              if (entity === RegulatoryRule) {
                return {
                  count: jest.fn().mockResolvedValue(3),
                };
              }
              return {};
            },
          };
          return cb(mockManager);
        },
      );

      await expect(
        service.publishRuleVersion('v-2', adminPrincipal),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully publishes a valid draft version atomically inside a transaction', async () => {
      const draftVersion = {
        id: 'v-1',
        ruleSetId: 'rs-1',
        versionNumber: 1,
        status: RuleLifecycleStatus.DRAFT,
        effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
        effectiveTo: null,
        sourceTitle: 'Valid Handbook',
        sourceReference: 'Clause 1',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      } as RuleVersion;

      const mockSavedVersion = {
        ...draftVersion,
        status: RuleLifecycleStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: adminPrincipal.id,
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: any) => {
          const mockManager = {
            getRepository: (entity: unknown) => {
              if (entity === RuleVersion) {
                return {
                  findOne: jest.fn().mockResolvedValue(draftVersion),
                  find: jest.fn().mockResolvedValue([]), // No overlapping published versions
                  save: jest.fn().mockResolvedValue(mockSavedVersion),
                };
              }
              if (entity === RegulatoryRule) {
                return {
                  count: jest.fn().mockResolvedValue(2),
                  find: jest.fn().mockResolvedValue([
                    {
                      id: 'r-1',
                      ruleCode: 'RULE-01',
                      title: 'Title',
                      description: 'Desc',
                      ruleType: RuleType.INFRASTRUCTURE_LAND,
                      severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
                      parametersJsonb: {},
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  ]),
                };
              }
              if (entity === ChecklistTemplate) {
                return {
                  find: jest.fn().mockResolvedValue([]),
                };
              }
              return {};
            },
          };
          return cb(mockManager);
        },
      );

      const result = await service.publishRuleVersion('v-1', adminPrincipal);

      expect(result.status).toBe(RuleLifecycleStatus.PUBLISHED);
      expect(result.publishedBy).toBe(adminPrincipal.id);
      expect(result.publishedAt).toBeDefined();
    });
  });

  describe('resolveApplicableRules', () => {
    it('throws NotFoundException if application category does not exist', async () => {
      ruleSetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveApplicableRules({
          category: 'Nonexistent Category',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if no published version covers the evaluation date', async () => {
      ruleSetRepo.findOne.mockResolvedValue({
        id: 'rs-1',
        code: 'RULESET-ENGG-UG',
        name: 'UG Engineering',
        applicationCategory: 'Undergraduate Engineering',
        issuingAuthority: 'AICTE',
      } as RuleSet);

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      ruleVersionRepo.createQueryBuilder.mockReturnValue(qbMock as any);

      await expect(
        service.resolveApplicableRules({
          category: 'Undergraduate Engineering',
          evaluationDate: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deterministically selects the qualifying published version and returns structured rules/checklists', async () => {
      ruleSetRepo.findOne.mockResolvedValue({
        id: 'rs-1',
        code: 'RULESET-ENGG-UG',
        name: 'UG Engineering Norms',
        applicationCategory: 'Undergraduate Engineering',
        issuingAuthority: 'AICTE',
      } as RuleSet);

      const qualifyingVersion = {
        id: 'v-1',
        ruleSetId: 'rs-1',
        versionNumber: 1,
        status: RuleLifecycleStatus.PUBLISHED,
        effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
        effectiveTo: null,
        sourceTitle: 'AICTE APH 2024-2027',
        sourceReference: 'Chapter 1 & 2',
        sourceClassification:
          RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      } as RuleVersion;

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([qualifyingVersion]),
      };
      ruleVersionRepo.createQueryBuilder.mockReturnValue(qbMock as any);

      regulatoryRuleRepo.find.mockResolvedValue([
        {
          id: 'rule-1',
          ruleVersionId: 'v-1',
          ruleCode: 'RULE-LAND-01',
          title: 'Land Requirement',
          description: 'Minimum 7.5 acres',
          ruleType: RuleType.INFRASTRUCTURE_LAND,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          parametersJsonb: { minLandAcres: 7.5 },
          sourceClause: 'Clause 1.4.1',
          sourceClassification:
            RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as RegulatoryRule,
      ]);

      checklistTemplateRepo.find.mockResolvedValue([
        {
          id: 'template-1',
          ruleVersionId: 'v-1',
          code: 'CHK-ENGG-UG-INTAKE',
          name: 'Mandatory Intake Checklist',
          applicationCategory: 'Undergraduate Engineering',
          items: [
            {
              id: 'item-1',
              checklistTemplateId: 'template-1',
              itemCode: 'CHK-ITEM-LAND',
              description: 'Land Title Deed',
              itemType: ChecklistItemType.DOCUMENT_UPLOAD,
              required: true,
              evidenceDocumentType: 'LAND_TITLE_DEED',
              displayOrder: 10,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as ChecklistItem,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ChecklistTemplate,
      ]);

      const result = await service.resolveApplicableRules({
        category: 'Undergraduate Engineering',
        evaluationDate: '2026-10-24T00:00:00.000Z',
      });

      expect(result.ruleSet.code).toBe('RULESET-ENGG-UG');
      expect(result.ruleVersion.versionNumber).toBe(1);
      expect(result.ruleVersion.sourceClassification).toBe(
        RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      );
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].ruleCode).toBe('RULE-LAND-01');
      expect(result.checklists).toHaveLength(1);
      expect(result.checklists[0].items).toHaveLength(1);
      expect(result.checklists[0].items![0].itemCode).toBe('CHK-ITEM-LAND');
    });
  });

  describe('Non-admin access to draft versions', () => {
    it('throws ForbiddenException when an INSTITUTION_USER attempts to view a DRAFT version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue({
        id: 'v-draft',
        status: RuleLifecycleStatus.DRAFT,
      } as RuleVersion);

      await expect(
        service.getRuleVersionById('v-draft', institutionPrincipal),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows SYSTEM_ADMIN to inspect a DRAFT version', async () => {
      ruleVersionRepo.findOne.mockResolvedValue({
        id: 'v-draft',
        status: RuleLifecycleStatus.DRAFT,
        versionNumber: 2,
        rules: [],
        checklistTemplates: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as RuleVersion);

      const result = await service.getRuleVersionById(
        'v-draft',
        adminPrincipal,
      );

      expect(result.id).toBe('v-draft');
      expect(result.status).toBe(RuleLifecycleStatus.DRAFT);
    });
  });
});
