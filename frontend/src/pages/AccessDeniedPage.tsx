/**
 * ApprovalSync — Access Denied Page (HTTP 403 Forbidden)
 * Milestone: FE-02
 *
 * Rendered when an authenticated user lacks permission for a protected route.
 * Distinguishes unauthorized access from unauthenticated (401) sessions
 * without logging the user out.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { formatRoleName, getDefaultRouteForRole } from '../auth/roleRoutes';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { UserRole } from '../api/types';

export interface AccessDeniedPageProps {
  allowedRoles?: UserRole[];
}

export function AccessDeniedPage({ allowedRoles }: AccessDeniedPageProps): React.ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userRoleLabel = formatRoleName(user?.role);
  const defaultPath = getDefaultRouteForRole(user?.role);

  const handleReturnToWorkspace = () => {
    navigate(defaultPath, { replace: true });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '3rem auto',
        padding: '0 1rem',
      }}
    >
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fef2f2',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <ShieldAlert size={24} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--color-text-main)',
                  margin: 0,
                }}
              >
                Access Restricted
              </h1>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-danger)',
                  margin: '0.125rem 0 0 0',
                  fontWeight: 600,
                }}
              >
                HTTP 403 Forbidden — Insufficient Role Clearance
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
            You are authenticated as <strong>{user?.email || 'Authorized User'}</strong> with the
            designated role of <strong>{userRoleLabel}</strong>. However, this workflow requires a
            different regulatory clearance level.
          </p>

          {allowedRoles && allowedRoles.length > 0 && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                marginBottom: '1.25rem',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                Required Role Clearance:
              </span>
              <ul style={{ margin: '0.375rem 0 0 1.25rem', padding: 0 }}>
                {allowedRoles.map((role) => (
                  <li key={role} style={{ color: 'var(--color-text-muted)' }}>
                    {formatRoleName(role)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}
          >
            <Button
              type="button"
              variant="primary"
              onClick={handleReturnToWorkspace}
              leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
            >
              Return to Designated Workspace
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              leftIcon={<LogOut size={16} aria-hidden="true" />}
            >
              Sign Out &amp; Switch Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
