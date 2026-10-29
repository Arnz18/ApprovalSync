/**
 * ApprovalSync — Role Navigation & RBAC Presentation Tests
 * Milestone: FE-02
 * Tests role permissions matrix, safe return URLs, Sidebar filtering by role,
 * and Header user identity & logout action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue, AuthUser } from '../auth/types';
import {
  canRoleAccessRoute,
  getSafeReturnUrl,
  getDefaultRouteForRole,
  formatRoleName,
} from '../auth/roleRoutes';
import { UserRole } from '../api/types';

describe('Role Permissions & Safe Navigation Helpers (FE-02)', () => {
  it('enforces RBAC route clearance per backend UserRole enum', () => {
    // INSTITUTION_USER
    expect(canRoleAccessRoute(UserRole.INSTITUTION_USER, '/applications')).toBe(true);
    expect(canRoleAccessRoute(UserRole.INSTITUTION_USER, '/')).toBe(true);
    expect(canRoleAccessRoute(UserRole.INSTITUTION_USER, '/dossier')).toBe(true);
    expect(canRoleAccessRoute(UserRole.INSTITUTION_USER, '/scrutiny')).toBe(false);
    expect(canRoleAccessRoute(UserRole.INSTITUTION_USER, '/audit')).toBe(false);

    // SCRUTINY_OFFICER
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/scrutiny')).toBe(true);
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/dossier')).toBe(true);
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/verification')).toBe(true);
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/rules')).toBe(true);
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/audit')).toBe(false);
    expect(canRoleAccessRoute(UserRole.SCRUTINY_OFFICER, '/applications')).toBe(false);

    // AUDITOR
    expect(canRoleAccessRoute(UserRole.AUDITOR, '/audit')).toBe(true);
    expect(canRoleAccessRoute(UserRole.AUDITOR, '/rules')).toBe(true);
    expect(canRoleAccessRoute(UserRole.AUDITOR, '/applications')).toBe(false);

    // SYSTEM_ADMIN has access to all operational review workspaces (applications intake is restricted to institutions)
    expect(canRoleAccessRoute(UserRole.SYSTEM_ADMIN, '/applications')).toBe(false);
    expect(canRoleAccessRoute(UserRole.SYSTEM_ADMIN, '/scrutiny')).toBe(true);
    expect(canRoleAccessRoute(UserRole.SYSTEM_ADMIN, '/audit')).toBe(true);

    // Unknown or undefined role fails closed
    expect(canRoleAccessRoute(undefined, '/applications')).toBe(false);
    expect(canRoleAccessRoute(null, '/applications')).toBe(false);
    expect(canRoleAccessRoute('FAKE_ROLE' as UserRole, '/applications')).toBe(false);
  });

  it('sanitizes return URLs to prevent open-redirect vulnerabilities', () => {
    // Valid relative internal paths
    expect(getSafeReturnUrl('/applications')).toBe('/applications');
    expect(getSafeReturnUrl('/scrutiny')).toBe('/scrutiny');

    // Reject /login loop
    expect(getSafeReturnUrl('/login')).toBe('/');

    // Reject external protocols and protocol-relative URLs
    expect(getSafeReturnUrl('https://malicious.site/phish')).toBe('/');
    expect(getSafeReturnUrl('http://evil.com')).toBe('/');
    expect(getSafeReturnUrl('//attacker.com/evil')).toBe('/');
    expect(getSafeReturnUrl('\\\\attacker.com\\share')).toBe('/');
    expect(getSafeReturnUrl('javascript:alert(1)')).toBe('/');
    expect(getSafeReturnUrl(null)).toBe('/');
    expect(getSafeReturnUrl(undefined)).toBe('/');
  });

  it('determines primary landing route and role display title per role', () => {
    expect(getDefaultRouteForRole(UserRole.INSTITUTION_USER)).toBe('/dashboard');
    expect(getDefaultRouteForRole(UserRole.SCRUTINY_OFFICER)).toBe('/scrutiny');
    expect(getDefaultRouteForRole(UserRole.REGIONAL_OFFICER)).toBe('/dashboard');
    expect(getDefaultRouteForRole(UserRole.AUDITOR)).toBe('/audit');
    expect(getDefaultRouteForRole(UserRole.EVC_INSPECTOR)).toBe('/evc');
    expect(getDefaultRouteForRole(UserRole.SYSTEM_ADMIN)).toBe('/dashboard');
    expect(getDefaultRouteForRole(UserRole.BUREAU_HEAD)).toBe('/dashboard');
    expect(getDefaultRouteForRole(UserRole.SHC_SAC_MEMBER)).toBe('/dashboard');

    expect(formatRoleName(UserRole.INSTITUTION_USER)).toBe('Institution Representative');
    expect(formatRoleName(UserRole.SCRUTINY_OFFICER)).toBe('Scrutiny Officer');
    expect(formatRoleName(UserRole.REGIONAL_OFFICER)).toBe('Regional Officer');
    expect(formatRoleName(UserRole.SYSTEM_ADMIN)).toBe('System Administrator');
    expect(formatRoleName(UserRole.AUDITOR)).toBe('Independent Auditor');
    expect(formatRoleName(UserRole.EVC_INSPECTOR)).toBe('EVC Inspector');
    expect(formatRoleName(UserRole.BUREAU_HEAD)).toBe('Bureau Head');
    expect(formatRoleName(UserRole.SHC_SAC_MEMBER)).toBe('SHC / SAC Member');
  });
});

describe('Sidebar Role-Aware Filtering (FE-02)', () => {
  it('filters navigation links to only show permitted routes for INSTITUTION_USER', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar role={UserRole.INSTITUTION_USER} />
      </MemoryRouter>,
    );

    // Allowed
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('Application Intake')).toBeInTheDocument();
    expect(screen.getByText('Platform Settings')).toBeInTheDocument();

    // Restricted — must NOT be visible
    expect(screen.queryByText('Scrutiny Queue')).not.toBeInTheDocument();
    expect(screen.queryByText('EVC Ground Inspection')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Ledger & Proofs')).not.toBeInTheDocument();
  });

  it('filters navigation links to only show permitted routes for SCRUTINY_OFFICER', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar role={UserRole.SCRUTINY_OFFICER} />
      </MemoryRouter>,
    );

    // Allowed
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('Scrutiny Queue')).toBeInTheDocument();
    expect(screen.getByText('Document AI & Checks')).toBeInTheDocument();
    expect(screen.getByText('APH Regulatory Rules')).toBeInTheDocument();

    // Restricted
    expect(screen.queryByText('Application Intake')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Ledger & Proofs')).not.toBeInTheDocument();
  });
});

describe('Header User Identity & Logout Action (FE-02)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { status: 'ok' } }),
    } as unknown as Response);
  });

  it('renders authenticated user name, formatted role, and triggers logout', async () => {
    const mockUser: AuthUser = {
      id: 'officer-1',
      email: 'scrutiny.lead@synthetic.approvalsync.local',
      name: 'Dr. Jane Scrutiny',
      role: UserRole.SCRUTINY_OFFICER,
      isActive: true,
      createdAt: '2026-10-25T00:00:00.000Z',
    };

    const mockLogout = vi.fn();

    const authContextValue: AuthContextValue = {
      user: mockUser,
      status: 'AUTHENTICATED',
      isAuthenticated: true,
      isInitializing: false,
      initError: null,
      login: vi.fn(),
      logout: mockLogout,
      retryInitialization: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <Header onToggleMobileNav={vi.fn()} isMobileNavOpen={false} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dr. Jane Scrutiny')).toBeInTheDocument();
    expect(screen.getByText('Scrutiny Officer')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /Sign out/i });
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });

  it('renders Sign In button when user is unauthenticated', async () => {
    const authContextValue: AuthContextValue = {
      user: null,
      status: 'UNAUTHENTICATED',
      isAuthenticated: false,
      isInitializing: false,
      initError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retryInitialization: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <Header onToggleMobileNav={vi.fn()} isMobileNavOpen={false} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Sign In/i })).toHaveAttribute('href', '/login');

    await waitFor(() => {
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });
  });
});
