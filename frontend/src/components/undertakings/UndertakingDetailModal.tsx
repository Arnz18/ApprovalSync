import React from 'react';
import { History, RefreshCw, Send, FileCheck, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { UndertakingStatusBadge, UndertakingReviewBadge } from './UndertakingStatusBadge';
import { UndertakingProjection, UndertakingStatus } from '../../undertakings/types';
import { formatUndertakingType, formatDateUtc } from '../../undertakings/undertakingUtils';
import { UserRole } from '../../api/types';

export interface UndertakingDetailModalProps {
  undertaking: UndertakingProjection | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  onOpenHistory: (undertakingId: string) => void;
  onOpenReview?: (undertaking: UndertakingProjection) => void;
  onOpenRenew?: (undertaking: UndertakingProjection) => void;
  onSubmitDraft?: (undertakingId: string) => void;
  onSelectRelatedId?: (undertakingId: string) => void;
  isSubmitting?: boolean;
}

export function UndertakingDetailModal({
  undertaking,
  isOpen,
  onClose,
  currentUserRole,
  onOpenHistory,
  onOpenReview,
  onOpenRenew,
  onSubmitDraft,
  onSelectRelatedId,
  isSubmitting = false,
}: UndertakingDetailModalProps): React.ReactElement | null {
  if (!undertaking) return null;

  // Authorization checks
  const isOfficerOrAdmin =
    currentUserRole === UserRole.SCRUTINY_OFFICER ||
    currentUserRole === UserRole.REGIONAL_OFFICER ||
    currentUserRole === UserRole.BUREAU_HEAD ||
    currentUserRole === UserRole.SYSTEM_ADMIN;

  const canSubmit =
    undertaking.status === UndertakingStatus.DRAFT &&
    (currentUserRole === UserRole.INSTITUTION_USER ||
      currentUserRole === UserRole.REGIONAL_OFFICER ||
      currentUserRole === UserRole.SYSTEM_ADMIN);

  const canReview = isOfficerOrAdmin && undertaking.status !== UndertakingStatus.SUPERSEDED;

  const canRenew =
    (currentUserRole === UserRole.INSTITUTION_USER ||
      currentUserRole === UserRole.REGIONAL_OFFICER ||
      currentUserRole === UserRole.SYSTEM_ADMIN) &&
    undertaking.status !== UndertakingStatus.SUPERSEDED &&
    undertaking.status !== UndertakingStatus.TERMINATED &&
    undertaking.status !== UndertakingStatus.DRAFT;

  const metadataKeys = Object.keys(undertaking.metadataJsonb || {});

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={undertaking.title}
      description={`Record ID: ${undertaking.id} • ${formatUndertakingType(undertaking.type)}`}
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<History size={14} aria-hidden="true" />}
              onClick={() => onOpenHistory(undertaking.id)}
            >
              Audit History
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canSubmit && onSubmitDraft && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send size={14} aria-hidden="true" />}
                isLoading={isSubmitting}
                onClick={() => onSubmitDraft(undertaking.id)}
              >
                Submit for Scrutiny
              </Button>
            )}

            {canReview && onOpenReview && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FileCheck size={14} aria-hidden="true" />}
                onClick={() => onOpenReview(undertaking)}
              >
                Review Disposition
              </Button>
            )}

            {canRenew && onOpenRenew && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={14} aria-hidden="true" />}
                onClick={() => onOpenRenew(undertaking)}
              >
                Renew Instrument
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Status & Review Header Ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: '6px',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Lifecycle Status:</span>
            <UndertakingStatusBadge status={undertaking.status} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Review Status:</span>
            <UndertakingReviewBadge reviewStatus={undertaking.reviewStatus} />
          </div>
        </div>

        {/* Critical Expiry / Renewal Notice */}
        {undertaking.isExpired && (
          <Alert variant="error" title="Tenure Expired — Regulatory Review Triggered">
            This undertaking expired on {formatDateUtc(undertaking.expiryDate)} (
            {Math.abs(undertaking.daysRemaining)} days ago). Per AICTE APH procedures, expiry
            triggers human regulatory scrutiny and renewal evaluation.
          </Alert>
        )}

        {!undertaking.isExpired && undertaking.isRenewalDue && (
          <Alert variant="warning" title="Renewal Due — Critical Action Window">
            The configured renewal threshold was reached on{' '}
            {formatDateUtc(undertaking.renewalDueDate)}. {undertaking.daysRemaining} days remaining
            until final validity expiration on {formatDateUtc(undertaking.expiryDate)}.
          </Alert>
        )}

        {/* Key Instrument Dates & Validity Grid */}
        <Card>
          <h4
            style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: 0, marginBottom: '0.75rem' }}
          >
            Instrument Validity & Calendar Coordinates
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                Commencement Date
              </div>
              <div style={{ fontWeight: 600 }}>{formatDateUtc(undertaking.startDate)}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                Expiry Date
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: undertaking.isExpired ? 'var(--color-danger, #dc2626)' : 'inherit',
                }}
              >
                {formatDateUtc(undertaking.expiryDate)}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                Renewal Due Date
              </div>
              <div style={{ fontWeight: 600 }}>{formatDateUtc(undertaking.renewalDueDate)}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                Configured Lead Time
              </div>
              <div style={{ fontWeight: 600 }}>{undertaking.renewalLeadDays} days</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                Remaining Tenure
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color:
                    undertaking.daysRemaining <= 0
                      ? 'var(--color-danger, #dc2626)'
                      : undertaking.isRenewalDue
                        ? 'var(--color-warning, #d97706)'
                        : 'var(--color-success, #059669)',
                }}
              >
                {undertaking.daysRemaining < 0
                  ? `${Math.abs(undertaking.daysRemaining)}d overdue`
                  : `${undertaking.daysRemaining} days`}
              </div>
            </div>
          </div>
        </Card>

        {/* Legal & Registration Metadata */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <Card>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: 0,
                marginBottom: '0.75rem',
              }}
            >
              Registration & Parties
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                  Document / Deed No:{' '}
                </span>
                <span style={{ fontWeight: 600 }}>{undertaking.documentNumber || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                  Issuing Authority:{' '}
                </span>
                <span style={{ fontWeight: 600 }}>{undertaking.issuingAuthority || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                  Counterparty / Lessor:{' '}
                </span>
                <span style={{ fontWeight: 600 }}>{undertaking.counterpartyName || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Institution ID: </span>
                <code style={{ fontSize: '0.75rem' }}>{undertaking.institutionId}</code>
              </div>
              {undertaking.applicationId && (
                <div>
                  <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                    Approval Application:{' '}
                  </span>
                  <a
                    href={`/scrutiny/${undertaking.applicationId}`}
                    style={{
                      color: 'var(--color-primary, #2563eb)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View Application Case{' '}
                    <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Supersession & Renewal Lineage */}
          <Card>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: 0,
                marginBottom: '0.75rem',
              }}
            >
              Supersession & Renewal Lineage
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>
                  Supersedes Prior Record:{' '}
                </span>
                {undertaking.supersedesId ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRelatedId && onSelectRelatedId(undertaking.supersedesId!)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary, #2563eb)',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    {undertaking.supersedesId}
                  </button>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    None (Original Instrument)
                  </span>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Superseded By: </span>
                {undertaking.supersededById ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRelatedId && onSelectRelatedId(undertaking.supersededById!)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary, #2563eb)',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    {undertaking.supersededById}
                  </button>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    None (Current Active Record)
                  </span>
                )}
              </div>

              {undertaking.description && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '2px' }}>
                    Terms & Covenants Summary:
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                      color: 'var(--color-text, #1e293b)',
                    }}
                  >
                    {undertaking.description}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Regulatory Review Notes (if reviewed) */}
        {undertaking.reviewNotes && (
          <Card>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: 0,
                marginBottom: '0.5rem',
              }}
            >
              Regulatory Review Findings & Justification
            </h4>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
              {undertaking.reviewNotes}
            </p>
            {undertaking.reviewedAt && (
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted, #64748b)',
                }}
              >
                Reviewed on {formatDateUtc(undertaking.reviewedAt)}
                {undertaking.reviewedById && ` by Officer ID: ${undertaking.reviewedById}`}
              </div>
            )}
          </Card>
        )}

        {/* Custom Metadata (if any) */}
        {metadataKeys.length > 0 && (
          <Card>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: 0,
                marginBottom: '0.5rem',
              }}
            >
              Instrument Metadata Specifications
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              {metadataKeys.map((key) => (
                <div key={key}>
                  <span style={{ color: 'var(--color-text-muted, #64748b)' }}>{key}: </span>
                  <span style={{ fontWeight: 600 }}>{String(undertaking.metadataJsonb[key])}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ADR-004 Human Sovereignty Legal Disclaimer */}
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted, #64748b)',
            lineHeight: 1.4,
          }}
        >
          <strong>Regulatory Decision Support Notice: </strong>
          {undertaking.disclaimer ||
            'Illustrative demonstration undertaking and lease tracking policy. AICTE statutory covenants and lease validity norms are governed by the AICTE Approval Process Handbook. Expiry calculations provide decision support and do not constitute statutory revocation or rejection.'}
        </div>
      </div>
    </Modal>
  );
}
