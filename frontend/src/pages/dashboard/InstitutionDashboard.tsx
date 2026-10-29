/**
 * ApprovalSync — Institution Representative Dashboard
 * Milestone: FE-05
 *
 * Strict institutional tenancy: renders solely the authenticated institution's own
 * applications, status progressions, draft resumption links, and active clarification windows.
 * Zero cross-institution data exposure and zero officer-only controls.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  FileCheck,
  Copy,
  Check,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ApplicationStatusBadge,
  Alert,
  EmptyState,
} from '../../components/ui';
import { DashboardMetricsOverview } from '../../components/dashboard/DashboardMetricsOverview';
import { ApplicationStatusChart } from '../../components/dashboard/ApplicationStatusChart';
import { SlaTimerBadge } from '../../components/sla/SlaTimerBadge';
import { ApplicationProjection, ApplicationStatus } from '../../applications/types';
import { SlaTimerProjection } from '../../sla/types';
import { formatRemainingTime, formatIsoDateTime } from '../../sla/slaUtils';

export interface InstitutionDashboardProps {
  applications: ApplicationProjection[];
  activeTimers: Record<string, SlaTimerProjection | null>;
  isLoading?: boolean;
}

export function InstitutionDashboard({
  applications,
  activeTimers,
  isLoading: _isLoading = false,
}: InstitutionDashboardProps): React.ReactElement {
  // Compute institutional metrics
  const totalCount = applications.length;
  const draftCount = applications.filter((a) => a.status === ApplicationStatus.DRAFT).length;
  const submittedCount = applications.filter(
    (a) => a.status === ApplicationStatus.SUBMITTED,
  ).length;
  const underScrutinyCount = applications.filter(
    (a) => a.status === ApplicationStatus.UNDER_SCRUTINY,
  ).length;
  const deficiencyCount = applications.filter(
    (a) => a.status === ApplicationStatus.DEFICIENCY_ISSUED,
  ).length;
  const approvedCount = applications.filter((a) => a.status === ApplicationStatus.APPROVED).length;

  // Status breakdown mapping
  const statusCounts = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  // Applications requiring action (DEFICIENCY_ISSUED)
  const actionRequiredApps = applications.filter(
    (a) => a.status === ApplicationStatus.DEFICIENCY_ISSUED,
  );
  // Draft applications available for resumption
  const draftApps = applications.filter((a) => a.status === ApplicationStatus.DRAFT);

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyId = (id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const kpiMetrics = [
    {
      id: 'inst-total',
      label: 'Institution Applications',
      value: totalCount,
      subtext: 'Bound to authenticated institution',
      icon: <FileText size={18} />,
      variant: 'primary' as const,
    },
    {
      id: 'inst-deficiency',
      label: 'Action Required',
      value: deficiencyCount,
      subtext: 'Clarification response window open',
      icon: <AlertTriangle size={18} />,
      variant: deficiencyCount > 0 ? ('warning' as const) : ('muted' as const),
    },
    {
      id: 'inst-scrutiny',
      label: 'Under Scrutiny',
      value: underScrutinyCount,
      subtext: `${underScrutinyCount} in review, ${submittedCount} submitted`,
      icon: <Clock size={18} />,
      variant: 'default' as const,
    },
    {
      id: 'inst-drafts',
      label: 'Draft Applications',
      value: draftCount,
      subtext: 'Ready for editing and submission',
      icon: <FileCheck size={18} />,
      variant: 'muted' as const,
    },
    {
      id: 'inst-approved',
      label: 'Council Approved',
      value: approvedCount,
      subtext: 'Formal statutory approvals granted',
      icon: <CheckCircle2 size={18} />,
      variant: 'default' as const,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Action Required Banner for Deficiency Notices */}
      {actionRequiredApps.length > 0 && (
        <Alert variant="warning" title="Regulatory Clarification Required">
          Your institution has {actionRequiredApps.length}{' '}
          {actionRequiredApps.length === 1 ? 'application' : 'applications'} with active deficiency
          notices. Please inspect the deficiencies and submit required documents before the
          statutory window expires.
        </Alert>
      )}

      {/* Active Draft Resumption Notice */}
      {draftApps.length > 0 && (
        <Alert variant="info" title={`Draft Resumption (${draftApps.length} saved)`}>
          <div>
            <p style={{ margin: '0 0 var(--space-2) 0' }}>
              You have incomplete application drafts saved in the system. Select a draft to continue
              uploading documents and finalizing category checklists.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {draftApps.slice(0, 3).map((draft) => (
                <Link
                  key={draft.id}
                  to={`/applications?draftId=${draft.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <FileCheck size={14} aria-hidden="true" />
                  <span>Resume {draft.applicationNumber}</span>
                </Link>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {/* KPI Cards */}
      <DashboardMetricsOverview metrics={kpiMetrics} />

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {/* Left Column: Applications Tracking Table */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            gridColumn: 'span 2',
          }}
        >
          <Card>
            <CardHeader>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                <div>
                  <CardTitle style={{ fontSize: 'var(--font-size-base)' }}>
                    My Institution's Applications
                  </CardTitle>
                  <CardDescription>
                    Real-time status tracking, active stage timers, and follow-up actions.
                  </CardDescription>
                </div>

                <Link to="/applications" className="btn btn-primary btn-sm">
                  <PlusCircle size={14} aria-hidden="true" />
                  <span>Start New Application</span>
                </Link>
              </div>
            </CardHeader>

            <CardContent style={{ padding: '0' }}>
              {applications.length === 0 ? (
                <div style={{ padding: 'var(--space-6) 0' }}>
                  <EmptyState
                    icon={<FileText size={36} style={{ color: 'var(--color-muted-foreground)' }} />}
                    title="No Applications Found"
                    description="Your institution has not created any applications for the current academic year."
                    action={
                      <Link to="/applications" className="btn btn-primary btn-sm">
                        Create First Application
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="table-container table-responsive-wrapper">
                  <table
                    className="table"
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-muted)',
                        }}
                      >
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '28%',
                          }}
                        >
                          Application No.
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '22%',
                          }}
                        >
                          Program &amp; Year
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '15%',
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '15%',
                          }}
                        >
                          Stage SLA
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '10%',
                          }}
                        >
                          Created
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: 'var(--space-2) var(--space-3)',
                            width: '10%',
                          }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => {
                        const timer = activeTimers[app.id];
                        const remaining = timer ? formatRemainingTime(timer.targetDeadline) : null;
                        const isCopied = copiedId === app.applicationNumber;

                        return (
                          <tr
                            key={app.id}
                            style={{
                              borderBottom: '1px solid var(--color-border-subtle)',
                              backgroundColor:
                                app.status === ApplicationStatus.DEFICIENCY_ISSUED
                                  ? 'var(--color-warning-bg)'
                                  : 'transparent',
                            }}
                          >
                            <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-1)',
                                  maxWidth: '100%',
                                }}
                              >
                                <span className="app-id-cell" title={app.applicationNumber}>
                                  {app.applicationNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(app.applicationNumber)}
                                  title={isCopied ? 'Copied!' : 'Copy Application Number'}
                                  aria-label={`Copy Application Number ${app.applicationNumber}`}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    color: isCopied
                                      ? 'var(--color-success)'
                                      : 'var(--color-muted-foreground)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    borderRadius: 'var(--radius-sm)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isCopied ? (
                                    <Check size={12} aria-hidden="true" />
                                  ) : (
                                    <Copy size={12} aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              <div style={{ fontWeight: 500 }}>{app.programType}</div>
                              <div
                                style={{
                                  color: 'var(--color-muted-foreground)',
                                  fontSize: '0.6875rem',
                                }}
                              >
                                AY {app.academicYear}
                              </div>
                            </td>

                            <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              <ApplicationStatusBadge status={app.status} />
                            </td>

                            <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              {timer ? (
                                <div
                                  style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                                >
                                  <SlaTimerBadge status={timer.status} />
                                  {remaining && (
                                    <span
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: remaining.isPast
                                          ? 'var(--color-error)'
                                          : 'var(--color-muted-foreground)',
                                        fontWeight: remaining.isPast ? 600 : 400,
                                      }}
                                    >
                                      {remaining.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                              <span className="app-timestamp-cell">
                                {formatIsoDateTime(app.createdAt)}
                              </span>
                            </td>

                            <td
                              style={{
                                padding: 'var(--space-2) var(--space-3)',
                                textAlign: 'right',
                              }}
                            >
                              {app.status === ApplicationStatus.DRAFT ? (
                                <Link
                                  to={`/applications?draftId=${app.id}`}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
                                >
                                  Resume Draft
                                </Link>
                              ) : (
                                <Link
                                  to="/applications"
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
                                >
                                  View Details
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Workflow Lifecycle Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <ApplicationStatusChart
            statusCounts={statusCounts}
            totalCount={totalCount}
            title="Application Status Breakdown"
            description="Progression of your institution's applications across statutory stages."
          />
        </div>
      </div>
    </div>
  );
}
