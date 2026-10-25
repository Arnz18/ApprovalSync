/**
 * ApprovalSync — Normalized Verification Request Interface
 * Milestone: DOC-05
 *
 * Encapsulates the minimal necessary document and issuer attributes
 * passed to external verification adapters.
 */

export type SimulationScenario =
  | 'MATCH'
  | 'MISMATCH'
  | 'EXPIRED'
  | 'PENDING'
  | 'UNAVAILABLE'
  | 'UNSUPPORTED'
  | 'MANUAL_REVIEW';

export interface NormalizedVerificationRequest {
  documentId: string;
  applicationId: string;
  institutionId: string;
  documentType: string;
  documentNumber?: string;
  institutionName?: string;
  state?: string;
  district?: string;
  khasraNumber?: string;
  surveyNumber?: string;
  fileBuffer?: Buffer;
  sha256Checksum?: string;
  issuedDate?: string;
  expiryDate?: string;
  simulateScenario?: SimulationScenario;
  metadata?: Record<string, unknown>;
}
