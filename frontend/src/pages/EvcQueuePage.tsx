import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CalendarCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { EvcQueueFilters } from '../components/evc/EvcQueueFilters';
import { EvcQueueTable } from '../components/evc/EvcQueueTable';
import { evcService } from '../api/services/evcService';
import { EvcFilterState, EvcQueueItem } from '../evc/types';
import { ApiClientError } from '../api/client';

export const EvcQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<EvcFilterState>({
    status: 'ALL',
    search: '',
    sortBy: 'submittedAt',
    sortOrder: 'DESC',
    page: 1,
    limit: 10,
  });

  const [items, setItems] = useState<EvcQueueItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await evcService.getEvcQueue(filters);
      setItems(response.items);
      setPagination(response.pagination);

      // Trigger asynchronous bounded enrichment for visible page items
      if (response.items.length > 0) {
        const itemIds = response.items.map((i) => i.id);
        evcService
          .enrichEvcSummaries(itemIds)
          .then((enrichmentMap) => {
            setItems((prevItems) =>
              prevItems.map((item) => {
                const enriched = enrichmentMap[item.id];
                if (!enriched) return item;
                return {
                  ...item,
                  compliance: enriched.compliance,
                  dossierSummary: enriched.dossierSummary,
                  loadingSummary: false,
                };
              }),
            );
          })
          .catch((err) => {
            console.warn('Enrichment error in EVC queue:', err);
          });
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(
          `Failed to retrieve EVC applications queue: ${err.message} (HTTP ${err.statusCode})`,
        );
      } else {
        setError('Network interruption or backend service error while fetching EVC queue.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleFilterChange = (newFilters: Partial<EvcFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleReset = () => {
    setFilters({
      status: 'ALL',
      search: '',
      sortBy: 'submittedAt',
      sortOrder: 'DESC',
      page: 1,
      limit: 10,
    });
  };

  const handleSelectCase = (applicationId: string) => {
    navigate(`/evc/${applicationId}`);
  };

  return (
    <div className="scrutiny-workspace-container" style={{ padding: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="EVC Inspection & Committee Queue"
        description="Ground inspection scheduling, infrastructure compliance verification, and committee hearing reviews."
      />

      {/* ADR-004 Human Sovereignty Banner */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Alert
          variant="info"
          title="ADR-004 Human Sovereignty Governance: Advisory Inspection Signals"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Shield size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Automated physical inspection triggers and infrastructure review heuristics are advisory
              decision-support signals only. In accordance with AICTE regulatory governance, automated
              findings do not constitute statutory approval, endorsement, or rejection. Final on-site
              determinations rest exclusively with authorized Expert Visit Committee Members and
              Council Officers.
            </span>
          </div>
        </Alert>
      </div>

      {/* Operational Notice: Scheduling and Persistence Boundary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-muted-foreground)',
        }}
      >
        <CalendarCheck
          size={16}
          aria-hidden="true"
          style={{ color: 'var(--color-primary)', flexShrink: 0 }}
        />
        <span>
          <strong>Operational Boundary:</strong> Case workflows advance via BE-06 state machine
          transitions. Centralized expert roster scheduling and geotagged evidence capture endpoints
          are currently undergoing M1/M2 backend contract implementation.
        </span>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant="error" title="Queue Retrieval Error">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchQueue}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-error)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Retry
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Filter and Search Bar */}
      <EvcQueueFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onRefresh={fetchQueue}
        isLoading={isLoading}
      />

      {/* Queue Table */}
      <EvcQueueTable
        items={items}
        pagination={pagination}
        onPageChange={(newPage) => handleFilterChange({ page: newPage })}
        onLimitChange={(newLimit) => handleFilterChange({ limit: newLimit, page: 1 })}
        onSelectCase={handleSelectCase}
        isLoading={isLoading}
      />
    </div>
  );
};
