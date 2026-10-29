/**
 * ApprovalSync — EVC Case Detail & Workspace Test Suite
 * Milestone: FE-06
 * Tests case detail loading, infrastructure heuristics, working inspection checklist aid,
 * expert scheduling boundary, committee hearing review, audit timeline, and transition execution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EvcCaseDetailPage } from '../pages/EvcCaseDetailPage';
import { evcService } from '../api/services/evcService';
import { complianceService } from '../api/services/complianceService';
import { workflowService } from '../api/services/workflowService';
import { applicationsService } from '../api/services/applicationsService';
import { documentsService } from '../api/services/documentsService';
import {
  ApplicationProjection,
  ApplicationStatus,
  DocumentMetadataProjection,
  DocumentProcessingStatus,
} from '../applications/types';
import { UserRole } from '../api/types';
import { ApiClientError } from '../api/client';
import { ComplianceAssessmentResult } from '../evc/types';
import { AllowedTransition, WorkflowTimelineEvent } from '../scrutiny/types';

describe('EVC Case Detail & Inspection Workspace (FE-06)', () => {
  const mockApplication = {
    id: 'app-evc-test-001',
    applicationNumber: 'APP-2026-EVC01',
    institutionId: 'inst-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.RECOMMENDED_FOR_EVC,
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
      barrierFreeAccess: true,
      fireSafetyCompliant: true,
    },
    submittedAt: '2026-10-25T10:00:00.000Z',
    createdAt: '2026-10-25T08:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  };

  const mockCompliance: ComplianceAssessmentResult = {
    applicationId: 'app-evc-test-001',
    applicationNumber: 'APP-2026-EVC01',
    institutionId: 'inst-001',
    programType: 'Engineering & Technology',
    academicYear: '2026-2027',
    isAdvisory: true,
    evaluatedAt: '2026-10-25T10:00:00.000Z',
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
      inspectionTriggerReasons: [
        'Built-up floor area falls below prescribed norms for requested intake',
      ],
      heuristicLimitations: [
        'Architectural drawing verification requires on-site dimension measurement',
      ],
    },
    findings: [
      {
        id: 'finding-001',
        findingCode: 'INFRA_AREA_DEFICIENCY',
        title: 'Built-up Area Discrepancy',
        description: 'Declared instructional area is 200 sqm less than statutory requirement.',
        severity: 'CRITICAL_DEFICIENCY',
        isAdvisory: true,
        category: 'INFRASTRUCTURE',
        ruleCode: 'APH-2026-INFRA-04',
        evidence: [],
        requiresPhysicalInspection: true,
        recommendedAction: 'Verify physical dimensions on-site during ground visit.',
        limitations: ['Blueprint dimension validation only'],
      },
      {
        id: 'finding-002',
        findingCode: 'BARRIER_FREE_FLAG',
        title: 'Ramp Gradient Observation',
        description: 'Ramp slope ratio to entrance requires physical inspection check.',
        severity: 'ADVISORY_FLAG',
        isAdvisory: true,
        category: 'SAFETY_ACCESSIBILITY',
        ruleCode: 'APH-2026-ACCESS-01',
        evidence: [],
        requiresPhysicalInspection: true,
        recommendedAction: 'Inspect slope grade and grab rails.',
        limitations: ['Ramp grade unverified'],
      },
    ],
    disclaimer: 'Advisory heuristics only',
  };

  const mockDocuments: DocumentMetadataProjection[] = [
    {
      id: 'doc-001',
      applicationId: 'app-evc-test-001',
      documentType: 'LAND_TITLE',
      fileName: 'land_title_deed.pdf',
      fileSizeBytes: 2450000,
      mimeType: 'application/pdf',
      sha256Checksum: 'a1b2c3d4e5f6',
      processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
      uploadedAt: '2026-10-25T08:30:00.000Z',
    },
    {
      id: 'doc-002',
      applicationId: 'app-evc-test-001',
      documentType: 'BUILDING_SANCTION_PLAN',
      fileName: 'approved_building_plan.pdf',
      fileSizeBytes: 4120000,
      mimeType: 'application/pdf',
      sha256Checksum: 'b2c3d4e5f6a1',
      processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
      uploadedAt: '2026-10-25T08:35:00.000Z',
    },
  ];

  const mockAllowedTransitions: AllowedTransition[] = [
    {
      toStatus: ApplicationStatus.EVC_IN_PROGRESS,
      eventType: 'EVC_INSPECTION_STARTED',
      description: 'Initiate on-site inspection visit',
      requiresComment: false,
      allowedRoles: [UserRole.EVC_INSPECTOR, UserRole.REGIONAL_OFFICER, UserRole.SYSTEM_ADMIN],
    },
    {
      toStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
      eventType: 'RECOMMENDED_FOR_SHC',
      description: 'Escalate to Standing Hearing Committee',
      requiresComment: true,
      allowedRoles: [UserRole.EVC_INSPECTOR, UserRole.REGIONAL_OFFICER, UserRole.SYSTEM_ADMIN],
    },
  ];

  const mockTimelineEvents: WorkflowTimelineEvent[] = [
    {
      id: 'event-001',
      applicationId: 'app-evc-test-001',
      fromStatus: ApplicationStatus.SUBMITTED,
      toStatus: ApplicationStatus.UNDER_SCRUTINY,
      eventType: 'SCRUTINY_STARTED',
      actorId: 'user-scrutiny-01',
      actorRole: UserRole.SCRUTINY_OFFICER,
      comment: 'Initial document scrutiny initialized.',
      metadata: {},
      createdAt: '2026-10-25T08:30:00.000Z',
    },
    {
      id: 'event-002',
      applicationId: 'app-evc-test-001',
      fromStatus: ApplicationStatus.UNDER_SCRUTINY,
      toStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
      eventType: 'RECOMMENDED_FOR_EVC',
      actorId: 'user-scrutiny-01',
      actorRole: UserRole.SCRUTINY_OFFICER,
      comment: 'Physical verification required for built-up area and barrier-free access.',
      metadata: {},
      createdAt: '2026-10-25T09:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(evcService, 'getCaseDetails').mockResolvedValue(
      mockApplication as unknown as ApplicationProjection,
    );
    vi.spyOn(complianceService, 'getApplicationCompliance').mockResolvedValue(mockCompliance);
    vi.spyOn(complianceService, 'evaluateCompliance').mockResolvedValue(mockCompliance);
    vi.spyOn(workflowService, 'getAllowedTransitions').mockResolvedValue(mockAllowedTransitions);
    vi.spyOn(workflowService, 'getEvcSchedule').mockResolvedValue(null);
    vi.spyOn(workflowService, 'getTimeline').mockResolvedValue({
      items: mockTimelineEvents,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    vi.spyOn(applicationsService, 'getApplicationDocuments').mockResolvedValue(mockDocuments);
    vi.spyOn(documentsService, 'downloadDocument').mockResolvedValue({
      blob: new Blob(['pdf content']),
      fileName: 'land_title_deed.pdf',
      mimeType: 'application/pdf',
    });
  });

  const renderCaseDetailPage = () => {
    return render(
      <MemoryRouter initialEntries={['/evc/app-evc-test-001']}>
        <Routes>
          <Route path="/evc/:applicationId" element={<EvcCaseDetailPage />} />
          <Route path="/evc" element={<div data-testid="evc-queue-view">EVC Queue Return</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('loads case details, case header, and ADR-004 human sovereignty banner', async () => {
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
      expect(screen.getByText('Apex Institute of Technology')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/ADR-004 Human Sovereignty Governance: Advisory Decision Support/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /All automated compliance heuristics, deficiency flags, and physical inspection recommendations are decision-support inputs only/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders Infrastructure & Compliance (DOC-06) tab with sanity heuristics and findings matrix', async () => {
    renderCaseDetailPage();

    await waitFor(() => {
      expect(
        screen.getByText('Physical Infrastructure Sanity Heuristics (DOC-06)'),
      ).toBeInTheDocument();
    });

    // Check infrastructure metrics
    expect(screen.getByText(/On-Site EVC Inspection Triggers/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Built-up floor area falls below prescribed norms/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Architectural drawing verification requires on-site dimension measurement/i,
      ),
    ).toBeInTheDocument();

    // Check findings matrix
    expect(screen.getByText('Built-up Area Discrepancy')).toBeInTheDocument();
    expect(screen.getByText('Ramp Gradient Observation')).toBeInTheDocument();
  });

  it('switches to Inspection Checklist & Evidence Aid tab and toggles local checklist items', async () => {
    const user = userEvent.setup();
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
    });

    // Click on Tab 2
    const checklistTab = screen.getByRole('tab', { name: /inspection checklist & evidence aid/i });
    await user.click(checklistTab);

    // Verify statutory attachments
    await waitFor(() => {
      expect(screen.getByText('Submitted Documentary Evidence')).toBeInTheDocument();
      expect(screen.getByText('land_title_deed.pdf')).toBeInTheDocument();
      expect(screen.getByText('approved_building_plan.pdf')).toBeInTheDocument();
    });

    // Verify download trigger
    const downloadBtns = screen.getAllByRole('button', { name: /inspect attachment/i });
    expect(downloadBtns.length).toBeGreaterThan(0);
    await user.click(downloadBtns[0]);
    expect(documentsService.downloadDocument).toHaveBeenCalledWith('doc-001');

    // Verify working inspection checklist aid (non-persisted note)
    expect(screen.getByText('On-Site Physical Inspection Checklist Aid')).toBeInTheDocument();
    expect(
      screen.getByText(/Working Inspection Aid \(Client-Side Local Draft/i),
    ).toBeInTheDocument();

    // Toggle checklist verification state
    const verifyButtons = screen.getAllByRole('button', { name: /verified/i });
    expect(verifyButtons.length).toBeGreaterThan(0);
    await user.click(verifyButtons[0]);

    // Should indicate verified in state
    expect(screen.getByText('1 Verified')).toBeInTheDocument();
  });

  it('switches to Expert Scheduling & Roster tab and displays contract boundary explanation', async () => {
    const user = userEvent.setup();
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
    });

    const schedulingTab = screen.getByRole('tab', { name: /expert scheduling & roster/i });
    await user.click(schedulingTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Expert Visit Committee \(EVC\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Expert Committee Members/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Persist EVC Schedule/i })).toBeInTheDocument();
  });

  it('switches to Committee Review & Hearing (SHC) tab and verifies authorized decisions and escalation provenance', async () => {
    const user = userEvent.setup();
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
    });

    const committeeTab = screen.getByRole('tab', { name: /committee review & hearing/i });
    await user.click(committeeTab);

    await waitFor(() => {
      expect(screen.getByText(/Committee Workspace Context/i)).toBeInTheDocument();
      expect(screen.getByText('Escalation Provenance & Audit Trail')).toBeInTheDocument();
      expect(
        screen.getByText(/Material Discrepancies & Compliance Deficiencies \(DOC-06\)/i),
      ).toBeInTheDocument();
    });

    // Check proposed committee contract
    expect(
      screen.getByText(
        /Proposed Backend Contract Proposal: Committee Minutes & Hearing Records API/i,
      ),
    ).toBeInTheDocument();
  });

  it('switches to Audit Timeline tab and renders chronological events', async () => {
    const user = userEvent.setup();
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
    });

    const timelineTab = screen.getByRole('tab', { name: /audit timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText('Scrutiny Started')).toBeInTheDocument();
      expect(screen.getByText('Recommended For Evc')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Physical verification required for built-up area and barrier-free access.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('executes workflow transition with modal dialog and mandatory comment handling', async () => {
    const user = userEvent.setup();
    renderCaseDetailPage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-EVC01')).toBeInTheDocument();
    });

    // Find and click the transition button: "Escalate to SHC Committee"
    const transitionBtn = screen.getByRole('button', {
      name: /escalate to shc committee/i,
    });
    expect(transitionBtn).toBeInTheDocument();
    await user.click(transitionBtn);

    // Modal should open
    await waitFor(() => {
      expect(
        screen.getByText('Recommend for Standing Hearing Committee (SHC)'),
      ).toBeInTheDocument();
    });

    vi.spyOn(workflowService, 'executeTransition').mockResolvedValue({
      success: true,
      applicationId: 'app-evc-test-001',
      applicationNumber: 'APP-2026-EVC01',
      previousStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
      currentStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
      timelineEvent: mockTimelineEvents[1],
    });

    // Enter comment justification
    const commentInput = screen.getByRole('textbox');
    await user.type(commentInput, 'Escalating to SHC due to unresolved built-up area discrepancy.');

    // Confirm transition
    const confirmBtn = screen.getByRole('button', { name: /execute transition/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(workflowService.executeTransition).toHaveBeenCalledWith(
        'app-evc-test-001',
        expect.objectContaining({
          targetStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
          comment: 'Escalating to SHC due to unresolved built-up area discrepancy.',
        }),
      );
    });
  });

  it('handles 404 application not found error and navigates back to queue', async () => {
    vi.spyOn(evcService, 'getCaseDetails').mockRejectedValueOnce(
      new ApiClientError({
        message: 'Application not found',
        code: 'ERR_NOT_FOUND',
        statusCode: 404,
      }),
    );

    renderCaseDetailPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Application not found or inaccessible for the current user/i),
      ).toBeInTheDocument();
    });

    const returnBtn = screen.getByRole('button', { name: /return to evc queue/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('evc-queue-view')).toBeInTheDocument();
    });
  });
});
