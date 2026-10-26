/**
 * ApprovalSync — Application Workflow Status Distribution
 * Milestone: FE-05
 *
 * Accessible, lightweight visual representation of applications distributed across
 * authoritative workflow states with traceable percentage calculations and zero dependencies.
 */

import React from 'react';
import { Layers } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ApplicationStatusBadge,
} from '../ui';
import { ApplicationStatus } from '../../api/types';

export interface ApplicationStatusChartProps {
  statusCounts: Record<ApplicationStatus, number>;
  totalCount: number;
  title?: string;
  description?: string;
}

export function ApplicationStatusChart({
  statusCounts,
  totalCount,
  title = 'Application Workflow Distribution',
  description = 'Status distribution across the 16-state regulatory lifecycle based on retrieved application records.',
}: ApplicationStatusChartProps): React.ReactElement {
  // Sort statuses with active records first, then standard regulatory lifecycle order
  const displayStatuses: ApplicationStatus[] = [
    ApplicationStatus.DRAFT,
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_SCRUTINY,
    ApplicationStatus.DEFICIENCY_ISSUED,
    ApplicationStatus.RESUBMITTED,
    ApplicationStatus.RECOMMENDED_FOR_EVC,
    ApplicationStatus.EVC_IN_PROGRESS,
    ApplicationStatus.RECOMMENDED_FOR_SHC,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ];

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <CardTitle style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
                {title}
              </CardTitle>
            </div>
            <CardDescription style={{ marginTop: 'var(--space-1)' }}>{description}</CardDescription>
          </div>

          <span className="badge badge-default" style={{ fontWeight: 600 }}>
            {totalCount} Total Cases
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {totalCount === 0 ? (
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-muted-foreground)',
              textAlign: 'center',
              margin: 'var(--space-4) 0',
            }}
          >
            No application records currently available to display.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {displayStatuses
              .map((status) => {
                const count = statusCounts[status] || 0;
                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return { status, count, percentage };
              })
              .filter(
                (item) =>
                  item.count > 0 ||
                  [
                    ApplicationStatus.DRAFT,
                    ApplicationStatus.SUBMITTED,
                    ApplicationStatus.UNDER_SCRUTINY,
                  ].includes(item.status),
              )
              .map(({ status, count, percentage }) => (
                <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <ApplicationStatusBadge status={status} />
                    <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>
                      {count} {count === 1 ? 'case' : 'cases'}{' '}
                      <span style={{ color: 'var(--color-muted-foreground)', fontWeight: 400 }}>
                        ({percentage}%)
                      </span>
                    </span>
                  </div>

                  {/* Horizontal Bar Chart Meter */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--color-muted)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                    role="progressbar"
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={totalCount}
                    aria-label={`${status}: ${count} cases (${percentage}%)`}
                  >
                    <div
                      style={{
                        width: `${Math.max(percentage, count > 0 ? 3 : 0)}%`,
                        height: '100%',
                        backgroundColor:
                          status === ApplicationStatus.DEFICIENCY_ISSUED
                            ? 'var(--color-warning)'
                            : status === ApplicationStatus.REJECTED
                              ? 'var(--color-error)'
                              : status === ApplicationStatus.APPROVED
                                ? 'var(--color-success)'
                                : 'var(--color-primary)',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
