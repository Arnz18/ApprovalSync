/**
 * ApprovalSync — Audit Utilities Test Suite
 * Milestone: FE-07
 *
 * Covers hash formatting/truncation, event label humanization,
 * formula-injection-safe CSV export, and cryptographic disclaimer constants.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  truncateHash,
  formatAuditEventType,
  exportAuditLogsToCsv,
  CRYPTO_ASSURANCE_DISCLAIMER,
} from '../audit/auditUtils';
import { AuditLogProjection } from '../audit/types';
import { UserRole } from '../api/types';

describe('Audit Utilities (FE-07)', () => {
  describe('truncateHash', () => {
    it('truncates 64-character SHA-256 hash to start and end segments', () => {
      const fullHash = '4a1f89c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12';
      const truncated = truncateHash(fullHash, 8, 8);
      expect(truncated).toBe('4a1f89c0…9b1a5e12');
    });

    it('returns original string if length is less than or equal to chars', () => {
      expect(truncateHash('short', 8, 8)).toBe('short');
      expect(truncateHash('12345678901234', 8, 8)).toBe('12345678901234');
    });

    it('returns dash string for null, undefined, or empty input', () => {
      expect(truncateHash(null)).toBe('—');
      expect(truncateHash(undefined)).toBe('—');
      expect(truncateHash('')).toBe('—');
    });
  });

  describe('formatAuditEventType', () => {
    it('humanizes standard SCREAMING_SNAKE_CASE audit event types', () => {
      expect(formatAuditEventType('APPLICATION_SUBMITTED')).toBe('Application Submitted');
      expect(formatAuditEventType('DOCUMENT_UPLOADED')).toBe('Document Evidence Uploaded');
      expect(formatAuditEventType('UNDERTAKING_RECORD_CREATED')).toBe(
        'Statutory Undertaking Created',
      );
      expect(formatAuditEventType('UNDERTAKING_STATUS_CHANGED')).toBe(
        'Undertaking Status Transition',
      );
    });

    it('handles null, undefined, or empty values gracefully', () => {
      expect(formatAuditEventType(null)).toBe('Unknown Event');
      expect(formatAuditEventType(undefined)).toBe('Unknown Event');
      expect(formatAuditEventType('')).toBe('Unknown Event');
    });
  });

  describe('exportAuditLogsToCsv', () => {
    const mockLogs: AuditLogProjection[] = [
      {
        sequenceNumber: '1',
        applicationId: 'app-uuid-1',
        actorId: 'user-inst-1',
        actorRole: UserRole.INSTITUTION_USER,
        eventType: 'APPLICATION_CREATED',
        payloadSnapshot: { note: '=SUM(1,2)' },
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        leafHash: '4a1f89c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12',
        currentHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        timestamp: '2026-10-25T08:00:00.000Z',
      },
      {
        sequenceNumber: '2',
        applicationId: 'app-uuid-1',
        actorId: 'user-inst-1',
        actorRole: UserRole.INSTITUTION_USER,
        eventType: 'UNDERTAKING_ATTACHED',
        payloadSnapshot: { deedNumber: '+cmd|/C calc' },
        previousHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        leafHash: '111189c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12',
        currentHash: '2222344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
        timestamp: '2026-10-25T09:00:00.000Z',
      },
    ];

    it('generates well-formed CSV with report header and cryptographic warning banner', () => {
      // Mock DOM URL and click
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = vi.fn();
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      exportAuditLogsToCsv(mockLogs, 'app-uuid-1');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      HTMLAnchorElement.prototype.click = originalClick;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe('CRYPTO_ASSURANCE_DISCLAIMER', () => {
    it('contains clear explanations regarding local cryptographic proofs and external trust anchors', () => {
      expect(CRYPTO_ASSURANCE_DISCLAIMER).toContain('Local cryptographic verification');
      expect(CRYPTO_ASSURANCE_DISCLAIMER).toContain('tamper-evidence');
      expect(CRYPTO_ASSURANCE_DISCLAIMER).toContain('external trust anchor');
    });
  });
});
