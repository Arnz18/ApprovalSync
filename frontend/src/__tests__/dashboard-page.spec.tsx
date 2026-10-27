/**
 * ApprovalSync — Role-Specific Dashboard Page Test Suite
 * Milestone: FE-05
 *
 * Tests role-based dashboard rendering, institutional tenancy isolation,
 * critical timer controls, partial API failure isolation, and tab navigation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { AuthContext } from '../auth/AuthContext';
import { AuthContextValue, AuthUser } from '../auth/types';
import { applicationsService } from '../api/services/applicationsService';
import { slaService } from '../api/services/slaService';
import { ApplicationProjection } from '../applications/types';
import {
  UserRole,
  ApplicationStatus,
  SlaTimerStatus,
  SlaTier,
  SlaEscalationLevel,
} from '../sla/types';

describe('DashboardPage & Role Dashboards (FE-05)', () => {
  const mockApplications: ApplicationProjection[] = [
    {
      id: 'app-001',
      applicationNumber: 'AICTE-2026-ENGG-001',
      institutionId: 'inst-123',
      academicYear: '2026-2027',
      status: ApplicationStatus.UNDER_SCRUTINY,
      programType: 'Undergraduate Engineering',
      payloadJsonb: {},
      submittedAt: '2026-10-21T00:00:00.000Z',
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
    {
      id: 'app-002',
      applicationNumber: 'AICTE-2026-MGMT-002',
      institutionId: 'inst-123',
      academicYear: '2026-2027',
      status: ApplicationStatus.DEFICIENCY_ISSUED,
      programType: 'Postgraduate Management',
      payloadJsonb: {},
      submittedAt: '2026-10-18T00:00:00.000Z',
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-22T00:00:00.000Z',
    },
    {
      id: 'app-003',
      applicationNumber: 'AICTE-2026-POLY-003',
      institutionId: 'inst-123',
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Diploma in Engineering',
      payloadJsonb: {},
      submittedAt: null,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
  ];

  const mockActiveTimer = {
    id: 'timer-001',
    applicationId: 'app-001',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_1_RO_ALERT,
    status: SlaTimerStatus.ACTIVE,
    policyId: 'POL_1',
    startedAt: '2026-10-21T00:00:00.000Z',
    targetDeadline: '2026-11-05T00:00:00.000Z',
    warningDeadline: '2026-11-02T00:00:00.000Z',
    isWarningSent: true,
    isBreached: false,
    escalatedAt: null,
    pausedAt: null,
    resumedAt: null,
    totalPausedMs: 0,
    pauseReason: null,
    pausedById: null,
    completedAt: null,
    cancelledAt: null,
    lastEvaluatedAt: null,
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
  };

  const mockEscalations = {
    data: [
      {
        id: 'esc-001',
        timerId: 'timer-001',
        applicationId: 'app-001',
        stage: ApplicationStatus.UNDER_SCRUTINY,
        tier: SlaTier.TIER_1_RO_ALERT,
        escalationLevel: SlaEscalationLevel.WARNING,
        idempotencyKey: 'key-1',
        targetRole: UserRole.SCRUTINY_OFFICER,
        policyId: 'POL_1',
        policyVersion: '1.0.0',
        targetDeadline: '2026-11-05T00:00:00.000Z',
        detectedAt: '2026-10-25T12:00:00.000Z',
        recipientDetailsJsonb: {},
        isDispatched: true,
        createdAt: '2026-10-25T12:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const mockPolicies = [
    {
      id: 'POL_SCRUTINY',
      name: 'Scrutiny Document Review SLA',
      description: 'Document verification timeline',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_1_RO_ALERT,
      duration: 15,
      unit: 'DAYS' as const,
      warningThresholdFraction: 0.8,
      breachThresholdFraction: 1.0,
      warningTargetRole: UserRole.SCRUTINY_OFFICER,
      breachTargetRole: UserRole.REGIONAL_OFFICER,
      canPause: true,
      classification: 'ILLUSTRATIVE_DEMO' as const,
      sourceReference: 'AICTE APH 2024-25 Benchmark',
      version: '1.0.0',
      isActive: true,
      disclaimer: 'Illustrative demonstration SLA policy only.',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(applicationsService, 'listApplications').mockResolvedValue({
      items: mockApplications,
      pagination: {
        page: 1,
        limit: 50,
        totalItems: mockApplications.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    vi.spyOn(slaService, 'getActiveTimer').mockResolvedValue(mockActiveTimer);
    vi.spyOn(slaService, 'getEscalations').mockResolvedValue(mockEscalations);
    vi.spyOn(slaService, 'getPolicies').mockResolvedValue(mockPolicies);
  });

  function renderWithRole(role: UserRole) {
    const mockUser: AuthUser = {
      id: 'test-user-id',
      email: 'test.user@synthetic.approvalsync.local',
      name: 'Test Authorized User',
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
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <DashboardPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  }

  it('renders InstitutionDashboard for INSTITUTION_USER with tenant-scoped applications', async () => {
    renderWithRole(UserRole.INSTITUTION_USER);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Institution Representative Dashboard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/My Institution's Applications/i)).toBeInTheDocument();
      expect(screen.getByText('AICTE-2026-ENGG-001')).toBeInTheDocument();
      expect(screen.getByText('AICTE-2026-MGMT-002')).toBeInTheDocument();
      expect(screen.getByText('AICTE-2026-POLY-003')).toBeInTheDocument();
      expect(screen.getByText(/Regulatory Clarification Required/i)).toBeInTheDocument();
    });

    // Escalation list should NOT be rendered for institution users
    expect(screen.queryByText('Recorded SLA Escalations')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Authoritative SLA Timer Database Reconciliation/i),
    ).not.toBeInTheDocument();
  });

  it('renders ScrutinyDashboard for SCRUTINY_OFFICER with queue workload and critical timers', async () => {
    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Scrutiny Officer Dashboard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Active Scrutiny Workload')).toBeInTheDocument();
      expect(screen.getByText(/Scrutiny Escalation Events/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Scrutiny Queue/i })).toBeInTheDocument();
    });
  });

  it('renders RegionalDashboard for REGIONAL_OFFICER with regional workload and escalations', async () => {
    renderWithRole(UserRole.REGIONAL_OFFICER);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Regional Officer Dashboard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Regional Workload')).toBeInTheDocument();
      expect(screen.getByText(/Regional Escalations Log/i)).toBeInTheDocument();
    });
  });

  it('renders BureauDashboard for BUREAU_HEAD with council overview and policy trigger', async () => {
    renderWithRole(UserRole.BUREAU_HEAD);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Bureau Head Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('Council Total Intake')).toBeInTheDocument();
      expect(screen.getByText('Inspect SLA Policies')).toBeInTheDocument();
      expect(screen.getByText(/Council Escalation Event History/i)).toBeInTheDocument();
    });
  });

  it('renders AuditorAdminDashboard with manual reconciliation banner for SYSTEM_ADMIN', async () => {
    renderWithRole(UserRole.SYSTEM_ADMIN);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /System Administrator Dashboard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /Authoritative SLA Timer Database Reconciliation/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('Run Reconciliation Sweep')).toBeInTheDocument();
    });
  });

  it('renders read-only AuditorAdminDashboard without mutation buttons for AUDITOR', async () => {
    renderWithRole(UserRole.AUDITOR);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Independent Auditor Dashboard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Read-only independent audit oversight/i)).toBeInTheDocument();
    });

    // Zero mutation controls
    expect(screen.queryByText('Run Reconciliation Sweep')).not.toBeInTheDocument();
    expect(screen.queryByText('Pause Clock')).not.toBeInTheDocument();
    expect(screen.queryByText('Resume Clock')).not.toBeInTheDocument();
  });

  it('isolates partial API failures so application data still displays if escalations fail', async () => {
    vi.spyOn(slaService, 'getEscalations').mockRejectedValue(
      new Error('SLA escalation service connection timed out'),
    );

    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      // Applications still loaded and rendered
      expect(screen.getByText('Active Scrutiny Workload')).toBeInTheDocument();
      // Partial failure warning banner rendered
      expect(screen.getByText(/Escalations Seam Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Escalation records could not be retrieved/i)).toBeInTheDocument();
    });
  });

  it('switches to Derived Operational Alerts tab and displays server alerts', async () => {
    renderWithRole(UserRole.SCRUTINY_OFFICER);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Derived Operational Alerts/i })).toBeInTheDocument();
    });

    const alertsTab = screen.getByRole('tab', { name: /Derived Operational Alerts/i });
    fireEvent.click(alertsTab);

    expect(
      screen.getByRole('heading', { name: /Derived Operational Alerts/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/TIER 1 RO ALERT Escalation Event/i)).toBeInTheDocument();
  });

  it('displays permission-aware warning for SHC_SAC_MEMBER when applications fail with 403', async () => {
    vi.spyOn(applicationsService, 'listApplications').mockRejectedValue(
      new Error('Forbidden: User does not hold required regulatory permissions'),
    );

    renderWithRole(UserRole.SHC_SAC_MEMBER);

    await waitFor(() => {
      expect(
        screen.getByText(/Committee Application Access Notice \(DEF-BE-01\)/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId('shc-dashboard-guidance')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Standing Hearing Committee \(SHC\) application read authorization is pending/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
