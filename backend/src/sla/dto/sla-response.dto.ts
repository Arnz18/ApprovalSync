/**
 * ApprovalSync — SLA Response DTOs
 * Milestone: BE-08
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus, SlaTier, UserRole } from '../../shared/contracts';
import { SlaTimerStatus } from '../enums/sla-timer-status.enum';
import { SlaEscalationLevel } from '../enums/sla-escalation-level.enum';
import {
  SlaPolicyClassification,
  SlaUnit,
} from '../policies/sla-policy.interface';

export class SlaTimerResponseDto {
  @ApiProperty({ description: 'SLA Timer UUID' })
  id: string;

  @ApiProperty({ description: 'Associated Application UUID' })
  applicationId: string;

  @ApiProperty({
    enum: ApplicationStatus,
    description: 'Workflow stage monitored by this timer',
  })
  stage: ApplicationStatus;

  @ApiProperty({ enum: SlaTier, description: 'Escalation tier' })
  tier: SlaTier;

  @ApiProperty({
    enum: SlaTimerStatus,
    description: 'Current lifecycle status',
  })
  status: SlaTimerStatus;

  @ApiProperty({ description: 'Configured policy identifier' })
  policyId: string;

  @ApiProperty({ description: 'Timestamp when timer started' })
  startedAt: string;

  @ApiProperty({ description: 'Target deadline timestamp' })
  targetDeadline: string;

  @ApiPropertyOptional({ description: 'Warning threshold deadline' })
  warningDeadline?: string | null;

  @ApiProperty({
    description: 'Whether warning notification has been dispatched',
  })
  isWarningSent: boolean;

  @ApiProperty({ description: 'Whether target deadline has breached' })
  isBreached: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when breach was recorded' })
  escalatedAt?: string | null;

  @ApiPropertyOptional({ description: 'Timestamp when timer was paused' })
  pausedAt?: string | null;

  @ApiPropertyOptional({ description: 'Timestamp when timer was resumed' })
  resumedAt?: string | null;

  @ApiProperty({ description: 'Cumulative duration paused in milliseconds' })
  totalPausedMs: number;

  @ApiPropertyOptional({
    description: 'Justification comment recorded for pause',
  })
  pauseReason?: string | null;

  @ApiPropertyOptional({ description: 'User UUID who authorized pause' })
  pausedById?: string | null;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completedAt?: string | null;

  @ApiPropertyOptional({ description: 'Cancellation timestamp' })
  cancelledAt?: string | null;

  @ApiPropertyOptional({
    description: 'Last automated evaluation sweep timestamp',
  })
  lastEvaluatedAt?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class SlaEscalationResponseDto {
  @ApiProperty({ description: 'Escalation Event UUID' })
  id: string;

  @ApiProperty({ description: 'Associated Timer UUID' })
  timerId: string;

  @ApiProperty({ description: 'Associated Application UUID' })
  applicationId: string;

  @ApiProperty({ enum: ApplicationStatus })
  stage: ApplicationStatus;

  @ApiProperty({ enum: SlaTier })
  tier: SlaTier;

  @ApiProperty({ enum: SlaEscalationLevel })
  escalationLevel: SlaEscalationLevel;

  @ApiProperty({ description: 'Durable unique idempotency key' })
  idempotencyKey: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Target role assigned to handle this escalation',
  })
  targetRole: UserRole;

  @ApiProperty({ description: 'Associated SLA policy ID' })
  policyId: string;

  @ApiProperty({ description: 'Policy configuration version' })
  policyVersion: string;

  @ApiProperty({ description: 'Target deadline timestamp' })
  targetDeadline: string;

  @ApiProperty({ description: 'Timestamp when breach/warning was detected' })
  detectedAt: string;

  @ApiProperty({ description: 'Recipient and notification context snapshot' })
  recipientDetailsJsonb: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether event was dispatched to notification seam',
  })
  isDispatched: boolean;

  @ApiProperty({ description: 'Event creation timestamp' })
  createdAt: string;
}

export class SlaPolicyResponseDto {
  @ApiProperty({ description: 'Unique policy code' })
  id: string;

  @ApiProperty({ description: 'Policy title' })
  name: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ enum: ApplicationStatus })
  stage: ApplicationStatus;

  @ApiProperty({ enum: SlaTier })
  tier: SlaTier;

  @ApiProperty({ description: 'Duration value' })
  duration: number;

  @ApiProperty({ description: 'Time unit (DAYS, HOURS, MINUTES)' })
  unit: SlaUnit;

  @ApiProperty({ description: 'Warning threshold fraction (e.g. 0.75)' })
  warningThresholdFraction: number;

  @ApiProperty({ description: 'Breach threshold fraction (1.0)' })
  breachThresholdFraction: number;

  @ApiPropertyOptional({ description: 'Severe breach threshold fraction' })
  severeBreachThresholdFraction?: number;

  @ApiProperty({ enum: UserRole })
  warningTargetRole: UserRole;

  @ApiProperty({ enum: UserRole })
  breachTargetRole: UserRole;

  @ApiPropertyOptional({ enum: UserRole })
  severeBreachTargetRole?: UserRole;

  @ApiProperty({ description: 'Whether pause is authorized for this stage' })
  canPause: boolean;

  @ApiProperty({ description: 'Classification of policy' })
  classification: SlaPolicyClassification;

  @ApiProperty({ description: 'Source citation or prototype benchmark' })
  sourceReference: string;

  @ApiProperty({ description: 'Policy configuration version' })
  version: string;

  @ApiProperty({ description: 'Whether policy is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Disclaimer explaining regulatory context' })
  disclaimer: string;
}

export class SlaReconcileResponseDto {
  @ApiProperty({ description: 'Number of active timers evaluated' })
  evaluatedCount: number;

  @ApiProperty({ description: 'Number of warning notifications recorded' })
  warningsEmitted: number;

  @ApiProperty({ description: 'Number of target deadline breaches recorded' })
  breachesEmitted: number;

  @ApiProperty({ description: 'Timestamp when reconciliation sweep completed' })
  reconciledAt: string;
}
