/**
 * ApprovalSync — Workflow API Service
 * Milestone: FE-04 & AICTE-PS26262
 * Connects to BE-06 workflow controller endpoints under /api/v1/applications/:id and /api/v1/workflow.
 */

import { apiClient } from '../client';
import {
  AllowedTransition,
  TimelineResponse,
  TransitionExecutionResult,
  TransitionRequest,
} from '../../scrutiny/types';
import { CreateEvcSchedulePayload, EvcScheduleData } from '../types';

export const workflowService = {
  /**
   * Execute atomic FSM transition on an application.
   * Path: POST /api/v1/applications/:id/transitions
   */
  async executeTransition(
    applicationId: string,
    request: TransitionRequest,
  ): Promise<TransitionExecutionResult> {
    return apiClient.post<TransitionExecutionResult>(
      `/applications/${encodeURIComponent(applicationId)}/transitions`,
      request,
    );
  },

  /**
   * Retrieve chronological audit timeline history for an application.
   * Path: GET /api/v1/applications/:id/timeline
   */
  async getTimeline(
    applicationId: string,
    query?: { page?: number; limit?: number; sortOrder?: 'ASC' | 'DESC' },
  ): Promise<TimelineResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (query?.page) params.page = query.page;
    if (query?.limit) params.limit = query.limit;
    if (query?.sortOrder) params.sortOrder = query.sortOrder;

    return apiClient.get<TimelineResponse>(
      `/applications/${encodeURIComponent(applicationId)}/timeline`,
      params,
    );
  },

  /**
   * Discover allowed transitions from current status for authenticated user's role.
   * Path: GET /api/v1/applications/:id/allowed-transitions
   */
  async getAllowedTransitions(applicationId: string): Promise<AllowedTransition[]> {
    return apiClient.get<AllowedTransition[]>(
      `/applications/${encodeURIComponent(applicationId)}/allowed-transitions`,
    );
  },

  /**
   * Retrieve active EVC schedule for an application.
   * Path: GET /api/v1/applications/:id/evc-schedule
   */
  async getEvcSchedule(applicationId: string): Promise<EvcScheduleData | null> {
    return apiClient.get<EvcScheduleData | null>(
      `/applications/${encodeURIComponent(applicationId)}/evc-schedule`,
    );
  },

  /**
   * Create or update EVC schedule for an application.
   * Path: POST /api/v1/applications/:id/evc-schedule
   */
  async saveEvcSchedule(
    applicationId: string,
    payload: CreateEvcSchedulePayload,
  ): Promise<EvcScheduleData> {
    return apiClient.post<EvcScheduleData>(
      `/applications/${encodeURIComponent(applicationId)}/evc-schedule`,
      payload,
    );
  },

  /**
   * List all EVC schedules across applications.
   * Path: GET /api/v1/evc/schedules
   */
  async listEvcSchedules(query?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: EvcScheduleData[]; total: number }> {
    const params: Record<string, string | number | undefined> = {};
    if (query?.status) params.status = query.status;
    if (query?.page) params.page = query.page;
    if (query?.limit) params.limit = query.limit;

    return apiClient.get<{ items: EvcScheduleData[]; total: number }>('/evc/schedules', params);
  },

  /**
   * Retrieve stage-wise pendency distribution metrics for AICTE PS 26262 dashboards.
   * Path: GET /api/v1/workflow/stage-pendency
   */
  async getStagePendencyMetrics(): Promise<Record<string, number>> {
    return apiClient.get<Record<string, number>>('/workflow/stage-pendency');
  },
};
