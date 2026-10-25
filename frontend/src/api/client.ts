/**
 * ApprovalSync — Centralized Typed HTTP Client
 * Milestone: FE-01
 * Implements docs/contracts/api-conventions.md:
 * - Namespace: /api/v1
 * - Envelope: ApiResponse<T> & ApiErrorResponse
 * - Correlation tracing: X-Correlation-Id
 * - FormData handling without manual boundary
 * - AbortController timeout
 * - Typed error extraction
 */

import { ApiResponse, ApiErrorResponse, FieldError } from './types';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly correlationId: string;
  public readonly details?: FieldError[];
  public readonly isNetworkError: boolean;

  constructor({
    message,
    code = 'ERR_UNKNOWN',
    statusCode = 500,
    correlationId = '',
    details,
    isNetworkError = false,
  }: {
    message: string;
    code?: string;
    statusCode?: number;
    correlationId?: string;
    details?: FieldError[];
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  correlationId?: string;
  timeoutMs?: number;
  authToken?: string | null;
}

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  getAuthToken?: () => string | null;
}

/**
 * Generates an RFC4122 v4 compliant UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments lacking crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * ApprovalSync API Client
 */
export class ApiClient {
  private baseUrl: string;
  private timeoutMs: number;
  private getAuthToken?: () => string | null;

  constructor(config: ApiClientConfig = {}) {
    // Read from environment if available, defaulting to /api/v1 for Vite proxy
    const envBaseUrl =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_API_BASE_URL
        : undefined;

    const rawBaseUrl = config.baseUrl ?? envBaseUrl ?? '/api/v1';
    // Remove trailing slash if present
    this.baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

    const envTimeout =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_TIMEOUT_MS
        ? Number(import.meta.env.VITE_API_TIMEOUT_MS)
        : undefined;

    const resolvedTimeout =
      envTimeout !== undefined && Number.isFinite(envTimeout) ? envTimeout : 15000;
    this.timeoutMs = config.timeoutMs ?? resolvedTimeout;
    this.getAuthToken = config.getAuthToken;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Builds full URL with normalized path and query parameters
   */
  public buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const fullPath = `${this.baseUrl}${normalizedPath}`;

    if (!params) {
      return fullPath;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullPath}?${queryString}` : fullPath;
  }

  /**
   * Executes typed HTTP request returning the full ApiResponse<T> envelope
   */
  public async requestEnvelope<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      params,
      body,
      headers: customHeaders = {},
      correlationId: customCorrelationId,
      timeoutMs: customTimeoutMs,
      authToken: customAuthToken,
      signal: customSignal,
      ...fetchOptions
    } = options;

    const correlationId = customCorrelationId || generateUUID();
    const timeout = customTimeoutMs ?? this.timeoutMs;

    // Build URL
    const url = this.buildUrl(path, params);

    // Setup headers
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-Id': correlationId,
    };

    // Attach Bearer token if available
    const token = customAuthToken ?? (this.getAuthToken ? this.getAuthToken() : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge custom headers
    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((val, key) => {
          headers[key] = val;
        });
      } else if (Array.isArray(customHeaders)) {
        customHeaders.forEach(([key, val]) => {
          headers[key] = val;
        });
      } else {
        Object.assign(headers, customHeaders);
      }
    }

    // Prepare body
    let requestBody: BodyInit | undefined;
    if (body !== undefined && body !== null) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        requestBody = body;
        // CRITICAL: Do NOT set Content-Type header for FormData!
        // The browser must automatically set multipart/form-data with boundary.
        delete headers['Content-Type'];
      } else if (typeof body === 'string') {
        requestBody = body;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        requestBody = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    // Merge external abort signal if provided
    if (customSignal) {
      customSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle empty body responses (e.g. 204 No Content)
      if (response.status === 204) {
        return {
          success: true,
          data: {} as T,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId,
          },
        };
      }

      // Read response body as text first to handle both JSON and non-JSON cleanly
      const responseText = await response.text();
      let responseJson: unknown = null;

      if (responseText.trim().length > 0) {
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          // Non-JSON response body
          responseJson = null;
        }
      }

      // Check HTTP Status
      if (!response.ok) {
        if (responseJson && typeof responseJson === 'object' && 'error' in responseJson) {
          const apiError = (responseJson as ApiErrorResponse).error;
          throw new ApiClientError({
            message: apiError.message || `API error ${response.status}: ${response.statusText}`,
            code: apiError.code || `HTTP_${response.status}`,
            statusCode: apiError.statusCode || response.status,
            correlationId: apiError.correlationId || correlationId,
            details: apiError.details,
          });
        }

        // Generic HTTP error without standard ApiErrorResponse envelope
        throw new ApiClientError({
          message:
            responseText ||
            `Request failed with HTTP status ${response.status} (${response.statusText})`,
          code: `HTTP_${response.status}`,
          statusCode: response.status,
          correlationId,
        });
      }

      // Success path — parse ApiResponse envelope
      if (responseJson && typeof responseJson === 'object' && 'data' in responseJson) {
        const envelope = responseJson as ApiResponse<T>;
        return {
          ...envelope,
          meta: {
            ...envelope.meta,
            correlationId: envelope.meta?.correlationId || correlationId,
          },
        };
      }

      // Raw data returned without standard envelope (backward compatibility)
      return {
        success: true,
        data: responseJson as T,
        meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof ApiClientError) {
        throw err;
      }

      // Network / Fetch failure or Timeout
      const error = err as Error;
      const isTimeout = error.name === 'AbortError';

      throw new ApiClientError({
        message: isTimeout
          ? `Request timed out after ${timeout}ms. Verify backend server is responsive.`
          : `Network connection failed: unable to reach ApprovalSync API at ${this.baseUrl}. Verify the backend service is running. (${error.message})`,
        code: isTimeout ? 'ERR_TIMEOUT' : 'ERR_NETWORK',
        statusCode: isTimeout ? 408 : 0,
        correlationId,
        isNetworkError: true,
      });
    }
  }

  /**
   * Convenience method to extract directly the `data` property of ApiResponse<T>
   */
  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const envelope = await this.requestEnvelope<T>(path, options);
    return envelope.data;
  }

  /**
   * HTTP GET
   */
  public async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    options: Omit<RequestOptions, 'params' | 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, params, method: 'GET' });
  }

  /**
   * HTTP POST
   */
  public async post<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'body' | 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'POST' });
  }

  /**
   * HTTP PATCH
   */
  public async patch<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'body' | 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'PATCH' });
  }

  /**
   * HTTP PUT
   */
  public async put<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'body' | 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'PUT' });
  }

  /**
   * HTTP DELETE
   */
  public async delete<T>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Multipart Upload helper (FormData)
   */
  public async upload<T>(
    path: string,
    formData: FormData,
    options: Omit<RequestOptions, 'body' | 'method'> = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, body: formData, method: 'POST' });
  }
}

// Export singleton client instance with default environment config
export const apiClient = new ApiClient();
