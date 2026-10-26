/**
 * ApprovalSync — Undertakings Clock Service
 * Milestone: BE-09
 *
 * Deterministic clock abstraction for date boundary evaluation and test fixture simulation.
 */

import { Injectable } from '@nestjs/common';
import { formatDateOnlyUtc } from '../utils/date-calculations';

export interface IUndertakingsClock {
  getNow(): Date;
  getTodayDateString(): string;
  setDate(dateStr: string): void;
  reset(): void;
}

@Injectable()
export class UndertakingsClockService implements IUndertakingsClock {
  private simulatedDate: string | null = null;

  getNow(): Date {
    if (this.simulatedDate) {
      const [y, m, d] = this.simulatedDate.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
    }
    return new Date();
  }

  getTodayDateString(): string {
    if (this.simulatedDate) {
      return this.simulatedDate;
    }
    return formatDateOnlyUtc(new Date());
  }

  setDate(dateStr: string): void {
    this.simulatedDate = dateStr;
  }

  reset(): void {
    this.simulatedDate = null;
  }
}
