/**
 * ApprovalSync — Role-Specific Dashboards, SLA, Alerts & Analytics
 * Milestone: FE-05
 *
 * Primary coordinator page: dynamically resolves the authenticated user's role,
 * orchestrates resilient parallel data loading with partial failure isolation,
 * and delegates to the appropriate role-tailored dashboard view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, RefreshCw, Bell, BookOpen } from 'lucide-react';
import { PageHeader, Button, Alert, Spinner } from '../components/ui';
import { useAuth } from '../auth/useAuth';
import { UserRole } from '../api/types';
import { formatRoleName } from '../auth/roleRoutes';
import { applicationsService } from '../api/services/applicationsService';
import { slaService } from '../api/services/slaService';
import { ApplicationProjection } from '../applications/types';
import {
  SlaTimerProjection,
  SlaEscalationProjection,
  SlaPolicyProjection,
  SlaReconcileResult,
} from '../sla/types';
import { InstitutionDashboard } from './dashboard/InstitutionDashboard';
import { ScrutinyDashboard } from './dashboard/ScrutinyDashboard';
import { RegionalDashboard } from './dashboard/RegionalDashboard';
import { BureauDashboard } from './dashboard/BureauDashboard';
import { AuditorAdminDashboard } from './dashboard/AuditorAdminDashboard';
import { DerivedAlertsFeed } from '../components/dashboard/DerivedAlertsFeed';
import { SlaPolicyModal } from '../components/sla/SlaPolicyModal';

export function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const effectiveRole = user?.role || UserRole.INSTITUTION_USER;

  const [applications, setApplications] = useState<ApplicationProjection[]>([]);
  const [activeTimersMap, setActiveTimersMap] = useState<Record<string, SlaTimerProjection | null>>(
    {},
  );
  const [allTimers, setAllTimers] = useState<SlaTimerProjection[]>([]);
  const [escalations, setEscalations] = useState<SlaEscalationProjection[]>([]);
  const [policies, setPolicies] = useState<SlaPolicyProjection[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [escalationsError, setEscalationsError] = useState<string | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts'>('overview');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setAppsError(null);
    setEscalationsError(null);

    // 1. Fetch Applications (tenant-isolated on backend for INSTITUTION_USER)
    let fetchedApps: ApplicationProjection[] = [];
    try {
      const appRes = await applicationsService.listApplications({ limit: 50 });
      fetchedApps = appRes.items || [];
      setApplications(fetchedApps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve applications';
      setAppsError(msg);
    }

    // 2. Fetch Active Timers for retrieved applications in parallel with failure isolation
    if (fetchedApps.length > 0) {
      try {
        const timerPromises = fetchedApps.slice(0, 20).map(async (app) => {
          try {
            const timer = await slaService.getActiveTimer(app.id);
            return { appId: app.id, timer };
          } catch {
            return { appId: app.id, timer: null };
          }
        });

        const timerResults = await Promise.allSettled(timerPromises);
        const map: Record<string, SlaTimerProjection | null> = {};
        const flatTimers: SlaTimerProjection[] = [];

        timerResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            map[res.value.appId] = res.value.timer;
            if (res.value.timer && !flatTimers.some((t) => t.id === res.value.timer!.id)) {
              flatTimers.push(res.value.timer);
            }
          }
        });

        setActiveTimersMap(map);
        setAllTimers(flatTimers);
      } catch {
        // Non-fatal: active timers optional
      }
    }

    // 3. Fetch Escalations for regulatory roles (strictly omitted for INSTITUTION_USER)
    const canViewEscalations = [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ].includes(effectiveRole);

    if (canViewEscalations) {
      try {
        const escRes = await slaService.getEscalations({ limit: 50 });
        setEscalations(escRes.data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Escalations temporarily unavailable';
        setEscalationsError(msg);
      }
    } else {
      setEscalations([]);
    }

    // 4. Fetch SLA Policies
    try {
      const polRes = await slaService.getPolicies();
      setPolicies(polRes);
    } catch {
      // Non-fatal
    }

    setIsLoading(false);
  }, [effectiveRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTimerUpdated(updated: SlaTimerProjection) {
    setActiveTimersMap((prev) => ({
      ...prev,
      [updated.applicationId]: updated,
    }));
    setAllTimers((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  }

  function handleReconciliationCompleted(_result: SlaReconcileResult) {
    // Refresh timers and escalations after successful reconciliation sweep
    fetchData();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header with role badges and actions */}
      <PageHeader
        title={`${formatRoleName(effectiveRole)} Dashboard`}
        description="Role-tailored regulatory decision support, real-time SLA monitors, derived operational alerts, and workflow analytics."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BookOpen size={14} />}
              onClick={() => setIsPolicyModalOpen(true)}
            >
              SLA Policies
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              onClick={fetchData}
              disabled={isLoading}
            >
              Refresh Data
            </Button>
          </div>
        }
      />

      {/* Human Sovereignty Notice (ADR-004) */}
      <Alert variant="warning" title="Human Sovereignty Advisory (ADR-004)">
        ApprovalSync operates strictly as a decision-support platform. SLA warnings, deadline
        breaches, and escalation events draw regulatory attention to cases but do not independently
        approve or reject applications or establish statutory misconduct.
      </Alert>

      {/* Partial Data Failure Warnings */}
      {appsError && (
        <Alert
          variant={effectiveRole === UserRole.SHC_SAC_MEMBER ? 'warning' : 'error'}
          title={
            effectiveRole === UserRole.SHC_SAC_MEMBER
              ? 'Committee Application Access Notice (DEF-BE-01)'
              : 'Applications Data Service Notice'
          }
        >
          {effectiveRole === UserRole.SHC_SAC_MEMBER ? (
            <div data-testid="shc-dashboard-guidance">
              Standing Hearing Committee (SHC) application read authorization is pending backend
              controller clearance (DEF-BE-01). Other dashboard panels and regulatory timer feeds
              remain active.
            </div>
          ) : (
            `Failed to load application dossier records (${appsError}). Other panels will continue to render where data is available.`
          )}
        </Alert>
      )}

      {escalationsError && (
        <Alert variant="warning" title="Escalations Seam Notice">
          Escalation records could not be retrieved ({escalationsError}). Active stage timers remain
          operational.
        </Alert>
      )}

      {/* Top-Level Tabs: Overview vs Derived Alerts */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          gap: 'var(--space-4)',
        }}
        role="tablist"
        aria-label="Dashboard views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className="tab-button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderBottom:
              activeTab === 'overview' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color:
              activeTab === 'overview' ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            fontWeight: activeTab === 'overview' ? 600 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          <span>Workspace Overview</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'alerts'}
          className="tab-button"
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderBottom:
              activeTab === 'alerts' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color:
              activeTab === 'alerts' ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            fontWeight: activeTab === 'alerts' ? 600 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <Bell size={16} aria-hidden="true" />
          <span>Derived Operational Alerts</span>
          {allTimers.filter((t) => t.isBreached || t.isWarningSent).length > 0 && (
            <span
              className="badge badge-warning"
              style={{ fontSize: '0.625rem', padding: '1px 6px' }}
            >
              {allTimers.filter((t) => t.isBreached || t.isWarningSent).length}
            </span>
          )}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: 'var(--space-6) 0', display: 'flex', justifyContent: 'center' }}>
          <Spinner label="Loading dashboard metrics, active stage timers, and escalations..." />
        </div>
      )}

      {/* Tab Content: Alerts View */}
      {!isLoading && activeTab === 'alerts' && (
        <DerivedAlertsFeed timers={allTimers} escalations={escalations} userRole={effectiveRole} />
      )}

      {/* Tab Content: Overview (Role-Specific Delegation) */}
      {!isLoading && activeTab === 'overview' && (
        <>
          {effectiveRole === UserRole.INSTITUTION_USER && (
            <InstitutionDashboard
              applications={applications}
              activeTimers={activeTimersMap}
              isLoading={isLoading}
            />
          )}

          {effectiveRole === UserRole.SCRUTINY_OFFICER && (
            <ScrutinyDashboard
              applications={applications}
              timers={allTimers}
              escalations={escalations}
              onTimerUpdated={handleTimerUpdated}
              onRefreshEscalations={fetchData}
              isLoading={isLoading}
            />
          )}

          {effectiveRole === UserRole.REGIONAL_OFFICER && (
            <RegionalDashboard
              applications={applications}
              timers={allTimers}
              escalations={escalations}
              onTimerUpdated={handleTimerUpdated}
              onRefreshEscalations={fetchData}
              isLoading={isLoading}
            />
          )}

          {effectiveRole === UserRole.BUREAU_HEAD && (
            <BureauDashboard
              applications={applications}
              timers={allTimers}
              escalations={escalations}
              policies={policies}
              onTimerUpdated={handleTimerUpdated}
              onRefreshEscalations={fetchData}
              isLoading={isLoading}
            />
          )}

          {(effectiveRole === UserRole.SYSTEM_ADMIN ||
            effectiveRole === UserRole.AUDITOR ||
            effectiveRole === UserRole.EVC_INSPECTOR ||
            effectiveRole === UserRole.SHC_SAC_MEMBER) && (
            <AuditorAdminDashboard
              userRole={effectiveRole}
              applications={applications}
              timers={allTimers}
              escalations={escalations}
              policies={policies}
              onTimerUpdated={handleTimerUpdated}
              onRefreshEscalations={fetchData}
              onReconciliationCompleted={handleReconciliationCompleted}
              isLoading={isLoading}
            />
          )}
        </>
      )}

      {/* Configured SLA Policies Modal */}
      <SlaPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        policies={policies}
      />
    </div>
  );
}
