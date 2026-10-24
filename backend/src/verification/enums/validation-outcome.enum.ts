/**
 * ApprovalSync — Validation Outcome Enum
 * Milestone: DOC-03
 *
 * Distinguishes explicit validation outcomes for document completeness,
 * field completeness, date/expiry evaluation, and cross-record consistency.
 */

export enum ValidationOutcome {
  VALID = 'VALID',
  DEFICIENT = 'DEFICIENT',
  EXPIRED = 'EXPIRED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
  INCONCLUSIVE = 'INCONCLUSIVE',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  MALFORMED = 'MALFORMED',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum OverallValidationStatus {
  COMPLIANT = 'COMPLIANT',
  DEFICIENT = 'DEFICIENT',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}
