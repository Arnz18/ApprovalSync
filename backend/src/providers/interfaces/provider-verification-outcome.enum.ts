/**
 * ApprovalSync — Provider Verification Outcome & Status Mapping
 * Milestone: DOC-05
 *
 * Preserves fine-grained verification outcomes while mapping cleanly
 * to the frozen shared VerificationStatus enum.
 */

import { VerificationStatus } from '../../shared/contracts';

export enum ProviderVerificationOutcome {
  VERIFIED = 'VERIFIED',
  MISMATCH_DETECTED = 'MISMATCH_DETECTED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

/**
 * Maps a fine-grained provider outcome to the shared contract VerificationStatus.
 *
 * Rules:
 * - VERIFIED:
 *   - Simulated -> VERIFIED_MOCK (shared contract definition for verified mock)
 * - MISMATCH_DETECTED -> UNTRUSTED_ISSUER
 * - EXPIRED -> MANUAL_REVIEW_REQUIRED
 * - PENDING -> MANUAL_REVIEW_REQUIRED
 * - SOURCE_UNAVAILABLE -> SOURCE_UNAVAILABLE
 * - MANUAL_REVIEW_REQUIRED -> MANUAL_REVIEW_REQUIRED
 * - NOT_SUPPORTED -> MANUAL_REVIEW_REQUIRED
 */
export function mapOutcomeToVerificationStatus(
  outcome: ProviderVerificationOutcome,
): VerificationStatus {
  switch (outcome) {
    case ProviderVerificationOutcome.VERIFIED:
      return VerificationStatus.VERIFIED_MOCK;
    case ProviderVerificationOutcome.MISMATCH_DETECTED:
      return VerificationStatus.UNTRUSTED_ISSUER;
    case ProviderVerificationOutcome.EXPIRED:
    case ProviderVerificationOutcome.PENDING:
    case ProviderVerificationOutcome.NOT_SUPPORTED:
    case ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED:
      return VerificationStatus.MANUAL_REVIEW_REQUIRED;
    case ProviderVerificationOutcome.SOURCE_UNAVAILABLE:
      return VerificationStatus.SOURCE_UNAVAILABLE;
    default:
      return VerificationStatus.MANUAL_REVIEW_REQUIRED;
  }
}
