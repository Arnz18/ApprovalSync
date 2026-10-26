/**
 * ApprovalSync — Undertakings & Leases Utility Functions
 * Milestone: FE-07
 * Date mathematics, human-readable formatters, formula-safe CSV export, and badge styling.
 */

import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingProjection,
} from './types';

// -----------------------------------------------------------------------------
// Human-Readable Label Formatters
// -----------------------------------------------------------------------------

export function formatUndertakingType(type?: UndertakingType | string | null): string {
  if (!type) return 'Unknown Type';
  switch (type) {
    case UndertakingType.LAND_LEASE:
      return 'Registered Land Lease Deed';
    case UndertakingType.BUILDING_LEASE:
      return 'Facility & Building Lease';
    case UndertakingType.AFFIDAVIT_UNDERTAKING:
      return 'AICTE APH Compliance Affidavit';
    case UndertakingType.FIRE_SAFETY_CLEARANCE:
      return 'Fire Safety Clearance / NOC';
    case UndertakingType.STRUCTURAL_STABILITY:
      return 'Building Structural Stability Certificate';
    case UndertakingType.LAND_USE_CONVERSION:
      return 'Change of Land Use (CLU) Covenant';
    case UndertakingType.EQUIPMENT_SAFETY:
      return 'Workshop & Equipment Safety Undertaking';
    case UndertakingType.GENERAL_COMPLIANCE:
      return 'General Statutory Undertaking';
    default:
      return String(type).replace(/_/g, ' ');
  }
}

export function formatUndertakingStatus(status?: UndertakingStatus | string | null): string {
  if (!status) return 'Unknown Status';
  switch (status) {
    case UndertakingStatus.DRAFT:
      return 'Draft (Pending Submission)';
    case UndertakingStatus.SUBMITTED:
      return 'Submitted (Under Review)';
    case UndertakingStatus.ACTIVE:
      return 'Active (In Force)';
    case UndertakingStatus.EXPIRING_SOON:
      return 'Expiring Soon';
    case UndertakingStatus.RENEWAL_DUE:
      return 'Renewal Due';
    case UndertakingStatus.EXPIRED:
      return 'Expired';
    case UndertakingStatus.SUPERSEDED:
      return 'Superseded (Renewed)';
    case UndertakingStatus.TERMINATED:
      return 'Terminated';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

export function formatUndertakingReviewStatus(
  status?: UndertakingReviewStatus | string | null,
): string {
  if (!status) return 'Pending Review';
  switch (status) {
    case UndertakingReviewStatus.PENDING_REVIEW:
      return 'Pending Review';
    case UndertakingReviewStatus.VERIFIED:
      return 'Verified (Concurrent)';
    case UndertakingReviewStatus.DEFICIENT:
      return 'Clarification / Deficiency';
    case UndertakingReviewStatus.REJECTED:
      return 'Rejected';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

// -----------------------------------------------------------------------------
// Badge Color & Variant Mappings
// -----------------------------------------------------------------------------

export function getUndertakingStatusBadgeVariant(
  status?: UndertakingStatus | string | null,
): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case UndertakingStatus.ACTIVE:
      return 'success';
    case UndertakingStatus.EXPIRING_SOON:
    case UndertakingStatus.RENEWAL_DUE:
      return 'warning';
    case UndertakingStatus.EXPIRED:
    case UndertakingStatus.TERMINATED:
      return 'danger';
    case UndertakingStatus.SUBMITTED:
      return 'primary';
    case UndertakingStatus.DRAFT:
    case UndertakingStatus.SUPERSEDED:
    default:
      return 'default';
  }
}

export function getUndertakingReviewBadgeVariant(
  status?: UndertakingReviewStatus | string | null,
): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case UndertakingReviewStatus.VERIFIED:
      return 'success';
    case UndertakingReviewStatus.DEFICIENT:
      return 'warning';
    case UndertakingReviewStatus.REJECTED:
      return 'danger';
    case UndertakingReviewStatus.PENDING_REVIEW:
    default:
      return 'default';
  }
}

// -----------------------------------------------------------------------------
// Date Mathematics & UTC Formatting
// -----------------------------------------------------------------------------

/**
 * Parses YYYY-MM-DD string into a UTC midnight Date object to avoid timezone shifting.
 */
export function parseDateUtc(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month, day));
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Formats YYYY-MM-DD or ISO timestamp into clean UTC display format (e.g., "15 Jan 2024").
 */
export function formatDateUtc(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const parsed = parseDateUtc(dateStr);
  if (!parsed) {
    // Attempt standard Date fallback
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Calculates remaining days from asOfDate (or current UTC date) to expiryDate.
 * Deterministic integer day count: Math.ceil((expiry - asOf) / (86400 * 1000)).
 */
export function calculateDaysRemaining(
  expiryDateStr?: string | null,
  asOfDateStr?: string | Date | null,
): number | null {
  if (!expiryDateStr) return null;
  const expiry =
    parseDateUtc(expiryDateStr) ||
    (isNaN(new Date(expiryDateStr).getTime()) ? null : new Date(expiryDateStr));
  if (!expiry) return null;

  let asOf: Date;
  if (asOfDateStr instanceof Date) {
    asOf = asOfDateStr;
  } else if (typeof asOfDateStr === 'string') {
    const parsedAsOf = parseDateUtc(asOfDateStr);
    asOf = parsedAsOf || new Date();
  } else {
    const now = new Date();
    asOf = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const diffMs = expiry.getTime() - asOf.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// -----------------------------------------------------------------------------
// Role-Based Authorization Helpers
// -----------------------------------------------------------------------------

import { UserRole } from '../api/types';

export function isReviewAuthorized(role?: UserRole): boolean {
  if (!role) return false;
  return [
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
  ].includes(role);
}

export function isReconciliationAuthorized(role?: UserRole): boolean {
  if (!role) return false;
  return [UserRole.REGIONAL_OFFICER, UserRole.BUREAU_HEAD, UserRole.SYSTEM_ADMIN].includes(role);
}

export function isRenewalAuthorized(undertaking: UndertakingProjection, role?: UserRole): boolean {
  if (!role) return false;
  const isAuthorizedRole = [UserRole.INSTITUTION_USER, UserRole.SYSTEM_ADMIN].includes(role);
  if (!isAuthorizedRole) return false;
  return [
    UndertakingStatus.ACTIVE,
    UndertakingStatus.EXPIRING_SOON,
    UndertakingStatus.RENEWAL_DUE,
    UndertakingStatus.EXPIRED,
  ].includes(undertaking.status);
}

// -----------------------------------------------------------------------------
// Spreadsheet Formula Injection Sanitization & CSV Export
// -----------------------------------------------------------------------------

/**
 * Neutralizes spreadsheet formula injection (CSV Injection / CWE-1236).
 * Values starting with =, +, -, @, \t, \r are prepended with a single quote (').
 * Standard RFC 4180 escaping (quotes doubled, wrapped if containing commas/quotes/newlines).
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';

  let str = String(val);

  // Check if string begins with dangerous spreadsheet formula triggers
  const firstChar = str.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    str = `'${str}`;
  }

  // Double internal quotation marks
  const escapedQuotes = str.replace(/"/g, '""');

  // Wrap in quotes if it contains commas, quotes, carriage returns, or newlines
  if (/[",\r\n]/.test(str) || str.startsWith("'")) {
    return `"${escapedQuotes}"`;
  }

  return str;
}

/**
 * Generates and triggers download of a formula-injection-safe CSV file.
 */
export function exportUndertakingsToCsv(
  items: UndertakingProjection[],
  scopeNotice = 'Current Page View',
): void {
  const headers = [
    'ID',
    'Title',
    'Type',
    'Status',
    'Review Status',
    'Document Number',
    'Issuing Authority',
    'Counterparty',
    'Start Date',
    'Expiry Date',
    'Renewal Due Date',
    'Lead Days',
    'Days Remaining',
    'Application ID',
    'Institution ID',
    'Review Notes',
    'Last Updated UTC',
  ];

  const metaRows = [
    `# ApprovalSync — Undertakings & Leases Regulatory Export`,
    `# Export Date (UTC): ${new Date().toISOString()}`,
    `# Data Scope: ${scopeNotice}`,
    `# Total Records in Export: ${items.length}`,
    `# Notice: Expiry status is a factual decision-support signal under ADR-004 and does not constitute statutory revocation.`,
    '',
  ];

  const dataRows = items.map((item) => {
    return [
      escapeCsvCell(item.id),
      escapeCsvCell(item.title),
      escapeCsvCell(formatUndertakingType(item.type)),
      escapeCsvCell(formatUndertakingStatus(item.status)),
      escapeCsvCell(formatUndertakingReviewStatus(item.reviewStatus)),
      escapeCsvCell(item.documentNumber || ''),
      escapeCsvCell(item.issuingAuthority || ''),
      escapeCsvCell(item.counterpartyName || ''),
      escapeCsvCell(item.startDate),
      escapeCsvCell(item.expiryDate),
      escapeCsvCell(item.renewalDueDate),
      escapeCsvCell(item.renewalLeadDays),
      escapeCsvCell(item.daysRemaining),
      escapeCsvCell(item.applicationId || ''),
      escapeCsvCell(item.institutionId),
      escapeCsvCell(item.reviewNotes || ''),
      escapeCsvCell(item.updatedAt),
    ].join(',');
  });

  const csvContent = metaRows.join('\r\n') + headers.join(',') + '\r\n' + dataRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `approvalsync-undertakings-${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
