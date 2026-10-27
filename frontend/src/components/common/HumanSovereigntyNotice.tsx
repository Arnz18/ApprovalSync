import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Scale } from 'lucide-react';

interface HumanSovereigntyNoticeProps {
  title?: string;
  disclaimer?: string;
  className?: string;
}

export const HumanSovereigntyNotice: React.FC<HumanSovereigntyNoticeProps> = ({
  title = 'ADR-004 Human Sovereignty Advisory Boundary & Decision Support',
  disclaimer = 'Automated dossier verification findings, OCR extractions, and anomaly flags are strictly advisory decision support under AICTE Approval Process Handbook norms. Scrutiny officers and regional directors must review original uploaded evidence before issuing deficiency notices or transitioning application states.',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      role="region"
      aria-label="Regulatory advisory policy notice"
      className={`advisory-notice ${className}`.trim()}
      style={{
        backgroundColor: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border, #e2e8f0)',
        borderLeft: '4px solid var(--color-secondary, #2563eb)',
        borderRadius: 'var(--radius-md, 6px)',
        padding: 'var(--space-3) var(--space-4)',
        boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
        marginBottom: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck
            size={18}
            style={{ color: 'var(--color-secondary, #2563eb)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 'var(--font-size-sm, 0.875rem)',
              fontWeight: 600,
              color: 'var(--color-foreground, #0f172a)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#1e40af',
              backgroundColor: '#eff6ff',
              padding: '1px 6px',
              borderRadius: '9999px',
              border: '1px solid #bfdbfe',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Advisory Only
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="sovereignty-disclaimer-content"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-secondary, #2563eb)',
            fontSize: 'var(--font-size-xs, 0.75rem)',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm, 4px)',
          }}
        >
          <span>{isExpanded ? 'Hide Details' : 'View Regulatory Policy (ADR-004)'}</span>
          {isExpanded ? (
            <ChevronUp size={14} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} aria-hidden="true" />
          )}
        </button>
      </div>

      <p
        style={{
          fontSize: 'var(--font-size-xs, 0.75rem)',
          color: 'var(--color-muted-foreground, #64748b)',
          marginTop: '0.375rem',
          marginBottom: 0,
          lineHeight: 1.45,
        }}
      >
        Automated findings provide decision support. Statutory disposition authority remains
        sovereign with designated evaluators per AICTE norms.
      </p>

      {isExpanded && (
        <div
          id="sovereignty-disclaimer-content"
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border-subtle, #f1f5f9)',
            fontSize: 'var(--font-size-xs, 0.75rem)',
            color: 'var(--color-foreground, #334155)',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
          }}
        >
          <Scale
            size={16}
            style={{ color: 'var(--color-muted-foreground)', flexShrink: 0, marginTop: '2px' }}
            aria-hidden="true"
          />
          <div>{disclaimer}</div>
        </div>
      )}
    </div>
  );
};
