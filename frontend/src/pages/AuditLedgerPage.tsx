import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Search, Cpu, Layers, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import {
  AuditChainVerificationBadge,
  AuditHistoryTable,
  MerkleProofModal,
  StandaloneProofVerifierModal,
} from '../components/audit';
import {
  AuditLogProjection,
  AuditCheckpointProjection,
  AuditVerificationResult,
} from '../audit/types';
import { auditService } from '../api/services/auditService';
import { PaginationMeta } from '../api/types';
import { formatDateUtc } from '../undertakings/undertakingUtils';

export function AuditLedgerPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAppId = searchParams.get('applicationId') || 'a0000000-0000-0000-0000-000000000001';

  // Selected Application
  const [applicationIdInput, setApplicationIdInput] = useState(initialAppId);
  const [activeApplicationId, setActiveApplicationId] = useState(initialAppId);

  // Ledger Data
  const [logs, setLogs] = useState<AuditLogProjection[]>([]);
  const [checkpoint, setCheckpoint] = useState<AuditCheckpointProjection | null>(null);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(
    null,
  );
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 50,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [proofSequence, setProofSequence] = useState<string | null>(null);
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);

  const fetchLedger = useCallback(async (appId: string, pageToLoad = 1) => {
    if (!appId.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch of logs and checkpoint
      const [logsRes, checkpointRes] = await Promise.allSettled([
        auditService.getAuditLogs(appId.trim(), { page: pageToLoad, limit: 50 }),
        auditService.getCheckpoint(appId.trim()),
      ]);

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value?.items || []);
        setPagination(logsRes.value?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
      } else {
        setLogs([]);
        setError(
          logsRes.reason?.message ||
            'Unable to load audit logs for this application. Verify UUID or institutional clearance.',
        );
      }

      if (checkpointRes.status === 'fulfilled') {
        setCheckpoint(checkpointRes.value);
      } else {
        setCheckpoint(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch cryptographic ledger data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger(activeApplicationId, 1);
  }, [activeApplicationId, fetchLedger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationIdInput.trim()) return;
    setActiveApplicationId(applicationIdInput.trim());
    setSearchParams({ applicationId: applicationIdInput.trim() });
    setVerificationResult(null);
  };

  const handlePageChange = (newPage: number) => {
    fetchLedger(activeApplicationId, newPage);
  };

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <PageHeader
        title="Cryptographic Audit Ledger & Merkle Proofs"
        description="Tamper-evident sequential SHA-256 event chaining, canonical payload RFC 8785 hashing, and RFC 6962 Merkle inclusion proofs."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Cpu size={14} aria-hidden="true" />}
              onClick={() => setIsStandaloneModalOpen(true)}
            >
              Standalone Proof Verifier
            </Button>
          </div>
        }
      />

      {/* Application Selector Bar */}
      <Card>
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <div
            style={{
              flex: '1 1 280px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                color: 'var(--color-text-muted, #64748b)',
              }}
            />
            <input
              type="text"
              placeholder="Enter Application UUID (e.g. a0000000-0000-0000-0000-000000000001)…"
              value={applicationIdInput}
              onChange={(e) => setApplicationIdInput(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <Button variant="primary" size="sm" type="submit" disabled={isLoading}>
            Inspect Ledger
          </Button>

          {activeApplicationId && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
              Active Case: <code>{activeApplicationId}</code>
            </span>
          )}
        </form>
      </Card>

      {/* Chain Verification Card */}
      <AuditChainVerificationBadge
        applicationId={activeApplicationId}
        initialVerification={verificationResult}
        onVerified={(res) => setVerificationResult(res)}
      />

      {/* Checkpoint Snapshot Panel (if available) */}
      {checkpoint && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--color-primary, #2563eb)" aria-hidden="true" />
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
                Active Ledger Checkpoint
              </h4>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
              Recorded on {formatDateUtc(checkpoint.createdAt)} (
              {new Date(checkpoint.createdAt).toLocaleTimeString()} UTC)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                Chain Head Sequence:{' '}
              </span>
              <strong>#{checkpoint.sequenceNumber}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Total Events: </span>
              <strong>{checkpoint.totalBlocks}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Algorithm: </span>
              <code>{checkpoint.algorithm}</code>
            </div>
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Chain Head Hash: </span>
              <code style={{ wordBreak: 'break-all' }}>{checkpoint.chainHeadHash}</code>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                RFC 6962 Merkle Root:{' '}
              </span>
              <code style={{ wordBreak: 'break-all' }}>{checkpoint.merkleRootHash}</code>
            </div>
          </div>
        </Card>
      )}

      {/* Global Error Banner */}
      {error && (
        <Alert variant="error" title="Audit Ledger Query Error" onClose={() => setError(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLedger(activeApplicationId, pagination.page)}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Audit Log Table Area */}
      {isLoading ? (
        <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description={`No cryptographic audit events are recorded for application ${activeApplicationId}. Check the UUID or initiate application workflow events.`}
          icon={<History size={36} />}
        />
      ) : (
        <AuditHistoryTable
          logs={logs}
          applicationId={activeApplicationId}
          pagination={pagination}
          onPageChange={handlePageChange}
          onOpenProof={(seq) => setProofSequence(seq)}
          isLoading={isLoading}
        />
      )}

      {/* Cryptographic Assurance & Threat Model Notice */}
      <Card>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <ShieldAlert
            size={20}
            color="var(--color-primary, #2563eb)"
            style={{ flexShrink: 0, marginTop: '2px' }}
          />
          <div style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
            <h4 style={{ margin: '0 0 0.375rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              Cryptographic Assurance Scope & Threat Model
            </h4>
            <p style={{ margin: 0, color: 'var(--color-text-muted, #64748b)' }}>
              Local cryptographic verification validates sequential block hash continuity (SHA-256
              chained hashing) and canonical RFC 6962 Merkle inclusion proofs. Successful
              verification mathematically proves tamper-evidence within the recorded application
              ledger. It does not certify external factual truth or replace an external trust anchor
              against privileged database rewriting.
            </p>
          </div>
        </div>
      </Card>

      {/* Merkle Proof Modal */}
      <MerkleProofModal
        applicationId={activeApplicationId}
        sequenceNumber={proofSequence}
        isOpen={Boolean(proofSequence)}
        onClose={() => setProofSequence(null)}
      />

      {/* Standalone Verifier Modal */}
      <StandaloneProofVerifierModal
        isOpen={isStandaloneModalOpen}
        onClose={() => setIsStandaloneModalOpen(false)}
      />
    </div>
  );
}
