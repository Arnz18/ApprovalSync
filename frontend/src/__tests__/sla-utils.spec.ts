import { describe, it, expect } from 'vitest';
import {
  formatSlaDuration,
  formatRemainingTime,
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  formatIsoDateTime,
  formatSlaTier,
  formatEscalationLevel,
  getEscalationSeverity,
  isTimerManagementAuthorized,
  SLA_TIMER_MANAGEMENT_ROLES,
} from '../sla/slaUtils';
import {
  SlaTimerProjection,
  SlaTimerStatus,
  ApplicationStatus,
  SlaTier,
  SlaEscalationLevel,
  UserRole,
} from '../sla/types';

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

  describe('isTimerManagementAuthorized (BE-08 RBAC)', () => {
    it('authorizes all four backend-permitted regulatory and admin roles', () => {
      expect(SLA_TIMER_MANAGEMENT_ROLES).toContain(UserRole.SCRUTINY_OFFICER);
      expect(SLA_TIMER_MANAGEMENT_ROLES).toContain(UserRole.REGIONAL_OFFICER);
      expect(SLA_TIMER_MANAGEMENT_ROLES).toContain(UserRole.BUREAU_HEAD);
      expect(SLA_TIMER_MANAGEMENT_ROLES).toContain(UserRole.SYSTEM_ADMIN);

      expect(isTimerManagementAuthorized(UserRole.SCRUTINY_OFFICER)).toBe(true);
      expect(isTimerManagementAuthorized(UserRole.REGIONAL_OFFICER)).toBe(true);
      expect(isTimerManagementAuthorized(UserRole.BUREAU_HEAD)).toBe(true);
      expect(isTimerManagementAuthorized(UserRole.SYSTEM_ADMIN)).toBe(true);
    });

    it('denies applicant, committee, and auditor roles without mutation access', () => {
      expect(isTimerManagementAuthorized(UserRole.INSTITUTION_USER)).toBe(false);
      expect(isTimerManagementAuthorized(UserRole.EVC_INSPECTOR)).toBe(false);
      expect(isTimerManagementAuthorized(UserRole.SHC_SAC_MEMBER)).toBe(false);
      expect(isTimerManagementAuthorized(UserRole.AUDITOR)).toBe(false);
      expect(isTimerManagementAuthorized(null)).toBe(false);
      expect(isTimerManagementAuthorized(undefined)).toBe(false);
    });
  });

  describe('formatSlaTier & formatEscalationLevel (Escalation Presentation Resilience)', () => {
    it('formats frozen SlaTier enum values and alternative role-based aliases cleanly', () => {
      expect(formatSlaTier(SlaTier.TIER_1_RO_ALERT)).toBe('Tier 1 (RO Alert)');
      expect(formatSlaTier('TIER_1_SCRUTINY_OFFICER')).toBe('Tier 1 (RO Alert)');

      expect(formatSlaTier(SlaTier.TIER_2_DIRECTOR_BREACH)).toBe('Tier 2 (Director Breach)');
      expect(formatSlaTier('TIER_2_REGIONAL_OFFICER')).toBe('Tier 2 (Director Breach)');

      expect(formatSlaTier(SlaTier.TIER_3_COUNCIL_LOCK)).toBe('Tier 3 (Council Lock)');
      expect(formatSlaTier('TIER_3_BUREAU_HEAD')).toBe('Tier 3 (Council Lock)');
    });

    it('gracefully handles unknown or custom tier strings without crashing', () => {
      expect(formatSlaTier('TIER_4_SPECIAL_AUDIT')).toBe('Tier 4 Special Audit');
      expect(formatSlaTier('CUSTOM_EMERGENCY_TIER')).toBe('Custom Emergency Tier');
      expect(formatSlaTier(null)).toBe('Standard');
      expect(formatSlaTier(undefined)).toBe('Standard');
    });

    it('formats escalation levels with human-readable titles', () => {
      expect(formatEscalationLevel(SlaEscalationLevel.WARNING)).toBe('Warning');
      expect(formatEscalationLevel(SlaEscalationLevel.BREACH)).toBe('Breach');
      expect(formatEscalationLevel(SlaEscalationLevel.SEVERE_BREACH)).toBe('Severe Breach');
      expect(formatEscalationLevel('STAGE_DEADLINE_EXCEEDED')).toBe('Stage Deadline Exceeded');
      expect(formatEscalationLevel(null)).toBe('Notice');
      expect(formatEscalationLevel(undefined)).toBe('Notice');
    });

    it('derives correct visual severity for known and unknown levels', () => {
      expect(getEscalationSeverity(SlaEscalationLevel.BREACH)).toBe('breach');
      expect(getEscalationSeverity(SlaEscalationLevel.SEVERE_BREACH)).toBe('breach');
      expect(getEscalationSeverity(SlaEscalationLevel.WARNING)).toBe('warning');
      expect(getEscalationSeverity('UNEXPECTED_LEVEL')).toBe('info');
      expect(getEscalationSeverity(null)).toBe('info');
    });
  });
});
