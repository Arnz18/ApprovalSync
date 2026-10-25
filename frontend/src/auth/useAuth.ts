/**
 * ApprovalSync — useAuth Hook
 * Milestone: FE-02
 *
 * Provides typed access to centralized authentication state and actions.
 * Falls back to safe unauthenticated default in isolated unit tests
 * where <AuthProvider> is omitted.
 */

import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { AuthContextValue } from './types';

const DEFAULT_AUTH_VALUE: AuthContextValue = {
  user: null,
  status: 'UNAUTHENTICATED',
  isAuthenticated: false,
  isInitializing: false,
  initError: null,
  login: async () => {
    throw new Error('useAuth.login requires an active <AuthProvider> wrapper.');
  },
  logout: () => {},
  retryInitialization: async () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? DEFAULT_AUTH_VALUE;
}
