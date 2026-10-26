import React, { useEffect, useState } from 'react';
import { History, ArrowRight, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Loading';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { UndertakingStatusBadge, UndertakingReviewBadge } from './UndertakingStatusBadge';
import { UndertakingHistoryEntry } from '../../undertakings/types';
import { formatDateUtc } from '../../undertakings/undertakingUtils';
import { undertakingsService } from '../../api/services/undertakingsService';
import { formatRoleName } from '../../auth/roleRoutes';

export interface UndertakingHistoryModalProps {
  undertakingId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UndertakingHistoryModal({
  undertakingId,
  isOpen,
  onClose,
}: UndertakingHistoryModalProps): React.ReactElement | null {
  const [history, setHistory] = useState<UndertakingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !undertakingId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    undertakingsService
      .getUndertakingHistory(undertakingId)
      .then((data) => {
        if (isMounted) setHistory(data);
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve undertaking history trail.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, undertakingId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Undertaking Lifecycle History & Audit Trail"
      description={`Chronological record of status transitions, submissions, and regulatory reviews for ID: ${undertakingId}`}
      className="modal-wide"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ minHeight: '200px' }}>
        {isLoading && (
          <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </div>
        )}

        {error && (
          <Alert variant="error" title="Unable to Load History">
            {error}
          </Alert>
        )}

        {!isLoading && !error && history.length === 0 && (
          <EmptyState
            title="No History Events Recorded"
            description="No state transitions or actions have been recorded yet for this instrument."
            icon={<History size={32} />}
          />
        )}

        {!isLoading && !error && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((entry, index) => (
              <div
                key={entry.id || index}
                style={{
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--color-bg-surface, #ffffff)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
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
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-bg-subtle, #f1f5f9)',
                        color: 'var(--color-text, #1e293b)',
                      }}
                    >
                      {entry.action}
                    </span>
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}
                    >
                      {formatDateUtc(entry.createdAt)} (
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      )
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted, #64748b)',
                    }}
                  >
                    <User size={13} aria-hidden="true" />
                    <span>
                      {formatRoleName(entry.actorRole)}
                      {entry.actorEmail
                        ? ` (${entry.actorEmail})`
                        : ` [ID: ${entry.actorId.slice(0, 8)}]`}
                    </span>
                  </div>
                </div>

                {/* State Transitions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Lifecycle:</span>
                  {entry.fromStatus ? (
                    <>
                      <UndertakingStatusBadge status={entry.fromStatus} />
                      <ArrowRight size={14} color="var(--color-text-muted, #64748b)" />
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Initial →</span>
                  )}
                  <UndertakingStatusBadge status={entry.toStatus} />

                  {entry.toReviewStatus && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted, #64748b)' }}>Review:</span>
                      {entry.fromReviewStatus && (
                        <>
                          <UndertakingReviewBadge reviewStatus={entry.fromReviewStatus} />
                          <ArrowRight size={14} color="var(--color-text-muted, #64748b)" />
                        </>
                      )}
                      <UndertakingReviewBadge reviewStatus={entry.toReviewStatus} />
                    </div>
                  )}
                </div>

                {entry.changeReason && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8125rem',
                      color: 'var(--color-text, #1e293b)',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>Reason / Note: </strong>
                    {entry.changeReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
