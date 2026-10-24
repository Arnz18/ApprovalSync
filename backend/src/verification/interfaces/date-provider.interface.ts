/**
 * ApprovalSync — Date Provider Interface
 * Milestone: DOC-03
 *
 * Injected clock interface for deterministic date and expiry testing.
 */

export const DATE_PROVIDER_TOKEN = 'DATE_PROVIDER_TOKEN';

export interface IDateProvider {
  /**
   * Returns current reference time (UTC-aware Date).
   */
  getNow(): Date;
}
