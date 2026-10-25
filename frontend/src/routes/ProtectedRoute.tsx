/**
 * ApprovalSync — Reusable Protected Route Guard
 * Milestone: FE-02
 *
 * Enforces session verification, unauthenticated redirect with safe return-path,
 * accessible loading states without content flash, and role-based access denial (403).
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { RefreshCw, LogOut, WifiOff } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { Spinner } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { UserRole } from '../api/types';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps): React.ReactElement {
  const { user, status, isAuthenticated, isInitializing, initError, retryInitialization, logout } =
    useAuth();
  const location = useLocation();

  // 1. Initializing session — prevent any flash of protected content
  if (isInitializing || status === 'INITIALIZING') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <Spinner size="lg" label="Verifying institutional session" />
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          Verifying institutional session credentials...
        </span>
      </div>
    );
  }

  // 2. Session verification network/server failure — recoverable error state
  if (status === 'ERROR' && initError) {
    return (
      <div
        style={{
          maxWidth: '520px',
          margin: '4rem auto',
          padding: '0 1rem',
        }}
      >
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fee2e2',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <WifiOff size={20} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main)',
                    margin: 0,
                  }}
                >
                  Session Verification Interrupted
                </h1>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    margin: '0.125rem 0 0 0',
                  }}
                >
                  Backend service connection failed
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: '1rem',
              }}
            >
              {initError.message}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1.25rem',
              }}
            >
              <Button
                type="button"
                variant="primary"
                onClick={() => retryInitialization()}
                leftIcon={<RefreshCw size={15} aria-hidden="true" />}
              >
                Retry Connection
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => logout()}
                leftIcon={<LogOut size={15} aria-hidden="true" />}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Unauthenticated — redirect to /login preserving return path in router state
  if (!isAuthenticated || status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Role Authorization check (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return <AccessDeniedPage allowedRoles={allowedRoles} />;
    }
  }

  // 5. Authorized — render protected routes
  return <>{children || <Outlet />}</>;
}
