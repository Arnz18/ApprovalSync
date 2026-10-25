import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, User, Sparkles, LogOut, LogIn } from 'lucide-react';
import { SimulatedDataBadge } from '../ui/Badge';
import { healthService } from '../../api';
import { useAuth } from '../../auth/useAuth';
import { formatRoleName } from '../../auth/roleRoutes';

export interface HeaderProps {
  onToggleMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function Header({ onToggleMobileNav, isMobileNavOpen }: HeaderProps): React.ReactElement {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'standby'>('checking');
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let isMounted = true;
    healthService
      .getHealth()
      .then((res) => {
        if (isMounted && res.data && (res.data.status === 'ok' || res.data.status === 'degraded')) {
          setApiStatus('online');
        } else if (isMounted) {
          setApiStatus('standby');
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('standby');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
            <span className="header-subtitle">AICTE Regulatory Compliance &amp; Verification</span>
          </div>
        </Link>
      </div>

      <div className="header-actions">
        {/* Backend API Status Pill */}
        <span
          className={`badge ${apiStatus === 'online' ? 'badge-success' : 'badge-default'}`}
          title={
            apiStatus === 'online'
              ? 'Backend API connected and responding normally'
              : 'Backend API is offline or standby (run npm run start:dev in backend/)'
          }
          style={{ fontSize: '0.6875rem' }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: apiStatus === 'online' ? 'var(--color-success)' : '#94a3b8',
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
          {apiStatus === 'online' ? 'API Online' : 'API Standby'}
        </span>

        {/* Simulated data notice badge */}
        <SimulatedDataBadge />

        {/* Dynamic Authenticated User Info or Sign In Action */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="header-user-pill">
              <User size={14} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
              <span title={user.email}>{user.name || user.email}</span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                {formatRoleName(user.role)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost"
              aria-label="Sign out of ApprovalSync"
              title="Sign out of ApprovalSync"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '4px 8px',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
              }}
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn btn-outline btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              padding: '3px 8px',
              textDecoration: 'none',
            }}
          >
            <LogIn size={14} aria-hidden="true" />
            <span>Sign In</span>
          </Link>
        )}

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
