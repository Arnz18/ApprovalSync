/**
 * ApprovalSync — Scrutiny Officer Dashboard
 * Milestone: FE-05
 *
 * Operational cockpit for Scrutiny Officers: tracks scrutiny queue workload,
 * active stage timers approaching warning thresholds or breaches, case aging,
 * and authorized pause/resume controls with direct links to FE-04 case details.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import { DashboardMetricsOverview } from '../../components/dashboard/DashboardMetricsOverview';
import { ApplicationStatusChart } from '../../components/dashboard/ApplicationStatusChart';
import { ApplicationAgingBreakdown } from '../../components/dashboard/ApplicationAgingBreakdown';
import { SlaTimerCard } from '../../components/sla/SlaTimerCard';
import { SlaEscalationList } from '../../components/sla/SlaEscalationList';
import { ApplicationProjection, ApplicationStatus } from '../../applications/types';
import { SlaTimerProjection, SlaEscalationProjection, UserRole } from '../../sla/types';
import {
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  AgeBucket,
} from '../../sla/slaUtils';

export interface ScrutinyDashboardProps {
  applications: ApplicationProjection[];
  timers: SlaTimerProjection[];
  escalations: SlaEscalationProjection[];
  onTimerUpdated?: (updated: SlaTimerProjection) => void;
  onRefreshEscalations?: () => void;
  isLoading?: boolean;
}

export function ScrutinyDashboard({
  applications,
  timers,
  escalations,
  onTimerUpdated,
  onRefreshEscalations,
  isLoading: _isLoading = false,
}: ScrutinyDashboardProps): React.ReactElement {
  // Scrutiny relevant workload
  const scrutinyQueue = applications.filter((a) =>
    [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_SCRUTINY,
      ApplicationStatus.RESUBMITTED,
      ApplicationStatus.DEFICIENCY_ISSUED,
    ].includes(a.status),
  );

  const underScrutinyCount = applications.filter(
    (a) => a.status === ApplicationStatus.UNDER_SCRUTINY,
  ).length;
  const pendingPickupCount = applications.filter(
    (a) => a.status === ApplicationStatus.SUBMITTED || a.status === ApplicationStatus.RESUBMITTED,
  ).length;

  // SLA Timers urgency calculations
  const warningTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'warning');
  const breachedTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'breached');
  const pausedTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'paused');

  // Status breakdown
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
      id: 'scrutiny-queue',
      label: 'Active Scrutiny Workload',
      value: scrutinyQueue.length,
      subtext: `${underScrutinyCount} in scrutiny, ${pendingPickupCount} pending pickup`,
      icon: <ClipboardCheck size={18} />,
      variant: 'primary' as const,
    },
    {
      id: 'scrutiny-warnings',
      label: 'SLA Warning Deadlines',
      value: warningTimers.length,
      subtext: 'Approaching statutory review threshold',
      icon: <AlertTriangle size={18} />,
      variant: warningTimers.length > 0 ? ('warning' as const) : ('muted' as const),
    },
    {
      id: 'scrutiny-breaches',
      label: 'SLA Breached Timers',
      value: breachedTimers.length,
      subtext: 'Target review window exceeded',
      icon: <AlertOctagon size={18} />,
      variant: breachedTimers.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'scrutiny-paused',
      label: 'Paused SLA Clocks',
      value: pausedTimers.length,
      subtext: 'Frozen with regulatory justification',
      icon: <Clock size={18} />,
      variant: 'default' as const,
    },
  ];

  // Critical timers to highlight (breached or warning first, deduplicated)
  const criticalTimers = [...breachedTimers, ...warningTimers, ...pausedTimers]
    .filter((t, i, arr) => i === arr.findIndex((item) => item.id === t.id))
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* KPI Cards */}
      <DashboardMetricsOverview metrics={kpiMetrics} />

      {/* Critical SLA Timers Requiring Scrutiny Attention */}
      {criticalTimers.length > 0 && (
        <section aria-labelledby="critical-timers-heading">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
            }}
          >
            <div>
              <h3
                id="critical-timers-heading"
                style={{ fontSize: 'var(--font-size-base)', margin: 0, fontWeight: 600 }}
              >
                High-Priority SLA Timers Requiring Attention
              </h3>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  margin: 0,
                }}
              >
                Timers that have breached or reached warning thresholds. Freeze clock with
                justification if awaiting official records.
              </p>
            </div>

            <Link to="/scrutiny" className="btn btn-outline btn-sm">
              <span>Open Scrutiny Queue</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
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
                userRole={UserRole.SCRUTINY_OFFICER}
                onTimerUpdated={onTimerUpdated}
              />
            ))}
          </div>
        </section>
      )}

      {/* Analytics & Queue Overview Grid */}
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
          title="Scrutiny Workflow Status Breakdown"
          description="Distribution of cases across scrutiny, deficiency, and committee progression."
        />

        <ApplicationAgingBreakdown
          bucketCounts={bucketCounts}
          totalCount={applications.length}
          averageAgeDays={averageAgeDays}
          title="Scrutiny Workload Ageing Analysis"
          description="Case turnaround time elapsed from submission."
        />
      </div>

      {/* Recorded Escalations */}
      <SlaEscalationList
        escalations={escalations}
        onRefresh={onRefreshEscalations}
        userRole={UserRole.SCRUTINY_OFFICER}
        title="Scrutiny Escalation Events"
        description="Recorded Tier 1 warning threshold and stage breach notices dispatched to scrutiny officers."
      />
    </div>
  );
}
