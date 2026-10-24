/**
 * ApprovalSync — Document Verification Controller
 * Milestone: DOC-03
 *
 * Exposes endpoints for executing document completeness, expiry, and cross-record
 * consistency validation across application attachments.
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
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';
import { ApplicationValidationResultDto, ValidationQueryDto } from './dto';

@ApiTags('Document Verification')
@ApiBearerAuth('jwt')
@Controller()
export class VerificationController {
  constructor(
    private readonly orchestratorService: ValidationOrchestratorService,
  ) {}

  @Post('applications/:id/validate-documents')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({
    summary:
      'Validate application document completeness, expiry, and consistency',
    description:
      'Executes deterministic document completeness rules, statutory field checks, expiry validation, and fuzzy cross-record matching against application and institution records.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID to validate',
  })
  @ApiResponse({
    status: 200,
    description:
      'Validation evaluated successfully with evidence-linked findings',
    type: ApplicationValidationResultDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Tenancy mismatch: Cannot validate applications for another institution',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async validateDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: ValidationQueryDto,
  ): Promise<ApplicationValidationResultDto> {
    return this.orchestratorService.validateApplicationDocuments(
      id,
      user,
      query,
    );
  }

  @Get('applications/:id/validation-report')
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
    summary: 'Retrieve document validation report and findings',
    description:
      'Retrieves the existing or recalculated validation findings, advisory flags, and evidence locations for an application.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation report retrieved',
    type: ApplicationValidationResultDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async getValidationReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query?: ValidationQueryDto,
  ): Promise<ApplicationValidationResultDto> {
    return this.orchestratorService.getValidationReport(id, user, query);
  }
}
