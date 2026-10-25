/**
 * ApprovalSync — Applications API Service
 * Milestone: FE-03
 * Connects to BE-04 applications controller endpoints under /api/v1/applications.
 */

import { apiClient } from '../client';
import { PaginationQueryParams } from '../types';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  ApplicationProjection,
  ApplicationListResponse,
  DocumentMetadataProjection,
} from '../../applications/types';

export const applicationsService = {
  /**
   * Create a new draft application bound to caller's institution.
   * Path: POST /api/v1/applications
   */
  async createDraft(dto: CreateApplicationDto): Promise<ApplicationProjection> {
    return apiClient.post<ApplicationProjection>('/applications', dto);
  },

  /**
   * Update an existing draft application.
   * Path: PATCH /api/v1/applications/:id
   */
  async updateDraft(id: string, dto: UpdateApplicationDto): Promise<ApplicationProjection> {
    return apiClient.patch<ApplicationProjection>(`/applications/${encodeURIComponent(id)}`, dto);
  },

  /**
   * Retrieve application details by ID (enforces institutional tenancy).
   * Path: GET /api/v1/applications/:id
   */
  async getApplication(id: string): Promise<ApplicationProjection> {
    return apiClient.get<ApplicationProjection>(`/applications/${encodeURIComponent(id)}`);
  },

  /**
   * List applications with filters and pagination.
   * Path: GET /api/v1/applications
   */
  async listApplications(params?: PaginationQueryParams): Promise<ApplicationListResponse> {
    return apiClient.get<ApplicationListResponse>('/applications', params);
  },

  /**
   * Submit an application for scrutiny review.
   * Path: POST /api/v1/applications/:id/submit
   */
  async submitApplication(id: string): Promise<ApplicationProjection> {
    return apiClient.post<ApplicationProjection>(
      `/applications/${encodeURIComponent(id)}/submit`,
      {},
    );
  },

  /**
   * List document attachment metadata for an application.
   * Path: GET /api/v1/applications/:id/documents
   */
  async getApplicationDocuments(id: string): Promise<DocumentMetadataProjection[]> {
    return apiClient.get<DocumentMetadataProjection[]>(
      `/applications/${encodeURIComponent(id)}/documents`,
    );
  },
};
