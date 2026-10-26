import React, { useState } from 'react';
import { Cpu, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Alert } from '../ui/Alert';
import {
  VerifyProofRequestDto,
  StandaloneProofVerificationResult,
  MerkleProofStep,
} from '../../audit/types';
import { auditService } from '../../api/services/auditService';
import { CRYPTO_ASSURANCE_DISCLAIMER } from '../../audit/auditUtils';

export interface StandaloneProofVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StandaloneProofVerifierModal({
  isOpen,
  onClose,
}: StandaloneProofVerifierModalProps): React.ReactElement {
  const [leafHash, setLeafHash] = useState('');
  const [expectedRoot, setExpectedRoot] = useState('');
  const [proofSteps, setProofSteps] = useState<MerkleProofStep[]>([
    { hash: '', position: 'right' },
  ]);

  const [result, setResult] = useState<StandaloneProofVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const addStep = () => {
    setProofSteps((prev) => [...prev, { hash: '', position: 'right' }]);
  };

  const removeStep = (index: number) => {
    setProofSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof MerkleProofStep, value: string) => {
    setProofSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    );
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    if (!leafHash.trim() || leafHash.trim().length !== 64) {
      setError('Leaf hash must be a 64-character hexadecimal SHA-256 hash');
      return;
    }

    if (!expectedRoot.trim() || expectedRoot.trim().length !== 64) {
      setError('Expected Merkle root must be a 64-character hexadecimal SHA-256 hash');
      return;
    }

    const invalidStep = proofSteps.find((s) => !s.hash.trim() || s.hash.trim().length !== 64);
    if (invalidStep) {
      setError(
        'All sibling node hashes in the proof path must be 64-character hexadecimal SHA-256 hashes',
      );
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);

    const dto: VerifyProofRequestDto = {
      leafHash: leafHash.trim(),
      expectedRoot: expectedRoot.trim(),
      proofPath: proofSteps.map((s) => ({
        hash: s.hash.trim(),
        position: s.position,
      })),
    };

    try {
      const res = await auditService.verifyStandaloneProof(dto);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Standalone proof verification failed.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Standalone RFC 6962 Merkle Proof Mathematical Verifier"
      description="Independently verifies inclusion of any leaf hash against an expected root without querying database tables."
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isVerifying}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Cpu size={14} aria-hidden="true" />}
            isLoading={isVerifying}
            onClick={handleVerify}
          >
            Compute Proof Math
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleVerify}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {error && (
          <Alert variant="error" title="Validation or Computation Error">
            {error}
          </Alert>
        )}

        {result && (
          <Alert
            variant={result.isValid ? 'success' : 'error'}
            title={
              result.isValid
                ? 'Mathematical Verification Corroborated'
                : 'Mathematical Verification Failed'
            }
          >
            {result.isValid
              ? 'Success: Upward RFC 6962 tree traversal from leaf node matches expected root. Mathematical inclusion confirmed.'
              : 'Failure: Computed root differs from expected Merkle root. Proof path or leaf hash is invalid.'}
          </Alert>
        )}

        <FormField
          id="standalone-leaf"
          label="RFC 6962 Leaf Hash (64-char Hex)"
          required
          helperText="SHA-256(0x00 || blockHash)"
        >
          <input
            type="text"
            value={leafHash}
            onChange={(e) => setLeafHash(e.target.value)}
            placeholder="e.g. 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
            className="form-input"
            maxLength={64}
          />
        </FormField>

        <FormField
          id="standalone-root"
          label="Expected Merkle Root Hash (64-char Hex)"
          required
          helperText="Merkle root anchor from signed checkpoint or ledger"
        >
          <input
            type="text"
            value={expectedRoot}
            onChange={(e) => setExpectedRoot(e.target.value)}
            placeholder="e.g. 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"
            className="form-input"
            maxLength={64}
          />
        </FormField>

        {/* Proof Path Steps */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <label className="form-label" style={{ margin: 0 }}>
              Proof Path Steps ({proofSteps.length})
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus size={12} aria-hidden="true" />}
              onClick={addStep}
            >
              Add Sibling Step
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {proofSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '40px' }}>
                  #{idx + 1}
                </span>

                <select
                  value={step.position}
                  onChange={(e) => updateStep(idx, 'position', e.target.value as 'left' | 'right')}
                  className="form-select"
                  style={{ width: '90px', padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>

                <input
                  type="text"
                  value={step.hash}
                  onChange={(e) => updateStep(idx, 'hash', e.target.value)}
                  placeholder="64-char sibling SHA-256 hash"
                  className="form-input"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}
                  maxLength={64}
                />

                {proofSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-danger, #dc2626)',
                      padding: '4px',
                    }}
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted, #64748b)',
            borderTop: '1px solid var(--color-border, #e2e8f0)',
            paddingTop: '0.5rem',
            lineHeight: 1.3,
          }}
        >
          <strong>Cryptographic Notice: </strong>
          {CRYPTO_ASSURANCE_DISCLAIMER}
        </div>
      </form>
    </Modal>
  );
}
