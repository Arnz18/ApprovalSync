/**
 * ApprovalSync — Health API Service
 * Milestone: FE-01
 * Integrates with BE-01/BE-02 endpoints:
 * - GET /api/v1/health
 * - GET /api/v1/health/liveness
 * - GET /api/v1/health/readiness
 */

import { apiClient, ApiClient } from '../client';
import { ApiResponse, SystemHealthData, LivenessData, ReadinessData } from '../types';

export class HealthService {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Retrieves overall system health status
   */
  public async getHealth(): Promise<ApiResponse<SystemHealthData>> {
    return this.client.requestEnvelope<SystemHealthData>('/health');
  }

  /**
   * Probes container / process liveness
   */
  public async getLiveness(): Promise<ApiResponse<LivenessData>> {
    return this.client.requestEnvelope<LivenessData>('/health/liveness');
  }

  /**
   * Probes database readiness
   */
  public async getReadiness(): Promise<ApiResponse<ReadinessData>> {
    return this.client.requestEnvelope<ReadinessData>('/health/readiness');
  }
}

export const healthService = new HealthService();
