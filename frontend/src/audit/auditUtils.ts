/**
 * ApprovalSync — Cryptographic Audit Ledger Utilities
 * Milestone: FE-07
 * Hash truncation, event type humanization, CSV export with formula injection defense,
 * and cryptographic assurance disclaimers.
 */

import { AuditLogProjection } from './types';
import { escapeCsvCell } from '../undertakings/undertakingUtils';

/**
 * Truncates 64-char hexadecimal SHA-256 hash for human readability while preserving leading/trailing chars.
 * e.g., "7a8b9c0d1e...5e6f7a8b"
 */
export function truncateHash(hash?: string | null, lead = 8, trail = 8): string {
  if (!hash) return '—';
  if (hash.length <= lead + trail + 3) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-trail)}`;
}

/**
 * Formats machine event types into clear institutional titles.
 */
export function formatAuditEventType(eventType?: string | null): string {
  if (!eventType) return 'Unknown Event';
  switch (eventType) {
    case 'APPLICATION_CREATED':
      return 'Application Draft Created';
    case 'APPLICATION_SUBMITTED':
      return 'Application Submitted';
    case 'DOCUMENT_UPLOADED':
      return 'Document Evidence Uploaded';
    case 'SCRUTINY_STAGE_ENTERED':
      return 'Scrutiny Review Initiated';
    case 'UNDERTAKING_RECORD_CREATED':
      return 'Statutory Undertaking Created';
    case 'UNDERTAKING_STATUS_CHANGED':
      return 'Undertaking Status Transition';
    case 'EVC_RECOMMENDED':
      return 'Recommended for EVC Inspection';
    case 'EVC_INSPECTION_SCHEDULED':
      return 'EVC Inspection Committee Scheduled';
    case 'EVC_FINDINGS_SUBMITTED':
      return 'EVC Inspection Findings Recorded';
    case 'APPROVAL_ORDER_ISSUED':
      return 'Final AICTE Approval Granted';
    case 'APPLICATION_REJECTED':
      return 'Application Rejection Order';
    case 'SLA_TIMER_PAUSED':
      return 'SLA Compliance Clock Suspended';
    case 'SLA_TIMER_RESUMED':
      return 'SLA Compliance Clock Resumed';
    default:
      return eventType
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
  }
}

/**
 * Exports cryptographic audit log entries to a formula-safe CSV file.
 */
export function exportAuditLogsToCsv(logs: AuditLogProjection[], applicationId: string): void {
  const headers = [
    'Sequence Number',
    'Timestamp UTC',
    'Event Type',
    'Actor ID',
    'Actor Role',
    'Current Hash (SHA-256)',
    'Previous Hash',
    'Leaf Hash (Canonical Payload)',
    'Payload Snapshot (JSON)',
  ];

  const metaRows = [
    `# ApprovalSync — Cryptographic Audit Trail Export`,
    `# Application UUID: ${applicationId}`,
    `# Export Date (UTC): ${new Date().toISOString()}`,
    `# Total Entries: ${logs.length}`,
    `# Cryptographic Standard: RFC 6962 SHA-256 Sequential Hash Chaining & Merkle Roots`,
    `# Cryptographic Scope Disclaimer: Hash chaining establishes tamper-evidence and sequential immutability. An independent external trust anchor is required to guarantee non-repudiation against privileged database modification.`,
    '',
  ];

  const dataRows = logs.map((log) => {
    let payloadStr = '';
    try {
      payloadStr = JSON.stringify(log.payloadSnapshot || {});
    } catch {
      payloadStr = '{}';
    }

    return [
      escapeCsvCell(log.sequenceNumber),
      escapeCsvCell(log.timestamp),
      escapeCsvCell(formatAuditEventType(log.eventType)),
      escapeCsvCell(log.actorId),
      escapeCsvCell(log.actorRole),
      escapeCsvCell(log.currentHash),
      escapeCsvCell(log.previousHash),
      escapeCsvCell(log.leafHash),
      escapeCsvCell(payloadStr),
    ].join(',');
  });

  const csvContent = metaRows.join('\r\n') + headers.join(',') + '\r\n' + dataRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `audit-trail-${applicationId.slice(0, 8)}-${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Institutional disclaimer defining the precise guarantees and limitations of local cryptographic verification.
 */
export const CRYPTO_ASSURANCE_DISCLAIMER =
  'Local cryptographic verification validates sequential block hash continuity and canonical RFC 6962 Merkle tree inclusion. Successful verification proves tamper-evidence within the recorded ledger. It does not certify external factual truth or replace an external trust anchor (e.g. public transparency log / timestamping authority) against privileged database modifications.';
