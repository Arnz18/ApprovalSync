/**
 * ApprovalSync — Application Aging & Backlog Breakdown
 * Milestone: FE-05
 *
 * Visualizes case aging across regulatory buckets (0-7d, 8-15d, 16-30d, 30+d),
 * computing average processing turnaround and highlighting aged bottlenecks.
 */

import React from 'react';
import { Hourglass, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';
import { AgeBucket } from '../../sla/slaUtils';

export interface ApplicationAgingBreakdownProps {
  bucketCounts: Record<AgeBucket, number>;
  totalCount: number;
  averageAgeDays: number;
  title?: string;
  description?: string;
}

export function ApplicationAgingBreakdown({
  bucketCounts,
  totalCount,
  averageAgeDays,
  title = 'Application Ageing & Backlog Distribution',
  description = 'Turnaround and elapsed calendar days from initial submission timestamp.',
}: ApplicationAgingBreakdownProps): React.ReactElement {
  const buckets: { key: AgeBucket; label: string; color: string; subtext: string }[] = [
    {
      key: '0-7 days',
      label: '0–7 Days (Initial Window)',
      color: 'var(--color-success)',
      subtext: 'Within standard initial intake and assignment timeframe',
    },
    {
      key: '8-15 days',
      label: '8–15 Days (Active Review)',
      color: 'var(--color-info)',
      subtext: 'Standard documentary scrutiny and technical verification',
    },
    {
      key: '16-30 days',
      label: '16–30 Days (Extended Processing)',
      color: 'var(--color-warning)',
      subtext: 'Deficiency clarifications, committee scheduling, or inspection',
    },
    {
      key: '30+ days',
      label: '30+ Days (Critical Ageing)',
      color: 'var(--color-error)',
      subtext: 'Aged cases requiring executive regulatory prioritization',
    },
  ];

  const agedCount = bucketCounts['30+ days'] || 0;

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hourglass size={18} style={{ color: 'var(--color-secondary)' }} aria-hidden="true" />
              <CardTitle style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
                {title}
              </CardTitle>
            </div>
            <CardDescription style={{ marginTop: 'var(--space-1)' }}>{description}</CardDescription>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
            >
              Average Age
            </span>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 700,
                color: 'var(--color-foreground)',
              }}
            >
              {totalCount > 0 ? `${averageAgeDays} Days` : '—'}
            </div>
          </div>
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
            No active application timestamps available for age calculation.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {buckets.map((b) => {
              const count = bucketCounts[b.key] || 0;
              const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

              return (
                <div key={b.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-foreground)' }}>
                      {b.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {count} {count === 1 ? 'case' : 'cases'}{' '}
                      <span style={{ color: 'var(--color-muted-foreground)', fontWeight: 400 }}>
                        ({percentage}%)
                      </span>
                    </span>
                  </div>

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
                    aria-label={`${b.label}: ${count} cases (${percentage}%)`}
                  >
                    <div
                      style={{
                        width: `${Math.max(percentage, count > 0 ? 3 : 0)}%`,
                        height: '100%',
                        backgroundColor: b.color,
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>

                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted-foreground)' }}>
                    {b.subtext}
                  </span>
                </div>
              );
            })}

            {agedCount > 0 && (
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-on-error)',
                }}
              >
                <AlertCircle size={14} aria-hidden="true" />
                <span>
                  <strong>Bottleneck Advisory:</strong> {agedCount}{' '}
                  {agedCount === 1 ? 'case exceeds' : 'cases exceed'} 30 days of active processing
                  turnaround.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
