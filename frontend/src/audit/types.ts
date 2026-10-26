/**
 * ApprovalSync — Cryptographic Audit Ledger Domain Types
 * Milestone: FE-07
 * Strict integration with BE-07 Cryptographic Audit Controller & Contracts.
 */

import { UserRole, PaginationMeta } from '../api/types';

export interface AuditLogProjection {
  sequenceNumber: string;
  applicationId: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;
  payloadSnapshot: Record<string, unknown>;
  previousHash: string;
  leafHash: string;
  currentHash: string;
  timestamp: string; // ISO 8601 UTC
}

export interface AuditLogsListResponse {
  items: AuditLogProjection[];
  pagination: PaginationMeta;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface AuditVerificationResult {
  applicationId: string;
  isChainValid: boolean;
  totalBlocksVerified: number;
  brokenBlockSequence?: number;
  verifiedAt: string;
  merkleRootHash?: string;
}

export interface AuditCheckpointProjection {
  id: string;
  applicationId: string;
  sequenceNumber: string;
  chainHeadHash: string;
  merkleRootHash: string;
  totalBlocks: number;
  algorithm: string;
  createdAt: string;
}

export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

export interface MerkleProofProjection {
  applicationId: string;
  sequenceNumber: string;
  leafIndex: number;
  totalLeaves: number;
  leafHash: string;
  proofPath: MerkleProofStep[];
  expectedRoot: string;
}

export interface VerifyProofRequestDto {
  leafHash: string;
  expectedRoot: string;
  proofPath: MerkleProofStep[];
}

export interface StandaloneProofVerificationResult {
  isValid: boolean;
  leafHash: string;
  expectedRoot: string;
}
