/**
 * ApprovalSync — LoginPage Component & Form Validation Tests
 * Milestone: FE-02
 * Tests form rendering, accessibility, client-side validation, demo credentials,
 * pending states, and error envelopes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue, AuthUser } from '../auth/types';
import { UserRole } from '../api/types';
import { ApiClientError } from '../api/client';

function renderLoginPage(customAuthValue: Partial<AuthContextValue> = {}) {
  const defaultAuthValue: AuthContextValue = {
    user: null,
    status: 'UNAUTHENTICATED',
    isAuthenticated: false,
    isInitializing: false,
    initError: null,
    login: vi.fn(),
    logout: vi.fn(),
    retryInitialization: vi.fn(),
    ...customAuthValue,
  };

  return {
    authValue: defaultAuthValue,
    ...render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthContext.Provider value={defaultAuthValue}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/applications" element={<div>Applications Workspace</div>} />
            <Route path="/" element={<div>Default Workspace</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  };
}

describe('LoginPage Component (FE-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders institutional login branding, fields, and accessible labels', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /Institutional Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/Prototype/i)).toBeInTheDocument();
  });

  it('validates required fields inline on empty submit', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /Sign In to Workspace/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Official email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('validates email format before submitting to backend', async () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText(/Official Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const passwordInput = screen.getByLabelText(/^Password/i);
    fireEvent.change(passwordInput, { target: { value: 'SomePass123' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Workspace/i }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('toggles password visibility between text and password types', () => {
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('fills synthetic development credentials on click', () => {
    renderLoginPage();

    const fillBtn = screen.getByRole('button', { name: /Use Account/i });
    fireEvent.click(fillBtn);

    const emailInput = screen.getByLabelText(/Official Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);

    expect(emailInput).toHaveValue('demo.institution@synthetic.approvalsync.local');
    expect(passwordInput).toHaveValue('DemoPass@123');
  });

  it('submits valid credentials and triggers login action', async () => {
    const mockUser: AuthUser = {
      id: 'inst-1',
      email: 'demo.institution@synthetic.approvalsync.local',
      name: 'Demo Rep',
      role: UserRole.INSTITUTION_USER,
      isActive: true,
      createdAt: '2026-10-25T00:00:00.000Z',
    };

    const mockLogin = vi.fn().mockResolvedValue(mockUser);
    renderLoginPage({ login: mockLogin });

    fireEvent.click(screen.getByRole('button', { name: /Use Account/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Workspace/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'demo.institution@synthetic.approvalsync.local',
        password: 'DemoPass@123',
      });
    });
  });

  it('displays generic invalid credential error message on 401 rejection', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiClientError({
        message: 'Invalid email or password.',
        statusCode: 401,
        code: 'ERR_UNAUTHORIZED',
      }),
    );

    renderLoginPage({ login: mockLogin });

    fireEvent.change(screen.getByLabelText(/Official Email Address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'WrongPass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Workspace/i }));

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });

  it('displays network failure banner when backend is unreachable', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiClientError({
        message: 'Network connection failed',
        statusCode: 0,
        code: 'ERR_NETWORK',
        isNetworkError: true,
      }),
    );

    renderLoginPage({ login: mockLogin });

    fireEvent.click(screen.getByRole('button', { name: /Use Account/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Workspace/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to connect to the authentication service/i),
      ).toBeInTheDocument();
    });
  });
});
