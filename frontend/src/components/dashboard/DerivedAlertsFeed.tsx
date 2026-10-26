/**
 * ApprovalSync — Derived Operational Alerts Feed
 * Milestone: FE-05
 *
 * Transparently aggregates and displays operational notifications derived directly
 * from server-verified SLA warnings, breaches, and state changes.
 *
 * NOTE: The backend does not implement a durable user notification inbox entity.
 * In compliance with architectural honesty guidelines, this component presents
 * server-derived operational alerts without simulating fake local read/unread persistence.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertOctagon, ArrowRight, Bell, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from '../ui';
import { SlaTimerProjection, SlaEscalationProjection, UserRole } from '../../sla/types';
import { getSlaTimerUrgency, formatIsoDateTime } from '../../sla/slaUtils';

export interface DerivedAlertItem {
  id: string;
  severity: 'breach' | 'warning' | 'info';
  title: string;
  message: string;
  applicationId: string;
  applicationNumber?: string;
  timestamp: string;
  source: 'SLA_BREACH' | 'SLA_WARNING' | 'ESCALATION_EVENT' | 'DEFICIENCY_NOTICE';
}

export interface DerivedAlertsFeedProps {
  timers?: SlaTimerProjection[];
  escalations?: SlaEscalationProjection[];
  userRole?: UserRole;
  title?: string;
  description?: string;
}

export function DerivedAlertsFeed({
  timers = [],
  escalations = [],
  userRole,
  title = 'Derived Operational Alerts',
  description = 'Real-time operational alerts derived from authoritative server-recorded SLA warnings, stage breaches, and escalations.',
}: DerivedAlertsFeedProps): React.ReactElement {
  // Aggregate alerts dynamically from real server data
  const alerts: DerivedAlertItem[] = [];

  // 1. Process active timers with warnings or breaches
  timers.forEach((timer) => {
    const urgency = getSlaTimerUrgency(timer);
    if (urgency === 'breached') {
      alerts.push({
        id: `timer-breach-${timer.id}`,
        severity: 'breach',
        title: `SLA Stage Deadline Breached`,
        message: `Stage "${timer.stage.replace(/_/g, ' ')}" exceeded statutory target deadline. Case requires immediate regulatory review.`,
        applicationId: timer.applicationId,
        timestamp: timer.escalatedAt || timer.targetDeadline,
        source: 'SLA_BREACH',
      });
    } else if (urgency === 'warning') {
      alerts.push({
        id: `timer-warn-${timer.id}`,
        severity: 'warning',
        title: `SLA Warning Threshold Reached`,
        message: `Stage "${timer.stage.replace(/_/g, ' ')}" is approaching target deadline. Prioritize case disposition.`,
        applicationId: timer.applicationId,
        timestamp: timer.warningDeadline || timer.startedAt,
        source: 'SLA_WARNING',
      });
    }
  });

  // 2. Process recorded escalations
  escalations.forEach((esc) => {
    const isBreach = esc.escalationLevel === 'BREACH' || esc.escalationLevel === 'SEVERE_BREACH';
    alerts.push({
      id: `esc-${esc.id}`,
      severity: isBreach ? 'breach' : 'warning',
      title: `${esc.tier.replace(/_/g, ' ')} Escalation Event`,
      message: `Escalated to ${esc.targetRole.replace(/_/g, ' ')} for stage "${esc.stage.replace(/_/g, ' ')}".`,
      applicationId: esc.applicationId,
      timestamp: esc.detectedAt,
      source: 'ESCALATION_EVENT',
    });
  });

  // Sort alerts with newest timestamps first
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Deduplicate alerts by ID
  const uniqueAlerts = alerts.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id),
  );

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <CardTitle style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
                {title}
              </CardTitle>
            </div>
            <CardDescription style={{ marginTop: 'var(--space-1)' }}>{description}</CardDescription>
          </div>

          <span className="badge badge-default" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
            {uniqueAlerts.length} Active {uniqueAlerts.length === 1 ? 'Alert' : 'Alerts'}
          </span>
        </div>
      </CardHeader>

      <CardContent style={{ padding: '0' }}>
        {uniqueAlerts.length === 0 ? (
          <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
            <EmptyState
              icon={<CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />}
              title="No Active Alerts"
              description="All monitored workflows are operating within designated statutory thresholds and no escalations are active."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {uniqueAlerts.map((alert) => {
              const isBreach = alert.severity === 'breach';
              const caseUrl =
                userRole === UserRole.INSTITUTION_USER
                  ? '/applications'
                  : `/scrutiny/${alert.applicationId}`;

              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    backgroundColor: isBreach ? 'var(--color-error-bg)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        color: isBreach ? 'var(--color-error)' : 'var(--color-warning)',
                        marginTop: '2px',
                      }}
                      aria-hidden="true"
                    >
                      {isBreach ? <AlertOctagon size={16} /> : <AlertTriangle size={16} />}
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            color: isBreach ? 'var(--color-on-error)' : 'var(--color-foreground)',
                          }}
                        >
                          {alert.title}
                        </span>

                        <span
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--color-muted-foreground)',
                          }}
                        >
                          {formatIsoDateTime(alert.timestamp)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-muted-foreground)',
                          margin: '2px 0 0 0',
                          lineHeight: 1.4,
                        }}
                      >
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={caseUrl}
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.6875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Inspect</span>
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
