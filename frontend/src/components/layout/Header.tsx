import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, User, Sparkles } from 'lucide-react';
import { SimulatedDataBadge } from '../ui/Badge';

export interface HeaderProps {
  onToggleMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function Header({
  onToggleMobileNav,
  isMobileNavOpen,
}: HeaderProps): React.ReactElement {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          className="header-mobile-toggle"
          onClick={onToggleMobileNav}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileNavOpen}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <Link to="/" className="header-brand" aria-label="ApprovalSync Home">
          <div className="header-logo-icon" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div className="header-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="header-title">ApprovalSync</span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Prototype
              </span>
            </div>
            <span className="header-subtitle">
              AICTE Regulatory Compliance &amp; Verification
            </span>
          </div>
        </Link>
      </div>

      <div className="header-actions">
        {/* Simulated data notice badge */}
        <SimulatedDataBadge />

        {/* Institution / Role pill */}
        <div className="header-user-pill">
          <User size={14} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
          <span>Demo Institution</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Applicant / Reviewer</span>
        </div>

        <div
          title="AI-Powered Decision Support active"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: 'var(--color-secondary)',
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span style={{ display: 'none' }}>Decision Support</span>
        </div>
      </div>
    </header>
  );
}
