/**
 * AICTE Workflow & Compliance Portal — Role-Specific Institutional Login
 * Regulation Bureau • Integrated Approval Workflow Automation
 *
 * Implements accessible, role-specific portal selection with distinct
 * credentials, role descriptions, and designated post-login routing.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Building,
  ClipboardCheck,
  MapPin,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getDefaultRouteForRole, getSafeReturnUrl } from '../auth/roleRoutes';
import { ApiClientError } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Alert } from '../components/ui/Alert';
import { UserRole } from '../api/types';
import { NiyamSetuLogo } from '../components/layout/NiyamSetuLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_PASSWORD = 'DemoPass@123';

interface PortalOption {
  role: UserRole;
  portalName: string;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  icon: React.ReactNode;
  email: string;
  description: string;
  landingPath: string;
  landingLabel: string;
}

const PORTALS: PortalOption[] = [
  {
    role: UserRole.INSTITUTION_USER,
    portalName: 'Technical Institution Portal',
    badgeLabel: 'Applicant & Institution',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    borderColor: '#3b82f6',
    icon: <Building size={20} />,
    email: 'demo.institution@synthetic.approvalsync.local',
    description: 'Application drafting, deficiency response & compliance undertakings',
    landingPath: '/dashboard',
    landingLabel: 'Institutional Dashboard & Applications',
  },
  {
    role: UserRole.SCRUTINY_OFFICER,
    portalName: 'Scrutiny Officer Desk',
    badgeLabel: 'Regulatory Scrutiny',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    borderColor: '#f59e0b',
    icon: <ClipboardCheck size={20} />,
    email: 'demo.scrutiny@synthetic.approvalsync.local',
    description: 'Application review, checklist verification & deficiency issuance',
    landingPath: '/scrutiny',
    landingLabel: 'Scrutiny Queue & Review Worklist',
  },
  {
    role: UserRole.REGIONAL_OFFICER,
    portalName: 'Regional Bureau Portal',
    badgeLabel: 'Regional Operations',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    borderColor: '#10b981',
    icon: <MapPin size={20} />,
    email: 'demo.regional@synthetic.approvalsync.local',
    description: 'Regional workload, EVC inspection scheduling & SLA escalation tracking',
    landingPath: '/dashboard',
    landingLabel: 'Regional Operations & EVC Scheduling',
  },
  {
    role: UserRole.SYSTEM_ADMIN,
    portalName: 'Administrative Console',
    badgeLabel: 'Governance & Admin',
    badgeBg: '#f5f3ff',
    badgeColor: '#6d28d9',
    borderColor: '#8b5cf6',
    icon: <ShieldAlert size={20} />,
    email: 'demo.admin@synthetic.approvalsync.local',
    description: 'Global stage pendency, SLA policy configuration & audit ledger',
    landingPath: '/dashboard',
    landingLabel: 'Administration Control Center & Audit',
  },
];

export function LoginPage(): React.ReactElement {
  const { login, isAuthenticated, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Selected portal tab (defaults to Technical Institution)
  const [selectedPortal, setSelectedPortal] = useState<PortalOption>(PORTALS[0]);
  const [email, setEmail] = useState<string>(PORTALS[0].email);
  const [password, setPassword] = useState<string>(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine return target from router location state
  const rawFrom = (location.state as { from?: { pathname?: string } | string } | null)?.from;
  const returnPath = getSafeReturnUrl(typeof rawFrom === 'string' ? rawFrom : rawFrom?.pathname);

  // If already authenticated and not initializing, redirect to return path or default landing
  if (isAuthenticated && status === 'AUTHENTICATED') {
    return <Navigate to={returnPath !== '/' ? returnPath : '/dashboard'} replace />;
  }

  const handleSelectPortal = (portal: PortalOption) => {
    setSelectedPortal(portal);
    setEmail(portal.email);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setFormError(null);
  };

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

      // Target path: safe return url if user specifically requested a sub-path, else role-designated route
      const targetDestination =
        returnPath !== '/' ? returnPath : getDefaultRouteForRole(authUser.role);

      navigate(targetDestination, { replace: true });
    } catch (err) {
      const error = err as ApiClientError;
      if (error.statusCode === 401) {
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1rem',
        backgroundColor: 'var(--color-bg, #f8fafc)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '820px' }}>
        {/* Portal Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.875rem',
            }}
            aria-hidden="true"
          >
            <NiyamSetuLogo size={44} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-text-main, #0f172a)',
                letterSpacing: '-0.025em',
                margin: 0,
              }}
            >
              NiyamSetu
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #bfdbfe',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Regulation Bureau
            </span>
          </div>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted, #64748b)',
              marginTop: '0.375rem',
              marginBottom: 0,
            }}
          >
            Approval &amp; Compliance Management System • AICTE Regulation Bureau
          </p>
        </div>

        {/* 4-Portal Selector Cards Grid */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-text-main, #0f172a)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Select Stakeholder Portal:
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted, #64748b)',
              }}
            >
              Click a role card to pre-fill credentials &amp; destination
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {PORTALS.map((portal) => {
              const isSelected = selectedPortal.role === portal.role;
              return (
                <button
                  key={portal.role}
                  type="button"
                  onClick={() => handleSelectPortal(portal)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '0.875rem',
                    backgroundColor: isSelected ? '#ffffff' : 'var(--color-surface, #ffffff)',
                    border: isSelected
                      ? `2px solid ${portal.borderColor}`
                      : '1px solid var(--color-border, #e2e8f0)',
                    borderRadius: 'var(--radius-lg, 10px)',
                    boxShadow: isSelected
                      ? '0 4px 12px -2px rgba(0, 0, 0, 0.08)'
                      : '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.625rem',
                        right: '0.625rem',
                        color: portal.borderColor,
                      }}
                      title="Selected portal"
                    >
                      <CheckCircle2 size={16} />
                    </div>
                  )}

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: portal.badgeBg,
                      color: portal.badgeColor,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {portal.icon}
                  </div>

                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--color-text-main, #0f172a)',
                      lineHeight: 1.25,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {portal.portalName}
                  </span>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      backgroundColor: portal.badgeBg,
                      color: portal.badgeColor,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      marginBottom: '0.375rem',
                    }}
                  >
                    {portal.badgeLabel}
                  </span>

                  <p
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted, #64748b)',
                      margin: 0,
                      lineHeight: 1.35,
                    }}
                  >
                    {portal.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form Container */}
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Card>
            <CardHeader style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main, #0f172a)',
                    margin: 0,
                  }}
                >
                  Sign in to {selectedPortal.portalName}
                </h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: selectedPortal.badgeColor,
                    backgroundColor: selectedPortal.badgeBg,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {selectedPortal.badgeLabel}
                </span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted, #64748b)',
                  marginTop: '0.25rem',
                  marginBottom: 0,
                }}
              >
                Lands on: <strong>{selectedPortal.landingLabel}</strong> (
                {selectedPortal.landingPath})
              </p>
            </CardHeader>

            <CardContent style={{ padding: '1.25rem 1.5rem' }}>
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
                  label="Official Account Email"
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
                    placeholder="user@synthetic.approvalsync.local"
                    className="input-text"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: errors.email
                        ? '1px solid var(--color-danger, #ef4444)'
                        : '1px solid var(--color-border, #cbd5e1)',
                      outline: 'none',
                      backgroundColor: 'var(--color-surface, #ffffff)',
                      color: 'var(--color-text-main, #0f172a)',
                      boxSizing: 'border-box',
                    }}
                  />
                </FormField>

                {/* Password */}
                <div style={{ position: 'relative', marginTop: '1rem' }}>
                  <FormField label="Password" id="login-password" error={errors.password} required>
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
                        borderRadius: 'var(--radius-md, 6px)',
                        border: errors.password
                          ? '1px solid var(--color-danger, #ef4444)'
                          : '1px solid var(--color-border, #cbd5e1)',
                        outline: 'none',
                        backgroundColor: 'var(--color-surface, #ffffff)',
                        color: 'var(--color-text-main, #0f172a)',
                        boxSizing: 'border-box',
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
                      color: 'var(--color-text-muted, #64748b)',
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
                <div style={{ marginTop: '1.5rem' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    style={{
                      justifyContent: 'center',
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                    leftIcon={<Lock size={16} aria-hidden="true" />}
                    rightIcon={<ArrowRight size={16} aria-hidden="true" />}
                  >
                    {isSubmitting ? 'Authenticating...' : `Enter ${selectedPortal.portalName}`}
                  </Button>
                </div>
              </form>

              {/* Instant Fill Demo Notice */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem 0.875rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md, 6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Sparkles size={14} style={{ color: '#2563eb' }} />
                  <span style={{ color: '#334155' }}>
                    Demo Credentials: <strong>{selectedPortal.email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(selectedPortal.email);
                    setPassword(DEMO_PASSWORD);
                    setErrors({});
                  }}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reload Demo Defaults
                </button>
              </div>

              {/* Regulatory Governance Disclaimer */}
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-border, #e2e8f0)',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted, #64748b)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Authorized institutional personnel only. Access events are audited and verified
                  under AICTE Approval Process Handbook (APH) governance standards.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
