/**
 * ApprovalSync — Dossier Report Response DTOs
 * Milestone: DOC-07
 *
 * Swagger-annotated response DTOs for the consolidated dossier verification report,
 * document verification matrix, and lightweight summary.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoundingBox } from '../../shared/contracts';
import { OverallValidationStatus } from '../enums';
import {
  DossierFindingCategory,
  DossierReportFinding,
  DocumentVerificationMatrixItem,
  IssuerVerificationSummary,
  InfrastructureReviewSummaryMetrics,
  RegulatoryComplianceSummary,
  DossierReportSummary,
  DossierVerificationResult,
} from '../interfaces/dossier-report.interface';
import { BoundingBoxDto } from './validation-result.dto';

export class DossierReportFindingDto implements DossierReportFinding {
  @ApiProperty({
    description: 'Unique finding identifier',
    example: 'FIND-DOC-COMP-001',
  })
  id: string;

  @ApiProperty({
    description: 'Category of verification or compliance check',
    enum: [
      'DOCUMENT_COMPLETENESS',
      'FIELD_COMPLETENESS',
      'EXPIRY_VALIDITY',
      'CROSS_RECORD_CONSISTENCY',
      'DUPLICATE_DETECTION',
      'DOCUMENT_INTEGRITY',
      'ISSUER_VERIFICATION',
      'REGULATORY_COMPLIANCE',
      'INFRASTRUCTURE_REVIEW',
    ],
    example: 'REGULATORY_COMPLIANCE',
  })
  category: DossierFindingCategory;

  @ApiProperty({
    description: 'Rule or check code',
    example: 'RULE-LAND-AREA-MINIMUM',
  })
  ruleCode: string;

  @ApiProperty({
    description: 'Human-readable rule or check description',
    example: 'Minimum contiguous land requirement for mega-city category',
  })
  ruleDescription: string;

  @ApiProperty({
    description: 'Finding severity classification',
    enum: ['CRITICAL_DEFICIENCY', 'ADVISORY_FLAG', 'COMPLIANT'],
    example: 'CRITICAL_DEFICIENCY',
  })
  severity: 'CRITICAL_DEFICIENCY' | 'ADVISORY_FLAG' | 'COMPLIANT';

  @ApiProperty({
    description: 'Outcome or status of check',
    example: 'DEFICIENT',
  })
  outcome: string;

  @ApiPropertyOptional({
    description: 'Target document UUID if finding is document-linked',
    example: 'e2b3c4d5-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
  })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Document category/type',
    example: 'LAND_TITLE_DEED',
  })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Extracted or evaluated field key',
    example: 'landAreaAcres',
  })
  fieldKey?: string;

  @ApiPropertyOptional({
    description: 'Expected statutory or checklist value',
    example: 7.5,
  })
  expectedValue?: string | number;

  @ApiPropertyOptional({
    description: 'Actual submitted or extracted value',
    example: 6.8,
  })
  actualValue?: string | number;

  @ApiProperty({
    description: 'Human-readable explanation of the finding',
    example:
      'Land area 6.8 acres is below the statutory requirement of 7.5 acres.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'OCR bounding box location if extracted from PDF attachment',
    type: () => BoundingBoxDto,
  })
  boundingLocation?: BoundingBox;

  @ApiPropertyOptional({
    description:
      'Indicates whether this finding triggers an on-site physical inspection recommendation',
    example: true,
  })
  requiresPhysicalInspection?: boolean;

  @ApiProperty({
    description:
      'Enforces ADR-004 Human Sovereignty: all automated findings are strictly advisory',
    example: true,
  })
  isAdvisory: true;

  @ApiPropertyOptional({
    description:
      'Additional evidence details or metadata supporting this finding',
  })
  evidence?: Record<string, unknown>;
}

export class DocumentVerificationMatrixItemDto implements DocumentVerificationMatrixItem {
  @ApiProperty({
    description: 'Document attachment UUID',
    example: 'e2b3c4d5-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
  })
  documentId: string;

  @ApiProperty({
    description: 'Statutory document type',
    example: 'LAND_TITLE_DEED',
  })
  documentType: string;

  @ApiProperty({
    description: 'Uploaded filename',
    example: 'Apex_LandTitleDeed.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2457600,
  })
  fileSizeBytes: number;

  @ApiProperty({
    description: 'MIME type of document',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Cryptographic SHA-256 checksum',
    example: '3b9acba72b6a0378b8004f891df4ffbe7e8e50b91cb5ee73dc9d604b9ea42848',
  })
  sha256Checksum: string;

  @ApiProperty({
    description: 'Current document processing status',
    example: 'COMPLETED',
  })
  processingStatus: string;

  @ApiProperty({
    description: 'Overall OCR extraction confidence score (0.0 to 1.0)',
    example: 0.94,
  })
  ocrConfidence: number;

  @ApiProperty({
    description: 'Number of statutory fields extracted from document',
    example: 6,
  })
  extractedFieldCount: number;

  @ApiProperty({
    description: 'Dictionary of extracted key-value pairs',
    example: { landAreaAcres: 7.5, deedNumber: 'LD-2024-884' },
  })
  extractedFields: Record<string, string | number>;

  @ApiProperty({
    description: 'Structural integrity assessment outcome',
    enum: ['VALID', 'ANOMALIES_DETECTED', 'UNCHECKED'],
    example: 'VALID',
  })
  integrityStatus: 'VALID' | 'ANOMALIES_DETECTED' | 'UNCHECKED';

  @ApiProperty({
    description: 'Integrity anomaly codes detected if any',
    example: [],
  })
  integrityAnomalyCodes: string[];

  @ApiProperty({
    description: 'Duplicate detection status',
    enum: ['UNIQUE', 'EXACT_DUPLICATE', 'NEAR_DUPLICATE'],
    example: 'UNIQUE',
  })
  duplicateStatus: 'UNIQUE' | 'EXACT_DUPLICATE' | 'NEAR_DUPLICATE';

  @ApiProperty({
    description: 'Matching duplicate document IDs if any',
    example: [],
  })
  duplicateMatchIds: string[];

  @ApiProperty({
    description: 'Issuer verification status',
    enum: [
      'VERIFIED',
      'DISCREPANCY',
      'SIMULATED',
      'NOT_APPLICABLE',
      'PENDING',
      'SOURCE_UNAVAILABLE',
    ],
    example: 'SIMULATED',
  })
  issuerStatus:
    | 'VERIFIED'
    | 'DISCREPANCY'
    | 'SIMULATED'
    | 'NOT_APPLICABLE'
    | 'PENDING'
    | 'SOURCE_UNAVAILABLE';

  @ApiPropertyOptional({
    description: 'ID of verification provider used',
    example: 'SIMULATED_ISSUER_ADAPTER',
  })
  issuerProviderId?: string;

  @ApiProperty({
    description:
      'Flags whether issuer verification was performed with a simulated double',
    example: true,
  })
  isSimulated: boolean;

  @ApiProperty({
    description: 'Count of active findings associated with this document',
    example: 1,
  })
  findingsCount: number;
}

export class IssuerVerificationSummaryDto implements IssuerVerificationSummary {
  @ApiProperty({
    description: 'Total documents eligible for external issuer verification',
    example: 3,
  })
  totalEligible: number;

  @ApiProperty({
    description: 'Count of documents confirmed matching with issuer registry',
    example: 2,
  })
  verifiedCount: number;

  @ApiProperty({
    description:
      'Count of documents with field discrepancies or negative issuer match',
    example: 1,
  })
  discrepancyCount: number;

  @ApiProperty({
    description:
      'Count of verifications performed using simulated sandbox doubles',
    example: 3,
  })
  simulatedCount: number;

  @ApiProperty({
    description:
      'Count of eligible documents pending external issuer verification',
    example: 0,
  })
  pendingCount: number;
}

export class InfrastructureReviewSummaryMetricsDto implements InfrastructureReviewSummaryMetrics {
  @ApiProperty({
    description: 'Whether land area meets regulatory threshold',
    example: true,
  })
  landCompliant: boolean;

  @ApiProperty({
    description: 'Whether built-up instructional/admin area meets norms',
    example: true,
  })
  builtUpAreaCompliant: boolean;

  @ApiProperty({
    description: 'Whether barrier-free environment declarations exist',
    example: true,
  })
  barrierFreeDeclared: boolean;

  @ApiProperty({
    description: 'Whether fire safety certificate is unexpired',
    example: true,
  })
  fireSafetyValid: boolean;

  @ApiProperty({
    description:
      'Flag indicating whether on-site physical inspection by EVC is recommended',
    example: false,
  })
  evcInspectionRecommended: boolean;

  @ApiProperty({
    type: [String],
    description: 'Reasons triggering on-site EVC inspection recommendation',
    example: [],
  })
  inspectionTriggerReasons: string[];

  @ApiProperty({
    type: [String],
    description: 'Heuristic limitations and disclaimer statements',
    example: [],
  })
  heuristicLimitations: string[];
}

export class RegulatoryComplianceSummaryDto implements RegulatoryComplianceSummary {
  @ApiPropertyOptional({
    description: 'Code of the versioned rule set evaluated',
    example: 'AICTE-APH-2026-27',
  })
  ruleSetCode?: string;

  @ApiPropertyOptional({
    description: 'Name of the versioned rule set evaluated',
    example: 'AICTE Approval Process Handbook 2026-27',
  })
  ruleSetName?: string;

  @ApiPropertyOptional({
    description: 'Rule set version number',
    example: '1.0.0',
  })
  ruleVersionNumber?: string | number;

  @ApiPropertyOptional({
    description: 'Rule set version UUID',
    example: 'c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  ruleVersionId?: string;

  @ApiPropertyOptional({
    description: 'Regulatory checklist code evaluated',
    example: 'CHK-ENGG-UG-2026',
  })
  checklistCode?: string;
}

export class DossierReportSummaryDto implements DossierReportSummary {
  @ApiProperty({
    description: 'Total document attachments in dossier',
    example: 7,
  })
  totalDocuments: number;

  @ApiProperty({
    description:
      'Total verification, compliance, and checklist rules evaluated',
    example: 24,
  })
  totalRulesEvaluated: number;

  @ApiProperty({
    description: 'Count of critical statutory deficiencies found',
    example: 0,
  })
  criticalDeficienciesCount: number;

  @ApiProperty({
    description: 'Count of advisory warnings or recommended review flags',
    example: 2,
  })
  advisoryFlagsCount: number;

  @ApiProperty({
    description: 'Count of compliant rules and verified checks',
    example: 22,
  })
  compliantCount: number;

  @ApiProperty({
    description: 'True if one or more critical deficiencies are present',
    example: false,
  })
  hasCriticalDeficiency: boolean;

  @ApiProperty({
    description: 'Count of exact or near-duplicate matches detected',
    example: 0,
  })
  duplicateMatchCount: number;

  @ApiProperty({
    description: 'Count of structural integrity anomalies detected',
    example: 0,
  })
  integrityAnomalyCount: number;

  @ApiProperty({
    description: 'Summary of external/simulated issuer verifications',
    type: IssuerVerificationSummaryDto,
  })
  issuerVerificationSummary: IssuerVerificationSummaryDto;

  @ApiProperty({
    description: 'Summary of physical plant & infrastructure review heuristics',
    type: InfrastructureReviewSummaryMetricsDto,
  })
  infrastructureReviewSummary: InfrastructureReviewSummaryMetricsDto;

  @ApiProperty({
    description:
      'Indicates whether an on-site physical inspection is recommended by rules or heuristics',
    example: false,
  })
  requiresPhysicalInspection: boolean;
}

export class DossierReportDto implements DossierVerificationResult {
  @ApiProperty({
    description: 'Application UUID',
    example: '7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Application reference number',
    example: 'AICTE-2026-ENGG-0042',
  })
  applicationNumber: string;

  @ApiProperty({
    description: 'Institution UUID',
    example: 'inst-uuid-1001',
  })
  institutionId: string;

  @ApiPropertyOptional({
    description: 'Institution registered name',
    example: 'Apex Institute of Technology',
  })
  institutionName?: string;

  @ApiProperty({
    description: 'Academic program category',
    example: 'Undergraduate Engineering',
  })
  programType: string;

  @ApiProperty({
    description: 'Target academic year',
    example: '2026-2027',
  })
  academicYear: string;

  @ApiProperty({
    description: 'Overall consolidated verification disposition',
    enum: OverallValidationStatus,
    example: OverallValidationStatus.COMPLIANT,
  })
  overallStatus: OverallValidationStatus;

  @ApiProperty({
    description: 'Timestamp when evaluation was executed (ISO 8601 UTC)',
    example: '2026-10-25T14:30:00.000Z',
  })
  evaluatedAt: string;

  @ApiProperty({
    description:
      'Enforces ADR-004 Human Sovereignty: all dossier outputs are strictly advisory',
    example: true,
  })
  isAdvisory: true;

  @ApiProperty({
    description: 'Consolidated summary metrics across all pipelines',
    type: DossierReportSummaryDto,
  })
  summary: DossierReportSummaryDto;

  @ApiProperty({
    description: 'Per-attachment verification matrix',
    type: [DocumentVerificationMatrixItemDto],
  })
  documentMatrix: DocumentVerificationMatrixItemDto[];

  @ApiProperty({
    description: 'Consolidated evidence-linked findings list',
    type: [DossierReportFindingDto],
  })
  findings: DossierReportFindingDto[];

  @ApiPropertyOptional({
    description: 'Regulatory compliance rule version and checklist metadata',
    type: RegulatoryComplianceSummaryDto,
  })
  regulatoryCompliance?: RegulatoryComplianceSummaryDto;

  @ApiPropertyOptional({
    description: 'Detailed infrastructure review metrics and calculations',
  })
  infrastructureReview?: Record<string, unknown>;

  @ApiProperty({
    description: 'Authoritative ADR-004 Human Sovereignty legal disclaimer',
    example:
      'This dossier verification report is an automated decision-support aggregation...',
  })
  disclaimer: string;
}

export class DossierSummaryDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Application reference number',
    example: 'AICTE-2026-ENGG-0042',
  })
  applicationNumber: string;

  @ApiProperty({
    description: 'Institution UUID',
    example: 'inst-uuid-1001',
  })
  institutionId: string;

  @ApiPropertyOptional({
    description: 'Institution registered name',
    example: 'Apex Institute of Technology',
  })
  institutionName?: string;

  @ApiProperty({
    description: 'Academic program category',
    example: 'Undergraduate Engineering',
  })
  programType: string;

  @ApiProperty({
    description: 'Target academic year',
    example: '2026-2027',
  })
  academicYear: string;

  @ApiProperty({
    description: 'Overall consolidated verification disposition',
    enum: OverallValidationStatus,
    example: OverallValidationStatus.COMPLIANT,
  })
  overallStatus: OverallValidationStatus;

  @ApiProperty({
    description: 'Timestamp when evaluation was executed (ISO 8601 UTC)',
    example: '2026-10-25T14:30:00.000Z',
  })
  evaluatedAt: string;

  @ApiProperty({
    description:
      'Enforces ADR-004 Human Sovereignty: all dossier outputs are strictly advisory',
    example: true,
  })
  isAdvisory: true;

  @ApiProperty({
    description: 'Consolidated summary metrics for queue displays',
    type: DossierReportSummaryDto,
  })
  summary: DossierReportSummaryDto;
}
