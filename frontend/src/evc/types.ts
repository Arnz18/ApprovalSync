/**
 * ApprovalSync — EVC Ground Inspection & Committee Workspace Types
 * Milestone: FE-06
 * Conforms strictly to BE-06 (Workflow FSM), DOC-06 (Compliance & Infrastructure Heuristics),
 * and DOC-07 (Dossier Synthesis) backend contracts.
 */

import { ApplicationStatus, UserRole } from '../api/types';
import { ApplicationProjection } from '../applications/types';
import { DossierSummary } from '../scrutiny/types';

export { ApplicationStatus, UserRole };

// -----------------------------------------------------------------------------
// DOC-06 Compliance Evidence & Infrastructure Review DTOs
// -----------------------------------------------------------------------------

export type ComplianceFindingCategory =
  'DOCUMENTARY' | 'INFRASTRUCTURE' | 'CADRE_RATIO' | 'SAFETY_ACCESSIBILITY';

export type ComplianceSeverity = 'CRITICAL_DEFICIENCY' | 'ADVISORY_FLAG' | 'COMPLIANT';

export interface EvidenceReference {
  documentId?: string;
  documentType?: string;
  fileName?: string;
  fieldKey?: string;
  extractedValue?: string | number | null;
  declaredValue?: string | number | null;
  pageNumber?: number;
  notes?: string;
}

export interface ComplianceFinding {
  id: string;
  findingCode: string;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  isAdvisory: true;
  category: ComplianceFindingCategory;
  ruleCode?: string;
  ruleVersionId?: string;
  ruleVersionNumber?: number;
  checklistTemplateCode?: string;
  checklistItemCode?: string;
  sourceClause?: string;
  sourceClassification?: string;
  evidence: EvidenceReference[];
  requiresPhysicalInspection: boolean;
  recommendedAction: string;
  limitations: string[];
}

export interface ComplianceSummary {
  totalRulesEvaluated: number;
  criticalDeficienciesCount: number;
  advisoryFlagsCount: number;
  compliantCount: number;
  inspectionRecommendedCount: number;
  hasCriticalDeficiency: boolean;
  requiresPhysicalInspection: boolean;
}

export interface InfrastructureReviewSummary {
  landCompliant: boolean;
  builtUpAreaCompliant: boolean;
  barrierFreeDeclared: boolean;
  fireSafetyValid: boolean;
  evcInspectionRecommended: boolean;
  inspectionTriggerReasons: string[];
  heuristicLimitations: string[];
}

export interface ComplianceAssessmentResult {
  applicationId: string;
  applicationNumber: string;
  institutionId: string;
  programType: string;
  academicYear: string;
  evaluatedAt: string;
  isAdvisory: true;
  ruleSetCode?: string;
  ruleSetName?: string;
  ruleVersionNumber?: number;
  ruleVersionId?: string;
  checklistCode?: string;
  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  infrastructureReview: InfrastructureReviewSummary;
  disclaimer: string;
}

export interface EvaluateComplianceDto {
  ruleVersionId?: string;
  evaluationDate?: string;
}

// -----------------------------------------------------------------------------
// EVC Queue Types
// -----------------------------------------------------------------------------

export interface EvcQueueItem extends ApplicationProjection {
  compliance?: ComplianceAssessmentResult | null;
  dossierSummary?: DossierSummary | null;
  loadingSummary?: boolean;
  summaryError?: string | null;
}

export interface EvcFilterState {
  status: string; // 'ALL' or specific status like 'RECOMMENDED_FOR_EVC', 'EVC_IN_PROGRESS', 'RECOMMENDED_FOR_SHC'
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

// -----------------------------------------------------------------------------
// Working Inspection Checklist Aid (Section 7)
// Explicitly documented as a client-side working aid; no backend persistence exists.
// -----------------------------------------------------------------------------

export type InspectionChecklistCategory =
  | 'LAND_AND_BUILDING'
  | 'FIRE_SAFETY_DISASTER'
  | 'INSTRUCTIONAL_FACILITIES'
  | 'BARRIER_FREE_ACCESSIBILITY'
  | 'LABORATORIES_EQUIPMENT';

export type InspectionItemOutcome = 'VERIFIED' | 'DISCREPANCY' | 'UNCHECKED';

export interface InspectionChecklistItem {
  id: string;
  category: InspectionChecklistCategory;
  code: string;
  title: string;
  standardNorm: string;
  outcome: InspectionItemOutcome;
  inspectorNotes: string;
  sourceCitation: string;
  isSavedToServer: false; // Explicit human-sovereignty & contract boundary indicator
}

// -----------------------------------------------------------------------------
// Expert Scheduling & Assignment Capability Types (Section 6)
// Defines the proposed contract for missing scheduling persistence.
// -----------------------------------------------------------------------------

export interface ProposedEvcAssignmentDto {
  applicationId: string;
  proposedInspectionDate: string;
  leadInspectorName: string;
  leadInspectorRole: string;
  inspectionMode: 'ON_SITE_PHYSICAL' | 'VIRTUAL_REMOTE';
  jurisdictionRegion: string;
  conflictOfInterestDeclared: boolean;
  notes?: string;
}

export interface EvcAssignmentStatus {
  status: 'PENDING_SCHEDULING' | 'INSPECTION_SCHEDULED' | 'INSPECTION_IN_PROGRESS' | 'COMPLETED';
  assignmentScheduledDate?: string | null;
  leadInspectorName?: string | null;
  isPersistenceSupported: false; // Flag indicating backend endpoint is a proposed contract
}

// -----------------------------------------------------------------------------
// Committee Review & Hearing Workspace Types (Section 10)
// -----------------------------------------------------------------------------

export interface CommitteeReviewCaseContext {
  applicationId: string;
  applicationNumber: string;
  escalationEventType?: string;
  escalationActorRole?: string;
  escalationReason?: string;
  escalationTimestamp?: string;
  unresolvedDeficienciesCount: number;
  unresolvedDiscrepancies: string[];
}
