/**
 * ApprovalSync — Bureau Head / Senior Regulatory Dashboard
 * Milestone: FE-05
 *
 * Executive regulatory governance dashboard: provides council-wide operational oversight,
 * Tier 3 council escalations, cross-stage bottleneck analytics, policy threshold review,
 * and authorized SLA clock pause/resume controls.
 */

import React, { useState } from 'react';
import { Building2, Clock, AlertTriangle, AlertOctagon, ShieldAlert, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui';
import { DashboardMetricsOverview } from '../../components/dashboard/DashboardMetricsOverview';
import { ApplicationStatusChart } from '../../components/dashboard/ApplicationStatusChart';
import { ApplicationAgingBreakdown } from '../../components/dashboard/ApplicationAgingBreakdown';
import { SlaTimerCard } from '../../components/sla/SlaTimerCard';
import { SlaEscalationList } from '../../components/sla/SlaEscalationList';
import { SlaPolicyModal } from '../../components/sla/SlaPolicyModal';
import { ApplicationProjection, ApplicationStatus } from '../../applications/types';
import {
  SlaTimerProjection,
  SlaEscalationProjection,
  SlaPolicyProjection,
  UserRole,
  SlaTier,
} from '../../sla/types';
import {
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  AgeBucket,
} from '../../sla/slaUtils';

export interface BureauDashboardProps {
  applications: ApplicationProjection[];
  timers: SlaTimerProjection[];
  escalations: SlaEscalationProjection[];
  policies?: SlaPolicyProjection[];
  onTimerUpdated?: (updated: SlaTimerProjection) => void;
  onRefreshEscalations?: () => void;
  isLoading?: boolean;
}

export function BureauDashboard({
  applications,
  timers,
  escalations,
  policies = [],
  onTimerUpdated,
  onRefreshEscalations,
  isLoading: _isLoading = false,
}: BureauDashboardProps): React.ReactElement {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // Group escalations by tier
  const tier3Escalations = escalations.filter((e) => e.tier === SlaTier.TIER_3_COUNCIL_LOCK);
  const tier2Escalations = escalations.filter((e) => e.tier === SlaTier.TIER_2_DIRECTOR_BREACH);
  const tier1Escalations = escalations.filter((e) => e.tier === SlaTier.TIER_1_RO_ALERT);

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
      id: 'bureau-total',
      label: 'Council Total Intake',
      value: applications.length,
      subtext: 'Applications across all regional offices',
      icon: <Building2 size={18} />,
      variant: 'primary' as const,
    },
    {
      id: 'bureau-tier3',
      label: 'Tier 3 Escalations',
      value: tier3Escalations.length,
      subtext: `${tier3Escalations.length} Tier 3, ${tier2Escalations.length} Tier 2, ${tier1Escalations.length} Tier 1`,
      icon: <ShieldAlert size={18} />,
      variant: tier3Escalations.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'bureau-breaches',
      label: 'Statutory Breaches',
      value: breachedTimers.length,
      subtext: 'Active timers exceeding target deadline',
      icon: <AlertOctagon size={18} />,
      variant: breachedTimers.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'bureau-warnings',
      label: 'SLA Warnings',
      value: warningTimers.length,
      subtext: 'Timers approaching stage thresholds',
      icon: <AlertTriangle size={18} />,
      variant: warningTimers.length > 0 ? ('warning' as const) : ('muted' as const),
    },
    {
      id: 'bureau-paused',
      label: 'Paused Clocks',
      value: pausedTimers.length,
      subtext: 'Active regulatory freezes',
      icon: <Clock size={18} />,
      variant: 'default' as const,
    },
  ];

  const criticalTimers = [...breachedTimers, ...warningTimers, ...pausedTimers]
    .filter((t, i, arr) => i === arr.findIndex((item) => item.id === t.id))
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Policy Guide Access Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            Council Governance &amp; Regulatory Benchmark Framework
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            AICTE Approval Process Handbook (APH) operational benchmarks and escalation policies.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<BookOpen size={14} />}
          onClick={() => setIsPolicyModalOpen(true)}
        >
          Inspect SLA Policies
        </Button>
      </div>

      {/* Bureau KPI Cards */}
      <DashboardMetricsOverview metrics={kpiMetrics} />

      {/* Critical SLA Timers */}
      {criticalTimers.length > 0 && (
        <section aria-labelledby="bureau-timers-heading">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h3
              id="bureau-timers-heading"
              style={{ fontSize: 'var(--font-size-base)', margin: 0, fontWeight: 600 }}
            >
              Council SLA Bottlenecks &amp; Overdue Stages
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-muted-foreground)',
                margin: 0,
              }}
            >
              Review breached timers across stages. Authorized regulatory officers may pause or
              resume clocks with audited justification.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {criticalTimers.map((timer) => (
              <SlaTimerCard
                key={timer.id}
                timer={timer}
                userRole={UserRole.BUREAU_HEAD}
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
          title="Council-Wide Status Breakdown"
          description="Distribution of all applications across statutory stages."
        />

        <ApplicationAgingBreakdown
          bucketCounts={bucketCounts}
          totalCount={applications.length}
          averageAgeDays={averageAgeDays}
          title="National Turnaround & Ageing Analysis"
          description="Overall case processing turnaround across regional offices."
        />
      </div>

      {/* Council Escalations Log */}
      <SlaEscalationList
        escalations={escalations}
        onRefresh={onRefreshEscalations}
        userRole={UserRole.BUREAU_HEAD}
        title="Council Escalation Event History"
        description="Recorded Tier 1, Tier 2, and Tier 3 escalation notices emitted across all regional offices."
      />

      {/* Policy Modal */}
      <SlaPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        policies={policies}
      />
    </div>
  );
}
