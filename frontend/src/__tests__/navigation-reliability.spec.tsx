import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ScrutinyQueuePage } from '../pages/ScrutinyQueuePage';
import { CaseHeader } from '../components/scrutiny/CaseHeader';
import { scrutinyService } from '../api/services/scrutinyService';
import { ApplicationProjection } from '../applications/types';
import { ApplicationStatus } from '../api/types';

const mockApp: ApplicationProjection = {
  id: 'app-uuid-test-123',
  applicationNumber: 'APP-2026-TEST01',
  institutionId: 'inst-01',
  academicYear: '2026-2027',
  status: ApplicationStatus.SUBMITTED,
  programType: 'Engineering',
  payloadJsonb: {},
  institution: {
    id: 'inst-01',
    name: 'National Test Institute',
    registrationNumber: 'REG-001',
    district: 'Bengaluru',
    state: 'Karnataka',
  },
  submittedAt: '2026-10-25T10:00:00.000Z',
  createdAt: '2026-10-25T08:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
};

const MockCaseDetailPage: React.FC = () => {
  return (
    <div>
      <CaseHeader application={mockApp} onRefresh={vi.fn()} isLoading={false} />
      <div data-testid="case-detail-content">Viewing Case Detail</div>
    </div>
  );
};

describe('Navigation Reliability & Back-Navigation Regression', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(scrutinyService, 'getQueue').mockResolvedValue({
      items: [
        {
          id: 'app-uuid-test-123',
          applicationNumber: 'APP-2026-TEST01',
          institutionId: 'inst-01',
          academicYear: '2026-2027',
          status: ApplicationStatus.SUBMITTED,
          programType: 'Engineering',
          payloadJsonb: {},
          institution: {
            id: 'inst-01',
            name: 'National Test Institute',
            registrationNumber: 'REG-001',
            district: 'Bengaluru',
            state: 'Karnataka',
          },
          submittedAt: '2026-10-25T10:00:00.000Z',
          createdAt: '2026-10-25T08:00:00.000Z',
          updatedAt: '2026-10-25T10:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    vi.spyOn(scrutinyService, 'enrichQueueSummaries').mockResolvedValue({});
  });

  it('renders scrutiny queue and allows navigation to case detail without white screen', async () => {
    render(
      <MemoryRouter initialEntries={['/scrutiny?status=SUBMITTED&search=National']}>
        <Routes>
          <Route path="/scrutiny" element={<ScrutinyQueuePage />} />
          <Route path="/scrutiny/:applicationId" element={<MockCaseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('APP-2026-TEST01')).toBeInTheDocument();
      expect(screen.getByText('National Test Institute')).toBeInTheDocument();
    });

    // Click row or Review Case to navigate
    const viewButton = screen.getByRole('button', { name: /Review Case/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTestId('case-detail-content')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Return to previous queue view/i }),
      ).toBeInTheDocument();
    });
  });

  it('contextual back navigation button triggers history navigation safely', async () => {
    render(
      <MemoryRouter initialEntries={['/scrutiny', '/scrutiny/app-uuid-test-123']}>
        <Routes>
          <Route path="/scrutiny" element={<ScrutinyQueuePage />} />
          <Route path="/scrutiny/:applicationId" element={<MockCaseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('case-detail-content')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Return to previous queue view/i });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);

    // Verifies return to queue does not crash into a white screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Scrutiny Review Queue/i })).toBeInTheDocument();
    });
  });
});
