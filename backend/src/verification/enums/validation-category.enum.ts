/**
 * ApprovalSync — Validation Category Enum
 * Milestone: DOC-03
 *
 * Categorizes document validation checks into completeness, field extraction,
 * expiry/date validity, and cross-record consistency.
 */

export enum ValidationCategory {
  DOCUMENT_COMPLETENESS = 'DOCUMENT_COMPLETENESS',
  FIELD_COMPLETENESS = 'FIELD_COMPLETENESS',
  EXPIRY_AND_VALIDITY = 'EXPIRY_AND_VALIDITY',
  CROSS_RECORD_CONSISTENCY = 'CROSS_RECORD_CONSISTENCY',
  DUPLICATE_DETECTION = 'DUPLICATE_DETECTION',
  DOCUMENT_INTEGRITY = 'DOCUMENT_INTEGRITY',
}
