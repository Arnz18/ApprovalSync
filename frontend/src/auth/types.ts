/**
 * ApprovalSync — Authentication & Session Types
 * Milestone: FE-02
 * Adheres strictly to BE-03 Auth API contracts and docs/contracts/data-contracts.md
 */

import { UserRole } from '../api/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Safe authenticated user projection returned by BE-03 (/auth/login and /auth/me)
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string | null;
  regionalOffice?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Payload returned by POST /api/v1/auth/login
 */
export interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

/**
 * Authentication Status Finite State Machine
 */
export type AuthStatus =
  'INITIALIZING' | 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ERROR';

/**
 * Structured session initialization or network error
 */
export interface AuthInitError {
  message: string;
  statusCode?: number;
  isNetworkError: boolean;
  correlationId?: string;
}

/**
 * Authentication Context Interface
 */
export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isInitializing: boolean;
  initError: AuthInitError | null;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  retryInitialization: () => Promise<void>;
}
