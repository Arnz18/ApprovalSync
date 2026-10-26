/**
 * ApprovalSync — Date Calculations Unit Tests
 * Milestone: BE-09
 */

import { BadRequestException } from '@nestjs/common';
import {
  isLeapYear,
  getDaysInMonth,
  parseDateOnlyUtc,
  formatDateOnlyUtc,
  calculateRenewalDueDate,
  isValidDateRange,
  calculateUndertakingDerivedStatus,
} from './date-calculations';
import { UndertakingStatus } from '../enums/undertaking-status.enum';

describe('Date Calculations Utility', () => {
  describe('isLeapYear', () => {
    it('identifies standard leap years divisible by 4', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2016)).toBe(true);
    });

    it('identifies non-leap years not divisible by 4', () => {
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
    });

    it('handles century boundary leap year rules (divisible by 100 vs 400)', () => {
      expect(isLeapYear(2000)).toBe(true); // divisible by 400
      expect(isLeapYear(1900)).toBe(false); // divisible by 100 but not 400
      expect(isLeapYear(2100)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('returns 31 days for long months', () => {
      expect(getDaysInMonth(2024, 1)).toBe(31);
      expect(getDaysInMonth(2024, 3)).toBe(31);
      expect(getDaysInMonth(2024, 5)).toBe(31);
      expect(getDaysInMonth(2024, 7)).toBe(31);
      expect(getDaysInMonth(2024, 8)).toBe(31);
      expect(getDaysInMonth(2024, 10)).toBe(31);
      expect(getDaysInMonth(2024, 12)).toBe(31);
    });

    it('returns 30 days for short months', () => {
      expect(getDaysInMonth(2024, 4)).toBe(30);
      expect(getDaysInMonth(2024, 6)).toBe(30);
      expect(getDaysInMonth(2024, 9)).toBe(30);
      expect(getDaysInMonth(2024, 11)).toBe(30);
    });

    it('returns 29 days for February in leap years and 28 in regular years', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2023, 2)).toBe(28);
    });

    it('throws BadRequestException for invalid months', () => {
      expect(() => getDaysInMonth(2024, 0)).toThrow(BadRequestException);
      expect(() => getDaysInMonth(2024, 13)).toThrow(BadRequestException);
    });
  });

  describe('parseDateOnlyUtc & formatDateOnlyUtc', () => {
    it('parses valid calendar dates accurately in UTC', () => {
      const d = parseDateOnlyUtc('2024-02-29');
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(d.getUTCDate()).toBe(29);
      expect(formatDateOnlyUtc(d)).toBe('2024-02-29');
    });

    it('rejects Feb 29 on non-leap years', () => {
      expect(() => parseDateOnlyUtc('2023-02-29')).toThrow(BadRequestException);
    });

    it('rejects April 31 and November 31', () => {
      expect(() => parseDateOnlyUtc('2024-04-31')).toThrow(BadRequestException);
      expect(() => parseDateOnlyUtc('2024-11-31')).toThrow(BadRequestException);
    });

    it('rejects malformed strings', () => {
      expect(() => parseDateOnlyUtc('invalid')).toThrow(BadRequestException);
      expect(() => parseDateOnlyUtc('2024/05/10')).toThrow(BadRequestException);
      expect(() => parseDateOnlyUtc('2024-5-10')).toThrow(BadRequestException);
      expect(() => parseDateOnlyUtc('')).toThrow(BadRequestException);
    });
  });

  describe('calculateRenewalDueDate', () => {
    it('calculates renewal due date subtracting lead days', () => {
      // 2025-06-30 minus 60 days -> 2025-05-01
      const due = calculateRenewalDueDate('2025-06-30', 60);
      expect(due).toBe('2025-05-01');
    });

    it('handles leap year boundaries correctly', () => {
      // 2024-03-10 minus 15 days -> crosses into February 2024 (leap year -> 29 days)
      const due = calculateRenewalDueDate('2024-03-10', 15);
      expect(due).toBe('2024-02-24');
    });

    it('handles year boundary transitions', () => {
      // 2025-01-15 minus 30 days -> 2024-12-16
      const due = calculateRenewalDueDate('2025-01-15', 30);
      expect(due).toBe('2024-12-16');
    });

    it('throws for non-positive or non-integer lead days', () => {
      expect(() => calculateRenewalDueDate('2025-01-15', 0)).toThrow(
        BadRequestException,
      );
      expect(() => calculateRenewalDueDate('2025-01-15', -5)).toThrow(
        BadRequestException,
      );
      expect(() => calculateRenewalDueDate('2025-01-15', 10.5)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isValidDateRange', () => {
    it('returns true when expiry date is strictly after start date', () => {
      expect(isValidDateRange('2024-01-01', '2025-01-01')).toBe(true);
      expect(isValidDateRange('2024-02-28', '2024-02-29')).toBe(true);
    });

    it('returns false when expiry is same as or before start date', () => {
      expect(isValidDateRange('2024-01-01', '2024-01-01')).toBe(false);
      expect(isValidDateRange('2025-01-01', '2024-01-01')).toBe(false);
    });
  });

  describe('calculateUndertakingDerivedStatus', () => {
    const baseParams = {
      startDate: '2020-01-01',
      expiryDate: '2025-06-30',
      renewalDueDate: '2025-05-01', // 60 days before
      renewalLeadDays: 60,
      currentStatus: UndertakingStatus.ACTIVE,
    };

    it('derives ACTIVE when comfortably before renewal window', () => {
      const res = calculateUndertakingDerivedStatus({
        ...baseParams,
        asOfDate: '2024-01-01',
      });
      expect(res.status).toBe(UndertakingStatus.ACTIVE);
      expect(res.isExpiringSoon).toBe(false);
      expect(res.isRenewalDue).toBe(false);
      expect(res.isExpired).toBe(false);
    });

    it('derives EXPIRING_SOON when inside pre-warning threshold (30 days before renewalDueDate)', () => {
      // renewalDueDate is 2025-05-01; pre-warning starts on 2025-04-01
      const res = calculateUndertakingDerivedStatus({
        ...baseParams,
        asOfDate: '2025-04-15',
      });
      expect(res.status).toBe(UndertakingStatus.EXPIRING_SOON);
      expect(res.isExpiringSoon).toBe(true);
      expect(res.isRenewalDue).toBe(false);
      expect(res.isExpired).toBe(false);
    });

    it('derives RENEWAL_DUE when on or after renewalDueDate and on or before expiryDate', () => {
      const onDue = calculateUndertakingDerivedStatus({
        ...baseParams,
        asOfDate: '2025-05-01',
      });
      expect(onDue.status).toBe(UndertakingStatus.RENEWAL_DUE);
      expect(onDue.isRenewalDue).toBe(true);
      expect(onDue.isExpired).toBe(false);

      const onExpiry = calculateUndertakingDerivedStatus({
        ...baseParams,
        asOfDate: '2025-06-30',
      });
      expect(onExpiry.status).toBe(UndertakingStatus.RENEWAL_DUE);
      expect(onExpiry.isRenewalDue).toBe(true);
      expect(onExpiry.isExpired).toBe(false);
    });

    it('derives EXPIRED when evaluation date is past expiryDate', () => {
      const res = calculateUndertakingDerivedStatus({
        ...baseParams,
        asOfDate: '2025-07-01',
      });
      expect(res.status).toBe(UndertakingStatus.EXPIRED);
      expect(res.isExpired).toBe(true);
      expect(res.daysRemaining).toBeLessThan(0);
    });

    it('preserves SUPERSEDED, TERMINATED, and DRAFT terminal states without overwriting', () => {
      const superseded = calculateUndertakingDerivedStatus({
        ...baseParams,
        currentStatus: UndertakingStatus.SUPERSEDED,
        asOfDate: '2025-07-01',
      });
      expect(superseded.status).toBe(UndertakingStatus.SUPERSEDED);

      const terminated = calculateUndertakingDerivedStatus({
        ...baseParams,
        currentStatus: UndertakingStatus.TERMINATED,
        asOfDate: '2025-07-01',
      });
      expect(terminated.status).toBe(UndertakingStatus.TERMINATED);

      const draft = calculateUndertakingDerivedStatus({
        ...baseParams,
        currentStatus: UndertakingStatus.DRAFT,
        asOfDate: '2025-07-01',
      });
      expect(draft.status).toBe(UndertakingStatus.DRAFT);
    });
  });
});
