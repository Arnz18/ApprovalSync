/**
 * ApprovalSync — Normalized Verification Response Interface
 * Milestone: DOC-05
 *
 * Normalizes provider verification outcomes, source status, and structured evidence.
 */

import {
  MockProviderMetadata,
  VerificationStatus,
} from '../../shared/contracts';
import { ProviderVerificationOutcome } from './provider-verification-outcome.enum';

export type FieldComparisonStatus =
  'MATCH' | 'MISMATCH' | 'UNAVAILABLE' | 'NOT_APPLICABLE';

export interface FieldComparisonResult {
  field: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  status: FieldComparisonStatus;
  notes?: string;
}

export interface NormalizedVerificationResponse {
  documentId: string;
  status: VerificationStatus;
  outcome: ProviderVerificationOutcome;
  sourceId: string;
  sourceName: string;
  isSimulated: boolean;
  verifiedAt?: string;
  sourceReference?: string;
  comparisonSummary: string;
  matchedFields: FieldComparisonResult[];
  discrepantFields: FieldComparisonResult[];
  limitations: string[];
  evidence?: Record<string, unknown>;
  providerMetadata?: MockProviderMetadata;
  isAdvisory: true; // ADR-004 Human Sovereignty
}
