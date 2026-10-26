/**
 * ApprovalSync — Dashboard KPI Metrics Overview
 * Milestone: FE-05
 *
 * Displays role-tailored top-level KPI cards with restrained semantic styling,
 * accessible non-color cues, and traceable data counts.
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';

export interface DashboardMetricItem {
  id: string;
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'error' | 'muted';
}

export interface DashboardMetricsOverviewProps {
  metrics: DashboardMetricItem[];
}

export function DashboardMetricsOverview({
  metrics,
}: DashboardMetricsOverviewProps): React.ReactElement {
  const variantStyles = {
    default: {
      borderLeft: '4px solid var(--color-primary)',
      iconBg: '#e2e8f0',
      iconColor: '#1e293b',
    },
    primary: {
      borderLeft: '4px solid var(--color-secondary)',
      iconBg: '#dbeafe',
      iconColor: '#1e40af',
    },
    warning: {
      borderLeft: '4px solid var(--color-warning)',
      iconBg: 'var(--color-warning-bg)',
      iconColor: 'var(--color-on-warning)',
    },
    error: {
      borderLeft: '4px solid var(--color-error)',
      iconBg: 'var(--color-error-bg)',
      iconColor: 'var(--color-on-error)',
    },
    muted: {
      borderLeft: '4px solid #94a3b8',
      iconBg: '#f1f5f9',
      iconColor: '#475569',
    },
  };

  return (
    <section aria-labelledby="dashboard-kpi-heading">
      <h2 id="dashboard-kpi-heading" className="sr-only">
        Executive KPI Summary
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {metrics.map((item) => {
          const styleConfig = variantStyles[item.variant || 'default'];

          return (
            <Card
              key={item.id}
              style={{
                borderLeft: styleConfig.borderLeft,
                backgroundColor: 'var(--color-card)',
              }}
            >
              <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <CardDescription style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                    {item.label}
                  </CardDescription>
                  <div
                    style={{
                      backgroundColor: styleConfig.iconBg,
                      color: styleConfig.iconColor,
                      padding: 'var(--space-1)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </div>
                </div>

                <CardTitle
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    marginTop: 'var(--space-1)',
                    marginBottom: 0,
                  }}
                >
                  {item.value}
                </CardTitle>
              </CardHeader>

              {item.subtext && (
                <CardContent style={{ paddingTop: '0' }}>
                  <p
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--color-muted-foreground)',
                      margin: 0,
                    }}
                  >
                    {item.subtext}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
