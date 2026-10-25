import React from 'react';
import { Search, RefreshCw, X, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { ScrutinyFilterState } from '../../scrutiny/types';
import { ApplicationStatus } from '../../api/types';

interface ScrutinyQueueFiltersProps {
  filters: ScrutinyFilterState;
  onFilterChange: (newFilters: Partial<ScrutinyFilterState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ScrutinyQueueFilters: React.FC<ScrutinyQueueFiltersProps> = ({
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
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'DESC';

  return (
    <div className="scrutiny-filter-bar" role="search" aria-label="Scrutiny queue filters">
      {/* Search Input */}
      <div className="scrutiny-filter-group" style={{ flex: '1 1 240px' }}>
        <label htmlFor="queue-search-input" className="scrutiny-filter-label">
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
            id="queue-search-input"
            type="search"
            className="scrutiny-filter-input"
            placeholder="Search by ID, year, or program..."
            value={filters.search}
            onChange={handleSearchChange}
            style={{ paddingLeft: '2.25rem', paddingRight: filters.search ? '2.25rem' : 'var(--space-3)', width: '100%' }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '', page: 1 })}
              aria-label="Clear search input"
              style={{
                position: 'absolute',
                right: 'var(--space-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-muted-foreground)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="scrutiny-filter-group" style={{ flex: '0 1 200px' }}>
        <label htmlFor="queue-status-select" className="scrutiny-filter-label">
          Lifecycle State
        </label>
        <select
          id="queue-status-select"
          className="scrutiny-filter-select"
          value={filters.status}
          onChange={handleStatusChange}
        >
          <option value="ALL">All Application Statuses</option>
          <option value={ApplicationStatus.SUBMITTED}>Submitted (Pending Review)</option>
          <option value={ApplicationStatus.UNDER_SCRUTINY}>Under Scrutiny</option>
          <option value={ApplicationStatus.DEFICIENCY_ISSUED}>Deficiency Issued</option>
          <option value={ApplicationStatus.RESUBMITTED}>Resubmitted</option>
          <option value={ApplicationStatus.RECOMMENDED_FOR_EVC}>Recommended for EVC</option>
          <option value={ApplicationStatus.APPROVED}>Approved</option>
          <option value={ApplicationStatus.REJECTED}>Rejected</option>
          <option value={ApplicationStatus.WITHDRAWN}>Withdrawn</option>
        </select>
      </div>

      {/* Sort By Filter */}
      <div className="scrutiny-filter-group" style={{ flex: '0 1 180px' }}>
        <label htmlFor="queue-sort-by-select" className="scrutiny-filter-label">
          Sort Attribute
        </label>
        <select
          id="queue-sort-by-select"
          className="scrutiny-filter-select"
          value={filters.sortBy}
          onChange={handleSortByChange}
        >
          <option value="createdAt">Date Created</option>
          <option value="submittedAt">Date Submitted</option>
          <option value="updatedAt">Last Updated</option>
          <option value="applicationNumber">Application Number</option>
          <option value="academicYear">Academic Year</option>
          <option value="status">Lifecycle Status</option>
        </select>
      </div>

      {/* Sort Direction Toggle */}
      <div className="scrutiny-filter-group">
        <label className="scrutiny-filter-label">Direction</label>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleToggleSortOrder}
          title={`Currently sorting ${filters.sortOrder === 'ASC' ? 'Ascending' : 'Descending'}. Click to toggle.`}
          aria-label={`Toggle sort order: currently ${filters.sortOrder === 'ASC' ? 'Ascending' : 'Descending'}`}
        >
          {filters.sortOrder === 'ASC' ? (
            <>
              <ArrowUp size={14} aria-hidden="true" />
              <span>ASC</span>
            </>
          ) : (
            <>
              <ArrowDown size={14} aria-hidden="true" />
              <span>DESC</span>
            </>
          )}
        </Button>
      </div>

      {/* Action Buttons: Refresh & Clear */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onReset}
            disabled={isLoading}
            aria-label="Reset all search filters"
          >
            Reset Filters
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh scrutiny queue"
        >
          <RefreshCw
            size={14}
            className={isLoading ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </Button>
      </div>
    </div>
  );
};
