/**
 * ApprovalSync — Session Storage Token Management
 * Milestone: FE-02
 *
 * Implements scoped session storage for Bearer JWT tokens.
 * Trade-offs:
 * - Scoped to current browser tab/session (sessionStorage).
 * - Avoids persistent localStorage cross-tab XSS persistence.
 * - In environments where sessionStorage is disabled/restricted, falls back to memory.
 */

import { apiClient } from '../api/client';

const TOKEN_STORAGE_KEY = 'approvalsync_auth_token';

// In-memory fallback if sessionStorage is inaccessible
let memoryToken: string | null = null;

function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getStoredToken(): string | null {
  if (isSessionStorageAvailable()) {
    try {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return memoryToken;
    }
  }
  return memoryToken;
}

export function setStoredToken(token: string): void {
  if (isSessionStorageAvailable()) {
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      memoryToken = token;
    }
  } else {
    memoryToken = token;
  }
}

export function clearStoredToken(): void {
  memoryToken = null;
  if (isSessionStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignored
    }
  }
}

export function hasStoredToken(): boolean {
  return !!getStoredToken();
}

// Wire default token provider into singleton apiClient
apiClient.setAuthTokenProvider(getStoredToken);
