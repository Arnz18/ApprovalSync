/**
 * ApprovalSync — EVC & Compliance Service Unit Tests
 * Milestone: FE-06
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { complianceService } from '../api/services/complianceService';
import { evcService } from '../api/services/evcService';
import { applicationsService } from '../api/services/applicationsService';
import { dossierService } from '../api/services/dossierService';
import { apiClient, ApiClientError } from '../api/client';
import { ApplicationStatus } from '../applications/types';
import { ComplianceAssessmentResult } from '../evc/types';
import { DossierSummary } from '../scrutiny/types';

describe('Compliance & EVC Service (FE-06)', () => {
  const mockComplianceResult: ComplianceAssessmentResult = {
    applicationId: 'app-101',
    applicationNumber: 'APP-2026-ENG001',
    institutionId: 'inst-01',
    programType: 'ENGINEERING',
    academicYear: '2026-2027',
    evaluatedAt: '2026-10-25T12:00:00.000Z',
    isAdvisory: true,
    summary: {
      totalRulesEvaluated: 15,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 1,
      compliantCount: 14,
      inspectionRecommendedCount: 1,
      hasCriticalDeficiency: false,
      requiresPhysicalInspection: true,
    },
    findings: [
      {
        id: 'find-01',
        findingCode: 'INFRA_BUILTUP_AREA_VERIFY',
        title: 'Built-up area verification required',
        description:
          'Physical inspection recommended to verify total instructional area against blueprint',
        severity: 'ADVISORY_FLAG',
        isAdvisory: true,
        category: 'INFRASTRUCTURE',
        evidence: [],
        requiresPhysicalInspection: true,
        recommendedAction: 'EVC committee to conduct on-site physical measurement',
        limitations: ['Blueprint OCR does not guarantee actual construction state'],
      },
    ],
    infrastructureReview: {
      landCompliant: true,
      builtUpAreaCompliant: true,
      barrierFreeDeclared: true,
      fireSafetyValid: true,
      evcInspectionRecommended: true,
      inspectionTriggerReasons: ['Instructional built-up area requires physical confirmation'],
      heuristicLimitations: ['Satellite imagery unavailable'],
    },
    disclaimer: 'Advisory only. Final determinations rest with authorized officers.',
  };

  const mockDossierSummary: DossierSummary = {
    applicationId: 'app-101',
    applicationNumber: 'APP-2026-ENG001',
    institutionId: 'inst-01',
    programType: 'ENGINEERING',
    academicYear: '2026-2027',
    overallStatus: 'REQUIRES_REVIEW',
    evaluatedAt: '2026-10-25T12:00:00.000Z',
    isAdvisory: true,
    summary: {
      totalDocuments: 5,
      totalRulesEvaluated: 15,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 1,
      compliantCount: 14,
      hasCriticalDeficiency: false,
      duplicateMatchCount: 0,
      integrityAnomalyCount: 0,
      issuerVerificationSummary: {
        totalEligible: 2,
        verifiedCount: 2,
        discrepancyCount: 0,
        simulatedCount: 0,
        pendingCount: 0,
      },
      infrastructureReviewSummary: {
        landCompliant: true,
        builtUpAreaCompliant: true,
        barrierFreeDeclared: true,
        fireSafetyValid: true,
        evcInspectionRecommended: true,
        inspectionTriggerReasons: ['Instructional built-up area requires physical confirmation'],
        heuristicLimitations: [],
      },
      requiresPhysicalInspection: true,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('complianceService', () => {
    it('retrieves application compliance assessment via GET', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockComplianceResult);

      const result = await complianceService.getApplicationCompliance('app-101');

      expect(getSpy).toHaveBeenCalledWith('/applications/app-101/compliance-assist');
      expect(result.summary.requiresPhysicalInspection).toBe(true);
      expect(result.infrastructureReview.evcInspectionRecommended).toBe(true);
    });

    it('triggers compliance re-evaluation via POST', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockComplianceResult);

      const result = await complianceService.evaluateCompliance('app-101', {
        evaluationDate: '2026-10-25',
      });

      expect(postSpy).toHaveBeenCalledWith('/applications/app-101/compliance-assist/evaluate', {
        evaluationDate: '2026-10-25',
      });
      expect(result.applicationNumber).toBe('APP-2026-ENG001');
    });

    it('propagates ApiClientError when backend returns 403 or 404', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(
        new ApiClientError({ message: 'Forbidden tenant access', statusCode: 403 }),
      );

      await expect(complianceService.getApplicationCompliance('app-cross-tenant')).rejects.toThrow(
        'Forbidden tenant access',
      );
    });
  });

  describe('evcService', () => {
    it('fetches paginated applications queue with status and search filters', async () => {
      const mockListResponse = {
        items: [
          {
            id: 'app-101',
            applicationNumber: 'APP-2026-ENG001',
            institutionId: 'inst-01',
            academicYear: '2026-2027',
            status: ApplicationStatus.RECOMMENDED_FOR_EVC,
            programType: 'ENGINEERING',
            payloadJsonb: {},
            submittedAt: '2026-10-25T10:00:00.000Z',
            createdAt: '2026-10-25T08:00:00.000Z',
            updatedAt: '2026-10-25T10:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      vi.spyOn(applicationsService, 'listApplications').mockResolvedValue(mockListResponse);

      const queueResult = await evcService.getEvcQueue({
        status: ApplicationStatus.RECOMMENDED_FOR_EVC,
        search: 'ENG001',
        sortBy: 'submittedAt',
        sortOrder: 'DESC',
        page: 1,
        limit: 10,
      });

      expect(applicationsService.listApplications).toHaveBeenCalledWith({
        status: ApplicationStatus.RECOMMENDED_FOR_EVC,
        search: 'ENG001',
        sortBy: 'submittedAt',
        sortOrder: 'DESC',
        page: 1,
        limit: 10,
      });

      expect(queueResult.items).toHaveLength(1);
      expect(queueResult.items[0].compliance).toBeNull();
      expect(queueResult.items[0].dossierSummary).toBeNull();
    });

    it('omits status filter when status is ALL', async () => {
      vi.spyOn(applicationsService, 'listApplications').mockResolvedValue({
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

      await evcService.getEvcQueue({
        status: 'ALL',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        page: 1,
        limit: 10,
      });

      expect(applicationsService.listApplications).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortOrder: 'DESC',
        sortBy: 'createdAt',
      });
    });

    it('enriches visible applications with compliance and dossier summaries using bounded concurrency', async () => {
      vi.spyOn(complianceService, 'getApplicationCompliance').mockResolvedValue(
        mockComplianceResult,
      );
      vi.spyOn(dossierService, 'getDossierSummary').mockResolvedValue(mockDossierSummary);

      const enriched = await evcService.enrichEvcSummaries(['app-101', 'app-102']);

      expect(enriched['app-101'].compliance).toEqual(mockComplianceResult);
      expect(enriched['app-101'].dossierSummary).toEqual(mockDossierSummary);
      expect(enriched['app-102'].compliance).toEqual(mockComplianceResult);
    });

    it('handles partial failures gracefully without throwing error for entire queue', async () => {
      vi.spyOn(complianceService, 'getApplicationCompliance').mockRejectedValue(
        new Error('Network failure'),
      );
      vi.spyOn(dossierService, 'getDossierSummary').mockResolvedValue(mockDossierSummary);

      const enriched = await evcService.enrichEvcSummaries(['app-fail']);

      expect(enriched['app-fail'].compliance).toBeNull();
      expect(enriched['app-fail'].dossierSummary).toEqual(mockDossierSummary);
    });

    it('delegates getCaseDetails to applicationsService', async () => {
      const mockDetail = {
        id: 'app-101',
        applicationNumber: 'APP-2026-ENG001',
        institutionId: 'inst-01',
        academicYear: '2026-2027',
        status: ApplicationStatus.RECOMMENDED_FOR_EVC,
        programType: 'ENGINEERING',
        payloadJsonb: {},
        submittedAt: '2026-10-25T10:00:00.000Z',
        createdAt: '2026-10-25T08:00:00.000Z',
        updatedAt: '2026-10-25T10:00:00.000Z',
      };

      vi.spyOn(applicationsService, 'getApplication').mockResolvedValue(mockDetail);

      const detail = await evcService.getCaseDetails('app-101');
      expect(detail.id).toBe('app-101');
      expect(applicationsService.getApplication).toHaveBeenCalledWith('app-101');
    });
  });
});
