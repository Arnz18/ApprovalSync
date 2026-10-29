/**
 * ApprovalSync — Workflow Controller
 * Milestone: BE-06 / AICTE-26262
 *
 * REST endpoints for application FSM state transitions, timeline history,
 * EVC inspection scheduling, and stage-wise pendency metrics.
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { WorkflowService } from './workflow.service';
import {
  TransitionRequestDto,
  TimelineQueryDto,
  TransitionExecutionResultDto,
  AllowedTransitionResponseDto,
  WorkflowTimelineEventResponseDto,
  CreateEvcScheduleDto,
  EvcScheduleResponseDto,
} from './dto';

@ApiTags('Workflow, Transitions & EVC')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('applications/:id/transitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute state transition on an application',
    description:
      'Performs an atomic FSM state transition guarded by role permissions, pessimistic row locking, and mandatory justification rules.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Transition executed successfully',
    type: TransitionExecutionResultDto,
  })
  async executeTransition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() dto: TransitionRequestDto,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<TransitionExecutionResultDto> {
    return this.workflowService.executeTransition(
      id,
      currentUser,
      dto,
      correlationId,
    );
  }

  @Get('applications/:id/timeline')
  @ApiOperation({
    summary: 'Retrieve workflow timeline history for an application',
    description:
      'Returns the chronological audit trail of state transitions, actor roles, timestamps, and justifications.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Timeline retrieved successfully',
    type: [WorkflowTimelineEventResponseDto],
  })
  async getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query() queryDto: TimelineQueryDto,
  ) {
    return this.workflowService.getTimeline(id, currentUser, queryDto);
  }

  @Get('applications/:id/allowed-transitions')
  @ApiOperation({
    summary: 'Get currently allowed next transitions for caller',
    description:
      'Returns the list of permitted target states and transition requirements available to the caller.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Allowed transitions returned successfully',
    type: [AllowedTransitionResponseDto],
  })
  async getAllowedTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<AllowedTransitionResponseDto[]> {
    return this.workflowService.getAllowedTransitions(id, currentUser);
  }

  @Get('applications/:id/evc-schedule')
  @ApiOperation({
    summary: 'Get EVC visit schedule for an application',
    description:
      'Returns the scheduled inspection date, committee members, and visit outcome recommendations.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'EVC schedule retrieved',
    type: EvcScheduleResponseDto,
  })
  async getEvcSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<EvcScheduleResponseDto | null> {
    return this.workflowService.getEvcSchedule(id, currentUser);
  }

  @Post('applications/:id/evc-schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update EVC visit schedule and committee roster',
    description:
      'Allows Regional Officers and Administrators to schedule on-site/virtual inspections and assign committee experts.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'EVC schedule saved successfully',
    type: EvcScheduleResponseDto,
  })
  async saveEvcSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Body() dto: CreateEvcScheduleDto,
  ): Promise<EvcScheduleResponseDto> {
    return this.workflowService.saveEvcSchedule(id, currentUser, dto);
  }

  @Get('evc/schedules')
  @ApiOperation({
    summary: 'List all EVC schedules across applications',
    description:
      'Returns inspection schedules filtered by status for regulatory planning.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'List of EVC schedules',
    type: [EvcScheduleResponseDto],
  })
  async listEvcSchedules(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query('status') status?: string,
  ): Promise<EvcScheduleResponseDto[]> {
    return this.workflowService.listEvcSchedules(currentUser, status);
  }

  @Get('workflow/stage-pendency')
  @ApiOperation({
    summary: 'Get stage-wise pendency metrics',
    description:
      'Calculates real database-backed application counts, average turnaround hours, and SLA breach counts per workflow stage.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Stage-wise pendency metrics retrieved',
  })
  async getStagePendencyMetrics() {
    return this.workflowService.getStagePendencyMetrics();
  }
}
