/**
 * ApprovalSync — Issuer Verification & Provider Discovery Controller
 * Milestone: DOC-05
 *
 * Exposes endpoints for discovering verification adapters, executing issuer verification,
 * and retrieving verified source status with tenant boundary protections.
 */

import {
  Controller,
  Get,
  Post,
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
import { IssuerVerificationService } from './services/issuer-verification.service';
import {
  ProviderDiscoveryDto,
  VerifyIssuerDto,
  IssuerVerificationResultDto,
} from './dto';

@ApiTags('Issuer Verification')
@ApiBearerAuth('jwt')
@Controller()
export class ProvidersController {
  constructor(
    private readonly issuerVerificationService: IssuerVerificationService,
  ) {}

  @Get('providers')
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
    summary: 'Discover registered verification provider adapters and status',
    description:
      'Returns a catalog of registered verification adapters, capability declarations, and simulation indicators.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of registered verification providers',
    type: [ProviderDiscoveryDto],
  })
  listProviders(): ProviderDiscoveryDto[] {
    return this.issuerVerificationService.listAvailableProviders();
  }

  @Post('documents/:id/verify-issuer')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Verify document against issuer registry or simulation adapter',
    description:
      'Dispatches a normalized verification request to the designated provider. If an authorized provider is requested but unconfigured, returns an honest SOURCE_UNAVAILABLE rather than a silent mock fallback.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID to verify',
  })
  @ApiResponse({
    status: 200,
    description: 'Issuer verification evaluated and persisted successfully',
    type: IssuerVerificationResultDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Tenancy mismatch: Cannot verify documents belonging to another institution',
  })
  @ApiResponse({
    status: 404,
    description: 'Document or requested provider not found',
  })
  async verifyIssuer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Body() dto?: VerifyIssuerDto,
  ): Promise<IssuerVerificationResultDto> {
    return this.issuerVerificationService.verifyDocumentIssuer(id, user, dto);
  }

  @Get('documents/:id/issuer-verification')
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
    summary: 'Retrieve persisted issuer verification findings for a document',
    description:
      'Retrieves the latest verified issuer status, comparison findings, source identity, and simulation markers.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Document UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Issuer verification findings retrieved',
    type: IssuerVerificationResultDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: tenancy mismatch',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found or verification not yet executed',
  })
  async getIssuerVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<IssuerVerificationResultDto> {
    return this.issuerVerificationService.getDocumentIssuerVerification(
      id,
      user,
    );
  }
}
