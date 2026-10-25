/**
 * ApprovalSync — Dossier Report Controller
 * Milestone: DOC-07
 *
 * Exposes endpoints for executing and retrieving consolidated evidence-linked
 * dossier verification reports and queue summary metrics across applications.
 *
 * Enforces ADR-004 Human Sovereignty: all findings and statuses are strictly advisory.
 * Enforces institutional tenancy isolation.
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import { DossierOrchestratorService } from './services/dossier-orchestrator.service';
import { DossierReportDto, DossierSummaryDto, DossierQueryDto } from './dto';

@ApiTags('Document Verification')
@ApiBearerAuth('jwt')
@Controller()
export class DossierReportController {
  constructor(
    private readonly dossierOrchestratorService: DossierOrchestratorService,
  ) {}

  @Post('applications/:id/dossier-report')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary: 'Execute multi-pipeline dossier verification and generate report',
    description:
      'Orchestrates document completeness, field completeness, expiry validity, cross-record consistency (DOC-03), cryptographic and near-duplicate detection, structural integrity checks (DOC-04), external/simulated issuer verification (DOC-05), and regulatory compliance & infrastructure review assist (DOC-06). Persists snapshot in application metadata.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID to evaluate',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier report evaluated successfully',
    type: DossierReportDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Tenancy mismatch: Cannot evaluate dossier for another institution',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async evaluateDossier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: DossierQueryDto,
  ): Promise<DossierReportDto> {
    return this.dossierOrchestratorService.evaluateDossier(id, user, query);
  }

  @Post('applications/:id/dossier-report/evaluate')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary: 'Explicitly evaluate application dossier report',
    description:
      'Action alias for triggering complete multi-pipeline dossier orchestration.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID to evaluate',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier report evaluated successfully',
    type: DossierReportDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async evaluateDossierAction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: DossierQueryDto,
  ): Promise<DossierReportDto> {
    return this.dossierOrchestratorService.evaluateDossier(id, user, query);
  }

  @Get('applications/:id/dossier-report')
  @HttpCode(HttpStatus.OK)
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
    summary: 'Retrieve consolidated dossier verification report',
    description:
      'Retrieves the existing cached dossier verification report, document verification matrix, and categorized findings. Automatically evaluates if not previously evaluated, or if recalculate=true.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier report retrieved successfully',
    type: DossierReportDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async getDossierReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: DossierQueryDto,
  ): Promise<DossierReportDto> {
    return this.dossierOrchestratorService.getDossierReport(id, user, query);
  }

  @Get('applications/:id/dossier-report/summary')
  @HttpCode(HttpStatus.OK)
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
    summary:
      'Retrieve lightweight dossier verification summary for scrutiny queue',
    description:
      'Returns aggregate counts of critical deficiencies, advisory warnings, duplicate matches, integrity anomalies, issuer verifications, and physical inspection triggers for dashboard and queue displays.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Dossier summary retrieved successfully',
    type: DossierSummaryDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async getDossierSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: DossierQueryDto,
  ): Promise<DossierSummaryDto> {
    return this.dossierOrchestratorService.getDossierSummary(id, user, query);
  }
}
