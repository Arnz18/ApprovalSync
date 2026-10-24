/**
 * ApprovalSync — Document Integrity & Anomaly Contracts
 * Milestone: DOC-04
 *
 * Defines contracts for structural PDF integrity, active content detection,
 * image tamper heuristics, digital signature status, and anomaly indicators.
 */

import { ValidationFinding } from './validation-rule.interface';

export interface PdfStructureInspection {
  hasValidHeader: boolean;
  hasValidTrailer: boolean;
  pdfVersion?: string;
  hasActiveContent: boolean;
  activeContentDetails: string[];
  creationDate?: string;
  modDate?: string;
  hasTimelineInversion: boolean;
  isFutureDate: boolean;
}

export interface ImageStructureInspection {
  hasValidMagicBytes: boolean;
  hasValidTrailer: boolean;
  dimensionsValid: boolean;
  width?: number;
  height?: number;
  editingToolDetected?: string;
}

export interface DigitalSignatureInspection {
  hasSignatureDictionary: boolean;
  signatureType?: string;
  byteRangePresent: boolean;
  isTrustStoreConfigured: boolean;
  statusMessage: string;
}

export interface DocumentIntegrityResult {
  documentId: string;
  fileName: string;
  mimeType: string;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL' | 'UNAVAILABLE';
  findings: ValidationFinding[];
  evaluatedAt: string;
}
