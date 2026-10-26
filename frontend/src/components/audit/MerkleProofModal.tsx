import React, { useEffect, useState } from 'react';
import { Copy, Check, Cpu } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Loading';
import { MerkleProofProjection, StandaloneProofVerificationResult } from '../../audit/types';
import { CRYPTO_ASSURANCE_DISCLAIMER } from '../../audit/auditUtils';
import { auditService } from '../../api/services/auditService';

export interface MerkleProofModalProps {
  applicationId: string;
  sequenceNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MerkleProofModal({
  applicationId,
  sequenceNumber,
  isOpen,
  onClose,
}: MerkleProofModalProps): React.ReactElement | null {
  const [proof, setProof] = useState<MerkleProofProjection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isVerifyingStandalone, setIsVerifyingStandalone] = useState(false);
  const [standaloneResult, setStandaloneResult] =
    useState<StandaloneProofVerificationResult | null>(null);
  const [standaloneError, setStandaloneError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId || !sequenceNumber) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setStandaloneResult(null);
    setStandaloneError(null);

    auditService
      .getMerkleProof(applicationId, sequenceNumber)
      .then((data) => {
        if (isMounted) setProof(data);
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message || 'Failed to retrieve Merkle inclusion proof.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, applicationId, sequenceNumber]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerifyStandalone = async () => {
    if (!proof || isVerifyingStandalone) return;

    setIsVerifyingStandalone(true);
    setStandaloneError(null);

    try {
      const res = await auditService.verifyStandaloneProof({
        leafHash: proof.leafHash,
        expectedRoot: proof.expectedRoot,
        proofPath: proof.proofPath,
      });
      setStandaloneResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStandaloneError(err.message);
      } else {
        setStandaloneError('Standalone proof verification failed.');
      }
    } finally {
      setIsVerifyingStandalone(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RFC 6962 Merkle Inclusion Proof"
      description={`Audit Block Sequence #${sequenceNumber} • Application ${applicationId.slice(0, 8)}…`}
      className="modal-wide"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            {proof && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Cpu size={14} aria-hidden="true" />}
                isLoading={isVerifyingStandalone}
                onClick={handleVerifyStandalone}
              >
                Verify Proof Math Standalone
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading && (
          <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </div>
        )}

        {error && (
          <Alert variant="error" title="Proof Retrieval Failed">
            {error}
          </Alert>
        )}

        {standaloneResult && (
          <Alert
            variant={standaloneResult.isValid ? 'success' : 'error'}
            title={
              standaloneResult.isValid
                ? 'Cryptographic Inclusion Verified'
                : 'Inclusion Verification Failed'
            }
          >
            {standaloneResult.isValid
              ? 'Upward RFC 6962 tree traversal from leaf node matches expected Merkle root exactly. Mathematical inclusion corroborated.'
              : 'Computed root does NOT match expected Merkle root. Sibling proof path or leaf hash is invalid.'}
          </Alert>
        )}

        {standaloneError && (
          <Alert variant="error" title="Standalone Verification Error">
            {standaloneError}
          </Alert>
        )}

        {!isLoading && proof && (
          <>
            {/* Tree Coordinates Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              <Card>
                <div style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.75rem' }}>
                  Target Sequence
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>#{proof.sequenceNumber}</div>
              </Card>

              <Card>
                <div style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.75rem' }}>
                  Tree Leaf Index
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {proof.leafIndex} (0-based)
                </div>
              </Card>

              <Card>
                <div style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.75rem' }}>
                  Total Tree Leaves
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {proof.totalLeaves} blocks
                </div>
              </Card>

              <Card>
                <div style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.75rem' }}>
                  Proof Path Length
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {proof.proofPath.length} steps (O(log N))
                </div>
              </Card>
            </div>

            {/* Cryptographic Hashes */}
            <Card>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted, #64748b)' }}>
                      RFC 6962 Leaf Hash SHA-256(0x00 || blockHash):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(proof.leafHash, 'leaf')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.75rem',
                        color: 'var(--color-primary, #2563eb)',
                      }}
                    >
                      {copiedField === 'leaf' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'leaf' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code
                    style={{
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      display: 'block',
                      backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                    }}
                  >
                    {proof.leafHash}
                  </code>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted, #64748b)' }}>
                      Expected Merkle Root Hash:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(proof.expectedRoot, 'root')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.75rem',
                        color: 'var(--color-primary, #2563eb)',
                      }}
                    >
                      {copiedField === 'root' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'root' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code
                    style={{
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      display: 'block',
                      backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                    }}
                  >
                    {proof.expectedRoot}
                  </code>
                </div>
              </div>
            </Card>

            {/* Proof Path Steps Table */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                Ordered Upward Traversal Proof Path ({proof.proofPath.length} steps)
              </h4>
              <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '60px' }}>
                        Step
                      </th>
                      <th scope="col" style={{ width: '90px' }}>
                        Position
                      </th>
                      <th scope="col">Sibling Node Hash (SHA-256)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proof.proofPath.map((step, idx) => (
                      <tr key={idx}>
                        <td>#{idx + 1}</td>
                        <td>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              backgroundColor: step.position === 'left' ? '#eff6ff' : '#f0fdf4',
                              color: step.position === 'left' ? '#1d4ed8' : '#15803d',
                            }}
                          >
                            {step.position.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.75rem' }}>{step.hash}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted, #64748b)',
                borderTop: '1px solid var(--color-border, #e2e8f0)',
                paddingTop: '0.5rem',
                lineHeight: 1.3,
              }}
            >
              <strong>Cryptographic Assurance Limit: </strong>
              {CRYPTO_ASSURANCE_DISCLAIMER}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
