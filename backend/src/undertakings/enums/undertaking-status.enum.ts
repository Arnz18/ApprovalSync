/**
 * ApprovalSync — Undertaking Lifecycle Status
 * Milestone: BE-09
 *
 * Defines explicit, non-overlapping lifecycle states for institutional undertakings and lease records.
 */

export enum UndertakingStatus {
  DRAFT = 'DRAFT', // Prepared by institution user, not yet submitted for review
  SUBMITTED = 'SUBMITTED', // Submitted for scrutiny / compliance verification
  ACTIVE = 'ACTIVE', // In-force undertaking with active validity window
  EXPIRING_SOON = 'EXPIRING_SOON', // Within pre-warning threshold before renewal due date
  RENEWAL_DUE = 'RENEWAL_DUE', // Within critical renewal window (renewalDueDate <= now <= expiryDate)
  EXPIRED = 'EXPIRED', // Past validity expiry date (now > expiryDate)
  SUPERSEDED = 'SUPERSEDED', // Replaced by an approved renewal undertaking record
  TERMINATED = 'TERMINATED', // Formally revoked, cancelled, or terminated before natural expiry
}
