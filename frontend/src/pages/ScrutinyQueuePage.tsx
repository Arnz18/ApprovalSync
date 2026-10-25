import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Info, RefreshCw, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { ScrutinyQueueFilters } from '../components/scrutiny/ScrutinyQueueFilters';
import { ScrutinyQueueTable } from '../components/scrutiny/ScrutinyQueueTable';
import { scrutinyService } from '../api/services/scrutinyService';
import { ScrutinyQueueItem, ScrutinyFilterState } from '../scrutiny/types';
import { ApiClientError } from '../api/client';

export const ScrutinyQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  // Initialize filters from URL search params or defaults
  const [filters, setFilters] = useState<ScrutinyFilterState>(() => ({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'ALL',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 20,
  }));

  const [queueItems, setQueueItems] = useState<ScrutinyQueueItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state changes to URL query parameters
  const updateUrlParams = useCallback(
    (newFilters: ScrutinyFilterState) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.status !== 'ALL') params.set('status', newFilters.status);
      if (newFilters.sortBy !== 'createdAt') params.set('sortBy', newFilters.sortBy);
      if (newFilters.sortOrder !== 'DESC') params.set('sortOrder', newFilters.sortOrder);
      if (newFilters.page > 1) params.set('page', String(newFilters.page));
      if (newFilters.limit !== 20) params.set('limit', String(newFilters.limit));

      startTransition(() => {
        setSearchParams(params, { replace: true });
      });
    },
    [setSearchParams],
  );

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number | undefined> = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search.trim()) {
        queryParams.search = filters.search.trim();
      }

      if (filters.status !== 'ALL') {
        queryParams.status = filters.status;
      }

      const response = await scrutinyService.getQueue(queryParams);

      // Map response to initial queue items
      const items: ScrutinyQueueItem[] = response.items.map((app) => ({
        ...app,
        dossierSummary: null,
        dossierSummaryLoading: app.status !== 'DRAFT',
      }));

      setQueueItems(items);
      setPagination(response.pagination);
      setIsLoading(false);

      // Asynchronously enrich with dossier verification summaries
      if (items.length > 0) {
        scrutinyService
          .enrichQueueSummaries(items, 3)
          .then((summaries) => {
            setQueueItems((prev) =>
              prev.map((it) => ({
                ...it,
                dossierSummary: summaries[it.id] || null,
                dossierSummaryLoading: false,
              })),
            );
          })
          .catch(() => {
            setQueueItems((prev) =>
              prev.map((it) => ({
                ...it,
                dossierSummaryLoading: false,
              })),
            );
          });
      }
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof ApiClientError) {
        if (err.statusCode === 403) {
          setError(
            'Access Denied: Your account role does not have permission to view the scrutiny review queue.',
          );
        } else if (err.statusCode === 401) {
          setError('Session expired. Please log in again to access the scrutiny queue.');
        } else {
          setError(err.message || 'Failed to load applications from the scrutiny review queue.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while communicating with the server.');
      }
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleFilterChange = (newFilters: Partial<ScrutinyFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      updateUrlParams(updated);
      return updated;
    });
  };

  const handleResetFilters = () => {
    const defaultFilters: ScrutinyFilterState = {
      search: '',
      status: 'ALL',
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      page: 1,
      limit: filters.limit,
    };
    setFilters(defaultFilters);
    updateUrlParams(defaultFilters);
  };

  const handlePageChange = (newPage: number) => {
    handleFilterChange({ page: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    handleFilterChange({ limit: newLimit, page: 1 });
  };

  const handleSelectCase = (applicationId: string) => {
    navigate(`/scrutiny/${encodeURIComponent(applicationId)}`);
  };

  return (
    <div className="scrutiny-queue-page" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Page Header */}
      <PageHeader
        title="Scrutiny Review Queue"
        description="Institutional application review, AI-assisted documentary verification, and human officer dispositions."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Regulatory Review', href: '/scrutiny' },
          { label: 'Scrutiny Queue' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchQueue}
              disabled={isLoading}
              aria-label="Refresh queue data"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              <span>Reload Queue</span>
            </Button>
          </div>
        }
      />

      {/* Human Sovereignty Regulatory Advisory Banner (ADR-004) */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Alert variant="info" title="ADR-004 Human Sovereignty Decision Support">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Automated dossier verification findings, OCR extractions, and anomaly flags are strictly
              advisory decision support under AICTE Approval Process Handbook norms. Scrutiny officers
              and regional directors must review original uploaded evidence before issuing deficiency
              notices or transitioning application states.
            </span>
          </div>
        </Alert>
      </div>

      {/* Filter and Search Bar */}
      <ScrutinyQueueFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={fetchQueue}
        isLoading={isLoading}
      />

      {/* Error State */}
      {error && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Alert variant="error" title="Queue Retrieval Error">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={fetchQueue}>
                Retry Load
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && queueItems.length === 0 && !error && (
        <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
          <Spinner size="lg" label="Loading applications queue and regulatory records..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && queueItems.length === 0 && !error && (
        <EmptyState
          icon={<FileText size={48} />}
          title="No Applications Found"
          description={
            filters.search || filters.status !== 'ALL'
              ? 'No applications match your active search and filter criteria. Try resetting your filters to view all cases.'
              : 'There are currently no applications in the scrutiny queue.'
          }
          action={
            filters.search || filters.status !== 'ALL' ? (
              <Button type="button" variant="primary" onClick={handleResetFilters}>
                Reset Filter Criteria
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Populated Queue Table */}
      {queueItems.length > 0 && (
        <ScrutinyQueueTable
          items={queueItems}
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onSelectCase={handleSelectCase}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
