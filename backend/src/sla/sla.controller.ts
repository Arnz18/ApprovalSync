/**
 * ApprovalSync — SLA Controller
 * Milestone: BE-08
 *
 * Exposes REST endpoints for SLA timer inspection, active stage timer lookups,
 * authorized pause/resume operations, configured SLA policy listings,
 * escalation event history, and administrative reconciliation sweeps.
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
import { UserRole, PaginationMeta } from '../shared/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { SlaService } from './sla.service';
import {
  PauseTimerDto,
  SlaTimerQueryDto,
  SlaEscalationQueryDto,
  SlaTimerResponseDto,
  SlaEscalationResponseDto,
  SlaPolicyResponseDto,
  SlaReconcileResponseDto,
} from './dto';

@ApiTags('SLA Timers & Escalations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('applications/:id/sla-timers')
  @ApiOperation({
    summary: 'Retrieve SLA timers for an application',
    description:
      'Returns paginated chronological SLA timers for an application with status, deadlines, pause history, and escalation tracking. Tenant-isolated for institution users.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'SLA timers retrieved successfully',
  })
  @SwaggerResponse({ status: 404, description: 'Application not found' })
  async getTimersForApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query() query: SlaTimerQueryDto,
  ): Promise<{ data: SlaTimerResponseDto[]; meta: PaginationMeta }> {
    return this.slaService.getTimersForApplication(id, currentUser, query);
  }

  @Get('applications/:id/sla-timers/active')
  @ApiOperation({
    summary: 'Retrieve active or paused SLA timer for an application',
    description:
      'Returns the currently running or paused SLA timer for the current workflow stage.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Active SLA timer retrieved (or null if none active)',
    type: SlaTimerResponseDto,
  })
  @SwaggerResponse({ status: 404, description: 'Application not found' })
  async getActiveTimerForApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<SlaTimerResponseDto | null> {
    return this.slaService.getActiveTimerForApplication(id, currentUser);
  }

  @Post('applications/:id/sla-timers/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pause an active SLA timer',
    description:
      'Freezes an active SLA timer with a mandatory justification reason. Only authorized regulatory officers may pause timers.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'SLA timer paused successfully',
    type: SlaTimerResponseDto,
  })
  @SwaggerResponse({
    status: 400,
    description: 'Timer is already paused or policy disallows pausing',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Caller role not authorized to pause timers',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Application or active SLA timer not found',
  })
  @Roles(
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
  )
  async pauseTimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() dto: PauseTimerDto,
  ): Promise<SlaTimerResponseDto> {
    const timer = await this.slaService.pauseTimer(id, currentUser, dto);
    return this.slaService.mapTimerToDto(timer);
  }

  @Post('applications/:id/sla-timers/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resume a paused SLA timer',
    description:
      'Resumes a paused SLA timer, extending deadlines forward by the exact elapsed pause duration. Only authorized regulatory officers may resume timers.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'SLA timer resumed successfully',
    type: SlaTimerResponseDto,
  })
  @SwaggerResponse({
    status: 403,
    description: 'Caller role not authorized to resume timers',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Application or paused SLA timer not found',
  })
  @Roles(
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
  )
  async resumeTimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<SlaTimerResponseDto> {
    const timer = await this.slaService.resumeTimer(id, currentUser);
    return this.slaService.mapTimerToDto(timer);
  }

  @Get('sla/policies')
  @ApiOperation({
    summary: 'List configured SLA policies',
    description:
      'Lists all configured SLA policies, target durations, warning thresholds, escalation targets, and illustrative demo disclaimers.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Configured SLA policies retrieved',
    type: [SlaPolicyResponseDto],
  })
  getPolicies(): SlaPolicyResponseDto[] {
    return this.slaService.getPolicies();
  }

  @Get('sla/escalations')
  @ApiOperation({
    summary: 'Retrieve SLA escalation event logs',
    description:
      'Returns paginated idempotent SLA escalation records for regulatory oversight and monitoring.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Escalations retrieved successfully',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Caller role not authorized to view escalation logs',
  })
  @Roles(
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
  )
  async getEscalations(
    @Query() query: SlaEscalationQueryDto,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<{ data: SlaEscalationResponseDto[]; meta: PaginationMeta }> {
    return this.slaService.getEscalations(query, currentUser);
  }

  @Post('sla/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute manual SLA timer reconciliation sweep',
    description:
      'Authoritative database sweep that evaluates overdue timers and emits warnings and breaches directly from PostgreSQL state. Restricted to SYSTEM_ADMIN.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Reconciliation sweep completed',
    type: SlaReconcileResponseDto,
  })
  @SwaggerResponse({
    status: 403,
    description: 'Only SYSTEM_ADMIN can trigger reconciliation sweeps',
  })
  @Roles(UserRole.SYSTEM_ADMIN)
  async reconcile(): Promise<SlaReconcileResponseDto> {
    return this.slaService.reconcileOverdueTimers();
  }
}
