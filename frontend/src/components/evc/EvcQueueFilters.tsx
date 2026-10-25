import React from 'react';
import { Search, RefreshCw, X, ArrowDown, ArrowUp, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { EvcFilterState } from '../../evc/types';
import { ApplicationStatus } from '../../api/types';

interface EvcQueueFiltersProps {
  filters: EvcFilterState;
  onFilterChange: (newFilters: Partial<EvcFilterState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const EvcQueueFilters: React.FC<EvcQueueFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  isLoading,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value, page: 1 });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ status: e.target.value, page: 1 });
  };

  const handleQuickStatus = (statusValue: string) => {
    onFilterChange({ status: statusValue, page: 1 });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ sortBy: e.target.value, page: 1 });
  };

  const handleToggleSortOrder = () => {
    const nextOrder = filters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onFilterChange({ sortOrder: nextOrder, page: 1 });
  };

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.status !== 'ALL' ||
    filters.sortBy !== 'submittedAt' ||
    filters.sortOrder !== 'DESC';

  return (
    <div className="scrutiny-filter-bar" role="search" aria-label="EVC queue filters">
      {/* Search Input */}
      <div className="scrutiny-filter-group" style={{ flex: '1 1 240px' }}>
        <label htmlFor="evc-search-input" className="scrutiny-filter-label">
          Search Reference
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              color: 'var(--color-muted-foreground)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="evc-search-input"
            type="search"
            className="scrutiny-filter-input"
            placeholder="Search by ID, program, or institution..."
            value={filters.search}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              paddingLeft: 'var(--space-8)',
              paddingRight: filters.search ? 'var(--space-8)' : 'var(--space-3)',
            }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '', page: 1 })}
              aria-label="Clear search text"
              style={{
                position: 'absolute',
                right: 'var(--space-2)',
                background: 'none',
                border: 'none',
                color: 'var(--color-muted-foreground)',
                cursor: 'pointer',
                padding: 'var(--space-1)',
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Status Selector */}
      <div className="scrutiny-filter-group" style={{ flex: '1 1 220px' }}>
        <label htmlFor="evc-status-select" className="scrutiny-filter-label">
          Lifecycle Status
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Filter
            size={14}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              color: 'var(--color-muted-foreground)',
              pointerEvents: 'none',
            }}
          />
          <select
            id="evc-status-select"
            className="scrutiny-filter-select"
            value={filters.status}
            onChange={handleStatusChange}
            style={{ paddingLeft: 'var(--space-8)' }}
          >
            <option value="ALL">All Application States</option>
            <option value={ApplicationStatus.RECOMMENDED_FOR_EVC}>
              Recommended for EVC (Awaiting Inspection)
            </option>
            <option value={ApplicationStatus.EVC_IN_PROGRESS}>EVC Inspection in Progress</option>
            <option value={ApplicationStatus.RECOMMENDED_FOR_SHC}>
              Recommended for SHC Committee
            </option>
            <option value={ApplicationStatus.UNDER_SCRUTINY}>Under Scrutiny</option>
            <option value={ApplicationStatus.SUBMITTED}>Submitted</option>
            <option value={ApplicationStatus.APPROVED}>Approved</option>
            <option value={ApplicationStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {/* Sort By Field */}
      <div className="scrutiny-filter-group" style={{ flex: '0 1 180px' }}>
        <label htmlFor="evc-sort-select" className="scrutiny-filter-label">
          Sort Field
        </label>
        <select
          id="evc-sort-select"
          className="scrutiny-filter-select"
          value={filters.sortBy}
          onChange={handleSortByChange}
        >
          <option value="submittedAt">Submission Date</option>
          <option value="createdAt">Created Date</option>
          <option value="updatedAt">Last Updated</option>
          <option value="applicationNumber">Application ID</option>
        </select>
      </div>

      {/* Sort Direction & Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-2)',
          flexWrap: 'nowrap',
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleToggleSortOrder}
          title={`Currently ${filters.sortOrder === 'ASC' ? 'Ascending' : 'Descending'}. Click to toggle.`}
          aria-label={`Toggle sort direction, currently ${filters.sortOrder === 'ASC' ? 'ascending' : 'descending'}`}
        >
          {filters.sortOrder === 'ASC' ? (
            <>
              <ArrowUp size={16} aria-hidden="true" style={{ marginRight: 'var(--space-1)' }} />
              Asc
            </>
          ) : (
            <>
              <ArrowDown size={16} aria-hidden="true" style={{ marginRight: 'var(--space-1)' }} />
              Desc
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh EVC queue"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={isLoading ? 'animate-spin' : ''}
            style={{ marginRight: 'var(--space-1)' }}
          />
          Refresh
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onReset}
            aria-label="Reset all filters to defaults"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Quick Filter Status Badges */}
      <div
        style={{
          flex: '1 1 100%',
          display: 'flex',
          gap: 'var(--space-2)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-2)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-muted-foreground)',
            marginRight: 'var(--space-1)',
          }}
        >
          Quick Filter:
        </span>
        <button
          type="button"
          onClick={() => handleQuickStatus('ALL')}
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background: filters.status === 'ALL' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: filters.status === 'ALL' ? '#ffffff' : 'var(--color-foreground)',
            cursor: 'pointer',
            fontWeight:
              filters.status === 'ALL'
                ? 'var(--font-weight-semibold)'
                : 'var(--font-weight-normal)',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => handleQuickStatus(ApplicationStatus.RECOMMENDED_FOR_EVC)}
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_EVC
                ? 'var(--color-primary)'
                : 'var(--color-surface)',
            color:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_EVC
                ? '#ffffff'
                : 'var(--color-foreground)',
            cursor: 'pointer',
            fontWeight:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_EVC
                ? 'var(--font-weight-semibold)'
                : 'var(--font-weight-normal)',
          }}
        >
          Recommended for EVC
        </button>
        <button
          type="button"
          onClick={() => handleQuickStatus(ApplicationStatus.EVC_IN_PROGRESS)}
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background:
              filters.status === ApplicationStatus.EVC_IN_PROGRESS
                ? 'var(--color-primary)'
                : 'var(--color-surface)',
            color:
              filters.status === ApplicationStatus.EVC_IN_PROGRESS
                ? '#ffffff'
                : 'var(--color-foreground)',
            cursor: 'pointer',
            fontWeight:
              filters.status === ApplicationStatus.EVC_IN_PROGRESS
                ? 'var(--font-weight-semibold)'
                : 'var(--font-weight-normal)',
          }}
        >
          Inspection in Progress
        </button>
        <button
          type="button"
          onClick={() => handleQuickStatus(ApplicationStatus.RECOMMENDED_FOR_SHC)}
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_SHC
                ? 'var(--color-primary)'
                : 'var(--color-surface)',
            color:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_SHC
                ? '#ffffff'
                : 'var(--color-foreground)',
            cursor: 'pointer',
            fontWeight:
              filters.status === ApplicationStatus.RECOMMENDED_FOR_SHC
                ? 'var(--font-weight-semibold)'
                : 'var(--font-weight-normal)',
          }}
        >
          Committee Review (SHC)
        </button>
      </div>
    </div>
  );
};
