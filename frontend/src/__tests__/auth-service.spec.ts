/**
 * ApprovalSync — Authentication Service & API Client Tests
 * Milestone: FE-02
 * Tests BE-03 Auth Endpoints, Token Injection, Response Parsing, and Error Envelopes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, authService } from '../api/services/authService';
import { ApiClient, ApiClientError } from '../api/client';
import { UserRole } from '../api/types';

describe('AuthService & Bearer Token Behavior (FE-02)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs valid POST /api/v1/auth/login and parses BE-03 response envelope', async () => {
    const mockResponsePayload = {
      success: true,
      data: {
        accessToken: 'mock-jwt-token-xyz',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 'user-uuid-1',
          email: 'demo.institution@synthetic.approvalsync.local',
          name: 'Demo Institution Representative',
          role: UserRole.INSTITUTION_USER,
          institutionId: 'inst-uuid-1',
          regionalOffice: null,
          isActive: true,
          createdAt: '2026-10-22T14:30:00.000Z',
          updatedAt: '2026-10-22T14:30:00.000Z',
        },
      },
      meta: {
        timestamp: '2026-10-25T00:00:00.000Z',
        correlationId: 'corr-id-123',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponsePayload),
    } as unknown as Response);

    const result = await authService.login({
      email: 'demo.institution@synthetic.approvalsync.local',
      password: 'DemoPass@123',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];

    expect(calledUrl).toBe('/api/v1/auth/login');
    expect(calledInit.method).toBe('POST');
    expect(JSON.parse(calledInit.body as string)).toEqual({
      email: 'demo.institution@synthetic.approvalsync.local',
      password: 'DemoPass@123',
    });

    // CRITICAL: Public login request must NOT inject a Bearer token
    expect(calledInit.headers['Authorization']).toBeUndefined();

    // Check parsed payload
    expect(result.accessToken).toBe('mock-jwt-token-xyz');
    expect(result.user.email).toBe('demo.institution@synthetic.approvalsync.local');
    expect(result.user.role).toBe(UserRole.INSTITUTION_USER);
  });

  it('handles 401 invalid credential rejection uniformly from BE-03 error envelope', async () => {
    const mockErrorEnvelope = {
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        message: 'Invalid email or password.',
        statusCode: 401,
        timestamp: '2026-10-25T00:00:00.000Z',
        path: '/api/v1/auth/login',
        correlationId: 'test-corr-401',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify(mockErrorEnvelope),
    } as unknown as Response);

    await expect(
      authService.login({
        email: 'wrong@example.com',
        password: 'BadPassword',
      }),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('injects Bearer token into authenticated GET /api/v1/auth/me requests', async () => {
    const mockUserPayload = {
      success: true,
      data: {
        id: 'user-uuid-1',
        email: 'demo.institution@synthetic.approvalsync.local',
        name: 'Demo Representative',
        role: UserRole.INSTITUTION_USER,
        isActive: true,
        createdAt: '2026-10-22T14:30:00.000Z',
      },
      meta: {
        timestamp: '2026-10-25T00:00:00.000Z',
        correlationId: 'corr-me-123',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockUserPayload),
    } as unknown as Response);

    const client = new ApiClient({
      baseUrl: '/api/v1',
      getAuthToken: () => 'injected-session-jwt-abc',
    });
    const customService = new AuthService(client);

    const user = await customService.getMe();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];

    expect(calledUrl).toBe('/api/v1/auth/me');
    expect(calledInit.headers['Authorization']).toBe('Bearer injected-session-jwt-abc');
    expect(user.id).toBe('user-uuid-1');
  });

  it('differentiates 401 Unauthorized vs 403 Forbidden errors', async () => {
    // 401 Unauthorized
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () =>
        JSON.stringify({
          success: false,
          error: {
            code: 'ERR_UNAUTHORIZED',
            message: 'Missing or expired token',
            statusCode: 401,
            correlationId: 'c1',
          },
        }),
    } as unknown as Response);

    try {
      await authService.getMe('expired-token');
      expect.fail('Should have thrown 401');
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('ERR_UNAUTHORIZED');
    }

    // 403 Forbidden
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () =>
        JSON.stringify({
          success: false,
          error: {
            code: 'ERR_FORBIDDEN',
            message: 'Access denied: insufficient clearance',
            statusCode: 403,
            correlationId: 'c2',
          },
        }),
    } as unknown as Response);

    try {
      await authService.getMe('valid-token-wrong-role');
      expect.fail('Should have thrown 403');
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('ERR_FORBIDDEN');
    }
  });

  it('handles backend network failures gracefully without false successful login', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await authService.login({
        email: 'test@example.com',
        password: 'Pass',
      });
      expect.fail('Should have thrown network error');
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.isNetworkError).toBe(true);
      expect(error.code).toBe('ERR_NETWORK');
    }
  });
});
