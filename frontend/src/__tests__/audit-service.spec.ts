/**
 * ApprovalSync — Audit API Service Test Suite
 * Milestone: FE-07
 *
 * Covers all 5 BE-07 audit API endpoints:
 * - getAuditLogs (GET /applications/:id/audit-logs)
 * - verifyChain (GET /applications/:id/audit-logs/verify)
 * - getCheckpoint (GET /applications/:id/audit-logs/checkpoint)
 * - getMerkleProof (GET /applications/:id/audit-logs/:sequenceNumber/proof)
 * - verifyStandaloneProof (POST /audit/verify-proof)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService } from '../api/services/auditService';
import { apiClient } from '../api/client';
import {
  AuditLogProjection,
  AuditVerificationResult,
  AuditCheckpointProjection,
  MerkleProofProjection,
  VerifyProofRequestDto,
  StandaloneProofVerificationResult,
} from '../audit/types';
import { UserRole } from '../api/types';

describe('Audit API Service (FE-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockLog: AuditLogProjection = {
    sequenceNumber: '1',
    applicationId: 'app-uuid-1',
    actorId: 'user-inst-1',
    actorRole: UserRole.INSTITUTION_USER,
    eventType: 'APPLICATION_CREATED',
    payloadSnapshot: { academicYear: '2026-27', institutionName: 'National Tech Institute' },
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    leafHash: '4a1f89c09930e15b2203cf7d5a570075d691bc13e3a479ff76f183709b1a5e12',
    currentHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
    timestamp: '2026-10-25T08:00:00.000Z',
  };

  it('getAuditLogs calls GET /applications/:id/audit-logs with pagination and sorting', async () => {
    const mockList = {
      items: [mockLog],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockList);

    const res = await auditService.getAuditLogs('app-uuid-1', {
      page: 1,
      limit: 20,
      sortOrder: 'ASC',
    });

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/audit-logs', {
      page: 1,
      limit: 20,
      sortOrder: 'ASC',
    });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].sequenceNumber).toBe('1');
    expect(res.pagination.totalItems).toBe(1);
  });

  it('verifyChain calls GET /applications/:id/audit-logs/verify and returns chain integrity', async () => {
    const mockVerification: AuditVerificationResult = {
      isChainValid: true,
      applicationId: 'app-uuid-1',
      totalBlocksVerified: 15,
      merkleRootHash: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
      brokenBlockSequence: undefined,
      verifiedAt: '2026-10-27T00:00:00.000Z',
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockVerification);

    const res = await auditService.verifyChain('app-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/audit-logs/verify');
    expect(res.isChainValid).toBe(true);
    expect(res.totalBlocksVerified).toBe(15);
    expect(res.brokenBlockSequence).toBeUndefined();
  });

  it('getCheckpoint calls GET /applications/:id/audit-logs/checkpoint', async () => {
    const mockCheckpoint: AuditCheckpointProjection = {
      id: 'cp-1',
      applicationId: 'app-uuid-1',
      sequenceNumber: '15',
      chainHeadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      merkleRootHash: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
      totalBlocks: 15,
      algorithm: 'SHA-256',
      createdAt: '2026-10-27T00:00:00.000Z',
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockCheckpoint);

    const res = await auditService.getCheckpoint('app-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/audit-logs/checkpoint');
    expect(res.merkleRootHash).toBe(
      '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
    );
    expect(res.totalBlocks).toBe(15);
  });

  it('getMerkleProof calls GET /applications/:id/audit-logs/:sequenceNumber/proof', async () => {
    const mockProof: MerkleProofProjection = {
      applicationId: 'app-uuid-1',
      sequenceNumber: '1',
      leafIndex: 0,
      totalLeaves: 2,
      leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
      proofPath: [
        {
          position: 'right',
          hash: '6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
        },
      ],
      expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockProof);

    const res = await auditService.getMerkleProof('app-uuid-1', '1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/audit-logs/1/proof');
    expect(res.sequenceNumber).toBe('1');
    expect(res.proofPath).toHaveLength(1);

    // Also assert numeric sequence number is encoded properly and not confused with UUID
    await auditService.getMerkleProof('app-uuid-1', 42);
    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/audit-logs/42/proof');
  });

  it('verifyStandaloneProof calls POST /audit/verify-proof with proof payload', async () => {
    const mockVerification: StandaloneProofVerificationResult = {
      isValid: true,
      leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
      expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockVerification);

    const dto: VerifyProofRequestDto = {
      leafHash: 'b564344db1c68f23f81e3a6c230f36f32e65d83637e199d36378e9f59f6356b2',
      expectedRoot: '9f83a48e89cf21e90d7967b55f723e71d3e849c716e4e541320ef457b87640f1',
      proofPath: [
        {
          position: 'right',
          hash: '6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
        },
      ],
    };

    const res = await auditService.verifyStandaloneProof(dto);

    expect(postSpy).toHaveBeenCalledWith('/audit/verify-proof', dto);
    expect(res.isValid).toBe(true);
    expect(res.expectedRoot).toBe(mockVerification.expectedRoot);
  });
});
