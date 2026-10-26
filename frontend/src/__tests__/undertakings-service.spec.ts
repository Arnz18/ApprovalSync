/**
 * ApprovalSync — Undertakings API Service Test Suite
 * Milestone: FE-07
 *
 * Covers all 10 BE-09 undertaking API endpoints:
 * - createUndertaking (POST /undertakings)
 * - getUndertakings (GET /undertakings with query params)
 * - getUndertakingById (GET /undertakings/:id)
 * - updateUndertaking (PATCH /undertakings/:id)
 * - submitUndertaking (POST /undertakings/:id/submit)
 * - reviewUndertaking (POST /undertakings/:id/review)
 * - renewUndertaking (POST /undertakings/:id/renew)
 * - getUndertakingHistory (GET /undertakings/:id/history)
 * - getApplicationUndertakings (GET /applications/:id/undertakings)
 * - reconcileUndertakings (POST /undertakings/reconcile)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { undertakingsService } from '../api/services/undertakingsService';
import { apiClient } from '../api/client';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  CreateUndertakingDto,
  UpdateUndertakingDto,
  ReviewUndertakingDto,
  RenewUndertakingDto,
  UndertakingProjection,
  UndertakingHistoryEntry,
  UndertakingReconcileResult,
  UndertakingsListResponse,
} from '../undertakings/types';
import { UserRole } from '../api/types';

describe('Undertakings API Service (FE-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecord: UndertakingProjection = {
    id: 'und-uuid-1',
    institutionId: 'inst-uuid-1',
    applicationId: 'app-uuid-1',
    type: UndertakingType.LAND_LEASE,
    title: '30-Year Registered Land Lease Deed',
    documentNumber: 'DEED-KA-2020-00918',
    issuingAuthority: 'Sub-Registrar Office, Electronic City',
    counterpartyName: 'Karnataka Industrial Areas Development Board',
    startDate: '2020-04-01',
    expiryDate: '2050-03-31',
    renewalLeadDays: 180,
    renewalDueDate: '2049-10-02',
    daysRemaining: 8500,
    isExpiringSoon: false,
    isRenewalDue: false,
    isExpired: false,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    reviewNotes: 'Original registered deed verified against revenue records',
    reviewedById: 'officer-uuid-1',
    reviewedAt: '2026-10-25T14:30:00.000Z',
    documentId: 'doc-uuid-1',
    supersedesId: null,
    supersededById: null,
    metadataJsonb: { surveyNumber: '44/2A', landAreaAcres: 5.2 },
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
    disclaimer: 'Illustrative regulatory data',
  };

  it('createUndertaking calls POST /undertakings with DTO', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockRecord);

    const dto: CreateUndertakingDto = {
      type: UndertakingType.LAND_LEASE,
      title: '30-Year Registered Land Lease Deed',
      documentNumber: 'DEED-KA-2020-00918',
      issuingAuthority: 'Sub-Registrar Office, Electronic City',
      counterpartyName: 'Karnataka Industrial Areas Development Board',
      startDate: '2020-04-01',
      expiryDate: '2050-03-31',
      renewalLeadDays: 180,
      applicationId: 'app-uuid-1',
    };

    const res = await undertakingsService.createUndertaking(dto);

    expect(postSpy).toHaveBeenCalledWith('/undertakings', dto);
    expect(res.id).toBe('und-uuid-1');
    expect(res.type).toBe(UndertakingType.LAND_LEASE);
  });

  it('getUndertakings serializes filter and pagination query params', async () => {
    const mockListResponse: UndertakingsListResponse = {
      items: [mockRecord],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockListResponse);

    const res = await undertakingsService.getUndertakings({
      page: 1,
      limit: 10,
      status: UndertakingStatus.ACTIVE,
      type: UndertakingType.LAND_LEASE,
      reviewStatus: UndertakingReviewStatus.VERIFIED,
      documentNumber: 'DEED-KA',
      applicationId: 'app-uuid-1',
    });

    expect(getSpy).toHaveBeenCalledWith('/undertakings', {
      page: 1,
      limit: 10,
      status: UndertakingStatus.ACTIVE,
      type: UndertakingType.LAND_LEASE,
      reviewStatus: UndertakingReviewStatus.VERIFIED,
      documentNumber: 'DEED-KA',
      applicationId: 'app-uuid-1',
    });
    expect(res.items).toHaveLength(1);
    expect(res.pagination.totalItems).toBe(1);
  });

  it('getUndertakingById calls GET /undertakings/:id', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockRecord);

    const res = await undertakingsService.getUndertakingById('und-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1', undefined);
    expect(res.id).toBe('und-uuid-1');
  });

  it('updateUndertaking calls PATCH /undertakings/:id with allowed mutable fields', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      ...mockRecord,
      title: 'Updated Lease Title',
    });

    const dto: UpdateUndertakingDto = {
      title: 'Updated Lease Title',
      documentNumber: 'DEED-KA-2020-00918-REV',
    };

    const res = await undertakingsService.updateUndertaking('und-uuid-1', dto);

    expect(patchSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1', dto);
    expect(res.title).toBe('Updated Lease Title');
  });

  it('submitUndertaking calls POST /undertakings/:id/submit', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ...mockRecord,
      status: UndertakingStatus.SUBMITTED,
    });

    const res = await undertakingsService.submitUndertaking('und-uuid-1');

    expect(postSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/submit', {});
    expect(res.status).toBe(UndertakingStatus.SUBMITTED);
  });

  it('reviewUndertaking calls POST /undertakings/:id/review with VERIFIED disposition', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ...mockRecord,
      reviewStatus: UndertakingReviewStatus.VERIFIED,
      reviewNotes: 'Survey coordinates authenticated via revenue portal',
      status: UndertakingStatus.ACTIVE,
    });

    const dto: ReviewUndertakingDto = {
      reviewStatus: UndertakingReviewStatus.VERIFIED,
      reviewNotes: 'Survey coordinates authenticated via revenue portal',
      effectiveStatus: UndertakingStatus.ACTIVE,
    };

    const res = await undertakingsService.reviewUndertaking('und-uuid-1', dto);

    expect(postSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/review', dto);
    expect(res.reviewStatus).toBe(UndertakingReviewStatus.VERIFIED);
    expect(res.status).toBe(UndertakingStatus.ACTIVE);
  });

  it('reviewUndertaking calls POST /undertakings/:id/review with DEFICIENT disposition', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ...mockRecord,
      reviewStatus: UndertakingReviewStatus.DEFICIENT,
      reviewNotes: 'Clarification required regarding structural engineer signature',
    });

    const dto: ReviewUndertakingDto = {
      reviewStatus: UndertakingReviewStatus.DEFICIENT,
      reviewNotes: 'Clarification required regarding structural engineer signature',
    };

    const res = await undertakingsService.reviewUndertaking('und-uuid-1', dto);

    expect(postSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/review', dto);
    expect(res.reviewStatus).toBe(UndertakingReviewStatus.DEFICIENT);
  });

  it('reviewUndertaking calls POST /undertakings/:id/review with REJECTED disposition', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ...mockRecord,
      reviewStatus: UndertakingReviewStatus.REJECTED,
      reviewNotes: 'Forged stamp detected on lease deed',
    });

    const dto: ReviewUndertakingDto = {
      reviewStatus: UndertakingReviewStatus.REJECTED,
      reviewNotes: 'Forged stamp detected on lease deed',
    };

    const res = await undertakingsService.reviewUndertaking('und-uuid-1', dto);

    expect(postSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/review', dto);
    expect(res.reviewStatus).toBe(UndertakingReviewStatus.REJECTED);
  });

  it('renewUndertaking calls POST /undertakings/:id/renew and creates superseding record', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      ...mockRecord,
      id: 'und-uuid-2-renewed',
      supersedesId: 'und-uuid-1',
      expiryDate: '2080-03-31',
    });

    const dto: RenewUndertakingDto = {
      startDate: '2050-04-01',
      expiryDate: '2080-03-31',
      renewalLeadDays: 180,
      documentNumber: 'DEED-KA-2050-RENEWAL',
    };

    const res = await undertakingsService.renewUndertaking('und-uuid-1', dto);

    expect(postSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/renew', dto);
    expect(res.id).toBe('und-uuid-2-renewed');
    expect(res.supersedesId).toBe('und-uuid-1');
  });

  it('getUndertakingHistory calls GET /undertakings/:id/history', async () => {
    const mockHistory: UndertakingHistoryEntry[] = [
      {
        id: 'hist-1',
        undertakingId: 'und-uuid-1',
        action: 'CREATED',
        fromStatus: null,
        toStatus: UndertakingStatus.DRAFT,
        actorId: 'user-1',
        actorRole: UserRole.INSTITUTION_USER,
        changeReason: 'Initial draft saved by applicant',
        snapshotJsonb: {},
        createdAt: '2026-10-25T10:00:00.000Z',
      },
      {
        id: 'hist-2',
        undertakingId: 'und-uuid-1',
        action: 'SUBMITTED',
        fromStatus: UndertakingStatus.DRAFT,
        toStatus: UndertakingStatus.SUBMITTED,
        actorId: 'user-1',
        actorRole: UserRole.INSTITUTION_USER,
        changeReason: 'Submitted for scrutiny review',
        snapshotJsonb: {},
        createdAt: '2026-10-25T11:00:00.000Z',
      },
    ];

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockHistory);

    const res = await undertakingsService.getUndertakingHistory('und-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/undertakings/und-uuid-1/history');
    expect(res).toHaveLength(2);
    expect(res[0].action).toBe('CREATED');
  });

  it('getApplicationUndertakings calls GET /applications/:id/undertakings', async () => {
    const mockListResponse: UndertakingsListResponse = {
      items: [mockRecord],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockListResponse);

    const res = await undertakingsService.getApplicationUndertakings('app-uuid-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-uuid-1/undertakings', undefined);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('und-uuid-1');
  });

  it('reconcileUndertakings calls POST /undertakings/reconcile with privileged sweep confirmation', async () => {
    const mockResult: UndertakingReconcileResult = {
      scannedCount: 142,
      activeCount: 100,
      expiringSoonCount: 5,
      renewalDueCount: 2,
      expiredCount: 1,
      transitionedCount: 8,
      transitionedIds: ['und-uuid-1'],
      evaluationDate: '2026-10-27',
      disclaimer: 'Illustrative reconciliation',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResult);

    const res = await undertakingsService.reconcileUndertakings();

    expect(postSpy).toHaveBeenCalledWith('/undertakings/reconcile', {}, { params: undefined });
    expect(res.scannedCount).toBe(142);
    expect(res.transitionedCount).toBe(8);
  });
});
