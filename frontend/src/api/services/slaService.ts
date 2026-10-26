/**
 * ApprovalSync — SLA & Escalations API Service
 * Milestone: FE-05
 * Connects to BE-08 SLA Controller endpoints.
 */

import { apiClient } from '../client';
import {
  SlaTimerProjection,
  SlaPolicyProjection,
  SlaReconcileResult,
  SlaTimerQueryParams,
  SlaEscalationQueryParams,
  SlaTimersListResponse,
  SlaEscalationsListResponse,
} from '../../sla/types';

export const slaService = {
  /**
   * Retrieve paginated SLA timers for an application.
   * Path: GET /api/v1/applications/:id/sla-timers
   */
  async getApplicationTimers(
    applicationId: string,
    params?: SlaTimerQueryParams,
  ): Promise<SlaTimersListResponse> {
    return apiClient.get<SlaTimersListResponse>(
      `/applications/${encodeURIComponent(applicationId)}/sla-timers`,
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  /**
   * Retrieve active or paused SLA timer for an application.
   * Path: GET /api/v1/applications/:id/sla-timers/active
   */
  async getActiveTimer(applicationId: string): Promise<SlaTimerProjection | null> {
    return apiClient.get<SlaTimerProjection | null>(
      `/applications/${encodeURIComponent(applicationId)}/sla-timers/active`,
    );
  },

  /**
   * Freeze an active SLA timer with a mandatory regulatory justification comment.
   * Authorized roles: SCRUTINY_OFFICER, REGIONAL_OFFICER, BUREAU_HEAD, SYSTEM_ADMIN.
   * Path: POST /api/v1/applications/:id/sla-timers/pause
   */
  async pauseTimer(applicationId: string, reason: string): Promise<SlaTimerProjection> {
    return apiClient.post<SlaTimerProjection>(
      `/applications/${encodeURIComponent(applicationId)}/sla-timers/pause`,
      { reason },
    );
  },

  /**
   * Resume a paused SLA timer, shifting deadlines forward by exact elapsed pause duration.
   * Authorized roles: SCRUTINY_OFFICER, REGIONAL_OFFICER, BUREAU_HEAD, SYSTEM_ADMIN.
   * Path: POST /api/v1/applications/:id/sla-timers/resume
   */
  async resumeTimer(applicationId: string): Promise<SlaTimerProjection> {
    return apiClient.post<SlaTimerProjection>(
      `/applications/${encodeURIComponent(applicationId)}/sla-timers/resume`,
      {},
    );
  },

  /**
   * List configured stage SLA policies with illustrative demo disclaimers.
   * Path: GET /api/v1/sla/policies
   */
  async getPolicies(): Promise<SlaPolicyProjection[]> {
    return apiClient.get<SlaPolicyProjection[]>('/sla/policies');
  },

  /**
   * Retrieve paginated system-wide SLA escalation events for regulatory oversight.
   * Authorized roles: SCRUTINY_OFFICER, REGIONAL_OFFICER, BUREAU_HEAD, SYSTEM_ADMIN, AUDITOR.
   * Path: GET /api/v1/sla/escalations
   */
  async getEscalations(params?: SlaEscalationQueryParams): Promise<SlaEscalationsListResponse> {
    return apiClient.get<SlaEscalationsListResponse>(
      '/sla/escalations',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  /**
   * Trigger privileged database reconciliation sweep.
   * Authorized roles: SYSTEM_ADMIN only.
   * Path: POST /api/v1/sla/reconcile
   */
  async reconcileOverdueTimers(): Promise<SlaReconcileResult> {
    return apiClient.post<SlaReconcileResult>('/sla/reconcile', {});
  },
};
