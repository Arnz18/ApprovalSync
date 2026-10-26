/**
 * ApprovalSync — Undertakings & Lease Date Calculation Engine
 * Milestone: BE-09
 *
 * Implements deterministic calendar calculations for expiry tracking, renewal lead-times,
 * leap-year adjustments, and mutually exclusive lifecycle status derivations.
 */

import { BadRequestException } from '@nestjs/common';
import { UndertakingStatus } from '../enums/undertaking-status.enum';

export const ILLUSTRATIVE_UNDERTAKING_DISCLAIMER =
  'Illustrative demonstration undertaking and lease tracking policy. AICTE statutory covenants and lease validity norms are governed by the AICTE Approval Process Handbook. Expiry calculations provide decision support and do not constitute statutory revocation or rejection.';

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum days in a month for a specific year, accounting for leap years.
 */
export function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: // January
    case 3: // March
    case 5: // May
    case 7: // July
    case 8: // August
    case 10: // October
    case 12: // December
      return 31;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      return 30;
    case 2: // February
      return isLeapYear(year) ? 29 : 28;
    default:
      throw new BadRequestException(`Invalid calendar month: ${month}`);
  }
}

/**
 * Parses and strictly validates a YYYY-MM-DD calendar date string in UTC.
 * Rejects impossible dates like Feb 29 on non-leap years, Nov 31, April 31, etc.
 */
export function parseDateOnlyUtc(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new BadRequestException(
      'Date string is required in YYYY-MM-DD format',
    );
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new BadRequestException(
      `Date '${dateStr}' must strictly follow YYYY-MM-DD format`,
    );
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2150) {
    throw new BadRequestException(
      `Year ${year} is outside valid calendar bounds (1900-2150)`,
    );
  }

  if (month < 1 || month > 12) {
    throw new BadRequestException(
      `Month ${month} is invalid (must be between 01 and 12)`,
    );
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    throw new BadRequestException(
      `Day ${day} is invalid for year ${year}, month ${month} (max is ${maxDays})`,
    );
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Formats a Date object to YYYY-MM-DD UTC representation.
 */
export function formatDateOnlyUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates that an expiry date is strictly after the start date.
 */
export function isValidDateRange(
  startDateStr: string,
  expiryDateStr: string,
): boolean {
  const start = parseDateOnlyUtc(startDateStr);
  const expiry = parseDateOnlyUtc(expiryDateStr);
  return expiry.getTime() > start.getTime();
}

/**
 * Computes the renewal due date given an expiry date string and lead-time days.
 * renewalDueDate = expiryDate - leadDays (in UTC calendar days).
 */
export function calculateRenewalDueDate(
  expiryDateStr: string,
  leadDays: number,
): string {
  if (leadDays <= 0 || !Number.isInteger(leadDays)) {
    throw new BadRequestException(
      'Renewal lead days must be a positive integer',
    );
  }

  const expiry = parseDateOnlyUtc(expiryDateStr);
  const due = new Date(expiry.getTime());
  due.setUTCDate(due.getUTCDate() - leadDays);
  return formatDateOnlyUtc(due);
}

export interface DerivedUndertakingStatusResult {
  status: UndertakingStatus;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isRenewalDue: boolean;
  isExpired: boolean;
  evaluationDate: string;
}

/**
 * Evaluates the derived lifecycle state of an undertaking relative to an evaluation date.
 * Uses explicit non-overlapping conditions. Preserves terminal states (SUPERSEDED, TERMINATED, DRAFT).
 */
export function calculateUndertakingDerivedStatus(params: {
  startDate: string;
  expiryDate: string;
  renewalDueDate: string;
  renewalLeadDays: number;
  currentStatus: UndertakingStatus;
  asOfDate?: string;
}): DerivedUndertakingStatusResult {
  const evalDateStr = params.asOfDate || formatDateOnlyUtc(new Date());
  const evalDate = parseDateOnlyUtc(evalDateStr);
  const expiryDate = parseDateOnlyUtc(params.expiryDate);
  const renewalDueDate = parseDateOnlyUtc(params.renewalDueDate);

  // Preserve non-active states that require explicit manual or workflow transitions
  if (
    params.currentStatus === UndertakingStatus.SUPERSEDED ||
    params.currentStatus === UndertakingStatus.TERMINATED ||
    params.currentStatus === UndertakingStatus.DRAFT
  ) {
    const diffMs = expiryDate.getTime() - evalDate.getTime();
    const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return {
      status: params.currentStatus,
      daysRemaining,
      isExpiringSoon: false,
      isRenewalDue: false,
      isExpired: daysRemaining < 0,
      evaluationDate: evalDateStr,
    };
  }

  const diffMs = expiryDate.getTime() - evalDate.getTime();
  const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // Non-overlapping mutual exclusion:
  // 1. EXPIRED: evalDate > expiryDate (daysRemaining < 0)
  if (daysRemaining < 0) {
    return {
      status: UndertakingStatus.EXPIRED,
      daysRemaining,
      isExpiringSoon: false,
      isRenewalDue: true,
      isExpired: true,
      evaluationDate: evalDateStr,
    };
  }

  // 2. RENEWAL_DUE: renewalDueDate <= evalDate <= expiryDate (0 <= daysRemaining <= renewalLeadDays)
  if (evalDate.getTime() >= renewalDueDate.getTime()) {
    return {
      status: UndertakingStatus.RENEWAL_DUE,
      daysRemaining,
      isExpiringSoon: true,
      isRenewalDue: true,
      isExpired: false,
      evaluationDate: evalDateStr,
    };
  }

  // 3. EXPIRING_SOON: within 30 days before renewalDueDate
  const preWarningWindowDays = 30;
  const warningWindowDate = new Date(renewalDueDate.getTime());
  warningWindowDate.setUTCDate(
    warningWindowDate.getUTCDate() - preWarningWindowDays,
  );

  if (evalDate.getTime() >= warningWindowDate.getTime()) {
    return {
      status: UndertakingStatus.EXPIRING_SOON,
      daysRemaining,
      isExpiringSoon: true,
      isRenewalDue: false,
      isExpired: false,
      evaluationDate: evalDateStr,
    };
  }

  // 4. ACTIVE: comfortably before pre-warning window
  return {
    status: UndertakingStatus.ACTIVE,
    daysRemaining,
    isExpiringSoon: false,
    isRenewalDue: false,
    isExpired: false,
    evaluationDate: evalDateStr,
  };
}
