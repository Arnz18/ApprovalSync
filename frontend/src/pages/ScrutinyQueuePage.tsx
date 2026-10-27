import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { ScrutinyQueueFilters } from '../components/scrutiny/ScrutinyQueueFilters';
import { ScrutinyQueueTable } from '../components/scrutiny/ScrutinyQueueTable';
import { HumanSovereigntyNotice } from '../components/common/HumanSovereigntyNotice';
import { scrutinyService } from '../api/services/scrutinyService';
import { ScrutinyQueueItem, ScrutinyFilterState } from '../scrutiny/types';
import { ApiClientError } from '../api/client';

export const ScrutinyQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMountedRef = useRef<boolean>(true);

  // Derive filters directly from URL search params as single source of truth
  const filters: ScrutinyFilterState = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || 'ALL',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    }),
    [searchParams],
  );

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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Partial<ScrutinyFilterState>) => {
      setSearchParams(
        (prevParams) => {
          const merged: ScrutinyFilterState = {
            search:
              newFilters.search !== undefined ? newFilters.search : prevParams.get('search') || '',
            status:
              newFilters.status !== undefined
                ? newFilters.status
                : prevParams.get('status') || 'ALL',
            sortBy:
              newFilters.sortBy !== undefined
                ? newFilters.sortBy
                : prevParams.get('sortBy') || 'createdAt',
            sortOrder:
              newFilters.sortOrder !== undefined
                ? newFilters.sortOrder
                : (prevParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
            page:
              newFilters.page !== undefined ? newFilters.page : Number(prevParams.get('page')) || 1,
            limit:
              newFilters.limit !== undefined
                ? newFilters.limit
                : Number(prevParams.get('limit')) || 20,
          };

          const params = new URLSearchParams();
          if (merged.search.trim()) params.set('search', merged.search.trim());
          if (merged.status !== 'ALL') params.set('status', merged.status);
          if (merged.sortBy !== 'createdAt') params.set('sortBy', merged.sortBy);
          if (merged.sortOrder !== 'DESC') params.set('sortOrder', merged.sortOrder);
          if (merged.page > 1) params.set('page', String(merged.page));
          if (merged.limit !== 20) params.set('limit', String(merged.limit));

          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleResetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

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
      if (!isMountedRef.current) return;

      const rawItems = response?.items || [];
      const items: ScrutinyQueueItem[] = rawItems.map((app) => ({
        ...app,
        dossierSummary: null,
        dossierSummaryLoading: app.status !== 'DRAFT',
      }));

      setQueueItems(items);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
      setIsLoading(false);

      // Asynchronously enrich with dossier verification summaries
      if (items.length > 0) {
        scrutinyService
          .enrichQueueSummaries(items, 3)
          .then((summaries) => {
            if (!isMountedRef.current) return;
            setQueueItems((prev) =>
              prev.map((it) => ({
                ...it,
                dossierSummary: summaries[it.id] || null,
                dossierSummaryLoading: false,
              })),
            );
          })
          .catch(() => {
            if (!isMountedRef.current) return;
            setQueueItems((prev) =>
              prev.map((it) => ({
                ...it,
                dossierSummaryLoading: false,
              })),
            );
          });
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
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
        description="Institutional application review, documentary verification, and human officer dispositions."
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
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Reload Queue</span>
            </Button>
          </div>
        }
      />

      {/* Human Sovereignty Regulatory Advisory Notice (ADR-004) */}
      <HumanSovereigntyNotice title="ADR-004 Human Sovereignty Decision Support" />

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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
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
