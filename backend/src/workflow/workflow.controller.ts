/**
 * ApprovalSync — Workflow Controller
 * Milestone: BE-06
 *
 * Exposes REST endpoints for application FSM state transitions, allowed transition queries,
 * and chronological workflow timeline inspection under /api/v1/applications/:id.
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
} from './dto';

@ApiTags('Workflow & Transitions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications/:id')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('transitions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute state transition on an application',
    description:
      'Performs an atomic FSM state transition guarded by role permissions, pessimistic row locking, and mandatory justification rules. Concurrently safe.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Transition executed successfully',
    type: TransitionExecutionResultDto,
  })
  @SwaggerResponse({
    status: 400,
    description:
      'Invalid transition, terminal state, or missing required comment',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Caller role not authorized or cross-tenant access denied',
  })
  @SwaggerResponse({ status: 404, description: 'Application not found' })
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

  @Get('timeline')
  @ApiOperation({
    summary: 'Retrieve workflow timeline history for an application',
    description:
      'Returns the chronological audit trail of state transitions, actor roles, timestamps, and justifications for the specified application.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Timeline retrieved successfully',
    type: [WorkflowTimelineEventResponseDto],
  })
  @SwaggerResponse({
    status: 403,
    description: 'Cross-tenant access forbidden for institution user',
  })
  @SwaggerResponse({ status: 404, description: 'Application not found' })
  async getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query() queryDto: TimelineQueryDto,
  ) {
    const result = await this.workflowService.getTimeline(
      id,
      currentUser,
      queryDto,
    );
    return result;
  }

  @Get('allowed-transitions')
  @ApiOperation({
    summary: 'Get currently allowed next transitions for caller',
    description:
      'Returns the list of permitted target states and transition requirements available to the caller for the application.',
  })
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Allowed transitions returned successfully',
    type: [AllowedTransitionResponseDto],
  })
  @SwaggerResponse({
    status: 403,
    description: 'Cross-tenant access forbidden for institution user',
  })
  @SwaggerResponse({ status: 404, description: 'Application not found' })
  async getAllowedTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<AllowedTransitionResponseDto[]> {
    return this.workflowService.getAllowedTransitions(id, currentUser);
  }
}
