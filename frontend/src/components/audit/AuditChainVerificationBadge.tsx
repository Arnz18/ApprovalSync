import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuditVerificationResult } from '../../audit/types';
import { CRYPTO_ASSURANCE_DISCLAIMER } from '../../audit/auditUtils';
import { auditService } from '../../api/services/auditService';

export interface AuditChainVerificationBadgeProps {
  applicationId: string;
  initialVerification?: AuditVerificationResult | null;
  onVerified?: (result: AuditVerificationResult) => void;
  compact?: boolean;
}

export function AuditChainVerificationBadge({
  applicationId,
  initialVerification,
  onVerified,
  compact = false,
}: AuditChainVerificationBadgeProps): React.ReactElement {
  const [verification, setVerification] = useState<AuditVerificationResult | null>(
    initialVerification || null,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runVerification = async () => {
    if (isVerifying || !applicationId) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await auditService.verifyChain(applicationId);
      setVerification(res);
      if (onVerified) onVerified(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification request failed.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (compact) {
    if (!verification) {
      return (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ShieldCheck size={13} aria-hidden="true" />}
          isLoading={isVerifying}
          onClick={runVerification}
          aria-label="Verify sequential cryptographic audit chain"
        >
          Verify Chain
        </Button>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        {verification.isChainValid ? (
          <Badge
            variant="success"
            icon={<CheckCircle2 size={12} aria-hidden="true" />}
            title={`Chain intact across ${verification.totalBlocksVerified} blocks`}
          >
            Chain Intact ({verification.totalBlocksVerified} blks)
          </Badge>
        ) : (
          <Badge
            variant="error"
            icon={<ShieldAlert size={12} aria-hidden="true" />}
            title={`Chain broken at sequence ${verification.brokenBlockSequence}`}
          >
            Tampered (Seq #{verification.brokenBlockSequence})
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          style={{ padding: '2px 6px', height: 'auto' }}
          leftIcon={<RefreshCw size={11} aria-hidden="true" />}
          isLoading={isVerifying}
          onClick={runVerification}
          aria-label="Re-verify chain"
        >
          Re-verify
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border, #e2e8f0)',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: 'var(--color-bg-surface, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--color-primary, #2563eb)" aria-hidden="true" />
          <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
            Cryptographic Audit Chain Continuity
          </h4>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw size={13} aria-hidden="true" />}
          isLoading={isVerifying}
          onClick={runVerification}
        >
          {verification ? 'Re-Verify Chain' : 'Verify Sequential Chain'}
        </Button>
      </div>

      {error && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger, #dc2626)' }}>{error}</div>
      )}

      {verification ? (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {verification.isChainValid ? (
              <Badge variant="success" icon={<CheckCircle2 size={13} aria-hidden="true" />}>
                Sequential Chain Intact & Valid
              </Badge>
            ) : (
              <Badge variant="error" icon={<ShieldAlert size={13} aria-hidden="true" />}>
                Chain Broken at Sequence #{verification.brokenBlockSequence}
              </Badge>
            )}

            <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
              Verified <strong>{verification.totalBlocksVerified}</strong> sequential blocks from
              genesis
            </span>

            <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
              At {new Date(verification.verifiedAt).toLocaleTimeString()} UTC
            </span>
          </div>

          {verification.merkleRootHash && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
              Computed RFC 6962 Merkle Root:{' '}
              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {verification.merkleRootHash}
              </code>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted, #64748b)' }}>
          Click "Verify Sequential Chain" to recompute cryptographic leaf hashes and sequential
          SHA-256 block hash continuity from genesis to chain head.
        </div>
      )}

      <div
        style={{
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted, #64748b)',
          borderTop: '1px solid var(--color-border, #e2e8f0)',
          paddingTop: '0.5rem',
          lineHeight: 1.3,
        }}
      >
        <strong>Cryptographic Scope: </strong>
        {CRYPTO_ASSURANCE_DISCLAIMER}
      </div>
    </div>
  );
}
