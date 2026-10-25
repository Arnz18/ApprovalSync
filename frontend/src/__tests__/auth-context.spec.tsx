/**
 * ApprovalSync — AuthContext & Session Lifecycle Tests
 * Milestone: FE-02
 * Tests initial state, session restoration via /auth/me, invalid session cleanup,
 * network recovery, and logout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../auth/AuthContext';
import { useAuth } from '../auth/useAuth';
import { setStoredToken, getStoredToken, clearStoredToken } from '../auth/sessionStorage';
import { UserRole } from '../api/types';

// Consumer component to test context hook
function TestAuthConsumer() {
  const {
    user,
    status,
    isAuthenticated,
    isInitializing,
    initError,
    login,
    logout,
    retryInitialization,
  } = useAuth();

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="is-authenticated">{isAuthenticated ? 'YES' : 'NO'}</div>
      <div data-testid="is-initializing">{isInitializing ? 'YES' : 'NO'}</div>
      <div data-testid="user-email">{user?.email || 'NONE'}</div>
      <div data-testid="user-role">{user?.role || 'NONE'}</div>
      {initError && <div data-testid="init-error">{initError.message}</div>}

      <button
        onClick={() =>
          login({
            email: 'demo.institution@synthetic.approvalsync.local',
            password: 'DemoPass@123',
          })
        }
      >
        Trigger Login
      </button>

      <button onClick={logout}>Trigger Logout</button>
      <button onClick={() => retryInitialization()}>Trigger Retry</button>
    </div>
  );
}

describe('AuthContext Session Lifecycle (FE-02)', () => {
  beforeEach(() => {
    clearStoredToken();
  });

  afterEach(() => {
    clearStoredToken();
    vi.restoreAllMocks();
  });

  it('initializes to UNAUTHENTICATED when no token exists in storage', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('NO');
      expect(screen.getByTestId('user-email').textContent).toBe('NONE');
    });
  });

  it('restores authenticated session via GET /api/v1/auth/me when token exists', async () => {
    setStoredToken('existing-session-jwt');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            id: 'u-1',
            email: 'demo.institution@synthetic.approvalsync.local',
            name: 'Demo Rep',
            role: UserRole.INSTITUTION_USER,
            isActive: true,
            createdAt: '2026-10-25T00:00:00.000Z',
          },
        }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('YES');
      expect(screen.getByTestId('user-email').textContent).toBe(
        'demo.institution@synthetic.approvalsync.local',
      );
      expect(screen.getByTestId('user-role').textContent).toBe(UserRole.INSTITUTION_USER);
    });
  });

  it('clears stored token when backend returns 401 during session bootstrap', async () => {
    setStoredToken('invalid-expired-jwt');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () =>
        JSON.stringify({
          success: false,
          error: {
            code: 'ERR_UNAUTHORIZED',
            message: 'Token expired',
            statusCode: 401,
          },
        }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('NO');
      expect(getStoredToken()).toBeNull();
    });
  });

  it('enters ERROR state without wiping token when network failure occurs during bootstrap', async () => {
    setStoredToken('valid-jwt-with-network-down');

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ERROR');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('NO');
      expect(screen.getByTestId('init-error')).toBeInTheDocument();
      // Token must NOT be cleared on transient network error
      expect(getStoredToken()).toBe('valid-jwt-with-network-down');
    });
  });

  it('successful login stores token and updates user state', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'newly-issued-jwt',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
              id: 'u-2',
              email: 'demo.institution@synthetic.approvalsync.local',
              name: 'Demo Rep',
              role: UserRole.INSTITUTION_USER,
              isActive: true,
              createdAt: '2026-10-25T00:00:00.000Z',
            },
          },
        }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
    });

    await act(async () => {
      screen.getByText('Trigger Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('YES');
      expect(getStoredToken()).toBe('newly-issued-jwt');
    });
  });

  it('logout clears stored token and resets in-memory user state', async () => {
    setStoredToken('active-token-to-logout');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            id: 'u-3',
            email: 'user@example.com',
            name: 'User 3',
            role: UserRole.SCRUTINY_OFFICER,
            isActive: true,
            createdAt: '2026-10-25T00:00:00.000Z',
          },
        }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });

    act(() => {
      screen.getByText('Trigger Logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('NO');
      expect(screen.getByTestId('user-email').textContent).toBe('NONE');
      expect(getStoredToken()).toBeNull();
    });
  });
});
