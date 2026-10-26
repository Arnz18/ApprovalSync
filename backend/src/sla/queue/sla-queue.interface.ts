/**
 * ApprovalSync — SLA Queue Interface
 * Milestone: BE-08
 */

import { ApplicationStatus, SlaTier } from '../../shared/contracts';

export const SLA_QUEUE_TOKEN = 'SLA_QUEUE_TOKEN';

export type SlaJobCheckType = 'WARNING_CHECK' | 'BREACH_CHECK' | 'RECONCILE';

export interface SlaJobPayload {
  timerId: string;
  applicationId: string;
  stage: ApplicationStatus;
  tier: SlaTier;
  checkType: SlaJobCheckType;
  enqueuedAt?: string;
}

export interface ISlaQueue {
  /**
   * Enqueues a delayed evaluation job for a timer.
   */
  enqueueTimerCheck(payload: SlaJobPayload, delayMs?: number): Promise<void>;

  /**
   * Indicates whether the distributed Redis queue is currently connected and operational.
   */
  isAvailable(): boolean;

  /**
   * Returns current operational mode ('REDIS_BULLMQ' or 'DATABASE_RECONCILIATION').
   */
  getOperationalMode(): 'REDIS_BULLMQ' | 'DATABASE_RECONCILIATION';
}
