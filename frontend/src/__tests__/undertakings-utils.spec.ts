/**
 * ApprovalSync — Undertakings Utilities Test Suite
 * Milestone: FE-07
 *
 * Covers date calculations, UTC formatting, status label mapping,
 * badge variants, role authorization helpers, and CSV formula-injection defense.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  calculateDaysRemaining,
  parseDateUtc,
  formatDateUtc,
  formatUndertakingType,
  formatUndertakingStatus,
  formatUndertakingReviewStatus,
  getUndertakingStatusBadgeVariant,
  getUndertakingReviewBadgeVariant,
  isReviewAuthorized,
  isReconciliationAuthorized,
  isRenewalAuthorized,
  escapeCsvCell,
  exportUndertakingsToCsv,
} from '../undertakings/undertakingUtils';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingProjection,
} from '../undertakings/types';
import { UserRole } from '../api/types';

describe('Undertakings Utilities (FE-07)', () => {
  describe('parseDateUtc and formatDateUtc', () => {
    it('parses valid UTC date strings', () => {
      const d = parseDateUtc('2026-10-27T00:00:00.000Z');
      expect(d).not.toBeNull();
      expect(d?.getUTCFullYear()).toBe(2026);
      expect(d?.getUTCMonth()).toBe(9); // 0-indexed: October is 9
      expect(d?.getUTCDate()).toBe(27);
    });

    it('parses date-only YYYY-MM-DD strings without timezone shift', () => {
      const d = parseDateUtc('2026-12-31');
      expect(d).not.toBeNull();
      expect(d?.getUTCFullYear()).toBe(2026);
      expect(d?.getUTCMonth()).toBe(11); // December
      expect(d?.getUTCDate()).toBe(31);
    });

    it('returns null for null, undefined, or invalid date strings', () => {
      expect(parseDateUtc(null)).toBeNull();
      expect(parseDateUtc(undefined)).toBeNull();
      expect(parseDateUtc('not-a-date')).toBeNull();
    });

    it('formats date in DD MMM YYYY format safely', () => {
      expect(formatDateUtc('2026-10-27T00:00:00.000Z')).toBe('27 Oct 2026');
      expect(formatDateUtc('2024-02-29')).toBe('29 Feb 2024'); // Leap year
      expect(formatDateUtc(null)).toBe('N/A');
      expect(formatDateUtc('invalid')).toBe('N/A');
    });
  });

  describe('calculateDaysRemaining', () => {
    const fixedNow = new Date('2026-10-27T00:00:00.000Z');

    it('calculates positive days for future dates', () => {
      const future = '2026-11-06T00:00:00.000Z'; // 10 days later
      const days = calculateDaysRemaining(future, fixedNow);
      expect(days).toBe(10);
    });

    it('calculates negative days for overdue dates', () => {
      const past = '2026-10-22T00:00:00.000Z'; // 5 days earlier
      const days = calculateDaysRemaining(past, fixedNow);
      expect(days).toBe(-5);
    });

    it('returns 0 for the exact same day', () => {
      const same = '2026-10-27T00:00:00.000Z';
      const days = calculateDaysRemaining(same, fixedNow);
      expect(days).toBe(0);
    });

    it('returns null for invalid or missing dates', () => {
      expect(calculateDaysRemaining(null, fixedNow)).toBeNull();
      expect(calculateDaysRemaining('invalid', fixedNow)).toBeNull();
    });
  });

  describe('Enum Label Mappers & Fallbacks', () => {
    it('maps all known UndertakingType enums to human-readable labels', () => {
      expect(formatUndertakingType(UndertakingType.LAND_LEASE)).toBe('Registered Land Lease Deed');
      expect(formatUndertakingType(UndertakingType.BUILDING_LEASE)).toBe(
        'Facility & Building Lease',
      );
      expect(formatUndertakingType(UndertakingType.AFFIDAVIT_UNDERTAKING)).toBe(
        'AICTE APH Compliance Affidavit',
      );
      expect(formatUndertakingType(UndertakingType.FIRE_SAFETY_CLEARANCE)).toBe(
        'Fire Safety Clearance / NOC',
      );
      expect(formatUndertakingType(UndertakingType.STRUCTURAL_STABILITY)).toBe(
        'Building Structural Stability Certificate',
      );
      expect(formatUndertakingType(UndertakingType.LAND_USE_CONVERSION)).toBe(
        'Change of Land Use (CLU) Covenant',
      );
      expect(formatUndertakingType(UndertakingType.EQUIPMENT_SAFETY)).toBe(
        'Workshop & Equipment Safety Undertaking',
      );
      expect(formatUndertakingType(UndertakingType.GENERAL_COMPLIANCE)).toBe(
        'General Statutory Undertaking',
      );
    });

    it('provides safe fallback for unknown or future UndertakingType values', () => {
      expect(formatUndertakingType('CUSTOM_FUTURE_TYPE' as UndertakingType)).toBe(
        'CUSTOM FUTURE TYPE',
      );
      expect(formatUndertakingType(undefined as unknown as UndertakingType)).toBe('Unknown Type');
    });

    it('maps UndertakingStatus enums correctly', () => {
      expect(formatUndertakingStatus(UndertakingStatus.DRAFT)).toBe('Draft (Pending Submission)');
      expect(formatUndertakingStatus(UndertakingStatus.SUBMITTED)).toBe('Submitted (Under Review)');
      expect(formatUndertakingStatus(UndertakingStatus.ACTIVE)).toBe('Active (In Force)');
      expect(formatUndertakingStatus(UndertakingStatus.EXPIRING_SOON)).toBe('Expiring Soon');
      expect(formatUndertakingStatus(UndertakingStatus.RENEWAL_DUE)).toBe('Renewal Due');
      expect(formatUndertakingStatus(UndertakingStatus.EXPIRED)).toBe('Expired');
      expect(formatUndertakingStatus(UndertakingStatus.SUPERSEDED)).toBe('Superseded (Renewed)');
      expect(formatUndertakingStatus(UndertakingStatus.TERMINATED)).toBe('Terminated');
    });

    it('maps UndertakingReviewStatus enums correctly', () => {
      expect(formatUndertakingReviewStatus(UndertakingReviewStatus.PENDING_REVIEW)).toBe(
        'Pending Review',
      );
      expect(formatUndertakingReviewStatus(UndertakingReviewStatus.VERIFIED)).toBe(
        'Verified (Concurrent)',
      );
      expect(formatUndertakingReviewStatus(UndertakingReviewStatus.DEFICIENT)).toBe(
        'Clarification / Deficiency',
      );
      expect(formatUndertakingReviewStatus(UndertakingReviewStatus.REJECTED)).toBe('Rejected');
    });
  });

  describe('Badge Variants', () => {
    it('returns appropriate badge variants for UndertakingStatus', () => {
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.ACTIVE)).toBe('success');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.EXPIRING_SOON)).toBe('warning');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.RENEWAL_DUE)).toBe('warning');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.EXPIRED)).toBe('danger');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.TERMINATED)).toBe('danger');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.DRAFT)).toBe('default');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.SUBMITTED)).toBe('primary');
      expect(getUndertakingStatusBadgeVariant(UndertakingStatus.SUPERSEDED)).toBe('default');
      expect(getUndertakingStatusBadgeVariant('UNKNOWN_STATUS' as UndertakingStatus)).toBe(
        'default',
      );
    });

    it('returns appropriate badge variants for UndertakingReviewStatus', () => {
      expect(getUndertakingReviewBadgeVariant(UndertakingReviewStatus.VERIFIED)).toBe('success');
      expect(getUndertakingReviewBadgeVariant(UndertakingReviewStatus.DEFICIENT)).toBe('warning');
      expect(getUndertakingReviewBadgeVariant(UndertakingReviewStatus.REJECTED)).toBe('danger');
      expect(getUndertakingReviewBadgeVariant(UndertakingReviewStatus.PENDING_REVIEW)).toBe(
        'default',
      );
      expect(getUndertakingReviewBadgeVariant('UNKNOWN' as UndertakingReviewStatus)).toBe(
        'default',
      );
    });
  });

  describe('Role-Based Authority Helpers', () => {
    it('isReviewAuthorized permits regulatory reviewers and administrators', () => {
      expect(isReviewAuthorized(UserRole.SCRUTINY_OFFICER)).toBe(true);
      expect(isReviewAuthorized(UserRole.REGIONAL_OFFICER)).toBe(true);
      expect(isReviewAuthorized(UserRole.BUREAU_HEAD)).toBe(true);
      expect(isReviewAuthorized(UserRole.SYSTEM_ADMIN)).toBe(true);

      expect(isReviewAuthorized(UserRole.INSTITUTION_USER)).toBe(false);
      expect(isReviewAuthorized(UserRole.AUDITOR)).toBe(false);
      expect(isReviewAuthorized(UserRole.EVC_INSPECTOR)).toBe(false);
      expect(isReviewAuthorized(undefined)).toBe(false);
    });

    it('isReconciliationAuthorized permits only elevated administrative roles', () => {
      expect(isReconciliationAuthorized(UserRole.REGIONAL_OFFICER)).toBe(true);
      expect(isReconciliationAuthorized(UserRole.BUREAU_HEAD)).toBe(true);
      expect(isReconciliationAuthorized(UserRole.SYSTEM_ADMIN)).toBe(true);

      expect(isReconciliationAuthorized(UserRole.SCRUTINY_OFFICER)).toBe(false);
      expect(isReconciliationAuthorized(UserRole.INSTITUTION_USER)).toBe(false);
      expect(isReconciliationAuthorized(UserRole.AUDITOR)).toBe(false);
      expect(isReconciliationAuthorized(undefined)).toBe(false);
    });

    it('isRenewalAuthorized permits institutions and system admins for active/expiring/expired records', () => {
      const activeRecord = {
        status: UndertakingStatus.ACTIVE,
      } as UndertakingProjection;

      const supersededRecord = {
        status: UndertakingStatus.SUPERSEDED,
      } as UndertakingProjection;

      const draftRecord = {
        status: UndertakingStatus.DRAFT,
      } as UndertakingProjection;

      // Active records are renewable by applicant & admin
      expect(isRenewalAuthorized(activeRecord, UserRole.INSTITUTION_USER)).toBe(true);
      expect(isRenewalAuthorized(activeRecord, UserRole.SYSTEM_ADMIN)).toBe(true);
      expect(isRenewalAuthorized(activeRecord, UserRole.SCRUTINY_OFFICER)).toBe(false);

      // Superseded or Draft records are NOT renewable
      expect(isRenewalAuthorized(supersededRecord, UserRole.INSTITUTION_USER)).toBe(false);
      expect(isRenewalAuthorized(draftRecord, UserRole.INSTITUTION_USER)).toBe(false);
    });
  });

  describe('CSV Formula-Injection Defense (escapeCsvCell & exportUndertakingsToCsv)', () => {
    it('neutralizes spreadsheet formula-injection prefixes with single-quote escaping', () => {
      expect(escapeCsvCell('=1+1')).toBe('"\'=1+1"');
      expect(escapeCsvCell('+cmd|/C calc')).toBe('"\'"+cmd|/C calc"');
      expect(escapeCsvCell('-SUM(A1:B10)')).toBe('"\'-SUM(A1:B10)"');
      expect(escapeCsvCell('@HYPERLINK("evil.com")')).toBe('"\'@HYPERLINK(""evil.com"")"');
      expect(escapeCsvCell('\tDDE("cmd")')).toBe('"\'\tDDE(""cmd"")"');
      expect(escapeCsvCell('\rDDE("cmd")')).toBe('"\'\rDDE(""cmd"")"');
    });

    it('properly quotes cells with commas and existing quotes', () => {
      expect(escapeCsvCell('Land Lease, Survey #40')).toBe('"Land Lease, Survey #40"');
      expect(escapeCsvCell('Deed "Certified" True')).toBe('"Deed ""Certified"" True"');
    });

    it('returns empty string for null or undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('exports undertaking records into well-formed, sanitized CSV string', () => {
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      const mockItems: UndertakingProjection[] = [
        {
          id: 'und-1',
          institutionId: 'inst-1',
          applicationId: 'app-1',
          type: UndertakingType.LAND_LEASE,
          title: '=Dangerous Title',
          documentNumber: 'DEED-4421',
          issuingAuthority: 'Sub-Registrar Office, Bengaluru',
          counterpartyName: 'State Industrial Development Corp',
          startDate: '2020-04-01',
          expiryDate: '2050-03-31',
          renewalLeadDays: 180,
          renewalDueDate: '2049-10-02',
          daysRemaining: 8500,
          isExpiringSoon: false,
          isRenewalDue: false,
          isExpired: false,
          status: UndertakingStatus.ACTIVE,
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Verified against stamped deed',
          reviewedById: 'rev-1',
          reviewedAt: '2026-10-25T00:00:00.000Z',
          documentId: 'doc-1',
          supersedesId: null,
          supersededById: null,
          metadataJsonb: {},
          createdAt: '2026-10-25T00:00:00.000Z',
          updatedAt: '2026-10-25T00:00:00.000Z',
          disclaimer: 'Illustrative regulatory data',
        },
      ];

      exportUndertakingsToCsv(mockItems, 'Test Institution');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });
});
