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
import {
  ApplicationValidationResultDto,
  ValidationQueryDto,
  DuplicateDetectionResultDto,
  DocumentIntegrityResultDto,
} from './dto';

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

  @Post('applications/:id/check-duplicates')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Evaluate exact and near-duplicates for application attachments',
    description:
      'Performs SHA-256 cryptographic duplicate detection (intra-application, inter-application, and cross-institution) and OCR layout/template near-duplicate similarity checks with tenant isolation.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Application UUID to check for duplicates',
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicate evaluation completed with findings',
    type: DuplicateDetectionResultDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async checkDuplicates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<DuplicateDetectionResultDto> {
    return this.orchestratorService.checkApplicationDuplicates(id, user);
  }

  @Post('documents/:id/check-integrity')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary:
      'Evaluate document structural integrity, active content, and metadata',
    description:
      'Inspects PDF structure (%PDF- header, %%EOF trailer), active content (/JS, /Launch), metadata timeline inversion, image editing tool artifacts (Photoshop, GIMP), and digital signature status.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID to inspect',
  })
  @ApiResponse({
    status: 200,
    description: 'Document integrity evaluated with findings',
    type: DocumentIntegrityResultDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async checkDocumentIntegrity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<DocumentIntegrityResultDto> {
    return this.orchestratorService.checkDocumentIntegrity(id, user);
  }

  @Get('documents/:id/integrity')
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
    summary: 'Retrieve document integrity and anomaly inspection results',
    description:
      'Retrieves structural integrity, active content, and tamper indicator findings for a specific document attachment.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document integrity report retrieved',
    type: DocumentIntegrityResultDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocumentIntegrity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<DocumentIntegrityResultDto> {
    return this.orchestratorService.checkDocumentIntegrity(id, user);
  }
}
