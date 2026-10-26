/**
 * ApprovalSync — SLA Timer Status Badge
 * Milestone: FE-05
 * Accessible semantic status indicator with icons, colors, and ARIA labels.
 */

import React from 'react';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  PauseCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { SlaTimerStatus, SlaEscalationLevel } from '../../sla/types';
import { SlaUrgency } from '../../sla/slaUtils';

export interface SlaTimerBadgeProps {
  status?: SlaTimerStatus;
  urgency?: SlaUrgency;
  escalationLevel?: SlaEscalationLevel;
  className?: string;
  showIcon?: boolean;
}

export function SlaTimerBadge({
  status,
  urgency,
  escalationLevel,
  className = '',
  showIcon = true,
}: SlaTimerBadgeProps): React.ReactElement {
  // Determine effective status to render
  let effectiveState: 'active' | 'warning' | 'breached' | 'paused' | 'completed' | 'cancelled' =
    'active';

  if (urgency) {
    if (urgency === 'breached') effectiveState = 'breached';
    else if (urgency === 'warning') effectiveState = 'warning';
    else if (urgency === 'paused') effectiveState = 'paused';
    else if (urgency === 'completed') effectiveState = 'completed';
    else if (urgency === 'cancelled') effectiveState = 'cancelled';
  } else if (escalationLevel) {
    if (
      escalationLevel === SlaEscalationLevel.BREACH ||
      escalationLevel === SlaEscalationLevel.SEVERE_BREACH
    ) {
      effectiveState = 'breached';
    } else if (escalationLevel === SlaEscalationLevel.WARNING) {
      effectiveState = 'warning';
    }
  } else if (status) {
    switch (status) {
      case SlaTimerStatus.BREACHED:
        effectiveState = 'breached';
        break;
      case SlaTimerStatus.PAUSED:
        effectiveState = 'paused';
        break;
      case SlaTimerStatus.COMPLETED:
        effectiveState = 'completed';
        break;
      case SlaTimerStatus.CANCELLED:
        effectiveState = 'cancelled';
        break;
      case SlaTimerStatus.ACTIVE:
      default:
        effectiveState = 'active';
        break;
    }
  }

  const badgeConfig = {
    active: {
      label: 'SLA Active',
      ariaLabel: 'SLA timer is actively running within target threshold',
      icon: <Clock size={12} aria-hidden="true" />,
      style: {
        backgroundColor: 'var(--color-info-bg)',
        color: 'var(--color-on-info)',
        border: '1px solid var(--color-info-border)',
      },
    },
    warning: {
      label: 'SLA Warning',
      ariaLabel: 'SLA warning: stage is approaching target deadline threshold',
      icon: <AlertTriangle size={12} aria-hidden="true" />,
      style: {
        backgroundColor: 'var(--color-warning-bg)',
        color: 'var(--color-on-warning)',
        border: '1px solid var(--color-warning-border)',
      },
    },
    breached: {
      label: 'SLA Breached',
      ariaLabel: 'SLA deadline has been exceeded — statutory breach recorded',
      icon: <AlertOctagon size={12} aria-hidden="true" />,
      style: {
        backgroundColor: 'var(--color-error-bg)',
        color: 'var(--color-on-error)',
        border: '1px solid var(--color-error-border)',
      },
    },
    paused: {
      label: 'SLA Paused',
      ariaLabel: 'SLA timer clock is frozen with recorded regulatory justification',
      icon: <PauseCircle size={12} aria-hidden="true" />,
      style: {
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #cbd5e1',
      },
    },
    completed: {
      label: 'SLA Met',
      ariaLabel: 'Stage completed within statutory target timeframe',
      icon: <CheckCircle2 size={12} aria-hidden="true" />,
      style: {
        backgroundColor: 'var(--color-success-bg)',
        color: 'var(--color-on-success)',
        border: '1px solid var(--color-success-border)',
      },
    },
    cancelled: {
      label: 'SLA Inactive',
      ariaLabel: 'SLA timer cancelled due to application status withdrawal or termination',
      icon: <XCircle size={12} aria-hidden="true" />,
      style: {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: '1px solid #e2e8f0',
      },
    },
  }[effectiveState];

  return (
    <span
      className={`badge ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.4,
        ...badgeConfig.style,
      }}
      aria-label={badgeConfig.ariaLabel}
      role="status"
    >
      {showIcon && badgeConfig.icon}
      <span>{badgeConfig.label}</span>
    </span>
  );
}
