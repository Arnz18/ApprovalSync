/**
 * ApprovalSync — Case Detail, Evidence Review & Clarification Test Suite
 * Milestone: FE-04
 * Tests case detail loading, dossier findings, document verification matrix,
 * inspection modal, workflow timeline, and transition execution with justification.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CaseDetailPage } from '../pages/CaseDetailPage';
import { scrutinyService } from '../api/services/scrutinyService';
import { workflowService } from '../api/services/workflowService';
import { dossierService } from '../api/services/dossierService';
import { documentsService } from '../api/services/documentsService';
import { ApplicationStatus } from '../applications/types';
import { UserRole } from '../api/types';
import { ApiClientError } from '../api/client';
import {
  DossierReport,
  WorkflowTimelineEvent,
  AllowedTransition,
} from '../scrutiny/types';

describe('Case Detail & Evidence Review (FE-04)', () => {
  const mockApplication = {
    id: 'app-test-uuid-001',
    applicationNumber: 'APP-2026-EN001',
    institutionId: 'inst-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.SUBMITTED,
    programType: 'Engineering & Technology',
    institution: {
      id: 'inst-001',
      name: 'Apex Institute of Technology',
      registrationNumber: 'REG-MH-2026-001',
      district: 'Pune',
      state: 'Maharashtra',
    },
    payloadJsonb: {
      landAcres: 5.5,
      builtUpAreaSqm: 12500,
      totalFaculty: 48,
      phdFaculty: 16,
      totalBooks: 15000,
      totalComputers: 320,
      internetBandwidthMbps: 500,
      barrierFreeAccess: true,
      fireSafetyCompliant: true,
      courses: [
        {
          courseName: 'Computer Science and Engineering',
          level: 'UG',
          intake: 120,
        },
      ],
    },
    submittedAt: '2026-10-25T10:00:00.000Z',
    createdAt: '2026-10-25T08:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  };

  const mockTimelineEvents: WorkflowTimelineEvent[] = [
    {
      id: 'event-001',
      applicationId: 'app-test-uuid-001',
      fromStatus: ApplicationStatus.DRAFT,
      toStatus: ApplicationStatus.SUBMITTED,
      eventType: 'APPLICATION_SUBMITTED',
      actorId: 'user-001',
      actorRole: UserRole.INSTITUTION_USER,
      comment: 'Initial application submission with all mandatory statutory documents.',
      correlationId: 'corr-001',
      metadata: {},
      createdAt: '2026-10-25T10:00:00.000Z',
    },
  ];

  const mockDossierReport: DossierReport = {
    applicationId: 'app-test-uuid-001',
    applicationNumber: 'APP-2026-EN001',
    institutionId: 'inst-001',
    institutionName: 'Apex Institute of Technology',
    programType: 'Engineering & Technology',
    academicYear: '2026-2027',
    overallStatus: 'REQUIRES_REVIEW',
    evaluatedAt: '2026-10-25T10:05:00.000Z',
    isAdvisory: true,
    disclaimer:
      'This automated dossier verification report provides advisory decision support for AICTE scrutiny officers. All findings must be reviewed by authorized human evaluators.',
    summary: {
      totalDocuments: 2,
      totalRulesEvaluated: 12,
      criticalDeficienciesCount: 1,
      advisoryFlagsCount: 1,
      compliantCount: 10,
      hasCriticalDeficiency: true,
      duplicateMatchCount: 0,
      integrityAnomalyCount: 0,
      issuerVerificationSummary: {
        totalEligible: 2,
        verifiedCount: 1,
        discrepancyCount: 0,
        simulatedCount: 1,
        pendingCount: 0,
      },
      infrastructureReviewSummary: {
        landCompliant: true,
        builtUpAreaCompliant: false,
        barrierFreeDeclared: true,
        fireSafetyValid: true,
        evcInspectionRecommended: true,
        inspectionTriggerReasons: [
          'Built-up area requires physical floor verification.',
        ],
        heuristicLimitations: [],
      },
      requiresPhysicalInspection: true,
    },
    findings: [
      {
        id: 'find-001',
        category: 'COMPLIANCE',
        ruleCode: 'BUILT_UP_AREA_MINIMUM',
        ruleDescription: 'Instructional built-up area requirement for 120 intake',
        severity: 'CRITICAL_DEFICIENCY',
        outcome: 'FAILED',
        message: 'Built-up area shortfall detected based on submitted architectural blueprint.',
        expectedValue: '14,000 sqm',
        actualValue: '12,500 sqm',
        isAdvisory: true,
        boundingLocation: {
          pageNumber: 2,
          x: 0.15,
          y: 0.35,
          width: 0.4,
          height: 0.2,
        },
      },
      {
        id: 'find-002',
        category: 'DOCUMENT_EXPIRY',
        ruleCode: 'FIRE_SAFETY_VALIDITY',
        ruleDescription: 'Fire safety certificate must be valid for at least 6 months',
        severity: 'ADVISORY_FLAG',
        outcome: 'WARNING',
        message: 'Certificate expires within 90 days of anticipated academic term start.',
        isAdvisory: true,
      },
    ],
    documentMatrix: [
      {
        documentId: 'doc-001',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_title_apex.pdf',
        fileSizeBytes: 2048500,
        mimeType: 'application/pdf',
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ocrConfidence: 0.94,
        processingStatus: 'OCR_EXTRACTED',
        duplicateStatus: 'UNIQUE',
        integrityStatus: 'VALID',
        integrityAnomalyCodes: [],
        issuerStatus: 'VERIFIED',
        extractedFieldCount: 4,
        extractedFields: {
          surveyNumber: '42/1-B',
          ownerName: 'Apex Education Society',
          totalAcres: '5.5',
          registrationDate: '2018-04-12',
        },
      },
    ],
  };

  const mockAllowedTransitions: AllowedTransition[] = [
    {
      toStatus: ApplicationStatus.UNDER_SCRUTINY,
      eventType: 'COMMENCE_SCRUTINY',
      description: 'Scrutiny Officer commences documentary review.',
      requiresComment: false,
    },
    {
      toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
      eventType: 'DEFICIENCY_NOTICE',
      description: 'Deficiencies identified requiring institutional clarification and document resubmission.',
      requiresComment: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(scrutinyService, 'getCaseDetails').mockResolvedValue(mockApplication);
    vi.spyOn(workflowService, 'getTimeline').mockResolvedValue({
      items: mockTimelineEvents,
      pagination: {
        page: 1,
        limit: 100,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    vi.spyOn(workflowService, 'getAllowedTransitions').mockResolvedValue(mockAllowedTransitions);
    vi.spyOn(dossierService, 'getDossierReport').mockResolvedValue(mockDossierReport);
    vi.spyOn(dossierService, 'evaluateDossier').mockResolvedValue(mockDossierReport);
    vi.spyOn(workflowService, 'executeTransition').mockResolvedValue({
      success: true,
      previousStatus: ApplicationStatus.SUBMITTED,
      currentStatus: ApplicationStatus.DEFICIENCY_ISSUED,
      eventType: 'DEFICIENCY_NOTICE',
      timestamp: '2026-10-25T11:00:00.000Z',
    });
    vi.spyOn(documentsService, 'downloadDocument').mockResolvedValue({
      blob: new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' }),
      fileName: 'land_title_apex.pdf',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderCaseDetail = (appId = 'app-test-uuid-001') => {
    return render(
      <MemoryRouter initialEntries={[`/scrutiny/${appId}`]}>
        <Routes>
          <Route path="/scrutiny/:applicationId" element={<CaseDetailPage />} />
          <Route path="/scrutiny" element={<div data-testid="scrutiny-queue-view">Queue</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('loads case details, case header, and ADR-004 human sovereignty banner', async () => {
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EN001')).toBeInTheDocument();
      expect(screen.getByText('Apex Institute of Technology')).toBeInTheDocument();
      expect(screen.getByText(/ADR-004 Human Sovereignty Advisory Boundary/i)).toBeInTheDocument();
      expect(
        screen.getByText(/This automated dossier verification report provides advisory decision support/i),
      ).toBeInTheDocument();
    });
  });

  it('renders dossier findings tab with consolidated disposition, KPI tiles, and findings', async () => {
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText(/Requires Review \(Advisory Flags\)/i)).toBeInTheDocument();
      expect(screen.getByText('Built-up area shortfall detected based on submitted architectural blueprint.')).toBeInTheDocument();
      expect(screen.getByText('On-Site Expert Visit Committee (EVC) Inspection Recommended')).toBeInTheDocument();
      expect(screen.getByText('Built-up area requires physical floor verification.')).toBeInTheDocument();
    });
  });

  it('filters findings by severity buttons', async () => {
    const user = userEvent.setup();
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText('Instructional built-up area requirement for 120 intake')).toBeInTheDocument();
    });

    // Click Critical Filter
    const criticalBtn = screen.getByRole('button', { name: /Critical \(1\)/i });
    await user.click(criticalBtn);

    expect(screen.getByText('Instructional built-up area requirement for 120 intake')).toBeInTheDocument();
    expect(screen.queryByText('Fire safety certificate must be valid for at least 6 months')).not.toBeInTheDocument();
  });

  it('switches to document verification matrix tab and displays document attachments', async () => {
    const user = userEvent.setup();
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EN001')).toBeInTheDocument();
    });

    const matrixTab = screen.getByRole('tab', { name: /Document Verification Matrix/i });
    await user.click(matrixTab);

    await waitFor(() => {
      expect(screen.getByText('LAND_TITLE_DEED')).toBeInTheDocument();
      expect(screen.getByText(/land_title_apex\.pdf/i)).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument();
      expect(screen.getByText('Unique')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('inspects document and displays extracted statutory fields modal', async () => {
    const user = userEvent.setup();
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EN001')).toBeInTheDocument();
    });

    const matrixTab = screen.getByRole('tab', { name: /Document Verification Matrix/i });
    await user.click(matrixTab);

    await waitFor(() => {
      expect(screen.getByText('LAND_TITLE_DEED')).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole('button', { name: /Inspect LAND_TITLE_DEED/i });
    await user.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText(/Document Inspection — LAND_TITLE_DEED/i)).toBeInTheDocument();
      expect(screen.getByText('surveyNumber')).toBeInTheDocument();
      expect(screen.getByText('42/1-B')).toBeInTheDocument();
      expect(screen.getByText('Apex Education Society')).toBeInTheDocument();
    });
  });

  it('switches to timeline tab and displays audit events', async () => {
    const user = userEvent.setup();
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EN001')).toBeInTheDocument();
    });

    const timelineTab = screen.getByRole('tab', { name: /Case Timeline & History/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText('Application Submitted')).toBeInTheDocument();
      expect(
        screen.getByText('Initial application submission with all mandatory statutory documents.'),
      ).toBeInTheDocument();
    });
  });

  it('enforces mandatory justification comment when issuing a deficiency notice', async () => {
    const user = userEvent.setup();
    renderCaseDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Issue Deficiency Notice/i })).toBeInTheDocument();
    });

    // Click Issue Deficiency Notice button to open transition modal
    const deficiencyBtn = screen.getByRole('button', { name: /Issue Deficiency Notice/i });
    await user.click(deficiencyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Issue Regulatory Deficiency Notice \(Clarification\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Mandatory Regulatory Justification \/ Deficiency Specifications/i),
      ).toBeInTheDocument();
    });

    // Try submitting without comment
    const executeBtn = screen.getByRole('button', { name: /Execute Transition/i });
    await user.click(executeBtn);

    // Verify inline validation error
    await waitFor(() => {
      expect(
        screen.getByText(/A formal review justification or deficiency explanation is mandatory/i),
      ).toBeInTheDocument();
    });
    expect(workflowService.executeTransition).not.toHaveBeenCalled();

    // Type mandatory comment
    const textarea = screen.getByRole('textbox', {
      name: /Mandatory Regulatory Justification \/ Deficiency Specifications/i,
    });
    await user.type(
      textarea,
      'Architectural blueprint shows 12,500 sqm built-up area; norm requires 14,000 sqm for approved intake.',
    );

    await user.click(executeBtn);

    await waitFor(() => {
      expect(workflowService.executeTransition).toHaveBeenCalledWith('app-test-uuid-001', {
        targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
        comment:
          'Architectural blueprint shows 12,500 sqm built-up area; norm requires 14,000 sqm for approved intake.',
      });
      expect(screen.getByText(/Workflow State Transition Recorded/i)).toBeInTheDocument();
    });
  });

  it('renders 404 not found state when application does not exist', async () => {
    vi.spyOn(scrutinyService, 'getCaseDetails').mockRejectedValueOnce(
      new ApiClientError({ message: 'Application record not found', statusCode: 404 }),
    );

    renderCaseDetail('non-existent-uuid');

    await waitFor(() => {
      expect(screen.getByText(/Application Case Not Found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Scrutiny Queue/i })).toBeInTheDocument();
    });
  });

  it('renders 403 access forbidden state when cross-tenant access is denied', async () => {
    vi.spyOn(scrutinyService, 'getCaseDetails').mockRejectedValueOnce(
      new ApiClientError({ message: 'Forbidden tenant access', statusCode: 403 }),
    );

    renderCaseDetail('foreign-tenant-uuid');

    await waitFor(() => {
      expect(screen.getByText(/Access Forbidden/i)).toBeInTheDocument();
      expect(
        screen.getByText(/strictly isolated to their own institution records under multi-tenant security boundaries/i),
      ).toBeInTheDocument();
    });
  });
});
