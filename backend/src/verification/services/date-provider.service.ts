/**
 * ApprovalSync — Date Provider Service
 * Milestone: DOC-03
 *
 * Implements IDateProvider for deterministic, clock-injectable date evaluation.
 */

import { Injectable } from '@nestjs/common';
import { IDateProvider } from '../interfaces/date-provider.interface';

@Injectable()
export class DateProviderService implements IDateProvider {
  private overrideDate: Date | null = null;

  /**
   * Returns current reference time (UTC-aware Date).
   * If an override date has been set (e.g. for deterministic testing), returns that date.
   */
  getNow(): Date {
    return this.overrideDate ? new Date(this.overrideDate) : new Date();
  }

  /**
   * Set an explicit override date for testing. Set to null to restore system clock.
   */
  setOverrideDate(date: Date | string | null): void {
    if (date === null) {
      this.overrideDate = null;
    } else {
      this.overrideDate = typeof date === 'string' ? new Date(date) : date;
    }
  }
}
