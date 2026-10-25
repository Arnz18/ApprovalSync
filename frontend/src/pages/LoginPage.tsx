/**
 * ApprovalSync — Institutional Login Page
 * Milestone: FE-02
 *
 * Implements accessible, responsive institutional login adhering to
 * Swiss Minimalism design system and BE-03 Auth API contracts.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Info } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getDefaultRouteForRole, getSafeReturnUrl } from '../auth/roleRoutes';
import { ApiClientError } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Synthetic development credentials defined in backend seed.data.ts
const DEV_DEMO_CREDENTIALS = {
  email: 'demo.institution@synthetic.approvalsync.local',
  password: 'DemoPass@123',
  role: 'INSTITUTION_USER',
};

export function LoginPage(): React.ReactElement {
  const { login, isAuthenticated, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine return target from router location state
  const rawFrom = (location.state as { from?: { pathname?: string } | string } | null)?.from;
  const returnPath = getSafeReturnUrl(
    typeof rawFrom === 'string' ? rawFrom : rawFrom?.pathname,
  );

  // If already authenticated and not initializing, redirect to return path or default landing
  if (isAuthenticated && status === 'AUTHENTICATED') {
    return <Navigate to={returnPath !== '/' ? returnPath : '/'} replace />;
  }

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Official email address is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Target path: safe return url or role's primary landing workspace
      const targetDestination =
        returnPath !== '/' ? returnPath : getDefaultRouteForRole(authUser.role);

      navigate(targetDestination, { replace: true });
    } catch (err) {
      const error = err as ApiClientError;
      if (error.statusCode === 401) {
        // Uniform rejection message — avoids account enumeration
        setFormError('Invalid email or password.');
      } else if (error.isNetworkError || error.statusCode === 0 || error.statusCode === 408) {
        setFormError(
          'Unable to connect to the authentication service. Please verify the backend is running.',
        );
      } else {
        setFormError(
          error.message || 'An unexpected authentication error occurred. Please try again.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoCredentials = () => {
    setEmail(DEV_DEMO_CREDENTIALS.email);
    setPassword(DEV_DEMO_CREDENTIALS.password);
    setErrors({});
    setFormError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem 1rem',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Branding & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              marginBottom: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
            aria-hidden="true"
          >
            <ShieldCheck size={28} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
              }}
            >
              ApprovalSync
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Prototype
            </span>
          </div>

          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem',
              marginBottom: 0,
            }}
          >
            AICTE Regulatory Compliance &amp; Verification Portal
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                margin: 0,
              }}
            >
              Institutional Sign In
            </h1>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.25rem',
                marginBottom: 0,
              }}
            >
              Enter your official credentials to access your designated workspace.
            </p>
          </CardHeader>

          <CardContent>
            {/* Top Error Alert */}
            {formError && (
              <div style={{ marginBottom: '1.25rem' }}>
                <Alert variant="error" title="Authentication Failed">
                  <span>{formError}</span>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email Address */}
              <FormField
                label="Official Email Address"
                id="login-email"
                error={errors.email}
                required
              >
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-invalid={!!errors.email}
                  placeholder="representative@institution.ac.in"
                  className="input-text"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: errors.email
                      ? '1px solid var(--color-danger)'
                      : '1px solid var(--color-border)',
                    outline: 'none',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                  }}
                />
              </FormField>

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <FormField
                  label="Password"
                  id="login-password"
                  error={errors.password}
                  required
                >
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    placeholder="Enter your password"
                    className="input-text"
                    style={{
                      width: '100%',
                      padding: '0.625rem 2.5rem 0.625rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: errors.password
                        ? '1px solid var(--color-danger)'
                        : '1px solid var(--color-border)',
                      outline: 'none',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-main)',
                    }}
                  />
                </FormField>

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '2.1rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Submit Action */}
              <div style={{ marginTop: '1.25rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  style={{
                    justifyContent: 'center',
                    padding: '0.6875rem 1rem',
                    fontWeight: 600,
                  }}
                  leftIcon={<Lock size={16} aria-hidden="true" />}
                >
                  {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Workspace'}
                </Button>
              </div>
            </form>

            {/* Development-Only Demo Credentials Helper */}
            {import.meta.env.DEV && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.875rem',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  <Info size={14} aria-hidden="true" />
                  <span>Development Mode — Synthetic Account</span>
                </div>

                <p
                  style={{
                    color: 'var(--color-text-muted)',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.4,
                  }}
                >
                  Pre-configured development seed account from <code>seed.data.ts</code>.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    backgroundColor: '#ffffff',
                    padding: '0.5rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                      demo.institution@synthetic.approvalsync.local
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>
                      Role: INSTITUTION_USER
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillDemoCredentials}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      color: 'var(--color-primary)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Use Account
                  </button>
                </div>
              </div>
            )}

            {/* Regulatory Governance Disclaimer */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Authorized personnel only. Access events are logged to the immutable SHA-256
                audit ledger. Approval authority remains sovereign with designated officers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
