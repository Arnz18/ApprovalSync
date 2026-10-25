import React from 'react';
import {
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EvcQueueItem } from '../../evc/types';
import { ApplicationStatus } from '../../api/types';

interface EvcQueueTableProps {
  items: EvcQueueItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSelectCase: (applicationId: string) => void;
  isLoading: boolean;
}

export const EvcQueueTable: React.FC<EvcQueueTableProps> = ({
  items,
  pagination,
  onPageChange,
  onLimitChange,
  onSelectCase,
  isLoading,
}) => {
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.RECOMMENDED_FOR_EVC:
        return <Badge variant="primary">Recommended for EVC</Badge>;
      case ApplicationStatus.EVC_IN_PROGRESS:
        return <Badge variant="info">EVC in Progress</Badge>;
      case ApplicationStatus.RECOMMENDED_FOR_SHC:
        return <Badge variant="warning">Recommended for SHC</Badge>;
      case ApplicationStatus.APPROVED:
        return <Badge variant="success">Approved</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="error">Rejected</Badge>;
      case ApplicationStatus.UNDER_SCRUTINY:
        return <Badge variant="secondary">Under Scrutiny</Badge>;
      case ApplicationStatus.DEFICIENCY_ISSUED:
        return <Badge variant="warning">Deficiency Issued</Badge>;
      case ApplicationStatus.RESUBMITTED:
        return <Badge variant="warning">Resubmitted</Badge>;
      case ApplicationStatus.SUBMITTED:
        return <Badge variant="secondary">Submitted</Badge>;
      case ApplicationStatus.WITHDRAWN:
        return <Badge variant="default">Withdrawn</Badge>;
      case ApplicationStatus.DRAFT:
      default:
        return <Badge variant="default">Draft</Badge>;
    }
  };

  const renderInspectionIndicator = (item: EvcQueueItem) => {
    if (item.loadingSummary) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <Clock size={12} className="animate-spin" aria-hidden="true" />
          Evaluating...
        </span>
      );
    }

    const requiresInspection =
      item.compliance?.infrastructureReview?.evcInspectionRecommended ||
      item.compliance?.summary?.requiresPhysicalInspection ||
      item.dossierSummary?.summary?.requiresPhysicalInspection ||
      item.dossierSummary?.summary?.infrastructureReviewSummary?.evcInspectionRecommended;

    if (requiresInspection) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Badge
            variant="warning"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <AlertTriangle size={12} aria-hidden="true" />
            Inspection Triggered
          </Badge>
          {item.compliance?.infrastructureReview?.inspectionTriggerReasons?.[0] && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--color-muted-foreground)',
                maxWidth: '180px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={item.compliance.infrastructureReview.inspectionTriggerReasons[0]}
            >
              {item.compliance.infrastructureReview.inspectionTriggerReasons[0]}
            </span>
          )}
        </div>
      );
    }

    if (item.compliance?.summary) {
      return (
        <Badge
          variant="success"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <CheckCircle2 size={12} aria-hidden="true" />
          Heuristics Clear
        </Badge>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-muted-foreground)',
        }}
        title="Assessment not yet loaded or cached for this case"
      >
        <HelpCircle size={12} aria-hidden="true" />
        Unassessed
      </span>
    );
  };

  const renderComplianceChip = (item: EvcQueueItem) => {
    if (!item.compliance) return <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>;

    const criticalCount = item.compliance.summary.criticalDeficienciesCount;
    const advisoryCount = item.compliance.summary.advisoryFlagsCount;

    return (
      <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: '1.4' }}>
        {criticalCount > 0 && (
          <span style={{ color: 'var(--color-error)', fontWeight: 'var(--font-weight-semibold)' }}>
            {criticalCount} critical defect{criticalCount > 1 ? 's' : ''}
          </span>
        )}
        {criticalCount > 0 && advisoryCount > 0 && <span style={{ margin: '0 4px' }}>•</span>}
        {advisoryCount > 0 && (
          <span style={{ color: 'var(--color-warning)' }}>
            {advisoryCount} advisory flag{advisoryCount > 1 ? 's' : ''}
          </span>
        )}
        {criticalCount === 0 && advisoryCount === 0 && (
          <span style={{ color: 'var(--color-success)' }}>0 discrepancies</span>
        )}
      </div>
    );
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="scrutiny-table-container">
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          className="scrutiny-table"
          aria-label="EVC Inspection and Committee Review Applications"
        >
          <thead>
            <tr>
              <th scope="col" style={{ minWidth: '180px' }}>
                Application ID
              </th>
              <th scope="col" style={{ minWidth: '220px' }}>
                Institution & Location
              </th>
              <th scope="col" style={{ minWidth: '160px' }}>
                Workflow Status
              </th>
              <th scope="col" style={{ minWidth: '170px' }}>
                Physical Inspection Signal
              </th>
              <th scope="col" style={{ minWidth: '150px' }}>
                Compliance Assist
              </th>
              <th scope="col" style={{ minWidth: '130px' }}>
                Submitted
              </th>
              <th scope="col" style={{ minWidth: '140px', textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} aria-hidden="true">
                  <td colSpan={7}>
                    <div
                      style={{
                        height: '24px',
                        background: 'var(--color-muted)',
                        borderRadius: 'var(--radius-sm)',
                        animation: 'pulse 1.5s infinite ease-in-out',
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div
                    style={{
                      color: 'var(--color-muted-foreground)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    No applications match the current EVC inspection filters.
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    background:
                      item.status === ApplicationStatus.RECOMMENDED_FOR_EVC
                        ? 'var(--color-surface-hover)'
                        : undefined,
                  }}
                >
                  {/* Application ID & Category */}
                  <td>
                    <div
                      style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-foreground)',
                      }}
                    >
                      {item.applicationNumber}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-muted-foreground)',
                        marginTop: '2px',
                      }}
                    >
                      {item.programType} • AY {item.academicYear}
                    </div>
                  </td>

                  {/* Institution Details */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                      <Building
                        size={14}
                        aria-hidden="true"
                        style={{ color: 'var(--color-muted-foreground)' }}
                      />
                      <span
                        style={{
                          fontWeight: 'var(--font-weight-medium)',
                          maxWidth: '200px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.institution?.name || 'Authorized Institution'}
                      >
                        {item.institution?.name || 'Authorized Institution'}
                      </span>
                    </div>
                    {item.institution?.district && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-1)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-muted-foreground)',
                          marginTop: '2px',
                        }}
                      >
                        <MapPin size={12} aria-hidden="true" />
                        <span>
                          {item.institution.district}, {item.institution.state}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td>{getStatusBadge(item.status)}</td>

                  {/* Inspection Recommendation Indicator */}
                  <td>{renderInspectionIndicator(item)}</td>

                  {/* Compliance Findings Counts */}
                  <td>{renderComplianceChip(item)}</td>

                  {/* Submission Timestamp */}
                  <td
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    {formatDate(item.submittedAt || item.createdAt)}
                  </td>

                  {/* Action Link */}
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectCase(item.id)}
                      aria-label={`Open EVC inspection workspace for application ${item.applicationNumber}`}
                    >
                      <Eye size={14} aria-hidden="true" style={{ marginRight: '4px' }} />
                      Inspect Case
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="scrutiny-pagination">
        <div className="scrutiny-pagination-meta">
          Showing Page {pagination.page} of {Math.max(1, pagination.totalPages)} (
          {pagination.totalItems} total applications)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label
            htmlFor="evc-table-limit"
            style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
          >
            Page Size:
          </label>
          <select
            id="evc-table-limit"
            className="scrutiny-filter-select"
            value={pagination.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            style={{ width: '70px', padding: 'var(--space-1) var(--space-2)' }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Prev
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage || isLoading}
            aria-label="Next Page"
          >
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
