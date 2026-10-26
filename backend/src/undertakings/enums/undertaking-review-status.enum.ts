/**
 * ApprovalSync — Undertaking Review & Verification Status
 * Milestone: BE-09
 *
 * Separates factual calendar expiry status from human review dispositions,
 * adhering to the Human Sovereignty principle (ADR-004).
 */

export enum UndertakingReviewStatus {
  PENDING_REVIEW = 'PENDING_REVIEW', // Awaiting regulatory officer review
  VERIFIED = 'VERIFIED', // Corroborated and approved by authorized officer
  DEFICIENT = 'DEFICIENT', // Clarification / deficiency notice issued by officer
  REJECTED = 'REJECTED', // Formally rejected by authorized regulatory officer
}
