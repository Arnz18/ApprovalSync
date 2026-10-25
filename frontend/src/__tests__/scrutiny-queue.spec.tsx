/**
 * ApprovalSync — Scrutiny Queue Test Suite
 * Milestone: FE-04
 * Tests queue rendering, filters, search, pagination, summary indicators, and error boundaries.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { ScrutinyQueuePage } from '../pages/ScrutinyQueuePage';
import { scrutinyService } from '../api/services/scrutinyService';
import { ApplicationStatus } from '../applications/types';
import { ApiClientError } from '../api/client';
import { ScrutinyQueueItem } from '../scrutiny/types';

// Dummy component to test navigation
const DummyCaseDetail = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  return <div data-testid="case-detail-view">Case Detail Target: {applicationId}</div>;
};

describe('Scrutiny Review Queue (FE-04)', () => {
  const mockQueueItems: ScrutinyQueueItem[] = [
    {
      id: 'app-001',
      applicationNumber: 'APP-2026-0001',
      institutionId: 'inst-001',
      academicYear: '2026-2027',
      status: ApplicationStatus.SUBMITTED,
      programType: 'Engineering',
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
      dossierSummary: {
        overallStatus: 'REQUIRES_REVIEW',
        criticalDeficienciesCount: 1,
        advisoryFlagsCount: 2,
        requiresPhysicalInspection: true,
      },
    },
    {
      id: 'app-002',
      applicationNumber: 'APP-2026-0002',
      institutionId: 'inst-002',
      academicYear: '2026-2027',
      status: ApplicationStatus.UNDER_SCRUTINY,
      programType: 'Management',
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
      dossierSummary: {
        overallStatus: 'COMPLIANT',
        criticalDeficienciesCount: 0,
        advisoryFlagsCount: 0,
        requiresPhysicalInspection: false,
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(scrutinyService, 'getQueue').mockResolvedValue({
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

    vi.spyOn(scrutinyService, 'enrichQueueSummaries').mockResolvedValue({
      'app-001': {
        overallStatus: 'REQUIRES_REVIEW',
        criticalDeficienciesCount: 1,
        advisoryFlagsCount: 2,
        requiresPhysicalInspection: true,
      },
      'app-002': {
        overallStatus: 'COMPLIANT',
        criticalDeficienciesCount: 0,
        advisoryFlagsCount: 0,
        requiresPhysicalInspection: false,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/scrutiny']}>
        <Routes>
          <Route path="/scrutiny" element={<ScrutinyQueuePage />} />
          <Route path="/scrutiny/:applicationId" element={<DummyCaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders queue page title, ADR-004 disclaimer, and populated table rows', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Scrutiny Review Queue/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ADR-004 Human Sovereignty Decision Support/i),
      ).toBeInTheDocument();
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Apex Institute of Technology')).toBeInTheDocument();
      expect(screen.getByText('APP-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('Beacon Management Academy')).toBeInTheDocument();
      expect(screen.getByText('EVC Recommended')).toBeInTheDocument();
    });
  });

  it('displays empty state when queue returns zero applications', async () => {
    vi.spyOn(scrutinyService, 'getQueue').mockResolvedValueOnce({
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

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/No Applications Found/i)).toBeInTheDocument();
    });
  });

  it('filters queue by application status selection', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Lifecycle State/i);
    await user.selectOptions(statusSelect, ApplicationStatus.UNDER_SCRUTINY);

    await waitFor(() => {
      expect(scrutinyService.getQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApplicationStatus.UNDER_SCRUTINY,
        }),
      );
    });
  });

  it('searches applications by text input', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by ID, year, or program/i);
    await user.type(searchInput, 'Apex');

    await waitFor(() => {
      expect(scrutinyService.getQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Apex',
        }),
      );
    });
  });

  it('handles server error and provides accessible retry button', async () => {
    vi.spyOn(scrutinyService, 'getQueue')
      .mockRejectedValueOnce(
        new ApiClientError({ message: 'Gateway timeout connecting to database.', statusCode: 504 }),
      )
      .mockResolvedValueOnce({
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

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Queue Retrieval Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Gateway timeout connecting to database/i)).toBeInTheDocument();
    });

    // Click Retry Load
    const retryButton = screen.getByRole('button', { name: /Retry Load/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });
  });

  it('renders access denied alert when user role lacks scrutiny permission (403)', async () => {
    vi.spyOn(scrutinyService, 'getQueue').mockRejectedValueOnce(
      new ApiClientError({ message: 'Forbidden resource', statusCode: 403 }),
    );

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Queue Retrieval Error/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Access Denied: Your account role does not have permission/i),
      ).toBeInTheDocument();
    });
  });

  it('navigates to case detail page when officer clicks Review Case', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('APP-2026-0001')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByRole('button', { name: /Review Case/i });
    expect(reviewButtons.length).toBeGreaterThan(0);
    await user.click(reviewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('case-detail-view')).toHaveTextContent(
        'Case Detail Target: app-001',
      );
    });
  });
});
