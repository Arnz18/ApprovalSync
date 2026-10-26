import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { AllowedTransition, ApplicationStatus } from '../../scrutiny/types';

interface ReviewActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transition: AllowedTransition | null;
  applicationNumber: string;
  onSubmit: (targetStatus: ApplicationStatus, comment?: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  isOpen,
  onClose,
  transition,
  applicationNumber,
  onSubmit,
  isSubmitting,
}) => {
  const [comment, setComment] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setValidationError(null);
    }
  }, [isOpen, transition]);

  if (!transition) return null;

  const isDeficiency = transition.toStatus === 'DEFICIENCY_ISSUED';
  const isRejection = transition.toStatus === 'REJECTED';
  const requiresComment = transition.requiresComment;

  const getActionTitle = () => {
    switch (transition.toStatus) {
      case ApplicationStatus.UNDER_SCRUTINY:
        return 'Commence Scrutiny Review';
      case ApplicationStatus.DEFICIENCY_ISSUED:
        return 'Issue Regulatory Deficiency Notice (Clarification)';
      case ApplicationStatus.RECOMMENDED_FOR_EVC:
        return 'Recommend for Expert Visit Committee (EVC)';
      case ApplicationStatus.RECOMMENDED_FOR_SHC:
        return 'Recommend for Standing Hearing Committee (SHC)';
      case ApplicationStatus.APPROVED:
        return 'Statutory Approval Decision';
      case ApplicationStatus.REJECTED:
        return 'Reject Application';
      case ApplicationStatus.RESUBMITTED:
        return 'Resubmit Application';
      default:
        return `Transition to ${String(transition.toStatus).replace(/_/g, ' ')}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedComment = comment.trim();

    if (requiresComment && !trimmedComment) {
      setValidationError(
        'A formal review justification or deficiency explanation is mandatory for this transition under regulatory protocol.',
      );
      return;
    }

    if (trimmedComment.length > 2000) {
      setValidationError('Comment cannot exceed 2000 characters.');
      return;
    }

    try {
      await onSubmit(transition.toStatus, trimmedComment || undefined);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setValidationError(err.message);
      } else {
        setValidationError('Failed to record workflow transition. Please try again.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getActionTitle()}
      description={`Case Reference: ${applicationNumber}`}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        {/* Transition Summary Alert */}
        {isDeficiency && (
          <Alert variant="warning" title="Issuing Deficiency Notice / Clarification Request">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
              <AlertTriangle
                size={18}
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: '2px' }}
              />
              <div>
                This action transitions the application to <strong>DEFICIENCY_ISSUED</strong> and
                notifies the applicant institution. The institution will be required to submit
                rectified documentation before scrutiny can resume.
              </div>
            </div>
          </Alert>
        )}

        {isRejection && (
          <Alert variant="error" title="Adverse Decision Warning">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
              <ShieldAlert
                size={18}
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: '2px' }}
              />
              <div>
                Rejecting an application is a formal adverse regulatory outcome. Ensure all
                documentary deficiencies have been verified against statutory norms before
                proceeding.
              </div>
            </div>
          </Alert>
        )}

        {/* Transition description from server */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-foreground)', marginBottom: '4px' }}>
            Workflow State FSM Event:
          </div>
          <div style={{ color: 'var(--color-muted-foreground)' }}>
            {transition.description || `Move state to ${transition.toStatus}`}
          </div>
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--color-muted-foreground)' }}>Event Type:</span>
            <code style={{ fontFamily: 'var(--font-family-mono, monospace)', fontWeight: 600 }}>
              {transition.eventType}
            </code>
          </div>
        </div>

        {/* Justification Comment Input */}
        <div>
          <label
            htmlFor="transition-comment-input"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-foreground)',
              marginBottom: 'var(--space-1)',
            }}
          >
            {requiresComment ? (
              <span>
                Mandatory Regulatory Justification / Deficiency Specifications{' '}
                <span style={{ color: 'var(--color-error)' }}>*</span>
              </span>
            ) : (
              <span>Reviewer Observations / Discretionary Notes (Optional)</span>
            )}
          </label>

          <textarea
            id="transition-comment-input"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            placeholder={
              isDeficiency
                ? 'Specify the exact discrepancies, missing certificates, or land/infrastructure non-compliances that require institutional rectification...'
                : 'Enter audit rationale, verification corroboration, or committee notes...'
            }
            aria-required={requiresComment}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'transition-comment-error' : undefined}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: validationError
                ? '1px solid var(--color-error)'
                : '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px',
              fontSize: '11px',
              color: 'var(--color-muted-foreground)',
            }}
          >
            <span>
              {validationError ? (
                <span
                  id="transition-comment-error"
                  style={{ color: 'var(--color-error)', fontWeight: 500 }}
                >
                  {validationError}
                </span>
              ) : (
                'Recorded verbatim in the immutable audit timeline.'
              )}
            </span>
            <span>{comment.length} / 2000</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant={isRejection ? 'primary' : 'primary'}
            disabled={isSubmitting}
            style={
              isRejection
                ? {
                    backgroundColor: 'var(--color-error)',
                    borderColor: 'var(--color-error)',
                    color: '#fff',
                  }
                : isDeficiency
                  ? { backgroundColor: '#D97706', borderColor: '#D97706', color: '#fff' }
                  : undefined
            }
          >
            <Send size={14} aria-hidden="true" />
            <span>{isSubmitting ? 'Recording Transition...' : 'Execute Transition'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
