/**
 * ApprovalSync — Cryptographic Audit Ledger Controller
 * Milestone: BE-07
 *
 * Exposes REST endpoints for audit trail retrieval, cryptographic chain verification,
 * Merkle proof generation, and standalone proof verification.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '../shared/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { AuditService } from './audit.service';
import {
  AuditLogQueryDto,
  VerifyProofDto,
  AuditLogResponseDto,
  AuditVerificationResponseDto,
  AuditCheckpointResponseDto,
  MerkleProofResponseDto,
} from './dto';

@ApiTags('Cryptographic Audit Ledger')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('applications/:id/audit-logs')
  @ApiOperation({
    summary: 'Retrieve paginated cryptographic audit logs for an application',
    description:
      'Returns chronological audit log records with canonical payload hashes, previous hash bindings, and current block hashes. Tenant-isolated for institution users.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: [AuditLogResponseDto],
  })
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
  async getAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.getAuditLogsForApplication(id, user, query);
  }

  @Get('applications/:id/audit-logs/verify')
  @ApiOperation({
    summary: 'Verify cryptographic integrity of the application audit chain',
    description:
      'Iterates from genesis through the chain head, recomputing leaf hashes and sequential SHA-256 block hashes. Computes the RFC 6962 Merkle root.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Chain verification result',
    type: AuditVerificationResponseDto,
  })
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
  async verifyChain(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ) {
    return this.auditService.verifyApplicationChain(id, user);
  }

  @Get('applications/:id/audit-logs/checkpoint')
  @ApiOperation({
    summary:
      'Retrieve or record latest cryptographic checkpoint for the application',
    description:
      'Returns a verified checkpoint binding sequence number, chain head hash, total blocks, and RFC 6962 Merkle root.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Latest cryptographic checkpoint',
    type: AuditCheckpointResponseDto,
  })
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
  async getCheckpoint(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ) {
    return this.auditService.getLatestCheckpoint(id, user);
  }

  @Get('applications/:id/audit-logs/:sequenceNumber/proof')
  @ApiOperation({
    summary:
      'Generate an RFC 6962 Merkle Inclusion Proof for a specific audit block',
    description:
      'Returns the proof path and expected Merkle root enabling independent mathematical verification that the block is anchored in the ledger.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiParam({
    name: 'sequenceNumber',
    description: 'Sequence number of the target audit block',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Merkle inclusion proof',
    type: MerkleProofResponseDto,
  })
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
  async getProof(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sequenceNumber') sequenceNumber: string,
    @CurrentUser() user: AuthUserPrincipal,
  ) {
    return this.auditService.getMerkleProof(id, sequenceNumber, user);
  }

  @Post('audit/verify-proof')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Standalone verification of an RFC 6962 Merkle inclusion proof',
    description:
      'Computes the Merkle root upward from the provided leaf hash and proof path, comparing it against the expected root.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Verification outcome',
  })
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
  async verifyStandaloneProof(@Body() dto: VerifyProofDto) {
    return this.auditService.verifyStandaloneProof(dto);
  }
}
