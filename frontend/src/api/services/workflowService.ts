/**
 * ApprovalSync — Workflow API Service
 * Milestone: FE-04
 * Connects to BE-06 workflow controller endpoints under /api/v1/applications/:id.
 */

import { apiClient } from '../client';
import {
  AllowedTransition,
  TimelineResponse,
  TransitionExecutionResult,
  TransitionRequest,
} from '../../scrutiny/types';

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
};
