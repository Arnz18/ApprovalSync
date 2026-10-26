/**
 * ApprovalSync — Undertakings Clock Service Tests
 * Milestone: BE-09
 */

import { UndertakingsClockService } from './undertakings-clock.service';

describe('UndertakingsClockService', () => {
  let clock: UndertakingsClockService;

  beforeEach(() => {
    clock = new UndertakingsClockService();
  });

  it('returns current real date by default', () => {
    const today = clock.getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('allows freezing and overriding date string', () => {
    clock.setDate('2025-12-31');
    expect(clock.getTodayDateString()).toBe('2025-12-31');
    const now = clock.getNow();
    expect(now.getUTCFullYear()).toBe(2025);
    expect(now.getUTCMonth()).toBe(11);
    expect(now.getUTCDate()).toBe(31);
  });

  it('resets back to real date when reset is called', () => {
    clock.setDate('2025-12-31');
    clock.reset();
    expect(clock.getTodayDateString()).not.toBe('2025-12-31');
  });
});
