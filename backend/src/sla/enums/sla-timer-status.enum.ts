/**
 * ApprovalSync — SLA Timer Lifecycle Status
 * Milestone: BE-08
 */

export enum SlaTimerStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  BREACHED = 'BREACHED',
}
