/**
 * ApprovalSync — SLA Timing & Metrics Utility Helpers
 * Milestone: FE-05
 *
 * Provides timezone-safe date arithmetic, relative countdown formatting,
 * SLA urgency derivations, and application aging bucket calculations.
 */

import { SlaTimerProjection, SlaTimerStatus, UserRole, SlaTier, SlaEscalationLevel } from './types';

export interface RemainingTimeResult {
  label: string;
  isPast: boolean;
  diffMs: number;
  formattedTarget: string;
}

/**
 * Converts a millisecond duration into a concise, human-readable string.
 * Example: 90000000ms -> "1d 1h" or "45m"
 */
export function formatSlaDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (days > 0) {
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${days}d`;
  }
  if (totalHours > 0) {
    if (remainingMinutes > 0) {
      return `${totalHours}h ${remainingMinutes}m`;
    }
    return `${totalHours}h`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }
  return '< 1m';
}

/**
 * Calculates remaining or overdue time relative to a deadline.
 * Gracefully handles invalid dates and provides exact UTC representation.
 */
export function formatRemainingTime(
  targetDeadline: string,
  now: Date = new Date(),
): RemainingTimeResult {
  const targetDate = new Date(targetDeadline);
  if (isNaN(targetDate.getTime())) {
    return {
      label: 'Invalid deadline',
      isPast: false,
      diffMs: 0,
      formattedTarget: 'Unknown',
    };
  }

  const diffMs = targetDate.getTime() - now.getTime();
  const formattedTarget = targetDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  if (diffMs <= 0) {
    const overdueDuration = formatSlaDuration(Math.abs(diffMs));
    return {
      label: `Overdue by ${overdueDuration}`,
      isPast: true,
      diffMs: Math.abs(diffMs),
      formattedTarget,
    };
  }

  const remainingDuration = formatSlaDuration(diffMs);
  return {
    label: `${remainingDuration} remaining`,
    isPast: false,
    diffMs,
    formattedTarget,
  };
}

export type SlaUrgency = 'breached' | 'warning' | 'paused' | 'completed' | 'cancelled' | 'normal';

/**
 * Derives visual and operational urgency for an SLA timer based on authoritative backend records.
 */
export function getSlaTimerUrgency(timer: SlaTimerProjection, now: Date = new Date()): SlaUrgency {
  if (timer.status === SlaTimerStatus.PAUSED) {
    return 'paused';
  }
  if (timer.status === SlaTimerStatus.COMPLETED) {
    return 'completed';
  }
  if (timer.status === SlaTimerStatus.CANCELLED) {
    return 'cancelled';
  }

  // Check breach criteria
  const targetTime = new Date(timer.targetDeadline).getTime();
  if (
    timer.status === SlaTimerStatus.BREACHED ||
    timer.isBreached ||
    (!isNaN(targetTime) && now.getTime() >= targetTime)
  ) {
    return 'breached';
  }

  // Check warning threshold
  const warningTime = timer.warningDeadline ? new Date(timer.warningDeadline).getTime() : null;
  if (
    timer.isWarningSent ||
    (warningTime !== null && !isNaN(warningTime) && now.getTime() >= warningTime)
  ) {
    return 'warning';
  }

  return 'normal';
}

/**
 * Calculates application age in elapsed calendar days from creation timestamp.
 */
export function calculateApplicationAgeDays(createdAt: string, now: Date = new Date()): number {
  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) return 0;
  const elapsedMs = now.getTime() - createdDate.getTime();
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
}

export type AgeBucket = '0-7 days' | '8-15 days' | '16-30 days' | '30+ days';

/**
 * Groups application age into standard regulatory reporting buckets.
 */
export function categorizeAgeBucket(ageDays: number): AgeBucket {
  if (ageDays <= 7) return '0-7 days';
  if (ageDays <= 15) return '8-15 days';
  if (ageDays <= 30) return '16-30 days';
  return '30+ days';
}

/**
 * Formats an ISO string into an accessible, human-readable date/time representation.
 */
export function formatIsoDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Authoritative list of roles permitted to pause or resume SLA timers.
 * Matches backend assertCanManageTimers (sla.service.ts) and controller guards (sla.controller.ts).
 */
export const SLA_TIMER_MANAGEMENT_ROLES: readonly UserRole[] = [
  UserRole.SCRUTINY_OFFICER,
  UserRole.REGIONAL_OFFICER,
  UserRole.BUREAU_HEAD,
  UserRole.SYSTEM_ADMIN,
] as const;

/**
 * Checks whether the given user role is authorized to pause or resume SLA clocks.
 */
export function isTimerManagementAuthorized(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return SLA_TIMER_MANAGEMENT_ROLES.includes(role as UserRole);
}

/**
 * Formats an SLA escalation tier into an accessible, human-readable display string.
 * Gracefully handles frozen backend SlaTier enums, alternative labels, and unknown future values.
 */
export function formatSlaTier(tier?: SlaTier | string | null): string {
  if (!tier) return 'Standard';
  switch (tier) {
    case SlaTier.TIER_1_RO_ALERT:
    case 'TIER_1_SCRUTINY_OFFICER':
      return 'Tier 1 (RO Alert)';
    case SlaTier.TIER_2_DIRECTOR_BREACH:
    case 'TIER_2_REGIONAL_OFFICER':
      return 'Tier 2 (Director Breach)';
    case SlaTier.TIER_3_COUNCIL_LOCK:
    case 'TIER_3_BUREAU_HEAD':
      return 'Tier 3 (Council Lock)';
    default:
      return String(tier)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Formats an SLA escalation level into an accessible display string.
 * Gracefully handles known and unknown level values.
 */
export function formatEscalationLevel(level?: SlaEscalationLevel | string | null): string {
  if (!level) return 'Notice';
  switch (level) {
    case SlaEscalationLevel.WARNING:
      return 'Warning';
    case SlaEscalationLevel.BREACH:
      return 'Breach';
    case SlaEscalationLevel.SEVERE_BREACH:
      return 'Severe Breach';
    default:
      return String(level)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Derives visual severity for an escalation event.
 */
export function getEscalationSeverity(
  level?: SlaEscalationLevel | string | null,
): 'breach' | 'warning' | 'info' {
  if (!level) return 'info';
  if (level === SlaEscalationLevel.BREACH || level === SlaEscalationLevel.SEVERE_BREACH) {
    return 'breach';
  }
  if (level === SlaEscalationLevel.WARNING) {
    return 'warning';
  }
  return 'info';
}
