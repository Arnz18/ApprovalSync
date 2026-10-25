/**
 * ApprovalSync — Scrutiny Queue, Dossier Report & Workflow Types
 * Milestone: FE-04
 * Conforms strictly to BE-04, BE-06, and DOC-07 backend contracts.
 */

import { ApplicationStatus, UserRole } from '../api/types';
import { ApplicationProjection } from '../applications/types';

export { ApplicationStatus, UserRole };

// -----------------------------------------------------------------------------
// Dossier Verification Report Types (DOC-07)
// -----------------------------------------------------------------------------

export type DossierFindingCategory =
  | 'DOCUMENT_COMPLETENESS'
  | 'FIELD_COMPLETENESS'
  | 'EXPIRY_VALIDITY'
  | 'CROSS_RECORD_CONSISTENCY'
  | 'DUPLICATE_DETECTION'
  | 'DOCUMENT_INTEGRITY'
  | 'ISSUER_VERIFICATION'
  | 'REGULATORY_COMPLIANCE'
  | 'INFRASTRUCTURE_REVIEW';

export type OverallValidationStatus = 'COMPLIANT' | 'DEFICIENT' | 'REQUIRES_REVIEW';

export type FindingSeverity = 'CRITICAL_DEFICIENCY' | 'ADVISORY_FLAG' | 'COMPLIANT';

export interface BoundingBox {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  textSnippet?: string;
}

export interface DossierReportFinding {
  id: string;
  category: DossierFindingCategory;
  ruleCode: string;
  ruleDescription: string;
  severity: FindingSeverity;
  outcome: string;
  documentId?: string;
  documentType?: string;
  fieldKey?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  message: string;
  boundingLocation?: BoundingBox;
  requiresPhysicalInspection?: boolean;
  isAdvisory: true;
  evidence?: Record<string, unknown> | Array<unknown>;
}

export interface DocumentVerificationMatrixItem {
  documentId: string;
  documentType: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Checksum: string;
  processingStatus: string;
  ocrConfidence: number;
  extractedFieldCount: number;
  extractedFields: Record<string, string | number>;
  integrityStatus: 'VALID' | 'ANOMALIES_DETECTED' | 'UNCHECKED';
  integrityAnomalyCodes: string[];
  duplicateStatus: 'UNIQUE' | 'EXACT_DUPLICATE' | 'NEAR_DUPLICATE';
  duplicateMatchIds: string[];
  issuerStatus:
    'VERIFIED' | 'DISCREPANCY' | 'SIMULATED' | 'NOT_APPLICABLE' | 'PENDING' | 'SOURCE_UNAVAILABLE';
  issuerProviderId?: string;
  isSimulated: boolean;
  findingsCount: number;
}

export interface IssuerVerificationSummary {
  totalEligible: number;
  verifiedCount: number;
  discrepancyCount: number;
  simulatedCount: number;
  pendingCount: number;
}

export interface InfrastructureReviewSummaryMetrics {
  landCompliant: boolean;
  builtUpAreaCompliant: boolean;
  barrierFreeDeclared: boolean;
  fireSafetyValid: boolean;
  evcInspectionRecommended: boolean;
  inspectionTriggerReasons: string[];
  heuristicLimitations: string[];
}

export interface RegulatoryComplianceSummary {
  ruleSetCode?: string;
  ruleSetName?: string;
  ruleVersionNumber?: string | number;
  ruleVersionId?: string;
  checklistCode?: string;
}

export interface DossierReportSummary {
  totalDocuments: number;
  totalRulesEvaluated: number;
  criticalDeficienciesCount: number;
  advisoryFlagsCount: number;
  compliantCount: number;
  hasCriticalDeficiency: boolean;
  duplicateMatchCount: number;
  integrityAnomalyCount: number;
  issuerVerificationSummary: IssuerVerificationSummary;
  infrastructureReviewSummary: InfrastructureReviewSummaryMetrics;
  requiresPhysicalInspection: boolean;
}

export interface DossierReport {
  applicationId: string;
  applicationNumber: string;
  institutionId: string;
  institutionName?: string;
  programType: string;
  academicYear: string;
  overallStatus: OverallValidationStatus;
  evaluatedAt: string;
  isAdvisory: true;
  summary: DossierReportSummary;
  documentMatrix: DocumentVerificationMatrixItem[];
  findings: DossierReportFinding[];
  regulatoryCompliance?: RegulatoryComplianceSummary;
  infrastructureReview?: Record<string, unknown>;
  disclaimer: string;
}

export interface DossierSummary {
  applicationId: string;
  applicationNumber: string;
  institutionId: string;
  institutionName?: string;
  programType: string;
  academicYear: string;
  overallStatus: OverallValidationStatus;
  evaluatedAt: string;
  isAdvisory: true;
  summary: DossierReportSummary;
}

export interface DossierQueryOptions {
  recalculate?: boolean;
  asOfDate?: string;
}

// -----------------------------------------------------------------------------
// Workflow FSM & Timeline Types (BE-06)
// -----------------------------------------------------------------------------

export interface WorkflowTimelineEvent {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  eventType: string;
  actorId: string;
  actorRole: UserRole;
  comment?: string | null;
  correlationId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TimelineResponse {
  items: WorkflowTimelineEvent[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AllowedTransition {
  toStatus: ApplicationStatus;
  eventType: string;
  description: string;
  requiresComment: boolean;
  allowedRoles: UserRole[];
}

export interface TransitionRequest {
  targetStatus: ApplicationStatus;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionExecutionResult {
  success: boolean;
  applicationId: string;
  applicationNumber: string;
  previousStatus: ApplicationStatus;
  currentStatus: ApplicationStatus;
  timelineEvent: WorkflowTimelineEvent;
}

// -----------------------------------------------------------------------------
// Scrutiny Queue Row & Filter State
// -----------------------------------------------------------------------------

export interface ScrutinyQueueItem extends ApplicationProjection {
  dossierSummary?: DossierSummary | null;
  dossierSummaryLoading?: boolean;
  dossierSummaryError?: string | null;
}

export interface ScrutinyFilterState {
  status: string; // 'ALL' or specific ApplicationStatus
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  page: number;
  limit: number;
}
