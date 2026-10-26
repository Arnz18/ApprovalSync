import React, { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Alert } from '../ui/Alert';
import { Card } from '../ui/Card';
import { UndertakingReconcileResult } from '../../undertakings/types';
import { undertakingsService } from '../../api/services/undertakingsService';
import { ApiClientError } from '../../api/client';

export interface ReconcileUndertakingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: UndertakingReconcileResult) => void;
}

export function ReconcileUndertakingsModal({
  isOpen,
  onClose,
  onSuccess,
}: ReconcileUndertakingsModalProps): React.ReactElement {
  const [asOfDate, setAsOfDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<UndertakingReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReconcile = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await undertakingsService.reconcileUndertakings(asOfDate.trim() || undefined);
      setResult(res);
      onSuccess(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Expiry reconciliation failed.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during status reconciliation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setAsOfDate('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Execute Regulatory Expiry Reconciliation Sweep"
      description="Evaluates all active institutional undertakings and registered lease covenants against the UTC calendar clock."
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw size={14} aria-hidden="true" />}
              isLoading={isSubmitting}
              onClick={handleReconcile}
            >
              Confirm & Execute Sweep
            </Button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <Alert variant="error" title="Reconciliation Failed">
            {error}
          </Alert>
        )}

        {!result ? (
          <>
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                border: '1px solid var(--color-border, #e2e8f0)',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <ShieldCheck size={16} color="var(--color-primary, #2563eb)" />
                <strong>ADR-004 Human Sovereignty Guarantee</strong>
              </div>
              <p style={{ margin: 0, color: 'var(--color-text-muted, #64748b)' }}>
                This action executes a batch sweep on the backend to update derived status flags (
                <code>EXPIRING_SOON</code>, <code>RENEWAL_DUE</code>, and <code>EXPIRED</code>). It
                provides factual decision-support signals for regulatory officers and never causes
                automatic rejection of institutions or revocation of approvals.
              </p>
            </div>

            <FormField
              id="reconcile-asofdate"
              label="Simulation / As-of Evaluation Date (Optional)"
              helperText="Leave empty to reconcile against current UTC date, or specify YYYY-MM-DD for deterministic simulation."
            >
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="form-input"
              />
            </FormField>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Alert variant="success" title="Reconciliation Sweep Completed Successfully">
              Evaluation Date: <strong>{result.evaluationDate}</strong>. Scanned{' '}
              <strong>{result.scannedCount}</strong> records; updated derived lifecycle status for{' '}
              <strong>{result.transitionedCount}</strong> records.
            </Alert>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Scanned
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.scannedCount}</div>
              </Card>

              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Status Updated
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-primary, #2563eb)',
                  }}
                >
                  {result.transitionedCount}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Active
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-success, #059669)',
                  }}
                >
                  {result.activeCount}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Expiring Soon
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-warning, #d97706)',
                  }}
                >
                  {result.expiringSoonCount}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Renewal Due
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-warning, #d97706)',
                  }}
                >
                  {result.renewalDueCount}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Expired
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-danger, #dc2626)',
                  }}
                >
                  {result.expiredCount}
                </div>
              </Card>
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted, #64748b)',
                fontStyle: 'italic',
                lineHeight: 1.3,
              }}
            >
              {result.disclaimer}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
