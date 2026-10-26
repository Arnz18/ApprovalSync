/**
 * ApprovalSync — SLA Clock Service
 * Milestone: BE-08
 *
 * Provides deterministic time handling for SLA calculations, deadline evaluations,
 * and restart reconciliation testing.
 */

import { Injectable } from '@nestjs/common';
import { ISlaClock } from './sla-clock.interface';

@Injectable()
export class SlaClockService implements ISlaClock {
  private offsetMs = 0;
  private fixedDate: Date | null = null;

  /**
   * Returns the current time, factoring in any mock offset or fixed test time.
   */
  getNow(): Date {
    if (this.fixedDate) {
      return new Date(this.fixedDate.getTime());
    }
    return new Date(Date.now() + this.offsetMs);
  }

  /**
   * Fixes the clock to a specific frozen timestamp (useful in deterministic tests).
   */
  setTime(date: Date): void {
    this.fixedDate = new Date(date.getTime());
    this.offsetMs = 0;
  }

  /**
   * Advances the clock forward (or backward) by a relative millisecond duration.
   */
  advanceMs(ms: number): void {
    if (this.fixedDate) {
      this.fixedDate = new Date(this.fixedDate.getTime() + ms);
    } else {
      this.offsetMs += ms;
    }
  }

  /**
   * Resets the clock to live real-time system clock.
   */
  reset(): void {
    this.fixedDate = null;
    this.offsetMs = 0;
  }
}
