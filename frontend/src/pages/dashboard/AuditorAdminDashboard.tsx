/**
 * ApprovalSync — Auditor, Administrator & Committee Dashboard
 * Milestone: FE-05
 *
 * Dedicated dashboard for SYSTEM_ADMIN, AUDITOR, EVC_INSPECTOR, and SHC_SAC_MEMBER:
 * - SYSTEM_ADMIN: Full operational visibility, SLA policies, and privileged manual reconciliation.
 * - AUDITOR: Read-only governance and compliance oversight; mutation controls strictly suppressed.
 * - EVC_INSPECTOR & SHC_SAC_MEMBER: Contextual committee links and active stage timers.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  History,
  MapPin,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui';
import { DashboardMetricsOverview } from '../../components/dashboard/DashboardMetricsOverview';
import { ApplicationStatusChart } from '../../components/dashboard/ApplicationStatusChart';
import { ApplicationAgingBreakdown } from '../../components/dashboard/ApplicationAgingBreakdown';
import { SlaEscalationList } from '../../components/sla/SlaEscalationList';
import { SlaPolicyModal } from '../../components/sla/SlaPolicyModal';
import { ManualReconciliationBanner } from '../../components/sla/ManualReconciliationBanner';
import { ApplicationProjection, ApplicationStatus } from '../../applications/types';
import {
  SlaTimerProjection,
  SlaEscalationProjection,
  SlaPolicyProjection,
  SlaReconcileResult,
  UserRole,
} from '../../sla/types';
import {
  getSlaTimerUrgency,
  calculateApplicationAgeDays,
  categorizeAgeBucket,
  AgeBucket,
} from '../../sla/slaUtils';
import { formatRoleName } from '../../auth/roleRoutes';

export interface AuditorAdminDashboardProps {
  userRole: UserRole;
  applications: ApplicationProjection[];
  timers: SlaTimerProjection[];
  escalations: SlaEscalationProjection[];
  policies?: SlaPolicyProjection[];
  onTimerUpdated?: (updated: SlaTimerProjection) => void;
  onRefreshEscalations?: () => void;
  onReconciliationCompleted?: (result: SlaReconcileResult) => void;
  isLoading?: boolean;
}

export function AuditorAdminDashboard({
  userRole,
  applications,
  timers,
  escalations,
  policies = [],
  onTimerUpdated: _onTimerUpdated,
  onRefreshEscalations,
  onReconciliationCompleted,
  isLoading: _isLoading = false,
}: AuditorAdminDashboardProps): React.ReactElement {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const isAuditor = userRole === UserRole.AUDITOR;
  const isAdmin = userRole === UserRole.SYSTEM_ADMIN;
  const isEvc = userRole === UserRole.EVC_INSPECTOR;
  const isShc = userRole === UserRole.SHC_SAC_MEMBER;

  const warningTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'warning');
  const breachedTimers = timers.filter((t) => getSlaTimerUrgency(t) === 'breached');

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
      id: 'admin-total',
      label: isAdmin
        ? 'Platform Applications'
        : isAuditor
          ? 'Audited Applications'
          : 'Monitored Cases',
      value: applications.length,
      subtext: 'Authoritative system records',
      icon: <Shield size={18} />,
      variant: 'primary' as const,
    },
    {
      id: 'admin-breaches',
      label: 'Recorded Breaches',
      value: breachedTimers.length,
      subtext: 'Timers exceeding stage targets',
      icon: <AlertOctagon size={18} />,
      variant: breachedTimers.length > 0 ? ('error' as const) : ('muted' as const),
    },
    {
      id: 'admin-warnings',
      label: 'SLA Warnings',
      value: warningTimers.length,
      subtext: 'Timers approaching stage thresholds',
      icon: <AlertTriangle size={18} />,
      variant: warningTimers.length > 0 ? ('warning' as const) : ('muted' as const),
    },
    {
      id: 'admin-escalations',
      label: 'Total Escalations',
      value: escalations.length,
      subtext: 'Emitted escalation event records',
      icon: <History size={18} />,
      variant: 'default' as const,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Role Notice & Policy Access */}
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
            {formatRoleName(userRole)} Operations &amp; Compliance Console
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            {isAuditor
              ? 'Read-only independent audit oversight. Mutation controls are strictly disabled.'
              : isAdmin
                ? 'System administrator control center with on-demand database sweep capability.'
                : 'Committee inspection and appellate workflow monitoring.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isEvc && (
            <Link to="/evc" className="btn btn-primary btn-sm">
              <MapPin size={14} aria-hidden="true" />
              <span>EVC Workspace (FE-06)</span>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<BookOpen size={14} />}
            onClick={() => setIsPolicyModalOpen(true)}
          >
            Inspect SLA Policies
          </Button>
        </div>
      </div>

      {/* Privileged Manual Reconciliation Sweep (SYSTEM_ADMIN only) */}
      {isAdmin && (
        <ManualReconciliationBanner
          userRole={userRole}
          onReconciliationCompleted={onReconciliationCompleted}
        />
      )}

      {/* KPI Cards */}
      <DashboardMetricsOverview metrics={kpiMetrics} />

      {/* Committee Quick Entry Points */}
      {(isEvc || isShc) && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: 'var(--font-size-base)' }}>
              Committee Workspaces &amp; Special Handlers
            </CardTitle>
            <CardDescription>
              Direct links to specialized committee inspection and hearing review modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {isEvc && (
                <Link to="/evc" className="btn btn-outline btn-md">
                  <MapPin size={16} aria-hidden="true" />
                  <span>Open Expert Visit Committee (EVC) Queue</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
              {isShc && (
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Appellate hearing reviews are conducted in committee session. Cases marked for SHC
                  appear in the general queue.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <ApplicationStatusChart
          statusCounts={statusCounts}
          totalCount={applications.length}
          title="Lifecycle Status Breakdown"
          description="Distribution of applications across regulatory states."
        />

        <ApplicationAgingBreakdown
          bucketCounts={bucketCounts}
          totalCount={applications.length}
          averageAgeDays={averageAgeDays}
          title="Platform Turnaround & Ageing Analysis"
          description="Case turnaround time elapsed from submission."
        />
      </div>

      {/* SLA Escalation Log */}
      <SlaEscalationList
        escalations={escalations}
        onRefresh={onRefreshEscalations}
        userRole={userRole}
        title={isAuditor ? 'Independent Audit Escalation Log' : 'System Escalation Event Log'}
        description="Chronological record of SLA warning thresholds and deadline breaches emitted by the background engine."
      />

      {/* SLA Policy Modal */}
      <SlaPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        policies={policies}
      />
    </div>
  );
}
