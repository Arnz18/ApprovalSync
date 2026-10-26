import React, { useState, useEffect, useCallback } from 'react';
import { FileText, PlusCircle, RefreshCw, Download, Search, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import {
  UndertakingTable,
  CreateUndertakingModal,
  UndertakingDetailModal,
  ReviewUndertakingModal,
  RenewUndertakingModal,
  UndertakingHistoryModal,
  ReconcileUndertakingsModal,
} from '../components/undertakings';
import {
  UndertakingProjection,
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingQueryParams,
  UndertakingsListResponse,
} from '../undertakings/types';
import { exportUndertakingsToCsv, formatUndertakingType } from '../undertakings/undertakingUtils';
import { undertakingsService } from '../api/services/undertakingsService';
import { useAuth } from '../auth/useAuth';
import { UserRole, PaginationMeta } from '../api/types';
import { ApiClientError } from '../api/client';

export function UndertakingsPage(): React.ReactElement {
  const { user } = useAuth();
  const currentRole = user?.role;

  // Data & Pagination
  const [undertakings, setUndertakings] = useState<UndertakingProjection[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [selectedUndertaking, setSelectedUndertaking] = useState<UndertakingProjection | null>(
    null,
  );
  const [reviewingUndertaking, setReviewingUndertaking] = useState<UndertakingProjection | null>(
    null,
  );
  const [renewingUndertaking, setRenewingUndertaking] = useState<UndertakingProjection | null>(
    null,
  );
  const [historyUndertakingId, setHistoryUndertakingId] = useState<string | null>(null);

  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Role Permissions
  const canCreate =
    currentRole === UserRole.INSTITUTION_USER ||
    currentRole === UserRole.REGIONAL_OFFICER ||
    currentRole === UserRole.SYSTEM_ADMIN;

  const canReconcile =
    currentRole === UserRole.REGIONAL_OFFICER ||
    currentRole === UserRole.BUREAU_HEAD ||
    currentRole === UserRole.SYSTEM_ADMIN;

  // Fetch Undertakings
  const fetchUndertakings = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setError(null);

      const params: UndertakingQueryParams = {
        page: pageToLoad,
        limit: 20,
        search: search.trim() || undefined,
        type: (selectedType as UndertakingType) || undefined,
        status: (selectedStatus as UndertakingStatus) || undefined,
        reviewStatus: (selectedReviewStatus as UndertakingReviewStatus) || undefined,
        sortBy: 'expiryDate',
        sortOrder: 'ASC',
      };

      try {
        const res: UndertakingsListResponse = await undertakingsService.getUndertakings(params);
        setUndertakings(res.items);
        setPagination(res.pagination);
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          setError(err.message || 'Failed to load institutional undertakings.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected network or server error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedType, selectedStatus, selectedReviewStatus],
  );

  useEffect(() => {
    fetchUndertakings(1);
  }, [fetchUndertakings]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedReviewStatus('');
  };

  const handlePageChange = (newPage: number) => {
    fetchUndertakings(newPage);
  };

  // Submit Draft Record
  const handleSubmitDraft = async (id: string) => {
    setSubmittingId(id);
    setActionSuccessMessage(null);
    try {
      const updated = await undertakingsService.submitUndertaking(id);
      setActionSuccessMessage(
        `Undertaking "${updated.title}" successfully submitted for regulatory review.`,
      );
      if (selectedUndertaking && selectedUndertaking.id === id) {
        setSelectedUndertaking(updated);
      }
      fetchUndertakings(pagination.page);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Submission failed.');
      }
    } finally {
      setSubmittingId(null);
    }
  };

  // Select related ID (from supersession links)
  const handleSelectRelatedId = async (relatedId: string) => {
    try {
      const record = await undertakingsService.getUndertakingById(relatedId);
      setSelectedUndertaking(record);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Unable to open related record: ${err.message}`);
      }
    }
  };

  // Metrics derived from currently loaded list
  const activeCount = undertakings.filter((u) => u.status === UndertakingStatus.ACTIVE).length;
  const expiringSoonCount = undertakings.filter(
    (u) => u.status === UndertakingStatus.EXPIRING_SOON,
  ).length;
  const renewalDueCount = undertakings.filter(
    (u) => u.status === UndertakingStatus.RENEWAL_DUE,
  ).length;
  const expiredCount = undertakings.filter((u) => u.status === UndertakingStatus.EXPIRED).length;
  const pendingReviewCount = undertakings.filter(
    (u) => u.reviewStatus === UndertakingReviewStatus.PENDING_REVIEW,
  ).length;

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <PageHeader
        title="Institutional Undertakings & Leases"
        description="Manage land lease deeds, building leases, safety clearances, and statutory undertakings with automated expiry tracking."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} aria-hidden="true" />}
              disabled={undertakings.length === 0}
              onClick={() => exportUndertakingsToCsv(undertakings, `Page ${pagination.page} view`)}
            >
              Export CSV
            </Button>

            {canReconcile && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={14} aria-hidden="true" />}
                onClick={() => setIsReconcileOpen(true)}
              >
                Reconciliation Sweep
              </Button>
            )}

            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle size={14} aria-hidden="true" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Register Instrument
              </Button>
            )}
          </div>
        }
      />

      {/* Action / Success Banner */}
      {actionSuccessMessage && (
        <Alert
          variant="success"
          title="Operation Confirmed"
          onClose={() => setActionSuccessMessage(null)}
        >
          {actionSuccessMessage}
        </Alert>
      )}

      {/* ADR-004 Human Sovereignty Directive */}
      <Alert variant="info" title="ADR-004 Human Sovereignty Directive">
        Expiry or renewal deadlines serve as factual operational signals. Automated expiry tracking
        supports regulatory decision-making and never independently revokes approval, rejects an
        institution, or replaces authorized human review.
      </Alert>

      {/* Global Error Banner */}
      {error && (
        <Alert variant="error" title="Error Loading Data" onClose={() => setError(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => fetchUndertakings(pagination.page)}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* KPI Overview Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Total in Scope
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700 }}>{pagination.totalItems}</div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Active (In Force)
          </div>
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--color-success, #059669)',
            }}
          >
            {activeCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Expiring Soon
          </div>
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--color-warning, #d97706)',
            }}
          >
            {expiringSoonCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Renewal Due
          </div>
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--color-warning, #d97706)',
            }}
          >
            {renewalDueCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Expired
          </div>
          <div
            style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-danger, #dc2626)' }}
          >
            {expiredCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)' }}>
            Pending Review
          </div>
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--color-primary, #2563eb)',
            }}
          >
            {pendingReviewCount}
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            style={{
              flex: '1 1 200px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                color: 'var(--color-text-muted, #64748b)',
              }}
            />
            <input
              type="text"
              placeholder="Search title, document number, authority, counterparty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <div style={{ width: '160px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
              aria-label="Filter by lifecycle status"
            >
              <option value="">All Statuses</option>
              {Object.values(UndertakingStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
              aria-label="Filter by undertaking type"
            >
              <option value="">All Types</option>
              {Object.values(UndertakingType).map((t) => (
                <option key={t} value={t}>
                  {formatUndertakingType(t)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select
              value={selectedReviewStatus}
              onChange={(e) => setSelectedReviewStatus(e.target.value)}
              className="form-select"
              aria-label="Filter by review status"
            >
              <option value="">All Review Statuses</option>
              {Object.values(UndertakingReviewStatus).map((rs) => (
                <option key={rs} value={rs}>
                  {rs}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedType || selectedStatus || selectedReviewStatus) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw size={13} aria-hidden="true" />}
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ padding: '3rem 0', display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : undertakings.length === 0 ? (
        <EmptyState
          title="No Undertakings or Leases Found"
          description={
            search || selectedType || selectedStatus || selectedReviewStatus
              ? 'No instruments match your active filter criteria. Try resetting filters.'
              : 'No institutional undertakings or lease records are registered for your institution yet.'
          }
          icon={<FileText size={36} />}
          action={
            canCreate ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle size={14} aria-hidden="true" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Register Instrument
              </Button>
            ) : undefined
          }
        />
      ) : (
        <UndertakingTable
          undertakings={undertakings}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSelectUndertaking={(u) => setSelectedUndertaking(u)}
          onOpenReview={(u) => setReviewingUndertaking(u)}
          onOpenRenew={(u) => setRenewingUndertaking(u)}
          onSubmitDraft={handleSubmitDraft}
          currentUserRole={currentRole}
          isSubmittingId={submittingId}
        />
      )}

      {/* Detail Modal */}
      <UndertakingDetailModal
        undertaking={selectedUndertaking}
        isOpen={Boolean(selectedUndertaking)}
        onClose={() => setSelectedUndertaking(null)}
        currentUserRole={currentRole}
        onOpenHistory={(id) => setHistoryUndertakingId(id)}
        onOpenReview={(u) => {
          setSelectedUndertaking(null);
          setReviewingUndertaking(u);
        }}
        onOpenRenew={(u) => {
          setSelectedUndertaking(null);
          setRenewingUndertaking(u);
        }}
        onSubmitDraft={handleSubmitDraft}
        onSelectRelatedId={handleSelectRelatedId}
        isSubmitting={submittingId === selectedUndertaking?.id}
      />

      {/* Create Modal */}
      <CreateUndertakingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => {
          setActionSuccessMessage(`Draft record "${created.title}" successfully created.`);
          fetchUndertakings(1);
        }}
      />

      {/* Review Modal */}
      <ReviewUndertakingModal
        undertaking={reviewingUndertaking}
        isOpen={Boolean(reviewingUndertaking)}
        onClose={() => setReviewingUndertaking(null)}
        onSuccess={(updated) => {
          setActionSuccessMessage(
            `Regulatory review recorded for "${updated.title}". Status: ${updated.reviewStatus}.`,
          );
          fetchUndertakings(pagination.page);
        }}
      />

      {/* Renew Modal */}
      <RenewUndertakingModal
        undertaking={renewingUndertaking}
        isOpen={Boolean(renewingUndertaking)}
        onClose={() => setRenewingUndertaking(null)}
        onSuccess={(renewed) => {
          setActionSuccessMessage(
            `Renewal instrument "${renewed.title}" created. Predecessor record superseded.`,
          );
          fetchUndertakings(1);
        }}
      />

      {/* History Modal */}
      <UndertakingHistoryModal
        undertakingId={historyUndertakingId}
        isOpen={Boolean(historyUndertakingId)}
        onClose={() => setHistoryUndertakingId(null)}
      />

      {/* Reconcile Modal */}
      <ReconcileUndertakingsModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        onSuccess={(result) => {
          setActionSuccessMessage(
            `Reconciliation complete: evaluated ${result.scannedCount} records, updated status for ${result.transitionedCount} records.`,
          );
          fetchUndertakings(pagination.page);
        }}
      />
    </div>
  );
}
