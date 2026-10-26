/**
 * ApprovalSync — Pause SLA Timer Modal
 * Milestone: FE-05
 *
 * Accessible modal dialog capturing mandatory justification comments
 * (minimum 5 characters, max 500 characters) before freezing an active SLA clock.
 */

import React, { useState } from 'react';
import { PauseCircle } from 'lucide-react';
import { Modal, Button, FormField, Alert } from '../ui';
import { slaService } from '../../api/services/slaService';
import { SlaTimerProjection } from '../../sla/types';

export interface PauseTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationNumber?: string;
  onSuccess: (updatedTimer: SlaTimerProjection) => void;
}

export function PauseTimerModal({
  isOpen,
  onClose,
  applicationId,
  applicationNumber,
  onSuccess,
}: PauseTimerModalProps): React.ReactElement {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    if (isSubmitting) return;
    setReason('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Regulatory justification is mandatory to pause an SLA clock.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Justification reason must be at least 5 characters in length.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Justification reason cannot exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedTimer = await slaService.pauseTimer(applicationId, trimmed);
      setReason('');
      onSuccess(updatedTimer);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to pause SLA clock. Verify server connectivity and role permissions.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Freeze Active SLA Clock"
      description={`Record an official regulatory justification to freeze the SLA timer for application ${applicationNumber || applicationId}.`}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PauseCircle size={14} />}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || reason.trim().length < 5}
          >
            Confirm Clock Freeze
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Alert variant="warning" title="Regulatory Notice">
          Pausing an SLA clock is an audited regulatory action. The deadline will be shifted forward
          by the exact duration of the pause once resumed. AICTE compliance requires documenting the
          statutory cause.
        </Alert>

        {error && (
          <Alert variant="error" title="Submission Failed">
            {error}
          </Alert>
        )}

        <div>
          <FormField
            id="pause-reason-input"
            label="Regulatory Pause Justification"
            required
            helperText="Minimum 5 characters, maximum 500 characters. e.g., 'Awaiting certified land records revenue clarification from District Collector office.'"
            error={error || undefined}
          >
            <textarea
              id="pause-reason-input"
              className="form-input"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="State the regulatory justification for pausing the processing clock..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                fontSize: 'var(--font-size-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontFamily: 'inherit',
              }}
            />
          </FormField>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: 'var(--font-size-xs)',
              color: reason.length > 500 ? 'var(--color-error)' : 'var(--color-muted-foreground)',
              marginTop: 'var(--space-1)',
            }}
          >
            {reason.length} / 500 characters
          </div>
        </div>
      </form>
    </Modal>
  );
}
