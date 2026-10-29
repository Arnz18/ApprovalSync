/**
 * ApprovalSync — Notifications Controller
 * Milestone: AICTE-26262
 *
 * REST endpoints for reading in-app notifications, unread counters,
 * read-receipt mutations, and triggering deadline monitoring sweeps.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
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
import { NotificationsService } from './notifications.service';
import {
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationListResponseDto,
} from './dto/notification-dtos';

@ApiTags('Notifications & Alerts')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List in-app notifications for caller',
    description:
      'Returns paginated in-app notifications, deadline reminders, SLA alerts, and unread counts for the authenticated user and role.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Notifications list retrieved',
    type: NotificationListResponseDto,
  })
  async getNotifications(
    @CurrentUser() currentUser: AuthUserPrincipal,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.getNotifications(currentUser, query);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Sets notification isRead to true and records readAt timestamp.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, currentUser);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all caller notifications as read',
    description: 'Bulk marks all unread notifications for the caller as read.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Notifications marked as read count',
  })
  async markAllAsRead(
    @CurrentUser() currentUser: AuthUserPrincipal,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(currentUser);
  }

  @Post('sweep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger scheduled deadline and SLA alert sweep',
    description:
      'Evaluates active stage deadlines and compliance undertakings, generating idempotent in-app notifications for approaching due dates and breaches.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Deadline sweep results and notification count',
  })
  async sweepDeadlines(): Promise<{
    slaWarningsEmitted: number;
    slaBreachesEmitted: number;
    undertakingAlertsEmitted: number;
    totalGenerated: number;
  }> {
    return this.notificationsService.sweepDeadlines();
  }
}
