/**
 * ApprovalSync — Shared Audit Contracts
 * Milestone: FND-02
 */

import { UserRole } from './enums';

export interface AuditLogEntry {
  sequenceNumber: number;
  applicationId: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;
  payloadSnapshot: Record<string, unknown>;
  previousHash: string; // SHA-256 hex string (64 chars)
  leafHash: string; // SHA-256 hex of canonical payload
  currentHash: string; // SHA-256(previousHash + leafHash + timestamp)
  timestamp: string; // ISO 8601 UTC
}

export interface AuditVerificationResult {
  applicationId: string;
  isChainValid: boolean;
  totalBlocksVerified: number;
  brokenBlockSequence?: number;
  verifiedAt: string; // ISO 8601 UTC
  merkleRootHash?: string;
}

export interface AppendAuditEntryCommand {
  applicationId: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;
  payloadSnapshot: Record<string, unknown>;
}
