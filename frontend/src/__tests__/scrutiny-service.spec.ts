import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { dossierService } from '../api/services/dossierService';
import { workflowService } from '../api/services/workflowService';
import { scrutinyService } from '../api/services/scrutinyService';
import { documentsService } from '../api/services/documentsService';
import { ApplicationStatus, UserRole } from '../api/types';
import { ApplicationProjection } from '../applications/types';

describe('Scrutiny, Dossier & Workflow API Services (FE-04)', () => {
  const mockAppId = 'b0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('dossierService', () => {
    it('retrieves cached dossier report via GET /applications/:id/dossier-report', async () => {
      const mockReport = {
        applicationId: mockAppId,
        applicationNumber: 'APP-2026-0001',
        institutionId: 'inst-1',
        programType: 'Engineering',
        academicYear: '2026-2027',
        overallStatus: 'COMPLIANT',
        evaluatedAt: '2026-10-25T10:00:00.000Z',
        isAdvisory: true,
        summary: {
          totalDocuments: 5,
          totalRulesEvaluated: 12,
          criticalDeficienciesCount: 0,
          advisoryFlagsCount: 1,
          compliantCount: 11,
          hasCriticalDeficiency: false,
          duplicateMatchCount: 0,
          integrityAnomalyCount: 0,
          requiresPhysicalInspection: false,
        },
        documentMatrix: [],
        findings: [],
        disclaimer: 'This automated dossier verification report provides advisory decision support...',
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockReport);

      const result = await dossierService.getDossierReport(mockAppId, { recalculate: true });

      expect(getSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/dossier-report`,
        { recalculate: true },
      );
      expect(result.overallStatus).toBe('COMPLIANT');
      expect(result.isAdvisory).toBe(true);
    });

    it('triggers explicit dossier evaluation via POST /applications/:id/dossier-report', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        applicationId: mockAppId,
        overallStatus: 'REQUIRES_REVIEW',
        isAdvisory: true,
      });

      const result = await dossierService.evaluateDossier(mockAppId);

      expect(postSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/dossier-report`,
        {},
        { params: {} },
      );
      expect(result.overallStatus).toBe('REQUIRES_REVIEW');
    });

    it('retrieves dossier summary via GET /applications/:id/dossier-report/summary', async () => {
      const mockSummary = {
        applicationId: mockAppId,
        overallStatus: 'DEFICIENT',
        isAdvisory: true,
        summary: {
          criticalDeficienciesCount: 2,
          advisoryFlagsCount: 1,
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockSummary);

      const result = await dossierService.getDossierSummary(mockAppId);

      expect(getSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/dossier-report/summary`,
        {},
      );
      expect(result.overallStatus).toBe('DEFICIENT');
    });
  });

  describe('workflowService', () => {
    it('executes state transition via POST /applications/:id/transitions', async () => {
      const mockTransitionResult = {
        success: true,
        applicationId: mockAppId,
        applicationNumber: 'APP-2026-0001',
        previousStatus: ApplicationStatus.SUBMITTED,
        currentStatus: ApplicationStatus.UNDER_SCRUTINY,
        timelineEvent: {
          id: 'event-1',
          applicationId: mockAppId,
          fromStatus: ApplicationStatus.SUBMITTED,
          toStatus: ApplicationStatus.UNDER_SCRUTINY,
          eventType: 'SCRUTINY_STARTED',
          actorId: 'user-1',
          actorRole: UserRole.SCRUTINY_OFFICER,
          createdAt: '2026-10-25T11:00:00.000Z',
          metadata: {},
        },
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockTransitionResult);

      const result = await workflowService.executeTransition(mockAppId, {
        targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        comment: 'Beginning initial verification',
      });

      expect(postSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/transitions`,
        {
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
          comment: 'Beginning initial verification',
        },
      );
      expect(result.currentStatus).toBe(ApplicationStatus.UNDER_SCRUTINY);
    });

    it('retrieves chronological timeline via GET /applications/:id/timeline', async () => {
      const mockTimeline = {
        items: [
          {
            id: 'event-1',
            fromStatus: ApplicationStatus.DRAFT,
            toStatus: ApplicationStatus.SUBMITTED,
            eventType: 'APPLICATION_SUBMITTED',
            actorRole: UserRole.INSTITUTION_USER,
            createdAt: '2026-10-24T10:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockTimeline);

      const result = await workflowService.getTimeline(mockAppId, { page: 1, limit: 10, sortOrder: 'ASC' });

      expect(getSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/timeline`,
        { page: 1, limit: 10, sortOrder: 'ASC' },
      );
      expect(result.items).toHaveLength(1);
    });

    it('retrieves allowed transitions via GET /applications/:id/allowed-transitions', async () => {
      const mockAllowed = [
        {
          toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          eventType: 'DEFICIENCY_COMMUNICATED',
          description: 'Scrutiny Officer issues formal deficiency notice',
          requiresComment: true,
          allowedRoles: [UserRole.SCRUTINY_OFFICER],
        },
        {
          toStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
          eventType: 'RECOMMENDED_FOR_EVC',
          description: 'Recommend for on-site inspection',
          requiresComment: false,
          allowedRoles: [UserRole.SCRUTINY_OFFICER],
        },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockAllowed);

      const result = await workflowService.getAllowedTransitions(mockAppId);

      expect(getSpy).toHaveBeenCalledWith(
        `/applications/${mockAppId}/allowed-transitions`,
      );
      expect(result).toHaveLength(2);
      expect(result[0].requiresComment).toBe(true);
    });
  });

  describe('scrutinyService & enrichment', () => {
    it('enriches visible queue applications with summaries without failing on partial errors', async () => {
      const mockApps: ApplicationProjection[] = [
        {
          id: 'app-1',
          applicationNumber: 'APP-1',
          institutionId: 'inst-1',
          academicYear: '2026-2027',
          status: ApplicationStatus.SUBMITTED,
          programType: 'Engineering',
          payloadJsonb: {},
          submittedAt: '2026-10-25T08:00:00.000Z',
          createdAt: '2026-10-25T08:00:00.000Z',
          updatedAt: '2026-10-25T08:00:00.000Z',
        },
        {
          id: 'app-2',
          applicationNumber: 'APP-2',
          institutionId: 'inst-2',
          academicYear: '2026-2027',
          status: ApplicationStatus.DRAFT, // Draft should be skipped
          programType: 'Management',
          payloadJsonb: {},
          submittedAt: null,
          createdAt: '2026-10-25T08:00:00.000Z',
          updatedAt: '2026-10-25T08:00:00.000Z',
        },
        {
          id: 'app-3',
          applicationNumber: 'APP-3',
          institutionId: 'inst-3',
          academicYear: '2026-2027',
          status: ApplicationStatus.UNDER_SCRUTINY,
          programType: 'Pharmacy',
          payloadJsonb: {},
          submittedAt: '2026-10-25T08:00:00.000Z',
          createdAt: '2026-10-25T08:00:00.000Z',
          updatedAt: '2026-10-25T08:00:00.000Z',
        },
      ];

      vi.spyOn(dossierService, 'getDossierSummary')
        .mockResolvedValueOnce({
          applicationId: 'app-1',
          applicationNumber: 'APP-1',
          institutionId: 'inst-1',
          programType: 'Engineering',
          academicYear: '2026-2027',
          overallStatus: 'COMPLIANT',
          evaluatedAt: '2026-10-25T10:00:00.000Z',
          isAdvisory: true,
          summary: {
            totalDocuments: 3,
            totalRulesEvaluated: 10,
            criticalDeficienciesCount: 0,
            advisoryFlagsCount: 0,
            compliantCount: 10,
            hasCriticalDeficiency: false,
            duplicateMatchCount: 0,
            integrityAnomalyCount: 0,
            issuerVerificationSummary: { totalEligible: 1, verifiedCount: 1, discrepancyCount: 0, simulatedCount: 1, pendingCount: 0 },
            infrastructureReviewSummary: { landCompliant: true, builtUpAreaCompliant: true, barrierFreeDeclared: true, fireSafetyValid: true, evcInspectionRecommended: false, inspectionTriggerReasons: [], heuristicLimitations: [] },
            requiresPhysicalInspection: false,
          },
        })
        .mockRejectedValueOnce(new Error('Backend timeout fetching summary for app-3'));

      const enriched = await scrutinyService.enrichQueueSummaries(mockApps, 2);

      expect(enriched['app-1']).not.toBeNull();
      expect(enriched['app-1']?.overallStatus).toBe('COMPLIANT');
      expect(enriched['app-2']).toBeNull(); // Draft was not fetched
      expect(enriched['app-3']).toBeNull(); // Error was safely caught as null
    });

    it('downloads document blob via documentsService.downloadDocument', async () => {
      const mockBlob = new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' });
      const downloadSpy = vi.spyOn(apiClient, 'downloadBlob').mockResolvedValueOnce({
        blob: mockBlob,
        fileName: 'Approved_Plan.pdf',
        mimeType: 'application/pdf',
      });

      const res = await documentsService.downloadDocument('doc-123');

      expect(downloadSpy).toHaveBeenCalledWith('/documents/doc-123/download');
      expect(res.fileName).toBe('Approved_Plan.pdf');
      expect(res.mimeType).toBe('application/pdf');
    });
  });
});
