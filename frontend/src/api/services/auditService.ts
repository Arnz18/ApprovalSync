/**
 * ApprovalSync — Cryptographic Audit Ledger API Service
 * Milestone: FE-07
 * Connects to BE-07 Cryptographic Audit Controller endpoints.
 */

import { apiClient } from '../client';
import {
  AuditLogsListResponse,
  AuditLogQueryParams,
  AuditVerificationResult,
  AuditCheckpointProjection,
  MerkleProofProjection,
  VerifyProofRequestDto,
  StandaloneProofVerificationResult,
} from '../../audit/types';

export const auditService = {
  /**
   * Retrieve paginated cryptographic audit logs for an application.
   * Path: GET /api/v1/applications/:id/audit-logs
   * Tenant-isolated for INSTITUTION_USER.
   */
  async getAuditLogs(
    applicationId: string,
    params?: AuditLogQueryParams,
  ): Promise<AuditLogsListResponse> {
    return apiClient.get<AuditLogsListResponse>(
      `/applications/${encodeURIComponent(applicationId)}/audit-logs`,
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  /**
   * Verify cryptographic integrity of the application audit chain from genesis to head.
   * Path: GET /api/v1/applications/:id/audit-logs/verify
   */
  async verifyChain(applicationId: string): Promise<AuditVerificationResult> {
    return apiClient.get<AuditVerificationResult>(
      `/applications/${encodeURIComponent(applicationId)}/audit-logs/verify`,
    );
  },

  /**
   * Retrieve or record latest cryptographic checkpoint snapshot for an application.
   * Path: GET /api/v1/applications/:id/audit-logs/checkpoint
   */
  async getCheckpoint(applicationId: string): Promise<AuditCheckpointProjection> {
    return apiClient.get<AuditCheckpointProjection>(
      `/applications/${encodeURIComponent(applicationId)}/audit-logs/checkpoint`,
    );
  },

  /**
   * Retrieve RFC 6962 Merkle inclusion proof for a specific audit sequence number.
   * Path: GET /api/v1/applications/:id/audit-logs/:sequenceNumber/proof
   */
  async getMerkleProof(
    applicationId: string,
    sequenceNumber: string | number,
  ): Promise<MerkleProofProjection> {
    return apiClient.get<MerkleProofProjection>(
      `/applications/${encodeURIComponent(applicationId)}/audit-logs/${encodeURIComponent(
        String(sequenceNumber),
      )}/proof`,
    );
  },

  /**
   * Perform standalone mathematical verification of an RFC 6962 Merkle inclusion proof.
   * Path: POST /api/v1/audit/verify-proof
   */
  async verifyStandaloneProof(
    dto: VerifyProofRequestDto,
  ): Promise<StandaloneProofVerificationResult> {
    return apiClient.post<StandaloneProofVerificationResult>('/audit/verify-proof', dto);
  },
};
