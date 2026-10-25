/**
 * ApprovalSync — Applications Service Unit Tests
 * Milestone: FE-03
 * Tests applicationsService endpoints against BE-04 contracts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applicationsService } from '../api/services/applicationsService';
import { apiClient } from '../api/client';
import { ApplicationStatus } from '../applications/types';

describe('applicationsService (FE-03)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createDraft calls POST /applications with CreateApplicationDto and returns projection', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: 'app-uuid-1',
      applicationNumber: 'APP-2026-ABC12345',
      institutionId: 'inst-uuid-1',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: { facultyCount: 48 },
      submittedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });

    const res = await applicationsService.createDraft({
      academicYear: '2026-2027',
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: { facultyCount: 48 },
    });

    expect(postSpy).toHaveBeenCalledWith('/applications', {
      academicYear: '2026-2027',
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: { facultyCount: 48 },
    });
    expect(res.id).toBe('app-uuid-1');
    expect(res.status).toBe(ApplicationStatus.DRAFT);
  });

  it('updateDraft calls PATCH /applications/:id with UpdateApplicationDto', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      id: 'app-uuid-1',
      applicationNumber: 'APP-2026-ABC12345',
      institutionId: 'inst-uuid-1',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: { facultyCount: 52 },
      submittedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T01:00:00.000Z',
    });

    const res = await applicationsService.updateDraft('app-uuid-1', {
      payloadJsonb: { facultyCount: 52 },
    });

    expect(patchSpy).toHaveBeenCalledWith('/applications/app-uuid-1', {
      payloadJsonb: { facultyCount: 52 },
    });
    expect(res.payloadJsonb.facultyCount).toBe(52);
  });

  it('getApplication calls GET /applications/:id with tenant isolation', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      id: 'app-uuid-1',
      applicationNumber: 'APP-2026-ABC12345',
      institutionId: 'inst-uuid-1',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: {},
      submittedAt: null,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });

    const res = await applicationsService.getApplication('app-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1');
    expect(res.applicationNumber).toBe('APP-2026-ABC12345');
  });

  it('listApplications calls GET /applications with query parameters', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const res = await applicationsService.listApplications({ status: 'DRAFT', limit: 5 });

    expect(getSpy).toHaveBeenCalledWith('/applications', { status: 'DRAFT', limit: 5 });
    expect(res.items).toEqual([]);
  });

  it('submitApplication calls POST /applications/:id/submit and transitions to SUBMITTED', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: 'app-uuid-1',
      applicationNumber: 'APP-2026-ABC12345',
      institutionId: 'inst-uuid-1',
      academicYear: '2026-2027',
      status: ApplicationStatus.SUBMITTED,
      programType: 'Undergraduate Engineering & Technology',
      payloadJsonb: {},
      submittedAt: '2026-10-25T02:00:00.000Z',
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T02:00:00.000Z',
    });

    const res = await applicationsService.submitApplication('app-uuid-1');

    expect(postSpy).toHaveBeenCalledWith('/applications/app-uuid-1/submit', {});
    expect(res.status).toBe(ApplicationStatus.SUBMITTED);
    expect(res.submittedAt).toBe('2026-10-25T02:00:00.000Z');
  });

  it('getApplicationDocuments calls GET /applications/:id/documents', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce([
      {
        id: 'doc-uuid-1',
        applicationId: 'app-uuid-1',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        sha256Checksum: 'abcdef1234567890',
        processingStatus: 'UPLOADED',
        uploadedAt: '2026-10-25T00:00:00.000Z',
      },
    ]);

    const docs = await applicationsService.getApplicationDocuments('app-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/documents');
    expect(docs).toHaveLength(1);
    expect(docs[0].documentType).toBe('LAND_TITLE_DEED');
  });
});
