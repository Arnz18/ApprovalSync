/**
 * ApprovalSync — SLA & Escalation Domain Types & Contracts
 * Milestone: FE-05
 * Conforms strictly to BE-08 SLA Controller, Entities, and DTO contracts.
 */

import { ApplicationStatus, UserRole, SlaTier, PaginationMeta } from '../api/types';

export { ApplicationStatus, UserRole, SlaTier };
export type { PaginationMeta };

// -----------------------------------------------------------------------------
// SLA Lifecycle & Severity Enums (BE-08)
// -----------------------------------------------------------------------------

export enum SlaTimerStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  BREACHED = 'BREACHED',
}

export enum SlaEscalationLevel {
  WARNING = 'WARNING',
  BREACH = 'BREACH',
  SEVERE_BREACH = 'SEVERE_BREACH',
}

export type SlaUnit = 'MINUTES' | 'HOURS' | 'DAYS';

export type SlaPolicyClassification =
  'VERIFIED_REGULATORY' | 'UNVERIFIED_REVIEW_REQUIRED' | 'ILLUSTRATIVE_DEMO';

// -----------------------------------------------------------------------------
// SLA Timer & Escalation Projections (BE-08 DTOs)
// -----------------------------------------------------------------------------

export interface SlaTimerProjection {
  id: string;
  applicationId: string;
  stage: ApplicationStatus;
  tier: SlaTier;
  status: SlaTimerStatus;
  policyId: string;
  startedAt: string;
  targetDeadline: string;
  warningDeadline: string | null;
  isWarningSent: boolean;
  isBreached: boolean;
  escalatedAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  totalPausedMs: number;
  pauseReason: string | null;
  pausedById: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lastEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlaEscalationProjection {
  id: string;
  timerId: string;
  applicationId: string;
  stage: ApplicationStatus;
  tier: SlaTier;
  escalationLevel: SlaEscalationLevel;
  idempotencyKey: string;
  targetRole: UserRole;
  policyId: string;
  policyVersion: string;
  targetDeadline: string;
  detectedAt: string;
  recipientDetailsJsonb: Record<string, unknown>;
  isDispatched: boolean;
  createdAt: string;
}

export interface SlaPolicyProjection {
  id: string;
  name: string;
  description: string;
  stage: ApplicationStatus;
  tier: SlaTier;
  duration: number;
  unit: SlaUnit;
  warningThresholdFraction: number;
  breachThresholdFraction: number;
  severeBreachThresholdFraction?: number;
  warningTargetRole: UserRole;
  breachTargetRole: UserRole;
  severeBreachTargetRole?: UserRole;
  canPause: boolean;
  classification: SlaPolicyClassification;
  sourceReference: string;
  version: string;
  isActive: boolean;
  disclaimer: string;
}

export interface SlaReconcileResult {
  evaluatedCount: number;
  warningsEmitted: number;
  breachesEmitted: number;
  reconciledAt: string;
}

// -----------------------------------------------------------------------------
// SLA Request DTOs
// -----------------------------------------------------------------------------

export interface PauseTimerDto {
  reason: string;
}

export interface SlaTimerQueryParams {
  status?: SlaTimerStatus;
  stage?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export interface SlaEscalationQueryParams {
  page?: number;
  limit?: number;
}

export interface SlaTimersListResponse {
  data: SlaTimerProjection[];
  meta: PaginationMeta;
}

export interface SlaEscalationsListResponse {
  data: SlaEscalationProjection[];
  meta: PaginationMeta;
}
