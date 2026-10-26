/**
 * ApprovalSync — SLA Policies Configuration Unit Tests
 * Milestone: BE-08
 */

import { ApplicationStatus, SlaTier, UserRole } from '../../shared/contracts';
import {
  DEFAULT_SLA_POLICIES,
  resolvePolicyForStage,
  calculateDeadlines,
  convertDurationToMs,
  ILLUSTRATIVE_DISCLAIMER,
} from './sla-policies.config';

describe('SlaPoliciesConfig', () => {
  describe('DEFAULT_SLA_POLICIES Integrity', () => {
    it('configures policies with valid frozen enums and non-empty IDs', () => {
      expect(DEFAULT_SLA_POLICIES.length).toBeGreaterThan(0);
      for (const policy of DEFAULT_SLA_POLICIES) {
        expect(policy.id).toMatch(/^SLA_[A-Z0-9_]+$/);
        expect(policy.name).toBeTruthy();
        expect(policy.description).toBeTruthy();
        expect(Object.values(ApplicationStatus)).toContain(policy.stage);
        expect(Object.values(SlaTier)).toContain(policy.tier);
        expect(Object.values(UserRole)).toContain(policy.warningTargetRole);
        expect(Object.values(UserRole)).toContain(policy.breachTargetRole);
        expect(policy.duration).toBeGreaterThan(0);
        expect(policy.warningThresholdFraction).toBeGreaterThan(0);
        expect(policy.warningThresholdFraction).toBeLessThan(
          policy.breachThresholdFraction,
        );
        expect(policy.breachThresholdFraction).toBe(1.0);
        if (policy.severeBreachThresholdFraction) {
          expect(policy.severeBreachThresholdFraction).toBeGreaterThan(1.0);
        }
      }
    });

    it('classifies all unverified statutory policies as ILLUSTRATIVE_DEMO', () => {
      for (const policy of DEFAULT_SLA_POLICIES) {
        expect(policy.classification).toBe('ILLUSTRATIVE_DEMO');
        expect(policy.sourceReference).toContain('Illustrative');
      }
      expect(ILLUSTRATIVE_DISCLAIMER).toContain(
        'illustrative operational thresholds',
      );
    });
  });

  describe('convertDurationToMs', () => {
    it('converts minutes, hours, and days accurately to milliseconds', () => {
      expect(convertDurationToMs(5, 'MINUTES')).toBe(5 * 60 * 1000);
      expect(convertDurationToMs(2, 'HOURS')).toBe(2 * 3600 * 1000);
      expect(convertDurationToMs(3, 'DAYS')).toBe(3 * 86400 * 1000);
    });

    it('rejects negative durations', () => {
      expect(() => convertDurationToMs(-1, 'HOURS')).toThrow(
        'SLA duration must be non-negative',
      );
    });

    it('rejects unsupported units', () => {
      expect(() => convertDurationToMs(5, 'WEEKS' as any)).toThrow(
        'Unsupported SLA unit',
      );
    });
  });

  describe('resolvePolicyForStage', () => {
    it('resolves active policy for SUBMITTED stage', () => {
      const policy = resolvePolicyForStage(ApplicationStatus.SUBMITTED);
      expect(policy).not.toBeNull();
      expect(policy?.stage).toBe(ApplicationStatus.SUBMITTED);
      expect(policy?.tier).toBe(SlaTier.TIER_1_RO_ALERT);
    });

    it('resolves active policy for UNDER_SCRUTINY stage with canPause = true', () => {
      const policy = resolvePolicyForStage(ApplicationStatus.UNDER_SCRUTINY);
      expect(policy).not.toBeNull();
      expect(policy?.canPause).toBe(true);
      expect(policy?.duration).toBe(15);
    });

    it('returns null for stages without configured active SLA policy', () => {
      expect(resolvePolicyForStage(ApplicationStatus.DRAFT)).toBeNull();
      expect(resolvePolicyForStage(ApplicationStatus.APPROVED)).toBeNull();
      expect(resolvePolicyForStage(ApplicationStatus.REJECTED)).toBeNull();
      expect(resolvePolicyForStage(ApplicationStatus.WITHDRAWN)).toBeNull();
    });
  });

  describe('calculateDeadlines', () => {
    it('computes exact warning and target deadlines from start time', () => {
      const policy = resolvePolicyForStage(ApplicationStatus.SUBMITTED)!;
      const startedAt = new Date('2026-10-01T00:00:00.000Z');

      const { targetDeadline, warningDeadline, severeBreachDeadline } =
        calculateDeadlines(policy, startedAt);

      // Duration: 7 days = 604,800,000 ms
      const expectedTargetMs = startedAt.getTime() + 7 * 86400 * 1000;
      expect(targetDeadline.getTime()).toBe(expectedTargetMs);

      // Warning at 75% = 5.25 days = 453,600,000 ms
      const expectedWarningMs = startedAt.getTime() + 0.75 * 7 * 86400 * 1000;
      expect(warningDeadline.getTime()).toBe(expectedWarningMs);

      // Severe breach at 125% = 8.75 days
      const expectedSevereMs = startedAt.getTime() + 1.25 * 7 * 86400 * 1000;
      expect(severeBreachDeadline?.getTime()).toBe(expectedSevereMs);
    });
  });
});
