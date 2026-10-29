/**
 * ApprovalSync — Notification DTOs
 * Milestone: AICTE-26262
 */

import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationSeverity } from '../enums/notification-severity.enum';

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by unread status only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Filter by notification type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'b6f5d8a9-4e2c-4b1a-9f8d-0e3a5c7e9b1d' })
  id: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  userId?: string | null;

  @ApiPropertyOptional({ example: 'SCRUTINY_OFFICER' })
  targetRole?: string | null;

  @ApiPropertyOptional({ example: 'inst-uuid' })
  institutionId?: string | null;

  @ApiPropertyOptional({ example: 'app-uuid' })
  applicationId?: string | null;

  @ApiPropertyOptional({ example: 'undertaking-uuid' })
  undertakingId?: string | null;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.DEADLINE_REMINDER,
  })
  type: NotificationType;

  @ApiProperty({
    enum: NotificationSeverity,
    example: NotificationSeverity.WARNING,
  })
  severity: NotificationSeverity;

  @ApiProperty({ example: 'Application Scrutiny SLA Warning' })
  title: string;

  @ApiProperty({
    example:
      'Application APP-2026-DEMO-001 has reached 80% of Scrutiny review window.',
  })
  message: string;

  @ApiPropertyOptional({ example: '/scrutiny/APP-2026-DEMO-001' })
  link?: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({ example: '2026-10-29T12:00:00.000Z' })
  readAt?: string | null;

  @ApiProperty({ example: {} })
  metadata: Record<string, unknown>;

  @ApiProperty({ example: '2026-10-29T11:45:00.000Z' })
  createdAt: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items: NotificationResponseDto[];

  @ApiProperty({ example: 3 })
  unreadCount: number;

  @ApiProperty({ example: 10 })
  totalItems: number;
}
