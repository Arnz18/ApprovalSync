/**
 * ApprovalSync — Authoritative Shared Domain Enums
 * Milestone: FND-02
 */

/**
 * Application Lifecycle Finite State Machine (FSM) statuses.
 * Primary Owner: M2 (Workflow & Backend Core)
 */
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_SCRUTINY = 'UNDER_SCRUTINY',
  DEFICIENCY_ISSUED = 'DEFICIENCY_ISSUED',
  RESUBMITTED = 'RESUBMITTED',
  RECOMMENDED_FOR_EVC = 'RECOMMENDED_FOR_EVC',
  EVC_IN_PROGRESS = 'EVC_IN_PROGRESS',
  RECOMMENDED_FOR_SHC = 'RECOMMENDED_FOR_SHC',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Document Ingestion & AI OCR processing pipeline statuses.
 * Primary Owner: M3 (Document AI & Verification)
 */
export enum DocumentProcessingStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING_OCR = 'PROCESSING_OCR',
  OCR_EXTRACTED = 'OCR_EXTRACTED',
  FAILED_OCR = 'FAILED_OCR',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

/**
 * External Verification Adapter result statuses.
 * Primary Owner: M3 (Document AI & Verification)
 */
export enum VerificationStatus {
  VERIFIED_MOCK = 'VERIFIED_MOCK',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  UNTRUSTED_ISSUER = 'UNTRUSTED_ISSUER',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

/**
 * Compliance Finding Severity & Classification.
 * Primary Owner: M2 (Rules) & M3 (Compliance Assist)
 */
export enum ComplianceSeverity {
  CRITICAL_DEFICIENCY = 'CRITICAL_DEFICIENCY',
  ADVISORY_FLAG = 'ADVISORY_FLAG',
  COMPLIANT = 'COMPLIANT',
  UNVERIFIED_POLICY = 'UNVERIFIED_POLICY',
}

/**
 * Human Review Officer Dispositions.
 * Enforces the Human Sovereignty rule (ADR-004).
 * Primary Owner: M2 (Workflow) & M4 (Frontend Review UI)
 */
export enum ReviewDisposition {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED_BY_OFFICER = 'APPROVED_BY_OFFICER',
  DEFICIENCY_FLAGGED = 'DEFICIENCY_FLAGGED',
  OVERRIDDEN_WITH_JUSTIFICATION = 'OVERRIDDEN_WITH_JUSTIFICATION',
}

/**
 * Platform User Roles & RBAC hierarchy.
 * Primary Owner: M2 (Auth & Users)
 */
export enum UserRole {
  INSTITUTION_USER = 'INSTITUTION_USER',
  SCRUTINY_OFFICER = 'SCRUTINY_OFFICER',
  REGIONAL_OFFICER = 'REGIONAL_OFFICER',
  EVC_INSPECTOR = 'EVC_INSPECTOR',
  SHC_SAC_MEMBER = 'SHC_SAC_MEMBER',
  BUREAU_HEAD = 'BUREAU_HEAD',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  AUDITOR = 'AUDITOR',
}

/**
 * SLA Escalation Tiers for scrutiny queues.
 * Primary Owner: M2 (SLA & BullMQ Daemon)
 *
 * NOTE: TIER_3_COUNCIL_LOCK and the 120% SLA threshold represent team-defined prototype
 * escalation concepts for hackathon evaluation; they are NOT asserted official AICTE statutory processes.
 */
export enum SlaTier {
  TIER_1_RO_ALERT = 'TIER_1_RO_ALERT',
  TIER_2_DIRECTOR_BREACH = 'TIER_2_DIRECTOR_BREACH',
  TIER_3_COUNCIL_LOCK = 'TIER_3_COUNCIL_LOCK',
}
