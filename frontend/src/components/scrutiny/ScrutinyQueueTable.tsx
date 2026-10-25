import React from 'react';
import { Eye, AlertTriangle, CheckCircle2, ShieldAlert, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ScrutinyQueueItem } from '../../scrutiny/types';
import { ApplicationStatus } from '../../api/types';

interface ScrutinyQueueTableProps {
  items: ScrutinyQueueItem[];
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

export const ScrutinyQueueTable: React.FC<ScrutinyQueueTableProps> = ({
  items,
  pagination,
  onPageChange,
  onLimitChange,
  onSelectCase,
  isLoading,
}) => {
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return <Badge variant="success">Approved</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="error">Rejected</Badge>;
      case ApplicationStatus.DEFICIENCY_ISSUED:
        return <Badge variant="warning">Deficiency Issued</Badge>;
      case ApplicationStatus.UNDER_SCRUTINY:
        return <Badge variant="primary">Under Scrutiny</Badge>;
      case ApplicationStatus.SUBMITTED:
        return <Badge variant="secondary">Submitted</Badge>;
      case ApplicationStatus.RESUBMITTED:
        return <Badge variant="warning">Resubmitted</Badge>;
      case ApplicationStatus.RECOMMENDED_FOR_EVC:
        return <Badge variant="primary">EVC Recommended</Badge>;
      case ApplicationStatus.WITHDRAWN:
        return <Badge variant="default">Withdrawn</Badge>;
      case ApplicationStatus.DRAFT:
      default:
        return <Badge variant="default">Draft</Badge>;
    }
  };

  const getDossierSynthesisBadge = (item: ScrutinyQueueItem) => {
    if (item.dossierSummaryLoading) {
      return (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}>
          Evaluating...
        </span>
      );
    }

    if (!item.dossierSummary) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <Clock size={12} aria-hidden="true" />
          <span>Pending Evaluation</span>
        </span>
      );
    }

    const { overallStatus, summary } = item.dossierSummary;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {overallStatus === 'COMPLIANT' && (
            <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Compliant</span>
            </Badge>
          )}
          {overallStatus === 'REQUIRES_REVIEW' && (
            <Badge variant="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} aria-hidden="true" />
              <span>Requires Review</span>
            </Badge>
          )}
          {overallStatus === 'DEFICIENT' && (
            <Badge variant="error" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={12} aria-hidden="true" />
              <span>Deficient</span>
            </Badge>
          )}

          {summary.requiresPhysicalInspection && (
            <span
              title="Automated heuristics recommend on-site EVC inspection"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-warning)',
                backgroundColor: 'var(--color-warning-subtle, #FFFBEB)',
                border: '1px solid var(--color-warning)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              EVC Recommended
            </span>
          )}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}>
          {summary.criticalDeficienciesCount > 0 ? (
            <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>
              {summary.criticalDeficienciesCount} Critical Deficiency
              {summary.criticalDeficienciesCount > 1 ? 'ies' : ''}
            </span>
          ) : (
            <span>0 Deficiencies</span>
          )}
          {' • '}
          <span>{summary.advisoryFlagsCount} Advisory</span>
        </div>
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
      return String(isoString);
    }
  };

  const startRecord = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.totalItems);

  return (
    <div className="data-table-container">
      <div className="data-table-scroll">
        <table className="data-table" aria-label="Scrutiny queue applications">
          <thead>
            <tr>
              <th scope="col">Application ID</th>
              <th scope="col">Institution Profile</th>
              <th scope="col">Discipline & Year</th>
              <th scope="col">Submitted</th>
              <th scope="col">Status</th>
              <th scope="col">Dossier AI Synthesis</th>
              <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {/* Application ID */}
                <td>
                  <button
                    type="button"
                    onClick={() => onSelectCase(item.id)}
                    style={{
                      fontFamily: 'var(--font-family-mono, monospace)',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'underline',
                    }}
                    title={`Open case ${item.applicationNumber}`}
                  >
                    {item.applicationNumber}
                  </button>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted-foreground)' }}>
                    Ref: {item.id.slice(0, 8)}...
                  </div>
                </td>

                {/* Institution Profile */}
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>
                    {item.institution?.name || 'Affiliated Institution'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted-foreground)' }}>
                    {item.institution?.district ? `${item.institution.district}, ` : ''}
                    {item.institution?.state || 'Verified Region'}
                  </div>
                </td>

                {/* Discipline & Year */}
                <td>
                  <div style={{ fontWeight: 500 }}>{item.programType}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted-foreground)' }}>
                    AY: {item.academicYear}
                  </div>
                </td>

                {/* Submitted Timestamp */}
                <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                  {formatDate(item.submittedAt || item.createdAt)}
                </td>

                {/* Lifecycle Status */}
                <td>{getStatusBadge(item.status)}</td>

                {/* Dossier AI Synthesis */}
                <td>{getDossierSynthesisBadge(item)}</td>

                {/* Actions */}
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectCase(item.id)}
                    aria-label={`Review case ${item.applicationNumber}`}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>Review Case</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="data-table-pagination" role="navigation" aria-label="Queue pagination">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span>
            Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
            <strong>{pagination.totalItems}</strong> applications
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label htmlFor="queue-page-size-select" style={{ fontSize: 'var(--font-size-xs)' }}>
              Rows:
            </label>
            <select
              id="queue-page-size-select"
              value={pagination.limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              style={{
                height: '1.75rem',
                padding: '0 var(--space-2)',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            <span>Previous</span>
          </Button>

          <span style={{ fontSize: 'var(--font-size-xs)', padding: '0 var(--space-2)' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage || isLoading}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
