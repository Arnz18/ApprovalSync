/**
 * ApprovalSync — Workflow Response DTOs
 * Milestone: BE-06
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus, UserRole } from '../../shared/contracts';

export class WorkflowTimelineEventResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000001' })
  applicationId: string;

  @ApiProperty({ enum: ApplicationStatus, example: ApplicationStatus.DRAFT })
  fromStatus: ApplicationStatus;

  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SUBMITTED,
  })
  toStatus: ApplicationStatus;

  @ApiProperty({ example: 'APPLICATION_SUBMITTED' })
  eventType: string;

  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001' })
  actorId: string;

  @ApiProperty({ enum: UserRole, example: UserRole.INSTITUTION_USER })
  actorRole: UserRole;

  @ApiPropertyOptional({ example: 'Submitting finalized application dossier.' })
  comment?: string | null;

  @ApiPropertyOptional({ example: 'corr-1234-uuid' })
  correlationId?: string | null;

  @ApiProperty({ example: {} })
  metadata: Record<string, unknown>;

  @ApiProperty({ example: '2026-10-24T10:00:00.000Z' })
  createdAt: Date;
}

export class AllowedTransitionResponseDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.UNDER_SCRUTINY,
  })
  toStatus: ApplicationStatus;

  @ApiProperty({ example: 'SCRUTINY_STARTED' })
  eventType: string;

  @ApiProperty({
    example: 'Scrutiny Officer commences documentary review and verification',
  })
  description: string;

  @ApiProperty({ example: false })
  requiresComment: boolean;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER],
  })
  allowedRoles: UserRole[];
}

export class TransitionExecutionResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000001' })
  applicationId: string;

  @ApiProperty({ example: 'APP-2026-0001' })
  applicationNumber: string;

  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SUBMITTED,
  })
  previousStatus: ApplicationStatus;

  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.UNDER_SCRUTINY,
  })
  currentStatus: ApplicationStatus;

  @ApiProperty({ type: () => WorkflowTimelineEventResponseDto })
  timelineEvent: WorkflowTimelineEventResponseDto;
}
