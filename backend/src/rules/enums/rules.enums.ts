/**
 * ApprovalSync — Rules and Checklists Domain Enums
 * Milestone: BE-05
 *
 * Module-local domain enums governing regulatory rule versions, classifications,
 * rule types, and checklist item types.
 */

/**
 * Lifecycle status of a rule version.
 */
export enum RuleLifecycleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  RETIRED = 'RETIRED',
}

/**
 * Source confidence and regulatory authority classification.
 * Strictly separates legally authoritative norms from unreviewed sources and synthetic demo rules.
 */
export enum RuleSourceClassification {
  VERIFIED_REGULATORY = 'VERIFIED_REGULATORY',
  UNVERIFIED_HUMAN_REVIEW_REQUIRED = 'UNVERIFIED_HUMAN_REVIEW_REQUIRED',
  ILLUSTRATIVE_DEMO = 'ILLUSTRATIVE_DEMO',
}

/**
 * Categorization of regulatory requirements.
 */
export enum RuleType {
  INFRASTRUCTURE_LAND = 'INFRASTRUCTURE_LAND',
  INFRASTRUCTURE_BUILTUP = 'INFRASTRUCTURE_BUILTUP',
  FACULTY_RATIO = 'FACULTY_RATIO',
  BARRIER_FREE_ENVIRONMENT = 'BARRIER_FREE_ENVIRONMENT',
  DOCUMENT_MANDATORY = 'DOCUMENT_MANDATORY',
  FINANCIAL_DEPOSIT = 'FINANCIAL_DEPOSIT',
}

/**
 * Requirement type for checklist items.
 */
export enum ChecklistItemType {
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  INFRASTRUCTURE_METRIC = 'INFRASTRUCTURE_METRIC',
  AFFIDAVIT_UNDERTAKING = 'AFFIDAVIT_UNDERTAKING',
  FEE_PAYMENT = 'FEE_PAYMENT',
}
