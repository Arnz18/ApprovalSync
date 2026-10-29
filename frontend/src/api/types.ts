/**
 * ApprovalSync — Frontend API Contracts & Shared Types
 * Milestone: FE-01
 * Adheres strictly to docs/contracts/api-conventions.md and data-contracts.md
 */

// -----------------------------------------------------------------------------
// Shared Domain Enums (Frozen in FND-02)
// -----------------------------------------------------------------------------

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

export enum DocumentProcessingStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING_OCR = 'PROCESSING_OCR',
  OCR_EXTRACTED = 'OCR_EXTRACTED',
  FAILED_OCR = 'FAILED_OCR',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

export enum VerificationStatus {
  VERIFIED_MOCK = 'VERIFIED_MOCK',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  UNTRUSTED_ISSUER = 'UNTRUSTED_ISSUER',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

export enum ComplianceSeverity {
  CRITICAL_DEFICIENCY = 'CRITICAL_DEFICIENCY',
  ADVISORY_FLAG = 'ADVISORY_FLAG',
  COMPLIANT = 'COMPLIANT',
  UNVERIFIED_POLICY = 'UNVERIFIED_POLICY',
}

export enum ReviewDisposition {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED_BY_OFFICER = 'APPROVED_BY_OFFICER',
  DEFICIENCY_FLAGGED = 'DEFICIENCY_FLAGGED',
  OVERRIDDEN_WITH_JUSTIFICATION = 'OVERRIDDEN_WITH_JUSTIFICATION',
}

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

export enum SlaTier {
  TIER_1_RO_ALERT = 'TIER_1_RO_ALERT',
  TIER_2_DIRECTOR_BREACH = 'TIER_2_DIRECTOR_BREACH',
  TIER_3_COUNCIL_LOCK = 'TIER_3_COUNCIL_LOCK',
}

// -----------------------------------------------------------------------------
// Standard API Envelope Types
// -----------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string; // ISO 8601 UTC
    correlationId: string; // UUIDv4
    pagination?: PaginationMeta;
  };
}

export interface FieldError {
  field: string;
  message: string;
  rule?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    correlationId: string;
    details?: FieldError[];
  };
}

export interface MockProviderMetadata {
  isMock: true;
  provider: string;
  verificationScope: string;
  disclaimer: string;
}

export interface PaginationQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

// -----------------------------------------------------------------------------
// Health Check Payload Types (Matches BE-01 and BE-02 contracts)
// -----------------------------------------------------------------------------

export interface SystemHealthData {
  status: 'ok' | 'degraded' | 'error';
  info?: Record<string, { status: string; [key: string]: unknown }>;
  error?: Record<string, { status: string; [key: string]: unknown }>;
  details?: Record<string, { status: string; [key: string]: unknown }>;
}

export interface LivenessData {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessData {
  status: 'ready' | 'not_ready';
  checks: {
    database: { status: string; details?: string };
    config: { status: string };
  };
}

// -----------------------------------------------------------------------------
// AICTE Problem Statement 26262 — Notification & EVC Contracts
// -----------------------------------------------------------------------------

export enum NotificationType {
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH',
  DEFICIENCY_COMMUNICATED = 'DEFICIENCY_COMMUNICATED',
  RESCRUTINY_SUBMITTED = 'RESCRUTINY_SUBMITTED',
  EVC_SCHEDULED = 'EVC_SCHEDULED',
  EVC_OUTCOME_LOGGED = 'EVC_OUTCOME_LOGGED',
  COMMITTEE_ESCALATION = 'COMMITTEE_ESCALATION',
  UNDERTAKING_EXPIRING = 'UNDERTAKING_EXPIRING',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
}

export interface AppNotification {
  id: string;
  tenantId: string;
  recipientUserId: string | null;
  targetRole: UserRole | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  linkUrl: string | null;
  applicationId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unreadCount: number;
}

export interface CommitteeExpertMember {
  name: string;
  designation: string;
  organization: string;
  roleInCommittee: 'CHAIRMAN' | 'EXPERT_MEMBER' | 'CONVENER' | 'ARCHITECTURAL_EXPERT';
  conflictOfInterestDeclared: boolean;
}

export interface EvcScheduleData {
  id: string;
  applicationId: string;
  visitDate: string;
  visitType: 'PHYSICAL_VISIT' | 'VIRTUAL_VISIT' | 'HYBRID';
  committeeMembers: CommitteeExpertMember[];
  visitNotes: string | null;
  inspectionReportUrl: string | null;
  outcomeRecommendation: 'PENDING' | 'RECOMMENDED' | 'DEFICIENCIES_NOTED' | 'REJECTED';
  scheduledByUserId: string;
  scheduledByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvcSchedulePayload {
  visitDate: string;
  visitType: 'PHYSICAL_VISIT' | 'VIRTUAL_VISIT' | 'HYBRID';
  committeeMembers: CommitteeExpertMember[];
  visitNotes?: string;
  inspectionReportUrl?: string;
  outcomeRecommendation?: 'PENDING' | 'RECOMMENDED' | 'DEFICIENCIES_NOTED' | 'REJECTED';
}
