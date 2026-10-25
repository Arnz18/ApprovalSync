import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiClientError, generateUUID } from '../api/client';
import { ApiResponse, ApiErrorResponse } from '../api/types';

describe('ApiClient (FE-01)', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 2000 });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates valid RFC4122 v4 UUIDs', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('builds URLs correctly with query parameters', () => {
    const url = client.buildUrl('/applications', {
      page: 1,
      limit: 20,
      status: 'UNDER_SCRUTINY',
      emptyVal: undefined,
      nullVal: null,
      blankVal: '',
    });

    expect(url).toBe('/api/v1/applications?page=1&limit=20&status=UNDER_SCRUTINY');
  });

  it('successfully extracts single resource from ApiResponse envelope', async () => {
    const mockEnvelope: ApiResponse<{ id: string; name: string }> = {
      success: true,
      data: { id: 'app-1', name: 'Engineering Institute' },
      meta: {
        timestamp: '2026-10-25T07:00:00.000Z',
        correlationId: 'test-corr-id-123',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockEnvelope),
    } as unknown as Response);

    const result = await client.request<{ id: string; name: string }>('/applications/app-1', {
      correlationId: 'test-corr-id-123',
    });

    expect(result).toEqual({ id: 'app-1', name: 'Engineering Institute' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/applications/app-1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Correlation-Id': 'test-corr-id-123',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('parses standardized ApiErrorResponse on non-2xx HTTP responses', async () => {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'ERR_VALIDATION_FAILED',
        message: 'One or more fields failed validation.',
        statusCode: 400,
        timestamp: '2026-10-25T07:00:00.000Z',
        path: '/api/v1/applications',
        correlationId: 'error-corr-456',
        details: [
          {
            field: 'landAreaAcres',
            message: 'landAreaAcres must be a positive number',
            rule: 'isPositive',
          },
        ],
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify(errorResponse),
    } as unknown as Response);

    await expect(client.request('/applications')).rejects.toThrow(ApiClientError);

    try {
      await client.request('/applications');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe('ERR_VALIDATION_FAILED');
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toBe('One or more fields failed validation.');
      expect(apiErr.details).toHaveLength(1);
      expect(apiErr.details?.[0].field).toBe('landAreaAcres');
      expect(apiErr.correlationId).toBe('error-corr-456');
    }
  });

  it('handles network failures gracefully without crashing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(client.request('/health')).rejects.toThrow(ApiClientError);

    try {
      await client.request('/health');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe('ERR_NETWORK');
      expect(apiErr.isNetworkError).toBe(true);
      expect(apiErr.message).toContain('Network connection failed');
    }
  });

  it('handles FormData upload without manually overriding multipart boundary', async () => {
    const mockEnvelope: ApiResponse<{ uploaded: boolean }> = {
      success: true,
      data: { uploaded: true },
      meta: { timestamp: '2026-10-25T07:00:00.000Z', correlationId: 'upload-corr' },
    };

    let capturedHeaders: Record<string, string> | undefined;

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(mockEnvelope),
      } as Response);
    });

    const formData = new FormData();
    formData.append('documentCategory', 'LAND_TITLE_DEED');

    await client.upload('/applications/app-1/documents', formData);

    expect(capturedHeaders).toBeDefined();
    // Content-Type MUST NOT be set manually so the browser/fetch runtime sets boundary
    expect(capturedHeaders?.['Content-Type']).toBeUndefined();
    expect(capturedHeaders?.['X-Correlation-Id']).toBeDefined();
  });

  it('attaches Bearer token when configured via getAuthToken or options', async () => {
    const clientWithAuth = new ApiClient({
      baseUrl: '/api/v1',
      getAuthToken: () => 'mock-jwt-token-xyz',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { user: 'test' } }),
    } as unknown as Response);

    await clientWithAuth.get('/auth/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token-xyz',
        }),
      }),
    );
  });
});
