/**
 * ApprovalSync — Regional Officer Dashboard
 * Milestone: FE-05
 *
 * Regional regulatory oversight dashboard: tracks regional workload distribution,
 * Tier 2 escalations, breached stage deadlines, clock pause/resume authorizations,
 * and workload aging metrics.
 */

import React from 'react';
import { MapPin, Clock, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';
import { DashboardMetricsOverview } from '../../components/dashboard/DashboardMetricsOverview';
import { ApplicationStatusChart } from '../../components/dashboard/ApplicationStatusChart';
import { ApplicationAgingBreakdown } from '../../components/dashboard/ApplicationAgingBreakdown';
import { SlaTimerCard } from '../../components/sla/SlaTimerCard';
import { SlaEscalationList } from '../../components/sla/SlaEscalationList';
import { ApplicationProjection, ApplicationStatus } from '../../applications/types';
import { SlaTimerProjection, SlaEscalationProjection, UserRole, SlaTier } from '../../sla/types';
import {
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  AgeBucket,
} from '../../sla/slaUtils';

export interface RegionalDashboardProps {
  applications: ApplicationProjection[];
  timers: SlaTimerProjection[];
  escalations: SlaEscalationProjection[];
  onTimerUpdated?: (updated: SlaTimerProjection) => void;
  onRefreshEscalations?: () => void;
  isLoading?: boolean;
}

export function RegionalDashboard({
  applications,
  timers,
  escalations,
  onTimerUpdated,
  onRefreshEscalations,
  isLoading: _isLoading = false,
}: RegionalDashboardProps): React.ReactElement {
  // Urgent regional items: Tier 2 escalations
  const tier2Escalations = escalations.filter((e) => e.tier === SlaTier.TIER_2_DIRECTOR_BREACH);

  const warningTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'warning');
  const breachedTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'breached');
  const pausedTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'paused');

  // Status mapping
  const statusCounts = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  // Aging calculation
  const now = new Date();
  const bucketCounts: Record<AgeBucket, number> = {
    '0-7 days': 0,
    '8-15 days': 0,
    '16-30 days': 0,
    '30+ days': 0,
  };

  let totalAgeDays = 0;
  applications.forEach((app) => {
    const age = calculateApplicationAgeDays(app.createdAt, now);
    totalAgeDays += age;
    const bucket = categorizeAgeBucket(age);
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
  });

  const averageAgeDays =
    applications.length > 0 ? Math.round(totalAgeDays / applications.length) : 0;

  const kpiMetrics = [
    {
      id: 'ro-workload',
      label: 'Regional Workload',
      value: applications.length,
      subtext: 'Applications under regional purview',
      icon: <MapPin size={18} />,
      variant: 'primary' as const,
    },
    {
      id: 'ro-tier2',
      label: 'Tier 2 Escalations',
      value: tier2Escalations.length,
      subtext: 'Director-level escalation events',
      icon: <ShieldAlert size={18} />,
      variant: tier2Escalations.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'ro-breaches',
      label: 'Breached SLA Timers',
      value: breachedTimers.length,
      subtext: 'Stage deadlines breached in jurisdiction',
      icon: <AlertOctagon size={18} />,
      variant: breachedTimers.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'ro-warnings',
      label: 'SLA Warnings',
      value: warningTimers.length,
      subtext: 'Timers approaching stage thresholds',
      icon: <AlertTriangle size={18} />,
      variant: warningTimers.length > 0 ? ('warning' as const) : ('muted' as const),
    },
    {
      id: 'ro-paused',
      label: 'Frozen SLA Clocks',
      value: pausedTimers.length,
      subtext: 'Regulatory pauses under review',
      icon: <Clock size={18} />,
      variant: 'default' as const,
    },
  ];

  const criticalTimers = [...breachedTimers, ...warningTimers, ...pausedTimers]
    .filter((t, i, arr) => i === arr.findIndex((item) => item.id === t.id))
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Regional KPI Cards */}
      <DashboardMetricsOverview metrics={kpiMetrics} />

      {/* Critical Timers Requiring Regional Attention */}
      {criticalTimers.length > 0 && (
        <section aria-labelledby="ro-timers-heading">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3
              id="ro-timers-heading"
              style={{ fontSize: 'var(--font-size-base)', margin: 0, fontWeight: 600 }}
            >
              Regional SLA Timers Requiring Management
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: 0,
              }}
            >
              Inspect breached deadlines, approaching thresholds, and manage authorized regulatory
              pauses.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {criticalTimers.map((timer) => (
              <SlaTimerCard
                key={timer.id}
                timer={timer}
                userRole={UserRole.REGIONAL_OFFICER}
                onTimerUpdated={onTimerUpdated}
              />
            ))}
          </div>
        </section>
      )}

      {/* Analytics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <ApplicationStatusChart
          statusCounts={statusCounts}
          totalCount={applications.length}
          title="Regional Case Status Breakdown"
          description="Distribution of applications across regulatory states within the region."
        />

        <ApplicationAgingBreakdown
          bucketCounts={bucketCounts}
          totalCount={applications.length}
          averageAgeDays={averageAgeDays}
          title="Regional Turnaround & Ageing Analysis"
          description="Case turnaround time elapsed from submission."
        />
      </div>

      {/* Escalation Event History */}
      <SlaEscalationList
        escalations={escalations}
        onRefresh={onRefreshEscalations}
        userRole={UserRole.REGIONAL_OFFICER}
        title="Regional Escalations Log"
        description="Recorded Tier 1 and Tier 2 escalation notices emitted for cases under regional oversight."
      />
    </div>
  );
}
