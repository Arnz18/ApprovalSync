/**
 * ApprovalSync — EVC Queue & Application Selection Test Suite
 * Milestone: FE-06
 * Tests queue rendering, filters, search, pagination, summary indicators,
 * compliance report enrichment, and error boundaries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { EvcQueuePage } from '../pages/EvcQueuePage';
import { evcService } from '../api/services/evcService';
import { ApplicationStatus } from '../applications/types';
import { ApiClientError } from '../api/client';
import { EvcQueueItem, ComplianceAssessmentResult } from '../evc/types';

// Dummy component to test navigation
const DummyEvcCaseDetail = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  return <div data-testid="evc-case-workspace">EVC Case Target: {applicationId}</div>;
};

describe('EVC Queue & Application Selection (FE-06)', () => {
  const mockCompliance1: ComplianceAssessmentResult = {
    applicationId: 'app-001',
    applicationNumber: 'APP-2026-0001',
    institutionId: 'inst-001',
    programType: 'Engineering',
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
      builtUpAreaCompliant: true,
      barrierFreeDeclared: true,
      fireSafetyValid: true,
      evcInspectionRecommended: true,
      inspectionTriggerReasons: ['Floor area discrepancy requiring ground verification'],
      heuristicLimitations: ['Satellite boundary validation unavailable'],
    },
    findings: [],
    disclaimer: 'Advisory heuristics only',
  };

  const mockCompliance2: ComplianceAssessmentResult = {
    applicationId: 'app-002',
    applicationNumber: 'APP-2026-0002',
    institutionId: 'inst-002',
    programType: 'Management',
    academicYear: '2026-2027',
    isAdvisory: true,
    evaluatedAt: '2026-10-25T09:00:00.000Z',
    summary: {
      totalRulesEvaluated: 8,
      criticalDeficienciesCount: 0,
      advisoryFlagsCount: 0,
      compliantCount: 8,
      inspectionRecommendedCount: 0,
      hasCriticalDeficiency: false,
      requiresPhysicalInspection: false,
    },
    infrastructureReview: {
      landCompliant: true,
      builtUpAreaCompliant: true,
      barrierFreeDeclared: true,
      fireSafetyValid: true,
      evcInspectionRecommended: false,
      inspectionTriggerReasons: [],
      heuristicLimitations: [],
    },
    findings: [],
    disclaimer: 'Advisory heuristics only',
  };

  const mockQueueItems: EvcQueueItem[] = [
    {
      id: 'app-001',
      applicationNumber: 'APP-2026-0001',
      institutionId: 'inst-001',
      academicYear: '2026-2027',
      status: ApplicationStatus.RECOMMENDED_FOR_EVC,
      programType: 'Engineering',
      payloadJsonb: {},
      institution: {
        id: 'inst-001',
        name: 'Apex Institute of Technology',
        registrationNumber: 'REG-001',
        district: 'Pune',
        state: 'Maharashtra',
      },
      submittedAt: '2026-10-25T10:00:00.000Z',
      createdAt: '2026-10-25T08:00:00.000Z',
      updatedAt: '2026-10-25T10:00:00.000Z',
      compliance: mockCompliance1,
    },
    {
      id: 'app-002',
      applicationNumber: 'APP-2026-0002',
      institutionId: 'inst-002',
      academicYear: '2026-2027',
      status: ApplicationStatus.EVC_IN_PROGRESS,
      programType: 'Management',
      payloadJsonb: {},
      institution: {
        id: 'inst-002',
        name: 'Beacon Management Academy',
        registrationNumber: 'REG-002',
        district: 'Bengaluru',
        state: 'Karnataka',
      },
      submittedAt: '2026-10-24T12:00:00.000Z',
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-25T09:00:00.000Z',
      compliance: mockCompliance2,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(evcService, 'getEvcQueue').mockResolvedValue({
      items: mockQueueItems,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    vi.spyOn(evcService, 'enrichEvcSummaries').mockResolvedValue({
      'app-001': { compliance: mockCompliance1, dossierSummary: null },
      'app-002': { compliance: mockCompliance2, dossierSummary: null },
    });
  });

  const renderQueuePage = () => {
    return render(
      <MemoryRouter initialEntries={['/evc']}>
        <Routes>
          <Route path="/evc" element={<EvcQueuePage />} />
          <Route path="/evc/:applicationId" element={<DummyEvcCaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders queue page title, ADR-004 disclaimer, and populated table rows', async () => {
    renderQueuePage();

    expect(screen.getByText('EVC Inspection & Committee Queue')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Apex Institute of Technology')).toBeInTheDocument();
      expect(screen.getByText('Beacon Management Academy')).toBeInTheDocument();
    });

    // Check ADR-004 banner
    expect(
      screen.getByText(/ADR-004 Human Sovereignty Governance: Advisory Inspection Signals/i),
    ).toBeInTheDocument();

    // Check Operational Boundary notice
    expect(screen.getByText(/Operational Boundary:/i)).toBeInTheDocument();
  });

  it('filters queue by application status selection', async () => {
    const user = userEvent.setup();
    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Lifecycle Status/i);
    expect(statusSelect).toBeInTheDocument();

    await user.selectOptions(statusSelect, ApplicationStatus.EVC_IN_PROGRESS);

    await waitFor(() => {
      expect(evcService.getEvcQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.EVC_IN_PROGRESS,
        }),
      );
    });
  });

  it('searches applications by text input', async () => {
    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Search Reference/i);
    fireEvent.change(searchInput, { target: { value: 'Apex' } });

    await waitFor(
      () => {
        expect(evcService.getEvcQueue).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Apex',
          }),
        );
      },
      { timeout: 1500 },
    );
  });

  it('displays inspection-recommended indicator and bounded compliance summary', async () => {
    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    // App 1 has evcInspectionRecommended = true
    const siteInspectionBadge = screen.getByText('Inspection Triggered');
    expect(siteInspectionBadge).toBeInTheDocument();

    // App 2 has evcInspectionRecommended = false
    const virtualReviewBadge = screen.getByText('Heuristics Clear');
    expect(virtualReviewBadge).toBeInTheDocument();
  });

  it('handles unavailable compliance report gracefully without crashing', async () => {
    vi.spyOn(evcService, 'enrichEvcSummaries').mockResolvedValue({
      'app-001': { compliance: null, dossierSummary: null },
      'app-002': { compliance: null, dossierSummary: null },
    });

    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    // Should render "Unassessed" fallback rather than breaking
    const pendingBadges = screen.getAllByText('Unassessed');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });

  it('handles server error and provides accessible retry button', async () => {
    vi.spyOn(evcService, 'getEvcQueue').mockRejectedValueOnce(
      new ApiClientError({
        message: 'Database query timed out',
        code: 'ERR_DATABASE_TIMEOUT',
        statusCode: 500,
      }),
    );

    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText(/Queue Retrieval Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Database query timed out/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry refetches
    vi.spyOn(evcService, 'getEvcQueue').mockResolvedValueOnce({
      items: mockQueueItems,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });
  });

  it('handles 403 access forbidden error gracefully', async () => {
    vi.spyOn(evcService, 'getEvcQueue').mockRejectedValueOnce(
      new ApiClientError({
        message: 'User does not hold required regulatory permissions',
        code: 'ERR_ACCESS_DENIED',
        statusCode: 403,
      }),
    );

    renderQueuePage();

    await waitFor(() => {
      expect(
        screen.getByText(/User does not hold required regulatory permissions/i),
      ).toBeInTheDocument();
    });
  });

  it('navigates to case inspection workspace when user clicks Inspect Case', async () => {
    renderQueuePage();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const inspectButtons = screen.getAllByRole('button', {
      name: /open evc inspection workspace for application/i,
    });
    expect(inspectButtons.length).toBe(2);

    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('evc-case-workspace')).toHaveTextContent(
        'EVC Case Target: app-001',
      );
    });
  });
});
