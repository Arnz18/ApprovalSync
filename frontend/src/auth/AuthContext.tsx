/**
 * ApprovalSync — Authentication Context & Session Provider
 * Milestone: FE-02
 *
 * Centralizes authentication state, session bootstrap via GET /api/v1/auth/me,
 * login, and logout lifecycle.
 */

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContextValue, AuthInitError, AuthStatus, AuthUser, LoginCredentials } from './types';
import { authService } from '../api/services/authService';
import { ApiClientError } from '../api/client';
import { clearStoredToken, getStoredToken, setStoredToken } from './sessionStorage';

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('INITIALIZING');
  const [initError, setInitError] = useState<AuthInitError | null>(null);

  /**
   * Session verification on mount / bootstrap
   */
  const initializeSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStatus('UNAUTHENTICATED');
      setInitError(null);
      return;
    }

    setStatus('INITIALIZING');
    setInitError(null);

    try {
      const authUser = await authService.getMe(token);
      setUser(authUser);
      setStatus('AUTHENTICATED');
    } catch (err) {
      const error = err as ApiClientError;

      // Definitive authentication failure (401 Unauthorized / 403 Forbidden / invalid token)
      if (error.statusCode === 401 || error.statusCode === 403) {
        clearStoredToken();
        setUser(null);
        setStatus('UNAUTHENTICATED');
        setInitError(null);
      } else {
        // Network failure, backend unavailable, or timeout
        // DO NOT wipe the token prematurely, but DO NOT grant access
        setStatus('ERROR');
        setInitError({
          message:
            error.message ||
            'Unable to reach ApprovalSync authentication service. Please verify server connectivity.',
          statusCode: error.statusCode,
          isNetworkError: !!error.isNetworkError,
          correlationId: error.correlationId,
        });
      }
    }
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  /**
   * Authenticate with email & password against POST /api/v1/auth/login
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    setStatus('AUTHENTICATING');
    setInitError(null);

    try {
      const response = await authService.login(credentials);
      setStoredToken(response.accessToken);
      setUser(response.user);
      setStatus('AUTHENTICATED');
      return response.user;
    } catch (err) {
      setStatus('UNAUTHENTICATED');
      throw err;
    }
  }, []);

  /**
   * Log out of current session: clears stored token and in-memory state
   */
  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus('UNAUTHENTICATED');
    setInitError(null);
  }, []);

  /**
   * Retry session initialization if network connection failed
   */
  const retryInitialization = useCallback(async () => {
    await initializeSession();
  }, [initializeSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'AUTHENTICATED' && user !== null,
      isInitializing: status === 'INITIALIZING',
      initError,
      login,
      logout,
      retryInitialization,
    }),
    [user, status, initError, login, logout, retryInitialization],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
