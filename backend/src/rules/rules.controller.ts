/**
 * ApprovalSync — Rules and Checklists Controller
 * Milestone: BE-05
 *
 * REST API endpoints for regulatory rule sets, version lifecycle, checklists,
 * and deterministic applicable-version resolution.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole, PaginationMeta } from '../shared/contracts';
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

@ApiTags('Regulatory Rules & Checklists')
@ApiBearerAuth('JWT')
@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get('applicable')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.EVC_INSPECTOR,
    UserRole.SHC_SAC_MEMBER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Resolve applicable published rule version and checklist',
    description:
      'Deterministically resolves the effective published regulatory rules and checklist requirements for an application category at a specific evaluation date.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Applicable rule version and checklist resolved successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Invalid category or malformed evaluation date',
  })
  @SwaggerResponse({
    status: 404,
    description: 'No applicable published rule version found',
  })
  async resolveApplicable(
    @Query() query: ResolveApplicableQueryDto,
  ): Promise<ApplicableRulesResolutionProjection> {
    return await this.rulesService.resolveApplicableRules(query);
  }

  @Post('sets')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new regulatory rule set',
    description:
      'Creates a new regulatory rule set representing a domain or category. Restricted to SYSTEM_ADMIN.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'RuleSet created successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation failed',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Forbidden: requires SYSTEM_ADMIN role',
  })
  @SwaggerResponse({
    status: 409,
    description: 'RuleSet code already exists',
  })
  async createRuleSet(
    @Body() dto: CreateRuleSetDto,
  ): Promise<RuleSetProjection> {
    return await this.rulesService.createRuleSet(dto);
  }

  @Get('sets')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.EVC_INSPECTOR,
    UserRole.SHC_SAC_MEMBER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'List regulatory rule sets',
    description:
      'Lists regulatory rule sets with pagination, category filter, and search.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'List of rule sets returned successfully',
  })
  async getRuleSets(
    @Query() query: RuleQueryDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<{ items: RuleSetProjection[]; pagination: PaginationMeta }> {
    return await this.rulesService.getRuleSets(query, currentUser);
  }

  @Get('sets/:id')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.EVC_INSPECTOR,
    UserRole.SHC_SAC_MEMBER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Get regulatory rule set by ID',
    description:
      'Retrieves a specific rule set with its version history. Non-admin callers receive published/retired versions only.',
  })
  @ApiParam({ name: 'id', description: 'RuleSet UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'RuleSet retrieved successfully',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleSet not found',
  })
  async getRuleSetById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleSetProjection> {
    return await this.rulesService.getRuleSetById(id, currentUser);
  }

  @Post('sets/:id/versions')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a draft version for a rule set',
    description:
      'Creates a new draft version for drafting modified rules and checklist requirements. Restricted to SYSTEM_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'RuleSet UUID' })
  @SwaggerResponse({
    status: 201,
    description: 'Draft rule version created successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation failed',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleSet not found',
  })
  async createRuleVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRuleVersionDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.rulesService.createRuleVersion(id, dto, currentUser);
  }

  @Get('versions/:versionId')
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.EVC_INSPECTOR,
    UserRole.SHC_SAC_MEMBER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Get rule version details by ID',
    description:
      'Retrieves detailed rule version including its regulatory rules and checklist templates.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Rule version details retrieved successfully',
  })
  @SwaggerResponse({
    status: 403,
    description:
      'Forbidden: draft versions can only be inspected by SYSTEM_ADMIN',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleVersion not found',
  })
  async getRuleVersionById(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.rulesService.getRuleVersionById(versionId, currentUser);
  }

  @Patch('versions/:versionId')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Update draft rule version metadata',
    description:
      'Updates metadata of a draft rule version. Throws an error if version is already published or retired.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Draft rule version updated successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot mutate published/retired version or validation failed',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleVersion not found',
  })
  async updateRuleVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateRuleVersionDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.rulesService.updateRuleVersion(
      versionId,
      dto,
      currentUser,
    );
  }

  @Post('versions/:versionId/rules')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a regulatory rule to a draft version',
    description:
      'Adds a new regulatory rule requirement to a draft version. Prohibited on published versions.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 201,
    description: 'Regulatory rule created successfully',
  })
  @SwaggerResponse({
    status: 400,
    description:
      'Cannot add rules to published/retired version or invalid parameters',
  })
  @SwaggerResponse({
    status: 409,
    description: 'Rule code already exists in this version',
  })
  async createRegulatoryRule(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateRegulatoryRuleDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RegulatoryRuleProjection> {
    return await this.rulesService.createRegulatoryRule(
      versionId,
      dto,
      currentUser,
    );
  }

  @Patch('versions/:versionId/rules/:ruleId')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Update a regulatory rule in a draft version',
    description:
      'Updates a regulatory rule within a draft version. Prohibited on published versions.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @ApiParam({ name: 'ruleId', description: 'RegulatoryRule UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Regulatory rule updated successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot update rules in published/retired version',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Rule not found',
  })
  async updateRegulatoryRule(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateRegulatoryRuleDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RegulatoryRuleProjection> {
    return await this.rulesService.updateRegulatoryRule(
      versionId,
      ruleId,
      dto,
      currentUser,
    );
  }

  @Delete('versions/:versionId/rules/:ruleId')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Delete a regulatory rule from a draft version',
    description:
      'Removes a regulatory rule from a draft version. Prohibited on published versions.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @ApiParam({ name: 'ruleId', description: 'RegulatoryRule UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Regulatory rule deleted successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot delete rules from published/retired version',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Rule not found',
  })
  async deleteRegulatoryRule(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<{ message: string }> {
    return await this.rulesService.deleteRegulatoryRule(
      versionId,
      ruleId,
      currentUser,
    );
  }

  @Post('versions/:versionId/checklists')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a checklist template to a draft version',
    description:
      'Adds a checklist template to a draft version. Prohibited on published versions.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 201,
    description: 'Checklist template created successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot add checklist to published/retired version',
  })
  @SwaggerResponse({
    status: 409,
    description: 'Template code already exists in this version',
  })
  async createChecklistTemplate(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateChecklistTemplateDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<ChecklistTemplateProjection> {
    return await this.rulesService.createChecklistTemplate(
      versionId,
      dto,
      currentUser,
    );
  }

  @Post('versions/:versionId/checklists/:templateId/items')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a checklist item to a checklist template',
    description:
      'Adds a requirement or evidence checklist item to a template in a draft version. Prohibited on published versions.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @ApiParam({ name: 'templateId', description: 'ChecklistTemplate UUID' })
  @SwaggerResponse({
    status: 201,
    description: 'Checklist item added successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Cannot add items to published/retired version',
  })
  @SwaggerResponse({
    status: 409,
    description: 'Item code already exists in this template',
  })
  async createChecklistItem(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<ChecklistItemProjection> {
    return await this.rulesService.createChecklistItem(
      versionId,
      templateId,
      dto,
      currentUser,
    );
  }

  @Post('versions/:versionId/publish')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atomically validate and publish a draft rule version',
    description:
      'Validates all rules, ensures non-empty ruleset, checks date validity and overlapping published versions, and transitions version to PUBLISHED.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Rule version published successfully',
  })
  @SwaggerResponse({
    status: 400,
    description:
      'Publication invariants failed (e.g. no rules, invalid dates, overlapping published range)',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleVersion not found',
  })
  async publishRuleVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.rulesService.publishRuleVersion(versionId, currentUser);
  }

  @Post('versions/:versionId/retire')
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retire a published rule version',
    description:
      'Transitions a published rule version to RETIRED. Retains full immutable history for historical auditability.',
  })
  @ApiParam({ name: 'versionId', description: 'RuleVersion UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Rule version retired successfully',
  })
  @SwaggerResponse({
    status: 400,
    description: 'Only PUBLISHED versions can be retired',
  })
  @SwaggerResponse({
    status: 404,
    description: 'RuleVersion not found',
  })
  async retireRuleVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<RuleVersionProjection> {
    return await this.rulesService.retireRuleVersion(versionId, currentUser);
  }
}
