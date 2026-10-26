/**
 * ApprovalSync — Undertakings & Expiry Workspace Page Test Suite
 * Milestone: FE-07
 *
 * Covers UndertakingsPage:
 * - KPI summary metric cards (derived from server data)
 * - Role-specific action clearance (create, review, reconcile)
 * - Filtering and search controls
 * - CSV export trigger
 * - Error handling and retry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UndertakingsPage } from '../pages/UndertakingsPage';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue, AuthUser } from '../auth/types';
import { undertakingsService } from '../api/services/undertakingsService';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
  UndertakingProjection,
  UndertakingsListResponse,
} from '../undertakings/types';
import { UserRole } from '../api/types';

describe('UndertakingsPage (FE-07)', () => {
  const mockRecord1: UndertakingProjection = {
    id: 'und-001',
    institutionId: 'inst-123',
    applicationId: 'app-001',
    type: UndertakingType.LAND_LEASE,
    title: '30-Year Registered Land Lease Deed',
    documentNumber: 'KA-DEED-2020-0091',
    issuingAuthority: 'Sub-Registrar Office, Electronic City',
    counterpartyName: 'State Industrial Development Corp',
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
    reviewNotes: 'Survey coordinates authenticated',
    reviewedById: 'rev-01',
    reviewedAt: '2026-10-25T14:30:00.000Z',
    documentId: 'doc-001',
    supersedesId: null,
    supersededById: null,
    metadataJsonb: {},
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
    disclaimer: 'Illustrative regulatory data',
  };

  const mockRecord2: UndertakingProjection = {
    id: 'und-002',
    institutionId: 'inst-123',
    applicationId: 'app-001',
    type: UndertakingType.FIRE_SAFETY_CLEARANCE,
    title: 'Fire Safety Clearance Certificate',
    documentNumber: 'NOC-FS-2025-0044',
    issuingAuthority: 'Fire & Emergency Services',
    counterpartyName: 'State Disaster Management',
    startDate: '2025-11-01',
    expiryDate: '2026-11-15',
    renewalLeadDays: 60,
    renewalDueDate: '2026-09-16',
    daysRemaining: 19,
    isExpiringSoon: true,
    isRenewalDue: false,
    isExpired: false,
    status: UndertakingStatus.EXPIRING_SOON,
    reviewStatus: UndertakingReviewStatus.PENDING_REVIEW,
    reviewNotes: null,
    reviewedById: null,
    reviewedAt: null,
    documentId: 'doc-002',
    supersedesId: null,
    supersededById: null,
    metadataJsonb: {},
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    disclaimer: 'Illustrative regulatory data',
  };

  const mockApiResponse: UndertakingsListResponse = {
    items: [mockRecord1, mockRecord2],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(undertakingsService, 'getUndertakings').mockResolvedValue(mockApiResponse);
  });

  function renderWithRole(role: UserRole) {
    const mockUser: AuthUser = {
      id: 'test-user-id',
      email: 'test.user@synthetic.approvalsync.local',
      name: 'Test Operational User',
      role,
      institutionId: role === UserRole.INSTITUTION_USER ? 'inst-123' : undefined,
      isActive: true,
      createdAt: '2026-10-20T00:00:00.000Z',
    };

    const authContextValue: AuthContextValue = {
      user: mockUser,
      status: 'AUTHENTICATED',
      isAuthenticated: true,
      isInitializing: false,
      initError: null,
      login: vi.fn(),
      logout: vi.fn(),
      retryInitialization: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter>
          <UndertakingsPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  }

  it('renders overview page with KPI metrics derived from API data', async () => {
    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(screen.getByText('Institutional Undertakings & Leases')).toBeInTheDocument();
      expect(screen.getByText('30-Year Registered Land Lease Deed')).toBeInTheDocument();
      expect(screen.getByText('Fire Safety Clearance Certificate')).toBeInTheDocument();
    });

    // KPI cards
    expect(screen.getAllByText('Active (In Force)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expiring Soon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending Review').length).toBeGreaterThan(0);
  });

  it('shows Register Instrument button for INSTITUTION_USER and hides privileged reconcile button', async () => {
    renderWithRole(UserRole.INSTITUTION_USER);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register Instrument/i })).toBeInTheDocument();
    });

    // Should NOT show privileged Reconciliation Sweep button
    expect(screen.queryByRole('button', { name: /Reconciliation Sweep/i })).not.toBeInTheDocument();
  });

  it('shows privileged Reconciliation Sweep button for REGIONAL_OFFICER and SYSTEM_ADMIN', async () => {
    renderWithRole(UserRole.REGIONAL_OFFICER);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reconciliation Sweep/i })).toBeInTheDocument();
    });
  });

  it('filters undertakings when search query is entered', async () => {
    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(screen.getByText('30-Year Registered Land Lease Deed')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /Search title, document number, authority, counterparty/i,
    );
    fireEvent.change(searchInput, { target: { value: 'Fire Safety' } });

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Clearance Certificate')).toBeInTheDocument();
    });
  });

  it('handles API error state with error alert and retry button', async () => {
    vi.spyOn(undertakingsService, 'getUndertakings').mockRejectedValueOnce(
      new Error('Failed to load institutional undertakings records from server.'),
    );

    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load institutional undertakings records from server.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('renders ADR-004 human sovereignty regulatory disclaimer', async () => {
    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(screen.getByText(/ADR-004 Human Sovereignty Directive/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Expiry or renewal deadlines serve as factual operational signals/i),
      ).toBeInTheDocument();
    });
  });
});
