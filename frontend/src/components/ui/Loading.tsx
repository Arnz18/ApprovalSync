import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function Spinner({
  size = 'md',
  label = 'Loading...',
  className = '',
}: SpinnerProps): React.ReactElement {
  const pixelSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`spinner-container ${className}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <Loader2 size={pixelSize} className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
  ...props
}: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      {...props}
    />
  );
}
