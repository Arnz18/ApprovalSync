/**
 * ApprovalSync — SLA Clock Interface
 * Milestone: BE-08
 */

export const SLA_CLOCK_TOKEN = 'SLA_CLOCK_TOKEN';

export interface ISlaClock {
  /**
   * Returns current reference time (UTC-aware Date).
   */
  getNow(): Date;

  /**
   * Sets the clock to an explicit fixed timestamp (testing utility).
   */
  setTime?(date: Date): void;

  /**
   * Advances the clock by a relative millisecond offset (testing utility).
   */
  advanceMs?(ms: number): void;

  /**
   * Resets the clock to live system time.
   */
  reset?(): void;
}
