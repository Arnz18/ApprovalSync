import { describe, it, expect } from 'vitest';
import {
  formatSlaDuration,
  formatRemainingTime,
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  formatIsoDateTime,
} from '../sla/slaUtils';
import { SlaTimerProjection, SlaTimerStatus, ApplicationStatus, SlaTier } from '../sla/types';

describe('SLA Utilities (FE-05)', () => {
  describe('formatSlaDuration', () => {
    it('formats millisecond durations into days, hours, and minutes', () => {
      expect(formatSlaDuration(0)).toBe('< 1m');
      expect(formatSlaDuration(30000)).toBe('< 1m');
      expect(formatSlaDuration(5 * 60 * 1000)).toBe('5m');
      expect(formatSlaDuration(3 * 60 * 60 * 1000)).toBe('3h');
      expect(formatSlaDuration(3 * 60 * 60 * 1000 + 25 * 60 * 1000)).toBe('3h 25m');
      expect(formatSlaDuration(2 * 24 * 60 * 60 * 1000)).toBe('2d');
      expect(formatSlaDuration(2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000)).toBe('2d 4h');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatSlaDuration(-5000)).toBe('< 1m');
    });
  });

  describe('formatRemainingTime', () => {
    const fixedNow = new Date('2026-10-26T12:00:00.000Z');

    it('formats future deadlines with remaining duration', () => {
      const future = new Date('2026-10-28T16:30:00.000Z').toISOString();
      const res = formatRemainingTime(future, fixedNow);
      expect(res.isPast).toBe(false);
      expect(res.label).toContain('2d 4h remaining');
      expect(res.diffMs).toBeGreaterThan(0);
    });

    it('formats past deadlines with overdue duration', () => {
      const past = new Date('2026-10-25T08:00:00.000Z').toISOString();
      const res = formatRemainingTime(past, fixedNow);
      expect(res.isPast).toBe(true);
      expect(res.label).toContain('Overdue by 1d 4h');
      expect(res.diffMs).toBeGreaterThan(0);
    });

    it('handles invalid deadline gracefully', () => {
      const res = formatRemainingTime('not-a-date', fixedNow);
      expect(res.label).toBe('Invalid deadline');
      expect(res.isPast).toBe(false);
      expect(res.diffMs).toBe(0);
    });
  });

  describe('getSlaTimerUrgency', () => {
    const mockTimer: SlaTimerProjection = {
      id: 'timer-1',
      applicationId: 'app-1',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_1_RO_ALERT,
      status: SlaTimerStatus.ACTIVE,
      policyId: 'POLICY_1',
      startedAt: '2026-10-20T00:00:00.000Z',
      targetDeadline: '2026-10-30T00:00:00.000Z',
      warningDeadline: '2026-10-27T00:00:00.000Z',
      isWarningSent: false,
      isBreached: false,
      escalatedAt: null,
      pausedAt: null,
      resumedAt: null,
      totalPausedMs: 0,
      pauseReason: null,
      pausedById: null,
      completedAt: null,
      cancelledAt: null,
      lastEvaluatedAt: null,
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    };

    it('identifies paused timers', () => {
      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          status: SlaTimerStatus.PAUSED,
        }),
      ).toBe('paused');
    });

    it('identifies completed and cancelled timers', () => {
      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          status: SlaTimerStatus.COMPLETED,
        }),
      ).toBe('completed');
      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          status: SlaTimerStatus.CANCELLED,
        }),
      ).toBe('cancelled');
    });

    it('identifies breached timers via status, flag, or overdue deadline', () => {
      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          status: SlaTimerStatus.BREACHED,
        }),
      ).toBe('breached');

      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          isBreached: true,
        }),
      ).toBe('breached');

      // Now is past target deadline
      const pastDeadlineTimer: SlaTimerProjection = {
        ...mockTimer,
        targetDeadline: '2026-10-25T00:00:00.000Z',
      };
      expect(getSlaTimerUrgency(pastDeadlineTimer, new Date('2026-10-26T00:00:00.000Z'))).toBe(
        'breached',
      );
    });

    it('identifies warning timers via flag or reached warning deadline', () => {
      expect(
        getSlaTimerUrgency({
          ...mockTimer,
          isWarningSent: true,
        }),
      ).toBe('warning');

      const warningTimer: SlaTimerProjection = {
        ...mockTimer,
        warningDeadline: '2026-10-25T00:00:00.000Z',
        targetDeadline: '2026-10-30T00:00:00.000Z',
      };
      expect(getSlaTimerUrgency(warningTimer, new Date('2026-10-26T00:00:00.000Z'))).toBe(
        'warning',
      );
    });

    it('identifies normal active timers well before thresholds', () => {
      expect(getSlaTimerUrgency(mockTimer, new Date('2026-10-21T00:00:00.000Z'))).toBe('normal');
    });
  });

  describe('calculateApplicationAgeDays & categorizeAgeBucket', () => {
    it('calculates elapsed calendar days correctly', () => {
      const created = '2026-10-20T00:00:00.000Z';
      const now = new Date('2026-10-26T12:00:00.000Z');
      expect(calculateApplicationAgeDays(created, now)).toBe(6);
    });

    it('categorizes days into reporting age buckets', () => {
      expect(categorizeAgeBucket(3)).toBe('0-7 days');
      expect(categorizeAgeBucket(7)).toBe('0-7 days');
      expect(categorizeAgeBucket(8)).toBe('8-15 days');
      expect(categorizeAgeBucket(15)).toBe('8-15 days');
      expect(categorizeAgeBucket(16)).toBe('16-30 days');
      expect(categorizeAgeBucket(30)).toBe('16-30 days');
      expect(categorizeAgeBucket(31)).toBe('30+ days');
      expect(categorizeAgeBucket(100)).toBe('30+ days');
    });

    it('formats ISO datetime strings gracefully', () => {
      expect(formatIsoDateTime(null)).toBe('—');
      expect(formatIsoDateTime(undefined)).toBe('—');
      expect(formatIsoDateTime('invalid-date')).toBe('—');
      expect(formatIsoDateTime('2026-10-26T12:00:00.000Z')).toContain('2026');
    });
  });
});
