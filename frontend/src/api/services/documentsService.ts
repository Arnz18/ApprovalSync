/**
 * ApprovalSync — Documents API Service
 * Milestone: FE-03
 * Connects to DOC-01 documents controller endpoints.
 */

import { apiClient } from '../client';
import { DocumentMetadataProjection } from '../../applications/types';

export const documentsService = {
  /**
   * Upload a document attachment to an application.
   * Path: POST /api/v1/applications/:applicationId/documents
   * Uses multipart/form-data. Browser automatically sets Content-Type boundary.
   */
  async uploadDocument(
    applicationId: string,
    file: File | Blob,
    documentType: string,
    description?: string,
    fileNameOverride?: string,
  ): Promise<DocumentMetadataProjection> {
    const formData = new FormData();
    if (fileNameOverride && file instanceof Blob && !(file instanceof File)) {
      formData.append('file', file, fileNameOverride);
    } else {
      formData.append('file', file);
    }
    formData.append('documentType', documentType);
    if (description) {
      formData.append('description', description);
    }

    return apiClient.upload<DocumentMetadataProjection>(
      `/applications/${encodeURIComponent(applicationId)}/documents`,
      formData,
    );
  },

  /**
   * Retrieve document attachment metadata by UUID.
   * Path: GET /api/v1/documents/:id
   */
  async getDocument(id: string): Promise<DocumentMetadataProjection> {
    return apiClient.get<DocumentMetadataProjection>(`/documents/${encodeURIComponent(id)}`);
  },

  /**
   * Delete an uploaded document attachment.
   * Path: DELETE /api/v1/documents/:id
   */
  async deleteDocument(id: string): Promise<{ success: boolean; id: string }> {
    return apiClient.delete<{ success: boolean; id: string }>(
      `/documents/${encodeURIComponent(id)}`,
    );
  },
};
