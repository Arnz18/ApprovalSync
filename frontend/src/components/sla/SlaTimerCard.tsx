/**
 * ApprovalSync — SLA Timer Card
 * Milestone: FE-05
 *
 * Detailed card component displaying active, paused, or breached SLA timer metrics,
 * elapsed/remaining deadlines, pause reason audit trail, and authorized controls.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, PauseCircle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, Button, Alert } from '../ui';
import { SlaTimerBadge } from './SlaTimerBadge';
import { PauseTimerModal } from './PauseTimerModal';
import { SlaTimerProjection, SlaTimerStatus, UserRole } from '../../sla/types';
import {
  formatRemainingTime,
  formatSlaDuration,
  getSlaTimerUrgency,
  formatIsoDateTime,
  isTimerManagementAuthorized,
  formatSlaTier,
} from '../../sla/slaUtils';
import { slaService } from '../../api/services/slaService';

export interface SlaTimerCardProps {
  timer: SlaTimerProjection;
  applicationNumber?: string;
  userRole?: UserRole;
  onTimerUpdated?: (updated: SlaTimerProjection) => void;
  showCaseLink?: boolean;
}

export function SlaTimerCard({
  timer,
  applicationNumber,
  userRole,
  onTimerUpdated,
  showCaseLink = true,
}: SlaTimerCardProps): React.ReactElement {
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const urgency = getSlaTimerUrgency(timer);
  const remaining = formatRemainingTime(timer.targetDeadline);
  const canManage = isTimerManagementAuthorized(userRole);

  const isPaused = timer.status === SlaTimerStatus.PAUSED;
  const isActive = timer.status === SlaTimerStatus.ACTIVE;

  async function handleResume() {
    setIsResuming(true);
    setActionError(null);
    try {
      const updated = await slaService.resumeTimer(timer.applicationId);
      if (onTimerUpdated) onTimerUpdated(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to resume SLA clock. Verify permissions and timer state.';
      setActionError(message);
    } finally {
      setIsResuming(false);
    }
  }

  // Format stage name into human-readable label
  const stageDisplay = timer.stage.replace(/_/g, ' ');

  // Determine case link target based on role clearance
  const caseLinkTarget =
    userRole === UserRole.INSTITUTION_USER ? `/applications` : `/scrutiny/${timer.applicationId}`;

  return (
    <Card
      style={{
        borderLeft:
          urgency === 'breached'
            ? '4px solid var(--color-error)'
            : urgency === 'warning'
              ? '4px solid var(--color-warning)'
              : urgency === 'paused'
                ? '4px solid #64748b'
                : '4px solid var(--color-info)',
      }}
    >
      <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Stage Timer • {stageDisplay} • {formatSlaTier(timer.tier)}
              </span>
            </div>
            <h4
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 600,
                marginTop: 'var(--space-1)',
                marginBottom: 0,
              }}
            >
              {applicationNumber
                ? `App #${applicationNumber}`
                : `App ID: ${timer.applicationId.slice(0, 8)}...`}
            </h4>
          </div>

          <SlaTimerBadge urgency={urgency} status={timer.status} />
        </div>
      </CardHeader>

      <CardContent
        style={{ paddingTop: '0', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      >
        {actionError && (
          <Alert variant="error" title="Action Failed">
            {actionError}
          </Alert>
        )}

        {/* Primary Deadline Metric Display */}
        <div
          style={{
            backgroundColor: 'var(--color-muted)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <div
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
            >
              {remaining.isPast ? 'Statutory Deadline Exceeded' : 'Target Stage Deadline'}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 700,
                color: remaining.isPast
                  ? 'var(--color-error)'
                  : urgency === 'warning'
                    ? 'var(--color-warning)'
                    : 'var(--color-foreground)',
              }}
            >
              {isPaused ? 'Clock Frozen' : remaining.label}
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Target Date:</span>
            <div style={{ fontWeight: 600 }}>{formatIsoDateTime(timer.targetDeadline)}</div>
          </div>
        </div>

        {/* Additional Timestamps & Thresholds */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-muted-foreground)' }}>Started At:</span>
            <div style={{ fontWeight: 500 }}>{formatIsoDateTime(timer.startedAt)}</div>
          </div>

          {timer.warningDeadline && (
            <div>
              <span style={{ color: 'var(--color-muted-foreground)' }}>Warning Threshold:</span>
              <div style={{ fontWeight: 500 }}>{formatIsoDateTime(timer.warningDeadline)}</div>
            </div>
          )}

          {timer.totalPausedMs > 0 && (
            <div>
              <span style={{ color: 'var(--color-muted-foreground)' }}>Total Paused Duration:</span>
              <div style={{ fontWeight: 500 }}>{formatSlaDuration(timer.totalPausedMs)}</div>
            </div>
          )}
        </div>

        {/* Paused State Reason Banner */}
        {isPaused && timer.pauseReason && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '2px' }}>
              Recorded Pause Justification:
            </div>
            <p style={{ margin: 0, color: '#78350f' }}>{timer.pauseReason}</p>
            {timer.pausedAt && (
              <span style={{ color: '#b45309', fontSize: '0.6875rem' }}>
                Frozen at {formatIsoDateTime(timer.pausedAt)}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {canManage && isActive && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PauseCircle size={14} />}
              onClick={() => setIsPauseModalOpen(true)}
            >
              Pause Clock
            </Button>
          )}

          {canManage && isPaused && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlayCircle size={14} />}
              onClick={handleResume}
              isLoading={isResuming}
              disabled={isResuming}
            >
              Resume Clock
            </Button>
          )}
        </div>

        {showCaseLink && (
          <Link
            to={caseLinkTarget}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View Dossier</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </CardFooter>

      {/* Pause Justification Modal Dialog */}
      <PauseTimerModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        applicationId={timer.applicationId}
        applicationNumber={applicationNumber}
        onSuccess={(updated) => {
          if (onTimerUpdated) onTimerUpdated(updated);
        }}
      />
    </Card>
  );
}
