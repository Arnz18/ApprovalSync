/**
 * ApprovalSync — SLA Clock Service Unit Tests
 * Milestone: BE-08
 */

import { SlaClockService } from './sla-clock.service';

describe('SlaClockService', () => {
  let clock: SlaClockService;

  beforeEach(() => {
    clock = new SlaClockService();
  });

  it('returns current system time by default', () => {
    const before = Date.now();
    const now = clock.getNow().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it('freezes clock to an explicit timestamp when setTime is invoked', () => {
    const frozen = new Date('2026-10-01T12:00:00.000Z');
    clock.setTime(frozen);

    expect(clock.getNow().toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(clock.getNow().getTime()).toBe(frozen.getTime());
  });

  it('advances clock by millisecond delta', () => {
    const initial = new Date('2026-10-01T12:00:00.000Z');
    clock.setTime(initial);

    clock.advanceMs(3600 * 1000); // +1 hour
    expect(clock.getNow().toISOString()).toBe('2026-10-01T13:00:00.000Z');

    clock.advanceMs(24 * 3600 * 1000); // +1 day
    expect(clock.getNow().toISOString()).toBe('2026-10-02T13:00:00.000Z');
  });

  it('resets clock back to live system time', () => {
    const frozen = new Date('2020-01-01T00:00:00.000Z');
    clock.setTime(frozen);
    expect(clock.getNow().getFullYear()).toBe(2020);

    clock.reset();
    expect(clock.getNow().getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});
