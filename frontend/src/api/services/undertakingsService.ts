/**
 * ApprovalSync — Institutional Undertakings & Leases API Service
 * Milestone: FE-07
 * Integrates with BE-09 Undertakings Controller endpoints.
 */

import { apiClient } from '../client';
import {
  UndertakingProjection,
  UndertakingsListResponse,
  UndertakingHistoryEntry,
  UndertakingReconcileResult,
  CreateUndertakingDto,
  UpdateUndertakingDto,
  ReviewUndertakingDto,
  RenewUndertakingDto,
  UndertakingQueryParams,
} from '../../undertakings/types';

export const undertakingsService = {
  /**
   * Create a new institutional undertaking or lease record.
   * Path: POST /api/v1/undertakings
   * Authorized roles: INSTITUTION_USER, REGIONAL_OFFICER, SYSTEM_ADMIN
   */
  async createUndertaking(dto: CreateUndertakingDto): Promise<UndertakingProjection> {
    return apiClient.post<UndertakingProjection>('/undertakings', dto);
  },

  /**
   * List paginated undertakings with filtering and sorting.
   * Path: GET /api/v1/undertakings
   * Tenant-isolated for INSTITUTION_USER; cross-institution for regulatory officers.
   */
  async getUndertakings(params?: UndertakingQueryParams): Promise<UndertakingsListResponse> {
    return apiClient.get<UndertakingsListResponse>(
      '/undertakings',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  /**
   * Retrieve single undertaking by ID with anti-enumeration protection.
   * Path: GET /api/v1/undertakings/:id
   */
  async getUndertakingById(id: string, asOfDate?: string): Promise<UndertakingProjection> {
    const params = asOfDate ? { asOfDate } : undefined;
    return apiClient.get<UndertakingProjection>(`/undertakings/${encodeURIComponent(id)}`, params);
  },

  /**
   * Update permitted mutable fields of an editable draft/unverified record.
   * Path: PATCH /api/v1/undertakings/:id
   * Authorized roles: INSTITUTION_USER, REGIONAL_OFFICER, SYSTEM_ADMIN
   */
  async updateUndertaking(id: string, dto: UpdateUndertakingDto): Promise<UndertakingProjection> {
    return apiClient.patch<UndertakingProjection>(`/undertakings/${encodeURIComponent(id)}`, dto);
  },

  /**
   * Submit an institutional draft undertaking for regulatory review.
   * Path: POST /api/v1/undertakings/:id/submit
   * Authorized roles: INSTITUTION_USER, REGIONAL_OFFICER, SYSTEM_ADMIN
   */
  async submitUndertaking(id: string): Promise<UndertakingProjection> {
    return apiClient.post<UndertakingProjection>(
      `/undertakings/${encodeURIComponent(id)}/submit`,
      {},
    );
  },

  /**
   * Record an authorized regulatory officer review disposition.
   * Path: POST /api/v1/undertakings/:id/review
   * Authorized roles: SCRUTINY_OFFICER, REGIONAL_OFFICER, BUREAU_HEAD, SYSTEM_ADMIN
   */
  async reviewUndertaking(id: string, dto: ReviewUndertakingDto): Promise<UndertakingProjection> {
    return apiClient.post<UndertakingProjection>(
      `/undertakings/${encodeURIComponent(id)}/review`,
      dto,
    );
  },

  /**
   * Create an atomic superseding renewal record, linking to predecessor.
   * Path: POST /api/v1/undertakings/:id/renew
   * Authorized roles: INSTITUTION_USER, REGIONAL_OFFICER, SYSTEM_ADMIN
   */
  async renewUndertaking(id: string, dto: RenewUndertakingDto): Promise<UndertakingProjection> {
    return apiClient.post<UndertakingProjection>(
      `/undertakings/${encodeURIComponent(id)}/renew`,
      dto,
    );
  },

  /**
   * Retrieve chronological audit/event history for an undertaking record.
   * Path: GET /api/v1/undertakings/:id/history
   */
  async getUndertakingHistory(id: string): Promise<UndertakingHistoryEntry[]> {
    return apiClient.get<UndertakingHistoryEntry[]>(
      `/undertakings/${encodeURIComponent(id)}/history`,
    );
  },

  /**
   * List undertakings associated with an active approval workflow application.
   * Path: GET /api/v1/applications/:applicationId/undertakings
   */
  async getApplicationUndertakings(
    applicationId: string,
    params?: UndertakingQueryParams,
  ): Promise<UndertakingsListResponse> {
    return apiClient.get<UndertakingsListResponse>(
      `/applications/${encodeURIComponent(applicationId)}/undertakings`,
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  /**
   * Execute expiry and lifecycle status reconciliation sweep across active records.
   * Path: POST /api/v1/undertakings/reconcile
   * Authorized roles: REGIONAL_OFFICER, BUREAU_HEAD, SYSTEM_ADMIN
   */
  async reconcileUndertakings(asOfDate?: string): Promise<UndertakingReconcileResult> {
    const params = asOfDate ? { asOfDate } : undefined;
    return apiClient.post<UndertakingReconcileResult>('/undertakings/reconcile', {}, { params });
  },
};
