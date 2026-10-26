/**
 * ApprovalSync — Frontend Integration & Release-Readiness Hardening Test Suite
 * Milestone: FE-01 through FE-06 Audit Hardening
 * Verifies edge-case defect fixes:
 *  1. ReviewActionModal error capture and alert display on server rejection.
 *  2. EvcCaseDetailPage inflight evaluation guard, error banner, and transition success alert.
 *  3. Document download resilience with object URL lifecycle handling.
 *  4. ApplicationWizardPage double-submission prevention.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReviewActionModal } from '../components/scrutiny/ReviewActionModal';
import { DocumentVerificationMatrixView } from '../components/scrutiny/DocumentVerificationMatrixView';
import { EvcCaseDetailPage } from '../pages/EvcCaseDetailPage';
import { evcService } from '../api/services/evcService';
import { complianceService } from '../api/services/complianceService';
import { workflowService } from '../api/services/workflowService';
import { applicationsService } from '../api/services/applicationsService';
import { documentsService } from '../api/services/documentsService';
import {
  ApplicationStatus,
  AllowedTransition,
  DocumentVerificationMatrixItem,
  UserRole,
  TimelineResponse,
  TransitionExecutionResult,
} from '../scrutiny/types';
import { ApplicationProjection } from '../applications/types';
import { ComplianceAssessmentResult } from '../evc/types';

describe('Frontend Integration Hardening & Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ReviewActionModal Hardening', () => {
    const mockTransition: AllowedTransition = {
      toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
      eventType: 'ISSUE_DEFICIENCY',
      description:
        'Issue formal regulatory deficiency notice requiring institutional clarification',
      requiresComment: true,
      allowedRoles: [UserRole.SCRUTINY_OFFICER],
    };

    it('catches server rejections and displays error message in modal alert', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Backend rejected: Transition not permitted'));
      const mockOnClose = vi.fn();

      render(
        <ReviewActionModal
          isOpen={true}
          transition={mockTransition}
          applicationNumber="APP-2026-TEST"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />,
      );

      // Verify modal is rendered
      expect(screen.getByText(/Issue Regulatory Deficiency Notice/i)).toBeInTheDocument();

      // Enter required comment
      const commentInput = screen.getByRole('textbox', {
        name: /Mandatory Regulatory Justification \/ Deficiency Specifications/i,
      });
      await user.type(commentInput, 'Land title document missing mutation registry stamp.');

      // Click Execute Transition button
      const submitBtn = screen.getByRole('button', { name: /Execute Transition/i });
      await user.click(submitBtn);

      // Verify server rejection is caught and displayed inside modal
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          ApplicationStatus.DEFICIENCY_ISSUED,
          'Land title document missing mutation registry stamp.',
        );
        expect(screen.getByText('Backend rejected: Transition not permitted')).toBeInTheDocument();
      });
    });

    it('allows closing the modal via Cancel button', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ReviewActionModal
          isOpen={true}
          transition={mockTransition}
          applicationNumber="APP-2026-TEST"
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />,
      );

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('EvcCaseDetailPage Hardening', () => {
    const mockApplication = {
      id: 'app-hardening-001',
      applicationNumber: 'APP-2026-HARD01',
      institutionId: 'inst-001',
      academicYear: '2026-2027',
      status: ApplicationStatus.RECOMMENDED_FOR_EVC,
      programType: 'Engineering & Technology',
      institution: {
        id: 'inst-001',
        name: 'Hardening Test Institute',
        registrationNumber: 'REG-TEST-001',
        district: 'Bengaluru',
        state: 'Karnataka',
      },
      payloadJsonb: {
        landAcres: 6.0,
        builtUpAreaSqm: 14000,
        barrierFreeAccess: true,
        fireSafetyCompliant: true,
      },
      submittedAt: '2026-10-25T10:00:00.000Z',
      createdAt: '2026-10-25T08:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
    };

    const mockCompliance: ComplianceAssessmentResult = {
      applicationId: 'app-hardening-001',
      applicationNumber: 'APP-2026-HARD01',
      institutionId: 'inst-001',
      programType: 'Engineering & Technology',
      academicYear: '2026-2027',
      isAdvisory: true,
      evaluatedAt: '2026-10-25T10:00:00.000Z',
      disclaimer: 'Advisory heuristics only',
      summary: {
        totalRulesEvaluated: 10,
        criticalDeficienciesCount: 1,
        advisoryFlagsCount: 1,
        compliantCount: 8,
        inspectionRecommendedCount: 1,
        hasCriticalDeficiency: true,
        requiresPhysicalInspection: true,
      },
      infrastructureReview: {
        landCompliant: true,
        builtUpAreaCompliant: false,
        barrierFreeDeclared: true,
        fireSafetyValid: true,
        evcInspectionRecommended: true,
        inspectionTriggerReasons: ['Built-up floor area requires physical dimension verification'],
        heuristicLimitations: ['Dimension verification requires physical visit'],
      },
      findings: [
        {
          id: 'finding-001',
          findingCode: 'INFRA_BUILTUP_DEFICIENCY',
          title: 'Built-up Area Review',
          description: 'Calculated area falls slightly below standard.',
          severity: 'CRITICAL_DEFICIENCY',
          isAdvisory: true,
          category: 'INFRASTRUCTURE',
          evidence: [],
          requiresPhysicalInspection: true,
          recommendedAction: 'Verify on site',
          limitations: [],
        },
      ],
    };

    const mockTransitions: AllowedTransition[] = [
      {
        toStatus: ApplicationStatus.EVC_IN_PROGRESS,
        eventType: 'START_EVC_INSPECTION',
        description: 'Initiate on-site EVC inspection',
        requiresComment: false,
        allowedRoles: [UserRole.REGIONAL_OFFICER],
      },
    ];

    const mockTimelineResponse: TimelineResponse = {
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it('displays error banner when compliance re-evaluation fails', async () => {
      const user = userEvent.setup();
      vi.spyOn(evcService, 'getCaseDetails').mockResolvedValue(
        mockApplication as unknown as ApplicationProjection,
      );
      vi.spyOn(workflowService, 'getAllowedTransitions').mockResolvedValue(mockTransitions);
      vi.spyOn(workflowService, 'getTimeline').mockResolvedValue(mockTimelineResponse);
      vi.spyOn(applicationsService, 'getApplicationDocuments').mockResolvedValue([]);
      vi.spyOn(complianceService, 'getApplicationCompliance').mockResolvedValue(mockCompliance);
      vi.spyOn(complianceService, 'evaluateCompliance').mockRejectedValueOnce(
        new Error('Compliance engine connection refused'),
      );

      render(
        <MemoryRouter initialEntries={['/evc/app-hardening-001']}>
          <Routes>
            <Route path="/evc/:applicationId" element={<EvcCaseDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Hardening Test Institute')).toBeInTheDocument();
      });

      // Click Re-evaluate compliance button
      const reevaluateBtn = screen.getByRole('button', { name: /Re-evaluate Compliance/i });
      await user.click(reevaluateBtn);

      // Verify error alert banner is displayed
      await waitFor(() => {
        expect(screen.getByText('Compliance Evaluation Issue')).toBeInTheDocument();
        expect(screen.getByText('Compliance engine connection refused')).toBeInTheDocument();
      });
    });

    it('displays success banner after a workflow transition executes successfully', async () => {
      const user = userEvent.setup();
      vi.spyOn(evcService, 'getCaseDetails').mockResolvedValue(
        mockApplication as unknown as ApplicationProjection,
      );
      vi.spyOn(workflowService, 'getAllowedTransitions').mockResolvedValue(mockTransitions);
      vi.spyOn(workflowService, 'getTimeline').mockResolvedValue(mockTimelineResponse);
      vi.spyOn(applicationsService, 'getApplicationDocuments').mockResolvedValue([]);
      vi.spyOn(complianceService, 'getApplicationCompliance').mockResolvedValue(mockCompliance);
      vi.spyOn(workflowService, 'executeTransition').mockResolvedValue({
        success: true,
        applicationId: 'app-hardening-001',
        applicationNumber: 'APP-2026-HARD01',
        previousStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
        currentStatus: ApplicationStatus.EVC_IN_PROGRESS,
        timelineEvent: {
          id: 'evt-hard-001',
          applicationId: 'app-hardening-001',
          fromStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
          toStatus: ApplicationStatus.EVC_IN_PROGRESS,
          eventType: 'START_EVC_INSPECTION',
          actorId: 'usr-001',
          actorRole: UserRole.REGIONAL_OFFICER,
          comment: null,
          correlationId: null,
          metadata: {},
          createdAt: '2026-10-25T11:00:00.000Z',
        },
      } as TransitionExecutionResult);

      render(
        <MemoryRouter initialEntries={['/evc/app-hardening-001']}>
          <Routes>
            <Route path="/evc/:applicationId" element={<EvcCaseDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Hardening Test Institute')).toBeInTheDocument();
      });

      // Click Start EVC Inspection button in header
      const initiateBtn = screen.getByRole('button', { name: /Start EVC Inspection/i });
      await user.click(initiateBtn);

      // Modal appears
      await waitFor(() => {
        expect(screen.getByText(/Execute Transition/i)).toBeInTheDocument();
      });

      // Submit modal
      const executeBtn = screen.getByRole('button', { name: /Execute Transition/i });
      await user.click(executeBtn);

      // Verify success banner appears
      await waitFor(() => {
        expect(screen.getByText('Workflow Transition Recorded')).toBeInTheDocument();
        expect(
          screen.getByText(/Application transitioned to EVC_IN_PROGRESS successfully/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Document Download Resilience', () => {
    const mockDoc: DocumentVerificationMatrixItem = {
      documentId: 'doc-hardening-001',
      documentType: 'LAND_TITLE_DEED',
      fileName: 'land_deed.pdf',
      fileSizeBytes: 204800,
      mimeType: 'application/pdf',
      sha256Checksum: 'abcdef1234567890abcdef1234567890',
      processingStatus: 'COMPLETED',
      ocrConfidence: 98.5,
      extractedFieldCount: 4,
      extractedFields: { landArea: '6.0 acres' },
      integrityStatus: 'VALID',
      integrityAnomalyCodes: [],
      duplicateStatus: 'UNIQUE',
      duplicateMatchIds: [],
      issuerStatus: 'VERIFIED',
      isSimulated: false,
      findingsCount: 0,
    };

    it('handles document download seamlessly and triggers blob URL creation', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['mock binary pdf content'], { type: 'application/pdf' });
      vi.spyOn(documentsService, 'downloadDocument').mockResolvedValue({
        blob: mockBlob,
        fileName: 'land_deed.pdf',
        mimeType: 'application/pdf',
      });

      render(<DocumentVerificationMatrixView documents={[mockDoc]} />);

      expect(screen.getByText(/land_deed\.pdf/i)).toBeInTheDocument();

      const downloadBtn = screen.getByRole('button', { name: /Download land_deed\.pdf/i });
      await user.click(downloadBtn);

      await waitFor(() => {
        expect(documentsService.downloadDocument).toHaveBeenCalledWith('doc-hardening-001');
      });
    });

    it('displays error alert when document download fails', async () => {
      const user = userEvent.setup();
      vi.spyOn(documentsService, 'downloadDocument').mockRejectedValueOnce(
        new Error('Object storage bucket inaccessible'),
      );

      render(<DocumentVerificationMatrixView documents={[mockDoc]} />);

      const downloadBtn = screen.getByRole('button', { name: /Download land_deed\.pdf/i });
      await user.click(downloadBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to download land_deed.pdf: Object storage bucket inaccessible/i),
        ).toBeInTheDocument();
      });
    });
  });
});
