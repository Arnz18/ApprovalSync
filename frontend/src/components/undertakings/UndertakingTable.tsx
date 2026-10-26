import React from 'react';
import { Eye, RefreshCw, FileCheck, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { UndertakingStatusBadge, UndertakingReviewBadge } from './UndertakingStatusBadge';
import { UndertakingProjection, UndertakingStatus } from '../../undertakings/types';
import { formatUndertakingType, formatDateUtc } from '../../undertakings/undertakingUtils';
import { PaginationMeta, UserRole } from '../../api/types';

export interface UndertakingTableProps {
  undertakings: UndertakingProjection[];
  pagination?: PaginationMeta;
  onPageChange?: (newPage: number) => void;
  onSelectUndertaking: (undertaking: UndertakingProjection) => void;
  onOpenReview?: (undertaking: UndertakingProjection) => void;
  onOpenRenew?: (undertaking: UndertakingProjection) => void;
  onSubmitDraft?: (undertakingId: string) => void;
  currentUserRole?: UserRole;
  isSubmittingId?: string | null;
}

export function UndertakingTable({
  undertakings,
  pagination,
  onPageChange,
  onSelectUndertaking,
  onOpenReview,
  onOpenRenew,
  onSubmitDraft,
  currentUserRole,
  isSubmittingId,
}: UndertakingTableProps): React.ReactElement {
  const isOfficerOrAdmin =
    currentUserRole === UserRole.SCRUTINY_OFFICER ||
    currentUserRole === UserRole.REGIONAL_OFFICER ||
    currentUserRole === UserRole.BUREAU_HEAD ||
    currentUserRole === UserRole.SYSTEM_ADMIN;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="data-table" aria-label="Institutional undertakings and lease deeds table">
          <thead>
            <tr>
              <th scope="col">Title & Classification</th>
              <th scope="col">Document / Deed No</th>
              <th scope="col">Counterparty / Lessor</th>
              <th scope="col">Validity & Tenure</th>
              <th scope="col">Lifecycle Status</th>
              <th scope="col">Review Status</th>
              <th scope="col" style={{ textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {undertakings.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: 'var(--color-text-muted, #64748b)',
                  }}
                >
                  No Undertakings or Leases Found
                </td>
              </tr>
            ) : (
              undertakings.map((item) => {
                const canReview = isOfficerOrAdmin && item.status !== UndertakingStatus.SUPERSEDED;
                const canRenew =
                  (currentUserRole === UserRole.INSTITUTION_USER ||
                    currentUserRole === UserRole.REGIONAL_OFFICER ||
                    currentUserRole === UserRole.SYSTEM_ADMIN) &&
                  item.status !== UndertakingStatus.SUPERSEDED &&
                  item.status !== UndertakingStatus.TERMINATED &&
                  item.status !== UndertakingStatus.DRAFT;
                const canSubmit =
                  item.status === UndertakingStatus.DRAFT &&
                  (currentUserRole === UserRole.INSTITUTION_USER ||
                    currentUserRole === UserRole.REGIONAL_OFFICER ||
                    currentUserRole === UserRole.SYSTEM_ADMIN);

                return (
                  <tr key={item.id}>
                    {/* Title & Classification */}
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: 'var(--color-text, #1e293b)',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}
                      >
                        {formatUndertakingType(item.type)}
                        {item.applicationId && (
                          <span>
                            {' '}
                            • App:{' '}
                            <a
                              href={`/scrutiny/${item.applicationId}`}
                              style={{ color: 'var(--color-primary, #2563eb)' }}
                            >
                              {item.applicationId.slice(0, 8)}…
                            </a>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Document / Deed No */}
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {item.documentNumber || '—'}
                      </div>
                      {item.issuingAuthority && (
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--color-text-muted, #64748b)',
                          }}
                        >
                          {item.issuingAuthority}
                        </div>
                      )}
                    </td>

                    {/* Counterparty / Lessor */}
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>{item.counterpartyName || '—'}</div>
                    </td>

                    {/* Validity & Tenure */}
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        <span>Exp: {formatDateUtc(item.expiryDate)}</span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color:
                            item.daysRemaining <= 0
                              ? 'var(--color-danger, #dc2626)'
                              : item.isRenewalDue
                                ? 'var(--color-warning, #d97706)'
                                : 'var(--color-success, #059669)',
                        }}
                      >
                        {item.daysRemaining < 0
                          ? `${Math.abs(item.daysRemaining)}d past expiry`
                          : `${item.daysRemaining}d remaining`}
                      </div>
                    </td>

                    {/* Status Badges */}
                    <td>
                      <UndertakingStatusBadge status={item.status} />
                    </td>

                    <td>
                      <UndertakingReviewBadge reviewStatus={item.reviewStatus} />
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="View Full Details & Lineage"
                          aria-label={`View details for ${item.title}`}
                          leftIcon={<Eye size={13} aria-hidden="true" />}
                          onClick={() => onSelectUndertaking(item)}
                        >
                          Inspect
                        </Button>

                        {canSubmit && onSubmitDraft && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Send size={13} aria-hidden="true" />}
                            isLoading={isSubmittingId === item.id}
                            onClick={() => onSubmitDraft(item.id)}
                          >
                            Submit
                          </Button>
                        )}

                        {canReview && onOpenReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Conduct Regulatory Review"
                            leftIcon={<FileCheck size={13} aria-hidden="true" />}
                            onClick={() => onOpenReview(item)}
                          >
                            Review
                          </Button>
                        )}

                        {canRenew && onOpenRenew && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RefreshCw size={13} aria-hidden="true" />}
                            onClick={() => onOpenRenew(item)}
                          >
                            Renew
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Dataset Scope */}
      {pagination && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted, #64748b)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            Showing{' '}
            <strong>
              {pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.totalItems)}</strong>{' '}
            of <strong>{pagination.totalItems}</strong> records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => onPageChange && onPageChange(pagination.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => onPageChange && onPageChange(pagination.page + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
