/**
 * ApprovalSync — Dossier Verification Report Interfaces
 * Milestone: DOC-07
 *
 * Defines the consolidated evidence-linked dossier verification data structures
 * combining document completeness, field extraction, expiry validity,
 * cross-record consistency, duplicate detection, structural integrity,
 * external/simulated issuer verification, and regulatory compliance review.
 *
 * Conforms to ADR-004 Human Sovereignty: all outputs are strictly advisory decision support.
 */

import { BoundingBox, ComplianceSeverity } from '../../shared/contracts';
import { OverallValidationStatus } from '../enums';
import {
  InfrastructureReviewSummaryDto,
  EvidenceReferenceDto,
} from '../../compliance/dto';

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

export interface DossierReportFinding {
  id: string;
  category: DossierFindingCategory;
  ruleCode: string;
  ruleDescription: string;
  severity:
    ComplianceSeverity | 'CRITICAL_DEFICIENCY' | 'ADVISORY_FLAG' | 'COMPLIANT';
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
  evidence?: Record<string, unknown> | EvidenceReferenceDto[];
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
    | 'VERIFIED'
    | 'DISCREPANCY'
    | 'SIMULATED'
    | 'NOT_APPLICABLE'
    | 'PENDING'
    | 'SOURCE_UNAVAILABLE';
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

export interface DossierVerificationResult {
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
  infrastructureReview?:
    InfrastructureReviewSummaryDto | Record<string, unknown>;
  disclaimer: string;
}
