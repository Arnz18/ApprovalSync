/**
 * ApprovalSync — SLA Escalation Event History List
 * Milestone: FE-05
 *
 * Filterable, accessible table listing recorded system-wide SLA escalation events,
 * tiers, target roles, detection timestamps, and application dossier links.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  EmptyState,
} from '../ui';
import { SlaEscalationProjection, SlaTier, SlaEscalationLevel, UserRole } from '../../sla/types';
import { formatIsoDateTime } from '../../sla/slaUtils';
import { formatRoleName } from '../../auth/roleRoutes';

export interface SlaEscalationListProps {
  escalations: SlaEscalationProjection[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  userRole?: UserRole;
  title?: string;
  description?: string;
}

export function SlaEscalationList({
  escalations,
  isLoading = false,
  error = null,
  onRefresh,
  userRole,
  title = 'Recorded SLA Escalations',
  description = 'Authoritative log of warning thresholds and stage deadline breaches emitted by the background SLA engine.',
}: SlaEscalationListProps): React.ReactElement {
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  const filteredEscalations = useMemo(() => {
    return escalations.filter((esc) => {
      if (tierFilter !== 'ALL' && esc.tier !== tierFilter) return false;
      if (levelFilter !== 'ALL' && esc.escalationLevel !== levelFilter) return false;
      return true;
    });
  }, [escalations, tierFilter, levelFilter]);

  function handleResetFilters() {
    setTierFilter('ALL');
    setLevelFilter('ALL');
  }

  const isFiltered = tierFilter !== 'ALL' || levelFilter !== 'ALL';

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} style={{ color: 'var(--color-warning)' }} aria-hidden="true" />
              <CardTitle style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
                {title}
              </CardTitle>
            </div>
            <CardDescription style={{ marginTop: 'var(--space-1)' }}>{description}</CardDescription>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              onClick={onRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            alignItems: 'center',
            marginTop: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'var(--color-muted)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontWeight: 600,
            }}
          >
            <Filter size={14} aria-hidden="true" />
            <span>Filters:</span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span>Tier:</span>
            <select
              className="form-input"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', height: '28px' }}
              aria-label="Filter escalations by tier"
            >
              <option value="ALL">All Tiers ({escalations.length})</option>
              <option value={SlaTier.TIER_1_RO_ALERT}>Tier 1 (RO Alert)</option>
              <option value={SlaTier.TIER_2_DIRECTOR_BREACH}>Tier 2 (Director Breach)</option>
              <option value={SlaTier.TIER_3_COUNCIL_LOCK}>Tier 3 (Council Lock)</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span>Level:</span>
            <select
              className="form-input"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', height: '28px' }}
              aria-label="Filter escalations by severity level"
            >
              <option value="ALL">All Levels</option>
              <option value={SlaEscalationLevel.WARNING}>Warning Threshold</option>
              <option value={SlaEscalationLevel.BREACH}>Stage Breach</option>
              <option value={SlaEscalationLevel.SEVERE_BREACH}>Severe Breach</option>
            </select>
          </label>

          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              style={{ padding: '2px 8px', height: '28px', fontSize: 'var(--font-size-xs)' }}
            >
              Reset Filters
            </Button>
          )}

          <div style={{ marginLeft: 'auto', color: 'var(--color-muted-foreground)' }}>
            Showing {filteredEscalations.length} of {escalations.length} events
          </div>
        </div>
      </CardHeader>

      <CardContent style={{ padding: '0' }}>
        {error ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <p style={{ color: 'var(--color-error)', margin: 0, fontSize: 'var(--font-size-sm)' }}>
              Failed to load escalation events: {error}
            </p>
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div style={{ padding: 'var(--space-6) 0' }}>
            <EmptyState
              icon={<ShieldAlert size={36} style={{ color: 'var(--color-muted-foreground)' }} />}
              title={isFiltered ? 'No Escalations Match Filters' : 'No Recorded Escalations'}
              description={
                isFiltered
                  ? 'Try selecting a different tier or severity level filter to inspect events.'
                  : 'All applications are currently operating within established SLA thresholds.'
              }
              action={
                isFiltered ? (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table
              className="table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-muted)',
                  }}
                >
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Detected At
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Severity / Level
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Escalation Tier
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Target Role
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Application / Stage
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)' }}>
                    Target Deadline
                  </th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-2) var(--space-3)' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEscalations.map((esc) => {
                  const isBreach =
                    esc.escalationLevel === SlaEscalationLevel.BREACH ||
                    esc.escalationLevel === SlaEscalationLevel.SEVERE_BREACH;
                  const caseUrl =
                    userRole === UserRole.INSTITUTION_USER
                      ? '/applications'
                      : `/scrutiny/${esc.applicationId}`;

                  return (
                    <tr
                      key={esc.id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        backgroundColor: isBreach ? 'var(--color-error-bg)' : 'transparent',
                      }}
                    >
                      <td
                        style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}
                      >
                        {formatIsoDateTime(esc.detectedAt)}
                      </td>

                      <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            color: isBreach ? 'var(--color-error)' : 'var(--color-warning)',
                          }}
                        >
                          {isBreach ? (
                            <AlertOctagon size={12} aria-hidden="true" />
                          ) : (
                            <AlertTriangle size={12} aria-hidden="true" />
                          )}
                          <span>{esc.escalationLevel.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                        <span className="badge badge-default" style={{ fontSize: '0.6875rem' }}>
                          {esc.tier.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 500 }}>
                        {formatRoleName(esc.targetRole)}
                      </td>

                      <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                        <div style={{ fontWeight: 600 }}>{esc.applicationId.slice(0, 8)}...</div>
                        <div
                          style={{ color: 'var(--color-muted-foreground)', fontSize: '0.6875rem' }}
                        >
                          {esc.stage.replace(/_/g, ' ')}
                        </div>
                      </td>

                      <td
                        style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}
                      >
                        {formatIsoDateTime(esc.targetDeadline)}
                      </td>

                      <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                        <Link
                          to={caseUrl}
                          className="btn btn-outline btn-sm"
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.6875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>Inspect</span>
                          <ExternalLink size={10} aria-hidden="true" />
                        </Link>
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
  );
}
