import React, { useState } from 'react';
import { FileCheck, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Alert } from '../ui/Alert';
import {
  UndertakingProjection,
  UndertakingReviewStatus,
  UndertakingStatus,
  ReviewUndertakingDto,
} from '../../undertakings/types';
import { undertakingsService } from '../../api/services/undertakingsService';
import { ApiClientError } from '../../api/client';

export interface ReviewUndertakingModalProps {
  undertaking: UndertakingProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: UndertakingProjection) => void;
}

export function ReviewUndertakingModal({
  undertaking,
  isOpen,
  onClose,
  onSuccess,
}: ReviewUndertakingModalProps): React.ReactElement | null {
  const [reviewStatus, setReviewStatus] = useState<UndertakingReviewStatus>(
    UndertakingReviewStatus.VERIFIED,
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [effectiveStatus, setEffectiveStatus] = useState<UndertakingStatus>(
    UndertakingStatus.ACTIVE,
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!reviewNotes.trim()) {
      errors.reviewNotes = 'Detailed review findings are mandatory';
    } else if (reviewNotes.trim().length < 5) {
      errors.reviewNotes = 'Review notes must be at least 5 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !undertaking) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    const dto: ReviewUndertakingDto = {
      reviewStatus,
      reviewNotes: reviewNotes.trim(),
      effectiveStatus:
        reviewStatus === UndertakingReviewStatus.VERIFIED ? effectiveStatus : undefined,
    };

    try {
      const updated = await undertakingsService.reviewUndertaking(undertaking.id, dto);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setApiError(err.message || 'Regulatory review submission failed.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network or server error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!undertaking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Regulatory Review & Verification"
      description={`Instrument: ${undertaking.title} (Doc No: ${undertaking.documentNumber || 'N/A'})`}
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileCheck size={14} aria-hidden="true" />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Record Regulatory Review
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {apiError && (
          <Alert variant="error" title="Review Submission Failed">
            {apiError}
          </Alert>
        )}

        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert
            size={16}
            color="var(--color-primary, #2563eb)"
            style={{ flexShrink: 0, marginTop: '2px' }}
          />
          <div>
            <strong>Statutory Officer Accountability (ADR-004): </strong>
            This review disposition will be permanently recorded in the cryptographic audit ledger
            with your authenticated officer ID and UTC timestamp. Automated expiry alerts provide
            factual signals; official regulatory determinations remain sovereign officer decisions.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <FormField
            id="review-status"
            label="Officer Review Disposition"
            required
            helperText="Select regulatory finding on the undertaking or lease deed"
          >
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as UndertakingReviewStatus)}
              className="form-select"
            >
              <option value={UndertakingReviewStatus.VERIFIED}>
                VERIFIED — Concurrent Compliance Corroborated
              </option>
              <option value={UndertakingReviewStatus.DEFICIENT}>
                DEFICIENT — Clarification / Rectification Notice
              </option>
              <option value={UndertakingReviewStatus.REJECTED}>
                REJECTED — Non-Compliant / Revoked
              </option>
            </select>
          </FormField>

          {reviewStatus === UndertakingReviewStatus.VERIFIED && (
            <FormField
              id="effective-status"
              label="Transition Lifecycle Status"
              helperText="Set active validity upon successful regulatory verification"
            >
              <select
                value={effectiveStatus}
                onChange={(e) => setEffectiveStatus(e.target.value as UndertakingStatus)}
                className="form-select"
              >
                <option value={UndertakingStatus.ACTIVE}>ACTIVE (In-force validity)</option>
                <option value={UndertakingStatus.SUBMITTED}>Keep SUBMITTED</option>
              </select>
            </FormField>
          )}
        </div>

        <FormField
          id="review-notes"
          label="Mandatory Review Findings & Justification"
          required
          error={formErrors.reviewNotes}
          helperText="Document specific statutory clauses, registration verification details, or deficiencies noted"
        >
          <textarea
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Provide detailed justification, verified document register, or rectification instructions"
            className="form-input"
          />
        </FormField>
      </form>
    </Modal>
  );
}
