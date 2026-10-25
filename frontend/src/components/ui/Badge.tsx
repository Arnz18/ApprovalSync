import React from 'react';
import {
  FileEdit,
  Send,
  Eye,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  MapPin,
  Scale,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  HelpCircle,
  AlertOctagon,
  Check,
  Info,
} from 'lucide-react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'mock';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  icon,
  className = '',
  children,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// Domain Specific Badges (Enforcing ADR-002, ADR-004 and Shared Contracts)
// -----------------------------------------------------------------------------

export function SimulatedDataBadge({
  label = 'SIMULATED / MOCK DATA',
  className = '',
}: {
  label?: string;
  className?: string;
}): React.ReactElement {
  return (
    <Badge
      variant="mock"
      icon={<ShieldAlert size={12} />}
      className={className}
      title="This record is synthetic and generated for demonstration purposes only. Not an official AICTE live record."
    >
      {label}
    </Badge>
  );
}

export type ApplicationStatusType =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'DEFICIENCY_ISSUED'
  | 'RESUBMITTED'
  | 'RECOMMENDED_FOR_EVC'
  | 'EVC_IN_PROGRESS'
  | 'RECOMMENDED_FOR_SHC'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

const STATUS_CONFIG: Record<
  ApplicationStatusType,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  DRAFT: { label: 'Draft', variant: 'default', icon: <FileEdit size={12} /> },
  SUBMITTED: { label: 'Submitted', variant: 'info', icon: <Send size={12} /> },
  UNDER_SCRUTINY: { label: 'Under Scrutiny', variant: 'primary', icon: <Eye size={12} /> },
  DEFICIENCY_ISSUED: { label: 'Deficiency Issued', variant: 'warning', icon: <AlertTriangle size={12} /> },
  RESUBMITTED: { label: 'Resubmitted', variant: 'info', icon: <RefreshCw size={12} /> },
  RECOMMENDED_FOR_EVC: { label: 'Recommended for EVC', variant: 'primary', icon: <UserCheck size={12} /> },
  EVC_IN_PROGRESS: { label: 'EVC In Progress', variant: 'info', icon: <MapPin size={12} /> },
  RECOMMENDED_FOR_SHC: { label: 'Recommended for SHC', variant: 'warning', icon: <Scale size={12} /> },
  APPROVED: { label: 'Approved', variant: 'success', icon: <CheckCircle2 size={12} /> },
  REJECTED: { label: 'Rejected', variant: 'error', icon: <XCircle size={12} /> },
  WITHDRAWN: { label: 'Withdrawn', variant: 'default', icon: <Ban size={12} /> },
};

export function ApplicationStatusBadge({
  status,
  className = '',
}: {
  status: ApplicationStatusType | string;
  className?: string;
}): React.ReactElement {
  const config = STATUS_CONFIG[status as ApplicationStatusType] || {
    label: status.replace(/_/g, ' '),
    variant: 'default',
    icon: null,
  };

  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}

export type VerificationStatusType =
  | 'VERIFIED_MOCK'
  | 'INVALID_SIGNATURE'
  | 'UNTRUSTED_ISSUER'
  | 'SOURCE_UNAVAILABLE'
  | 'MANUAL_REVIEW_REQUIRED';

const VERIFICATION_CONFIG: Record<
  VerificationStatusType,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  VERIFIED_MOCK: { label: 'Verified (Mock Adapter)', variant: 'success', icon: <ShieldCheck size={12} /> },
  INVALID_SIGNATURE: { label: 'Invalid Signature', variant: 'error', icon: <ShieldAlert size={12} /> },
  UNTRUSTED_ISSUER: { label: 'Untrusted Issuer', variant: 'warning', icon: <ShieldX size={12} /> },
  SOURCE_UNAVAILABLE: { label: 'Source Unavailable', variant: 'warning', icon: <HelpCircle size={12} /> },
  MANUAL_REVIEW_REQUIRED: { label: 'Manual Review Required', variant: 'warning', icon: <Eye size={12} /> },
};

export function VerificationStatusBadge({
  status,
  className = '',
}: {
  status: VerificationStatusType | string;
  className?: string;
}): React.ReactElement {
  const config = VERIFICATION_CONFIG[status as VerificationStatusType] || {
    label: status.replace(/_/g, ' '),
    variant: 'default',
    icon: null,
  };

  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}

export type ComplianceSeverityType =
  | 'CRITICAL_DEFICIENCY'
  | 'ADVISORY_FLAG'
  | 'COMPLIANT'
  | 'UNVERIFIED_POLICY';

const SEVERITY_CONFIG: Record<
  ComplianceSeverityType,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  CRITICAL_DEFICIENCY: { label: 'Critical Deficiency', variant: 'error', icon: <AlertOctagon size={12} /> },
  ADVISORY_FLAG: { label: 'Advisory Flag (AI)', variant: 'warning', icon: <AlertTriangle size={12} /> },
  COMPLIANT: { label: 'Compliant', variant: 'success', icon: <Check size={12} /> },
  UNVERIFIED_POLICY: { label: 'Demo Policy', variant: 'info', icon: <Info size={12} /> },
};

export function ComplianceSeverityBadge({
  severity,
  className = '',
}: {
  severity: ComplianceSeverityType | string;
  className?: string;
}): React.ReactElement {
  const config = SEVERITY_CONFIG[severity as ComplianceSeverityType] || {
    label: severity.replace(/_/g, ' '),
    variant: 'default',
    icon: null,
  };

  return (
    <Badge variant={config.variant} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  );
}
