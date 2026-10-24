/**
 * ApprovalSync — Rules and Checklists Service
 * Milestone: BE-05
 *
 * Implements versioned regulatory rules, checklists, publication invariants,
 * immutability guarantees, and deterministic applicable-version resolution.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  RuleSet,
  RuleVersion,
  RegulatoryRule,
  ChecklistTemplate,
  ChecklistItem,
} from './entities';
import { RuleLifecycleStatus, RuleSourceClassification } from './enums';
import { UserRole, PaginationMeta } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import {
  CreateRuleSetDto,
  CreateRuleVersionDto,
  UpdateRuleVersionDto,
  CreateRegulatoryRuleDto,
  UpdateRegulatoryRuleDto,
  CreateChecklistTemplateDto,
  CreateChecklistItemDto,
  RuleQueryDto,
  ResolveApplicableQueryDto,
  RuleSetProjection,
  RuleVersionProjection,
  RegulatoryRuleProjection,
  ChecklistTemplateProjection,
  ChecklistItemProjection,
  ApplicableRulesResolutionProjection,
} from './dto';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  constructor(
    @InjectRepository(RuleSet)
    private readonly ruleSetRepository: Repository<RuleSet>,
    @InjectRepository(RuleVersion)
    private readonly ruleVersionRepository: Repository<RuleVersion>,
    @InjectRepository(RegulatoryRule)
    private readonly regulatoryRuleRepository: Repository<RegulatoryRule>,
    @InjectRepository(ChecklistTemplate)
    private readonly checklistTemplateRepository: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistItem)
    private readonly checklistItemRepository: Repository<ChecklistItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new RuleSet.
   */
  async createRuleSet(dto: CreateRuleSetDto): Promise<RuleSetProjection> {
    const existing = await this.ruleSetRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `RuleSet with code "${dto.code}" already exists.`,
      );
    }

    const ruleSet = this.ruleSetRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      applicationCategory: dto.applicationCategory,
      issuingAuthority: dto.issuingAuthority || 'AICTE',
    });

    const saved = await this.ruleSetRepository.save(ruleSet);
    this.logger.log(`Created RuleSet ${saved.code} (${saved.id})`);
    return this.mapRuleSet(saved);
  }

  /**
   * List RuleSets with pagination and category/search filtering.
   */
  async getRuleSets(
    query: RuleQueryDto,
    currentUser: AuthUserPrincipal,
  ): Promise<{ items: RuleSetProjection[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.ruleSetRepository
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.versions', 'v');

    if (query.category) {
      qb.andWhere('rs.applicationCategory = :category', {
        category: query.category,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(rs.name ILIKE :search OR rs.code ILIKE :search OR rs.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('rs.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [ruleSets, totalItems] = await qb.getManyAndCount();

    const items = ruleSets.map((rs) => {
      // Filter out DRAFT versions for non-SYSTEM_ADMIN users
      let versions = rs.versions || [];
      if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
        versions = versions.filter(
          (v) => v.status !== RuleLifecycleStatus.DRAFT,
        );
      }
      return this.mapRuleSet(rs, versions);
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;
    const pagination: PaginationMeta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { items, pagination };
  }

  /**
   * Retrieve a RuleSet by ID with its versions.
   */
  async getRuleSetById(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleSetProjection> {
    const ruleSet = await this.ruleSetRepository.findOne({
      where: { id },
      relations: ['versions'],
    });

    if (!ruleSet) {
      throw new NotFoundException(`RuleSet with ID "${id}" was not found.`);
    }

    let versions = ruleSet.versions || [];
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      versions = versions.filter((v) => v.status !== RuleLifecycleStatus.DRAFT);
    }
    versions.sort((a, b) => b.versionNumber - a.versionNumber);

    return this.mapRuleSet(ruleSet, versions);
  }

  /**
   * Create a new draft RuleVersion within a RuleSet.
   */
  async createRuleVersion(
    ruleSetId: string,
    dto: CreateRuleVersionDto,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    const ruleSet = await this.ruleSetRepository.findOne({
      where: { id: ruleSetId },
    });
    if (!ruleSet) {
      throw new NotFoundException(
        `RuleSet with ID "${ruleSetId}" was not found.`,
      );
    }

    const effectiveFromDate = new Date(dto.effectiveFrom);
    if (isNaN(effectiveFromDate.getTime())) {
      throw new BadRequestException('effectiveFrom must be a valid date.');
    }

    let effectiveToDate: Date | null = null;
    if (dto.effectiveTo) {
      effectiveToDate = new Date(dto.effectiveTo);
      if (isNaN(effectiveToDate.getTime())) {
        throw new BadRequestException('effectiveTo must be a valid date.');
      }
      if (effectiveToDate <= effectiveFromDate) {
        throw new BadRequestException(
          'effectiveTo must be strictly after effectiveFrom.',
        );
      }
    }

    // Determine monotonically assigned next versionNumber
    const latestVersion = await this.ruleVersionRepository.findOne({
      where: { ruleSetId },
      order: { versionNumber: 'DESC' },
    });
    const nextVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    const version = this.ruleVersionRepository.create({
      ruleSetId,
      versionNumber: nextVersionNumber,
      status: RuleLifecycleStatus.DRAFT,
      effectiveFrom: effectiveFromDate,
      effectiveTo: effectiveToDate,
      sourceTitle: dto.sourceTitle,
      sourceReference: dto.sourceReference,
      sourceClassification: dto.sourceClassification,
      changeSummary: dto.changeSummary || null,
      publishedAt: null,
      publishedBy: null,
      retiredAt: null,
      retiredBy: null,
    });

    const saved = await this.ruleVersionRepository.save(version);
    this.logger.log(
      `User ${currentUser.email} created draft RuleVersion ${saved.versionNumber} for RuleSet ${ruleSet.code} (${saved.id})`,
    );

    return this.mapRuleVersion(saved, [], []);
  }

  /**
   * Get a specific RuleVersion by ID with its rules and checklist templates.
   */
  async getRuleVersionById(
    versionId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
      relations: ['rules', 'checklistTemplates', 'checklistTemplates.items'],
    });

    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    if (
      version.status === RuleLifecycleStatus.DRAFT &&
      currentUser.role !== UserRole.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException(
        'Access denied: Only administrators may inspect draft rule versions.',
      );
    }

    const rules = (version.rules || []).sort((a, b) =>
      a.ruleCode.localeCompare(b.ruleCode),
    );
    const templates = (version.checklistTemplates || []).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    for (const t of templates) {
      if (t.items) {
        t.items.sort((a, b) => a.displayOrder - b.displayOrder);
      }
    }

    return this.mapRuleVersion(version, rules, templates);
  }

  /**
   * Update metadata of a draft RuleVersion.
   * Rejects mutations on PUBLISHED or RETIRED versions.
   */
  async updateRuleVersion(
    versionId: string,
    dto: UpdateRuleVersionDto,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
      relations: ['rules', 'checklistTemplates', 'checklistTemplates.items'],
    });

    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'update metadata on');

    if (dto.effectiveFrom) {
      const fromDate = new Date(dto.effectiveFrom);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('effectiveFrom must be a valid date.');
      }
      version.effectiveFrom = fromDate;
    }

    if (dto.effectiveTo !== undefined) {
      if (dto.effectiveTo === null) {
        version.effectiveTo = null;
      } else {
        const toDate = new Date(dto.effectiveTo);
        if (isNaN(toDate.getTime())) {
          throw new BadRequestException('effectiveTo must be a valid date.');
        }
        if (toDate <= version.effectiveFrom) {
          throw new BadRequestException(
            'effectiveTo must be strictly after effectiveFrom.',
          );
        }
        version.effectiveTo = toDate;
      }
    }

    if (dto.sourceTitle !== undefined) {
      version.sourceTitle = dto.sourceTitle;
    }
    if (dto.sourceReference !== undefined) {
      version.sourceReference = dto.sourceReference;
    }
    if (dto.sourceClassification !== undefined) {
      version.sourceClassification = dto.sourceClassification;
    }
    if (dto.changeSummary !== undefined) {
      version.changeSummary = dto.changeSummary || null;
    }

    const saved = await this.ruleVersionRepository.save(version);
    this.logger.log(
      `User ${currentUser.email} updated draft RuleVersion ${saved.id}`,
    );

    return this.mapRuleVersion(
      saved,
      version.rules || [],
      version.checklistTemplates || [],
    );
  }

  /**
   * Add a regulatory rule to a draft RuleVersion.
   */
  async createRegulatoryRule(
    versionId: string,
    dto: CreateRegulatoryRuleDto,
    currentUser: AuthUserPrincipal,
  ): Promise<RegulatoryRuleProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'add rules to');

    const existing = await this.regulatoryRuleRepository.findOne({
      where: { ruleVersionId: versionId, ruleCode: dto.ruleCode },
    });
    if (existing) {
      throw new ConflictException(
        `Rule with code "${dto.ruleCode}" already exists in version ${version.versionNumber}.`,
      );
    }

    const rule = this.regulatoryRuleRepository.create({
      ruleVersionId: versionId,
      ruleCode: dto.ruleCode,
      title: dto.title,
      description: dto.description,
      ruleType: dto.ruleType,
      severity: dto.severity,
      parametersJsonb: dto.parametersJsonb || {},
      sourceClause: dto.sourceClause || null,
      sourceClassification: dto.sourceClassification || null,
    });

    const saved = await this.regulatoryRuleRepository.save(rule);
    this.logger.log(
      `User ${currentUser.email} added rule ${saved.ruleCode} to version ${version.id}`,
    );

    return this.mapRegulatoryRule(saved);
  }

  /**
   * Update an existing regulatory rule in a draft version.
   */
  async updateRegulatoryRule(
    versionId: string,
    ruleId: string,
    dto: UpdateRegulatoryRuleDto,
    currentUser: AuthUserPrincipal,
  ): Promise<RegulatoryRuleProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'modify rules in');

    const rule = await this.regulatoryRuleRepository.findOne({
      where: { id: ruleId, ruleVersionId: versionId },
    });
    if (!rule) {
      throw new NotFoundException(
        `RegulatoryRule with ID "${ruleId}" was not found in version "${versionId}".`,
      );
    }

    if (dto.ruleCode && dto.ruleCode !== rule.ruleCode) {
      const existing = await this.regulatoryRuleRepository.findOne({
        where: { ruleVersionId: versionId, ruleCode: dto.ruleCode },
      });
      if (existing) {
        throw new ConflictException(
          `Rule with code "${dto.ruleCode}" already exists in version ${version.versionNumber}.`,
        );
      }
      rule.ruleCode = dto.ruleCode;
    }

    if (dto.title !== undefined) rule.title = dto.title;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.ruleType !== undefined) rule.ruleType = dto.ruleType;
    if (dto.severity !== undefined) rule.severity = dto.severity;
    if (dto.parametersJsonb !== undefined)
      rule.parametersJsonb = dto.parametersJsonb;
    if (dto.sourceClause !== undefined)
      rule.sourceClause = dto.sourceClause || null;
    if (dto.sourceClassification !== undefined)
      rule.sourceClassification = dto.sourceClassification || null;

    const saved = await this.regulatoryRuleRepository.save(rule);
    this.logger.log(
      `User ${currentUser.email} updated rule ${saved.ruleCode} (${saved.id})`,
    );

    return this.mapRegulatoryRule(saved);
  }

  /**
   * Delete a regulatory rule from a draft version.
   */
  async deleteRegulatoryRule(
    versionId: string,
    ruleId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<{ message: string }> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'delete rules from');

    const rule = await this.regulatoryRuleRepository.findOne({
      where: { id: ruleId, ruleVersionId: versionId },
    });
    if (!rule) {
      throw new NotFoundException(
        `RegulatoryRule with ID "${ruleId}" was not found in version "${versionId}".`,
      );
    }

    await this.regulatoryRuleRepository.remove(rule);
    this.logger.log(
      `User ${currentUser.email} deleted rule ${rule.ruleCode} (${rule.id})`,
    );

    return { message: `Rule "${rule.ruleCode}" removed successfully.` };
  }

  /**
   * Create a checklist template in a draft version.
   */
  async createChecklistTemplate(
    versionId: string,
    dto: CreateChecklistTemplateDto,
    currentUser: AuthUserPrincipal,
  ): Promise<ChecklistTemplateProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'add checklist templates to');

    const existing = await this.checklistTemplateRepository.findOne({
      where: { ruleVersionId: versionId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Checklist template with code "${dto.code}" already exists in version ${version.versionNumber}.`,
      );
    }

    const template = this.checklistTemplateRepository.create({
      ruleVersionId: versionId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      applicationCategory: dto.applicationCategory,
    });

    const saved = await this.checklistTemplateRepository.save(template);
    this.logger.log(
      `User ${currentUser.email} created checklist template ${saved.code} (${saved.id})`,
    );

    return this.mapChecklistTemplate(saved, []);
  }

  /**
   * Add a checklist item to a checklist template in a draft version.
   */
  async createChecklistItem(
    versionId: string,
    templateId: string,
    dto: CreateChecklistItemDto,
    currentUser: AuthUserPrincipal,
  ): Promise<ChecklistItemProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    this.assertVersionIsDraft(version, 'add checklist items to');

    const template = await this.checklistTemplateRepository.findOne({
      where: { id: templateId, ruleVersionId: versionId },
    });
    if (!template) {
      throw new NotFoundException(
        `ChecklistTemplate with ID "${templateId}" was not found in version "${versionId}".`,
      );
    }

    const existingItem = await this.checklistItemRepository.findOne({
      where: { checklistTemplateId: templateId, itemCode: dto.itemCode },
    });
    if (existingItem) {
      throw new ConflictException(
        `Checklist item with code "${dto.itemCode}" already exists in template ${template.code}.`,
      );
    }

    if (dto.ruleId) {
      const rule = await this.regulatoryRuleRepository.findOne({
        where: { id: dto.ruleId, ruleVersionId: versionId },
      });
      if (!rule) {
        throw new BadRequestException(
          `Associated rule with ID "${dto.ruleId}" does not exist in this rule version.`,
        );
      }
    }

    const item = this.checklistItemRepository.create({
      checklistTemplateId: templateId,
      itemCode: dto.itemCode,
      description: dto.description,
      itemType: dto.itemType,
      required: dto.required !== undefined ? dto.required : true,
      evidenceDocumentType: dto.evidenceDocumentType || null,
      displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : 0,
      ruleId: dto.ruleId || null,
      guidanceNotes: dto.guidanceNotes || null,
    });

    const saved = await this.checklistItemRepository.save(item);
    this.logger.log(
      `User ${currentUser.email} added checklist item ${saved.itemCode} to template ${template.code}`,
    );

    return this.mapChecklistItem(saved);
  }

  /**
   * Atomically validate and publish a draft RuleVersion.
   * Enforces:
   * 1. Must be currently in DRAFT status.
   * 2. Must contain at least one regulatory rule.
   * 3. Valid effective date range.
   * 4. No overlapping effective date range with an existing PUBLISHED version for the same RuleSet.
   */
  async publishRuleVersion(
    versionId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.dataSource.transaction(async (manager) => {
      const versionRepo = manager.getRepository(RuleVersion);
      const ruleRepo = manager.getRepository(RegulatoryRule);
      const templateRepo = manager.getRepository(ChecklistTemplate);

      const version = await versionRepo.findOne({
        where: { id: versionId },
        relations: ['rules', 'checklistTemplates', 'checklistTemplates.items'],
      });

      if (!version) {
        throw new NotFoundException(
          `RuleVersion with ID "${versionId}" was not found.`,
        );
      }

      if (version.status !== RuleLifecycleStatus.DRAFT) {
        throw new BadRequestException(
          `Only DRAFT versions can be published. Version is currently ${version.status}.`,
        );
      }

      // Invariant: at least 1 rule required for publication
      const ruleCount = await ruleRepo.count({
        where: { ruleVersionId: versionId },
      });
      if (ruleCount === 0) {
        throw new BadRequestException(
          'Cannot publish a rule version without any regulatory rules.',
        );
      }

      // Validate effective date range
      if (version.effectiveTo && version.effectiveTo <= version.effectiveFrom) {
        throw new BadRequestException(
          'Cannot publish: effectiveTo must be strictly after effectiveFrom.',
        );
      }

      // Validate source metadata for verified regulatory classification
      if (
        version.sourceClassification ===
        RuleSourceClassification.VERIFIED_REGULATORY
      ) {
        if (!version.sourceTitle || !version.sourceReference) {
          throw new BadRequestException(
            'Cannot publish as VERIFIED_REGULATORY: sourceTitle and sourceReference citations are mandatory.',
          );
        }
      }

      // Check for overlapping date ranges with existing PUBLISHED versions in this RuleSet
      const publishedVersions = await versionRepo.find({
        where: {
          ruleSetId: version.ruleSetId,
          status: RuleLifecycleStatus.PUBLISHED,
        },
      });

      const newFrom = version.effectiveFrom.getTime();
      const newTo = version.effectiveTo
        ? version.effectiveTo.getTime()
        : Number.POSITIVE_INFINITY;

      for (const pub of publishedVersions) {
        const pubFrom = pub.effectiveFrom.getTime();
        const pubTo = pub.effectiveTo
          ? pub.effectiveTo.getTime()
          : Number.POSITIVE_INFINITY;

        // Two intervals [A_from, A_to) and [B_from, B_to) overlap if A_from < B_to AND A_to > B_from
        if (newFrom < pubTo && newTo > pubFrom) {
          throw new BadRequestException(
            `Cannot publish version: effective date range (${version.effectiveFrom.toISOString()} - ${
              version.effectiveTo
                ? version.effectiveTo.toISOString()
                : 'indefinite'
            }) overlaps with existing published version ${pub.versionNumber} (${pub.effectiveFrom.toISOString()} - ${
              pub.effectiveTo ? pub.effectiveTo.toISOString() : 'indefinite'
            }).`,
          );
        }
      }

      version.status = RuleLifecycleStatus.PUBLISHED;
      version.publishedAt = new Date();
      version.publishedBy = currentUser.id;

      const saved = await versionRepo.save(version);
      this.logger.log(
        `User ${currentUser.email} published RuleVersion ${saved.versionNumber} (${saved.id}) for RuleSet ${saved.ruleSetId}`,
      );

      const rules = await ruleRepo.find({
        where: { ruleVersionId: versionId },
        order: { ruleCode: 'ASC' },
      });
      const templates = await templateRepo.find({
        where: { ruleVersionId: versionId },
        relations: ['items'],
        order: { code: 'ASC' },
      });
      for (const t of templates) {
        if (t.items) {
          t.items.sort((a, b) => a.displayOrder - b.displayOrder);
        }
      }

      return this.mapRuleVersion(saved, rules, templates);
    });
  }

  /**
   * Retire a published RuleVersion.
   * Preserves all historical records permanently for past auditability.
   */
  async retireRuleVersion(
    versionId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    const version = await this.ruleVersionRepository.findOne({
      where: { id: versionId },
      relations: ['rules', 'checklistTemplates', 'checklistTemplates.items'],
    });

    if (!version) {
      throw new NotFoundException(
        `RuleVersion with ID "${versionId}" was not found.`,
      );
    }

    if (version.status !== RuleLifecycleStatus.PUBLISHED) {
      throw new BadRequestException(
        `Only PUBLISHED rule versions can be retired. Current status is ${version.status}.`,
      );
    }

    version.status = RuleLifecycleStatus.RETIRED;
    version.retiredAt = new Date();
    version.retiredBy = currentUser.id;

    const saved = await this.ruleVersionRepository.save(version);
    this.logger.log(
      `User ${currentUser.email} retired RuleVersion ${saved.versionNumber} (${saved.id})`,
    );

    return this.mapRuleVersion(
      saved,
      version.rules || [],
      version.checklistTemplates || [],
    );
  }

  /**
   * Deterministically resolve the applicable published rule version for a given application
   * category and evaluation date.
   */
  async resolveApplicableRules(
    query: ResolveApplicableQueryDto,
  ): Promise<ApplicableRulesResolutionProjection> {
    const evaluationDate = query.evaluationDate
      ? new Date(query.evaluationDate)
      : new Date();

    if (isNaN(evaluationDate.getTime())) {
      throw new BadRequestException(
        'evaluationDate must be a valid ISO 8601 date string.',
      );
    }

    const ruleSet = await this.ruleSetRepository.findOne({
      where: { applicationCategory: query.category },
    });

    if (!ruleSet) {
      throw new NotFoundException(
        `No rule set found for application category: "${query.category}".`,
      );
    }

    // Query published versions that cover evaluationDate
    const publishedVersions = await this.ruleVersionRepository
      .createQueryBuilder('v')
      .where('v.ruleSetId = :ruleSetId', { ruleSetId: ruleSet.id })
      .andWhere('v.status = :status', { status: RuleLifecycleStatus.PUBLISHED })
      .andWhere('v.effectiveFrom <= :evalDate', { evalDate: evaluationDate })
      .andWhere('(v.effectiveTo IS NULL OR v.effectiveTo >= :evalDate)', {
        evalDate: evaluationDate,
      })
      .orderBy('v.versionNumber', 'DESC')
      .addOrderBy('v.effectiveFrom', 'DESC')
      .getMany();

    if (publishedVersions.length === 0) {
      throw new NotFoundException(
        `No applicable published rule version found for category "${query.category}" at evaluation date ${evaluationDate.toISOString()}.`,
      );
    }

    // Select the highest version number deterministically
    const selectedVersion = publishedVersions[0];

    const rules = await this.regulatoryRuleRepository.find({
      where: { ruleVersionId: selectedVersion.id },
      order: { ruleCode: 'ASC' },
    });

    const checklists = await this.checklistTemplateRepository.find({
      where: { ruleVersionId: selectedVersion.id },
      relations: ['items'],
      order: { code: 'ASC' },
    });

    for (const t of checklists) {
      if (t.items) {
        t.items.sort((a, b) => a.displayOrder - b.displayOrder);
      }
    }

    return {
      ruleSet: {
        id: ruleSet.id,
        code: ruleSet.code,
        name: ruleSet.name,
        applicationCategory: ruleSet.applicationCategory,
        issuingAuthority: ruleSet.issuingAuthority,
      },
      ruleVersion: {
        id: selectedVersion.id,
        versionNumber: selectedVersion.versionNumber,
        status: selectedVersion.status,
        effectiveFrom: selectedVersion.effectiveFrom,
        effectiveTo: selectedVersion.effectiveTo,
        sourceTitle: selectedVersion.sourceTitle,
        sourceReference: selectedVersion.sourceReference,
        sourceClassification: selectedVersion.sourceClassification,
        publishedAt: selectedVersion.publishedAt,
      },
      evaluationDate: evaluationDate.toISOString(),
      rules: rules.map((r) => this.mapRegulatoryRule(r)),
      checklists: checklists.map((t) =>
        this.mapChecklistTemplate(t, t.items || []),
      ),
    };
  }

  // --- Private Invariant Guards & Mappers ---

  private assertVersionIsDraft(version: RuleVersion, action: string): void {
    if (version.status !== RuleLifecycleStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot ${action} a published or retired rule version (${version.status}). Regulatory history is immutable. Create a new draft version instead.`,
      );
    }
  }

  private mapRuleSet(rs: RuleSet, versions?: RuleVersion[]): RuleSetProjection {
    return {
      id: rs.id,
      code: rs.code,
      name: rs.name,
      description: rs.description,
      applicationCategory: rs.applicationCategory,
      issuingAuthority: rs.issuingAuthority,
      versions: versions
        ? versions.map((v) =>
            this.mapRuleVersion(v, v.rules || [], v.checklistTemplates || []),
          )
        : undefined,
      createdAt: rs.createdAt,
      updatedAt: rs.updatedAt,
    };
  }

  private mapRuleVersion(
    v: RuleVersion,
    rules: RegulatoryRule[] = [],
    templates: ChecklistTemplate[] = [],
  ): RuleVersionProjection {
    return {
      id: v.id,
      ruleSetId: v.ruleSetId,
      versionNumber: v.versionNumber,
      status: v.status,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo,
      sourceTitle: v.sourceTitle,
      sourceReference: v.sourceReference,
      sourceClassification: v.sourceClassification,
      changeSummary: v.changeSummary,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
      retiredAt: v.retiredAt,
      retiredBy: v.retiredBy,
      rules: rules.map((r) => this.mapRegulatoryRule(r)),
      checklistTemplates: templates.map((t) =>
        this.mapChecklistTemplate(t, t.items || []),
      ),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private mapRegulatoryRule(r: RegulatoryRule): RegulatoryRuleProjection {
    return {
      id: r.id,
      ruleVersionId: r.ruleVersionId,
      ruleCode: r.ruleCode,
      title: r.title,
      description: r.description,
      ruleType: r.ruleType,
      severity: r.severity,
      parametersJsonb: r.parametersJsonb,
      sourceClause: r.sourceClause,
      sourceClassification: r.sourceClassification,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapChecklistTemplate(
    t: ChecklistTemplate,
    items: ChecklistItem[] = [],
  ): ChecklistTemplateProjection {
    return {
      id: t.id,
      ruleVersionId: t.ruleVersionId,
      code: t.code,
      name: t.name,
      description: t.description,
      applicationCategory: t.applicationCategory,
      items: items.map((i) => this.mapChecklistItem(i)),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private mapChecklistItem(i: ChecklistItem): ChecklistItemProjection {
    return {
      id: i.id,
      checklistTemplateId: i.checklistTemplateId,
      itemCode: i.itemCode,
      description: i.description,
      itemType: i.itemType,
      required: i.required,
      evidenceDocumentType: i.evidenceDocumentType,
      displayOrder: i.displayOrder,
      ruleId: i.ruleId,
      guidanceNotes: i.guidanceNotes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }
}
