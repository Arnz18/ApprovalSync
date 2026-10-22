/**
 * ApprovalSync — Shared Document & Evidence Contracts
 * Milestone: FND-02
 */

import { DocumentProcessingStatus } from './enums';

export interface BoundingBox {
  pageNumber: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface DocumentExtractionFinding {
  fieldKey: string;           // e.g. "leaseTenureYears", "landAreaAcres"
  extractedValue: string | number;
  confidenceScore: number;    // 0.0 to 1.0 (Provisional score)
  evidenceLocation: BoundingBox;
  isAdvisory: true;           // Strictly advisory finding (ADR-004)
}

export interface DocumentMetadata {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  processingStatus: DocumentProcessingStatus;
  uploadedAt: string;         // ISO 8601 UTC
}

export interface DocumentAnalysisReport {
  documentId: string;
  processingStatus: DocumentProcessingStatus;
  ocrConfidence: number;      // 0.0 to 1.0
  extractedFields: Record<string, string | number>;
  findings: DocumentExtractionFinding[];
  anomalyFlags: Array<{
    code: string;
    description: string;
    isAdvisory: true;
    boundingLocation?: BoundingBox;
  }>;
}
