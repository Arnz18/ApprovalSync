import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, LogIn } from 'lucide-react';
import { healthService } from '../../api';
import { useAuth } from '../../auth/useAuth';
import { formatRoleName } from '../../auth/roleRoutes';
import { NotificationBell } from '../notifications/NotificationBell';
import { NiyamSetuLogo } from './NiyamSetuLogo';

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

        <Link to="/" className="header-brand" aria-label="NiyamSetu Home">
          <NiyamSetuLogo size={24} />
          <div className="header-title-group">
            <span className="header-title">NiyamSetu</span>
            <span className="header-subtitle">Approval &amp; Compliance Management System</span>
          </div>
        </Link>
      </div>

      <div className="header-actions">
        {/* Institutional Environment & API Status Indicator */}
        <div
          className="header-env-indicator"
          role="status"
          aria-label={
            apiStatus === 'online'
              ? 'Connected to live backend API. Regulation Bureau service active.'
              : 'Backend API is in standby mode.'
          }
          title={
            apiStatus === 'online'
              ? 'Backend API: Live • Regulation Bureau'
              : 'Backend API: Standby mode'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: apiStatus === 'online' ? '#f0fdf4' : 'var(--color-muted)',
            border: `1px solid ${apiStatus === 'online' ? '#bbf7d0' : 'var(--color-border)'}`,
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: apiStatus === 'online' ? '#166534' : 'var(--color-muted-foreground)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: apiStatus === 'online' ? '#16a34a' : '#94a3b8',
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
          <span>{apiStatus === 'online' ? 'API Online' : 'API Standby'}</span>
        </div>

        <span
          className="header-prototype-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.625rem',
            fontWeight: 600,
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            letterSpacing: '0.02em',
          }}
        >
          Regulation Bureau
        </span>

        {/* Live In-App Notification Center */}
        {isAuthenticated && <NotificationBell />}

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
              aria-label="Sign out of NiyamSetu"
              title="Sign out of NiyamSetu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '4px 8px',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
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
      </div>
    </header>
  );
}
