import React from 'react';
import {
  FileEdit,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Ban,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { Badge, BadgeVariant } from '../ui/Badge';
import { UndertakingStatus, UndertakingReviewStatus } from '../../undertakings/types';
import {
  formatUndertakingStatus,
  formatUndertakingReviewStatus,
} from '../../undertakings/undertakingUtils';

export interface UndertakingStatusBadgeProps {
  status?: UndertakingStatus | string | null;
  className?: string;
}

export function UndertakingStatusBadge({
  status,
  className = '',
}: UndertakingStatusBadgeProps): React.ReactElement {
  let variant: BadgeVariant = 'default';
  let icon: React.ReactNode = <HelpCircle size={12} aria-hidden="true" />;

  switch (status) {
    case UndertakingStatus.ACTIVE:
      variant = 'success';
      icon = <CheckCircle2 size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.EXPIRING_SOON:
      variant = 'warning';
      icon = <Clock size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.RENEWAL_DUE:
      variant = 'warning';
      icon = <AlertTriangle size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.EXPIRED:
      variant = 'error';
      icon = <AlertOctagon size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.SUBMITTED:
      variant = 'primary';
      icon = <Send size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.DRAFT:
      variant = 'default';
      icon = <FileEdit size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.SUPERSEDED:
      variant = 'secondary';
      icon = <RefreshCw size={12} aria-hidden="true" />;
      break;
    case UndertakingStatus.TERMINATED:
      variant = 'error';
      icon = <Ban size={12} aria-hidden="true" />;
      break;
    default:
      variant = 'default';
      icon = <HelpCircle size={12} aria-hidden="true" />;
  }

  return (
    <Badge variant={variant} icon={icon} className={className}>
      {formatUndertakingStatus(status)}
    </Badge>
  );
}

export interface UndertakingReviewBadgeProps {
  reviewStatus?: UndertakingReviewStatus | string | null;
  className?: string;
}

export function UndertakingReviewBadge({
  reviewStatus,
  className = '',
}: UndertakingReviewBadgeProps): React.ReactElement {
  let variant: BadgeVariant = 'default';
  let icon: React.ReactNode = <Clock size={12} aria-hidden="true" />;

  switch (reviewStatus) {
    case UndertakingReviewStatus.VERIFIED:
      variant = 'success';
      icon = <FileCheck size={12} aria-hidden="true" />;
      break;
    case UndertakingReviewStatus.DEFICIENT:
      variant = 'warning';
      icon = <AlertTriangle size={12} aria-hidden="true" />;
      break;
    case UndertakingReviewStatus.REJECTED:
      variant = 'error';
      icon = <AlertOctagon size={12} aria-hidden="true" />;
      break;
    case UndertakingReviewStatus.PENDING_REVIEW:
    default:
      variant = 'default';
      icon = <Clock size={12} aria-hidden="true" />;
  }

  return (
    <Badge variant={variant} icon={icon} className={className}>
      {formatUndertakingReviewStatus(reviewStatus)}
    </Badge>
  );
}
