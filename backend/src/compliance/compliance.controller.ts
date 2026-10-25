/**
 * ApprovalSync — Compliance Evidence & Infrastructure Review Controller
 * Milestone: DOC-06
 *
 * Exposes decision-support endpoints for automated regulatory checklist evaluation,
 * evidence traceability, and explainable infrastructure review heuristics.
 *
 * Enforces ADR-004 Human Sovereignty: all outputs are strictly advisory.
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
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
import { ComplianceService } from './services/compliance.service';
import { EvaluateComplianceDto, ComplianceAssessmentResultDto } from './dto';

@ApiTags('Compliance Assist')
@ApiBearerAuth('jwt')
@Controller()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('applications/:id/compliance-assist/evaluate')
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
      'Evaluate application compliance against versioned rules and infrastructure heuristics',
    description:
      'Executes rule matching, documentary evidence traceability, deficiency detection, and physical infrastructure sanity checks. Strictly advisory under ADR-004.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance assessment completed successfully.',
    type: ComplianceAssessmentResultDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Tenancy mismatch or unauthorized role.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found.',
  })
  public async evaluateCompliance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() dto?: EvaluateComplianceDto,
  ): Promise<ComplianceAssessmentResultDto> {
    return this.complianceService.evaluateCompliance(id, currentUser, dto);
  }

  @Post('applications/:id/compliance-assist')
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
    summary: 'Evaluate compliance assist (convenience alias)',
    description:
      'Alias endpoint for POST applications/:id/compliance-assist/evaluate.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance assessment completed successfully.',
    type: ComplianceAssessmentResultDto,
  })
  public async evaluateComplianceAlias(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() dto?: EvaluateComplianceDto,
  ): Promise<ComplianceAssessmentResultDto> {
    return this.complianceService.evaluateCompliance(id, currentUser, dto);
  }

  @Get('applications/:id/compliance-assist')
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
    summary: 'Retrieve compliance assessment for application',
    description:
      'Retrieves the latest compliance assessment and infrastructure review for the specified application, computing fresh findings if none exist.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance assessment retrieved successfully.',
    type: ComplianceAssessmentResultDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Tenancy mismatch or unauthorized role.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found.',
  })
  public async getApplicationCompliance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<ComplianceAssessmentResultDto> {
    return this.complianceService.getApplicationCompliance(id, currentUser);
  }
}
