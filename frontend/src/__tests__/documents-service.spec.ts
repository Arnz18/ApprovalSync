/**
 * ApprovalSync — Documents Service Unit Tests
 * Milestone: FE-03
 * Tests documentsService upload, delete, and retrieval endpoints against DOC-01 contracts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentsService } from '../api/services/documentsService';
import { apiClient } from '../api/client';
import { DocumentProcessingStatus } from '../applications/types';

describe('documentsService (FE-03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploadDocument constructs FormData and calls apiClient.upload with /applications/:id/documents', async () => {
    const uploadSpy = vi.spyOn(apiClient, 'upload').mockResolvedValueOnce({
      id: 'doc-uuid-1',
      applicationId: 'app-uuid-1',
      documentType: 'LAND_TITLE_DEED',
      fileName: 'sale-deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10240,
      sha256Checksum: '112233445566778899aabbccddeeff00',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      uploadedAt: '2026-10-25T01:00:00.000Z',
    });

    const fakeFile = new File(['%PDF-1.4 test'], 'sale-deed.pdf', { type: 'application/pdf' });

    const res = await documentsService.uploadDocument(
      'app-uuid-1',
      fakeFile,
      'LAND_TITLE_DEED',
      '30-year registered lease deed',
    );

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const [calledPath, calledFormData] = uploadSpy.mock.calls[0];
    expect(calledPath).toBe('/applications/app-uuid-1/documents');
    expect(calledFormData).toBeInstanceOf(FormData);
    expect(calledFormData.get('documentType')).toBe('LAND_TITLE_DEED');
    expect(calledFormData.get('description')).toBe('30-year registered lease deed');
    expect(calledFormData.get('file')).toBeDefined();

    expect(res.id).toBe('doc-uuid-1');
    expect(res.processingStatus).toBe(DocumentProcessingStatus.UPLOADED);
  });

  it('getDocument calls GET /documents/:id', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      id: 'doc-uuid-1',
      applicationId: 'app-uuid-1',
      documentType: 'LAND_TITLE_DEED',
      fileName: 'sale-deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10240,
      sha256Checksum: '112233445566778899aabbccddeeff00',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      uploadedAt: '2026-10-25T01:00:00.000Z',
    });

    const res = await documentsService.getDocument('doc-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/documents/doc-uuid-1');
    expect(res.id).toBe('doc-uuid-1');
  });

  it('deleteDocument calls DELETE /documents/:id', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
      success: true,
      id: 'doc-uuid-1',
    });

    const res = await documentsService.deleteDocument('doc-uuid-1');

    expect(deleteSpy).toHaveBeenCalledWith('/documents/doc-uuid-1');
    expect(res.success).toBe(true);
    expect(res.id).toBe('doc-uuid-1');
  });
});
