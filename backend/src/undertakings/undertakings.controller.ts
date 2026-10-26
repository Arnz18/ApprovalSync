/**
 * ApprovalSync — Undertakings, Lease & Expiry Tracking Controller
 * Milestone: BE-09
 *
 * Exposes authorized endpoints for institutional undertakings, lease covenants,
 * validity periods, renewal submissions, human review actions, and expiry reconciliation.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import { UndertakingsService } from './undertakings.service';
import {
  CreateUndertakingDto,
  UpdateUndertakingDto,
  ReviewUndertakingDto,
  RenewUndertakingDto,
  UndertakingQueryDto,
  UndertakingResponseDto,
  UndertakingHistoryResponseDto,
  UndertakingReconcileResponseDto,
} from './dto';
import { PaginationMeta } from '../shared/contracts';

@ApiTags('Undertakings & Leases')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UndertakingsController {
  constructor(private readonly undertakingsService: UndertakingsService) {}

  @Post('undertakings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an undertaking or lease record',
    description:
      'Creates a new institutional undertaking or lease record in DRAFT status with deterministic renewal deadlines. Tenant-isolated for applicant users.',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Undertaking created successfully',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  async createUndertaking(
    @Body() dto: CreateUndertakingDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.createUndertaking(dto, user);
  }

  @Get('undertakings')
  @ApiOperation({
    summary: 'List undertakings and lease records',
    description:
      'Returns paginated undertakings with lifecycle status, renewal deadlines, and date filters. Institution users are strictly tenant-isolated to their own institution.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of undertakings',
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  async getUndertakings(
    @Query() query: UndertakingQueryDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<{ items: UndertakingResponseDto[]; pagination: PaginationMeta }> {
    return this.undertakingsService.getUndertakings(query, user);
  }

  @Get('applications/:id/undertakings')
  @ApiOperation({
    summary: 'List undertakings for an application',
    description:
      'Application-scoped alias retrieving all undertakings associated with a specific approval workflow application.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated undertakings for application',
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  async getApplicationUndertakings(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Query() query: UndertakingQueryDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<{ items: UndertakingResponseDto[]; pagination: PaginationMeta }> {
    return this.undertakingsService.getUndertakings(
      { ...query, applicationId },
      user,
    );
  }

  @Post('undertakings/reconcile')
  @ApiOperation({
    summary: 'Reconcile undertaking expiry states',
    description:
      'Executes deterministic calendar sweep evaluating EXPIRING_SOON, RENEWAL_DUE, and EXPIRED records relative to an evaluation date. Restricted to regulatory review officers.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Reconciliation summary tally',
    type: UndertakingReconcileResponseDto,
  })
  @Roles(UserRole.REGIONAL_OFFICER, UserRole.BUREAU_HEAD, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  async reconcileUndertakings(
    @Query('asOfDate') asOfDate?: string,
    @CurrentUser() user?: AuthUserPrincipal,
  ): Promise<UndertakingReconcileResponseDto> {
    return this.undertakingsService.reconcileUndertakings(asOfDate, user);
  }

  @Get('undertakings/:id')
  @ApiOperation({
    summary: 'Retrieve undertaking by ID',
    description:
      'Returns a single undertaking record. Returns HTTP 404 anti-enumeration for cross-tenant attempts by institution users.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Undertaking details',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  async getUndertakingById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asOfDate') asOfDate: string | undefined,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.getUndertakingById(id, user, asOfDate);
  }

  @Patch('undertakings/:id')
  @ApiOperation({
    summary: 'Update undertaking details',
    description:
      'Updates non-validity descriptive fields while preserving validity history. Rejects modification on superseded or terminated records.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Updated undertaking',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  async updateUndertaking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUndertakingDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.updateUndertaking(id, dto, user);
  }

  @Post('undertakings/:id/submit')
  @ApiOperation({
    summary: 'Submit DRAFT undertaking for review',
    description:
      'Transitions undertaking from DRAFT to SUBMITTED state for regulatory review.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Submitted undertaking',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async submitUndertaking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.submitUndertaking(id, user);
  }

  @Post('undertakings/:id/review')
  @ApiOperation({
    summary: 'Record officer review outcome',
    description:
      'Records human review officer disposition (VERIFIED, DEFICIENT, REJECTED) with mandatory justification notes. Restricted to regulatory review officers.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Reviewed undertaking',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async reviewUndertaking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewUndertakingDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.reviewUndertaking(id, dto, user);
  }

  @Post('undertakings/:id/renew')
  @ApiOperation({
    summary: 'Renew and supersede undertaking',
    description:
      'Renews an active or expired undertaking with a new instrument. Atomically creates the renewal record, marks the old record SUPERSEDED, and links the supersession chain without cycles.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID to supersede' })
  @SwaggerResponse({
    status: 201,
    description: 'New renewal undertaking created',
    type: UndertakingResponseDto,
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.REGIONAL_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  async renewUndertaking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewUndertakingDto,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingResponseDto> {
    return this.undertakingsService.renewUndertaking(id, dto, user);
  }

  @Get('undertakings/:id/history')
  @ApiOperation({
    summary: 'Retrieve undertaking chronological history',
    description:
      'Returns complete immutable history of actions, status transitions, review notes, and supersession links for an undertaking.',
  })
  @ApiParam({ name: 'id', description: 'Undertaking UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Chronological undertaking history entries',
    type: [UndertakingHistoryResponseDto],
  })
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  async getUndertakingHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUserPrincipal,
  ): Promise<UndertakingHistoryResponseDto[]> {
    return this.undertakingsService.getUndertakingHistory(id, user);
  }
}
