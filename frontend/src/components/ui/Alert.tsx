import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const ALERT_ICONS: Record<AlertVariant, React.ReactNode> = {
  info: <Info size={18} aria-hidden="true" />,
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  error: <AlertCircle size={18} aria-hidden="true" />,
};

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}: AlertProps): React.ReactElement {
  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={`alert alert-${variant} ${className}`.trim()}
    >
      <div className="alert-icon">{ALERT_ICONS[variant]}</div>
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="btn-ghost"
          style={{ padding: '2px', lineHeight: 1 }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
