/**
 * ApprovalSync — SLA Components Test Suite
 * Milestone: FE-05
 *
 * Tests SlaTimerBadge, SlaTimerCard, PauseTimerModal, SlaEscalationList,
 * ManualReconciliationBanner, and DerivedAlertsFeed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SlaTimerBadge } from '../components/sla/SlaTimerBadge';
import { SlaTimerCard } from '../components/sla/SlaTimerCard';
import { PauseTimerModal } from '../components/sla/PauseTimerModal';
import { SlaEscalationList } from '../components/sla/SlaEscalationList';
import { ManualReconciliationBanner } from '../components/sla/ManualReconciliationBanner';
import { DerivedAlertsFeed } from '../components/dashboard/DerivedAlertsFeed';
import { slaService } from '../api/services/slaService';
import {
  SlaTimerProjection,
  SlaEscalationProjection,
  SlaTimerStatus,
  SlaEscalationLevel,
  SlaTier,
  ApplicationStatus,
  UserRole,
} from '../sla/types';

describe('SLA Timer & Escalation Components (FE-05)', () => {
  const mockActiveTimer: SlaTimerProjection = {
    id: 'timer-001',
    applicationId: 'app-uuid-1',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_1_RO_ALERT,
    status: SlaTimerStatus.ACTIVE,
    policyId: 'SLA_UNDER_SCRUTINY_EVALUATION',
    startedAt: '2026-10-20T10:00:00.000Z',
    targetDeadline: '2026-11-04T10:00:00.000Z',
    warningDeadline: '2026-11-01T10:00:00.000Z',
    isWarningSent: false,
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
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  };

  const mockPausedTimer: SlaTimerProjection = {
    ...mockActiveTimer,
    id: 'timer-002',
    status: SlaTimerStatus.PAUSED,
    pausedAt: '2026-10-22T14:30:00.000Z',
    pauseReason: 'Awaiting certified land records revenue clarification',
    totalPausedMs: 3600000,
  };

  const mockBreachedTimer: SlaTimerProjection = {
    ...mockActiveTimer,
    id: 'timer-003',
    status: SlaTimerStatus.BREACHED,
    isBreached: true,
    targetDeadline: '2026-10-22T10:00:00.000Z',
    escalatedAt: '2026-10-22T10:00:00.000Z',
  };

  const mockEscalations: SlaEscalationProjection[] = [
    {
      id: 'esc-001',
      timerId: 'timer-001',
      applicationId: 'app-uuid-1',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_1_RO_ALERT,
      escalationLevel: SlaEscalationLevel.WARNING,
      idempotencyKey: 'key-1',
      targetRole: UserRole.SCRUTINY_OFFICER,
      policyId: 'POL_1',
      policyVersion: '1.0.0',
      targetDeadline: '2026-11-04T10:00:00.000Z',
      detectedAt: '2026-10-24T12:00:00.000Z',
      recipientDetailsJsonb: {},
      isDispatched: true,
      createdAt: '2026-10-24T12:00:00.000Z',
    },
    {
      id: 'esc-002',
      timerId: 'timer-003',
      applicationId: 'app-uuid-2',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_2_DIRECTOR_BREACH,
      escalationLevel: SlaEscalationLevel.BREACH,
      idempotencyKey: 'key-2',
      targetRole: UserRole.REGIONAL_OFFICER,
      policyId: 'POL_2',
      policyVersion: '1.0.0',
      targetDeadline: '2026-10-22T10:00:00.000Z',
      detectedAt: '2026-10-23T08:00:00.000Z',
      recipientDetailsJsonb: {},
      isDispatched: true,
      createdAt: '2026-10-23T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SlaTimerBadge', () => {
    it('renders active, paused, warning, and breached states with semantic labels', () => {
      const { rerender } = render(<SlaTimerBadge status={SlaTimerStatus.ACTIVE} />);
      expect(screen.getByText('SLA Active')).toBeInTheDocument();

      rerender(<SlaTimerBadge status={SlaTimerStatus.PAUSED} />);
      expect(screen.getByText('SLA Paused')).toBeInTheDocument();

      rerender(<SlaTimerBadge urgency="warning" />);
      expect(screen.getByText('SLA Warning')).toBeInTheDocument();

      rerender(<SlaTimerBadge status={SlaTimerStatus.BREACHED} />);
      expect(screen.getByText('SLA Breached')).toBeInTheDocument();

      rerender(<SlaTimerBadge status={SlaTimerStatus.COMPLETED} />);
      expect(screen.getByText('SLA Met')).toBeInTheDocument();
    });
  });

  describe('SlaTimerCard', () => {
    it('renders timer details, stage name, deadlines, and view dossier link', () => {
      render(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockActiveTimer}
            applicationNumber="AICTE-2026-001"
            userRole={UserRole.SCRUTINY_OFFICER}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Stage Timer • UNDER SCRUTINY/i)).toBeInTheDocument();
      expect(screen.getByText(/App #AICTE-2026-001/i)).toBeInTheDocument();
      expect(screen.getByText('SLA Active')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pause Clock/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Dossier/i })).toHaveAttribute(
        'href',
        '/scrutiny/app-uuid-1',
      );
    });

    it('displays pause reason and resume button when timer is paused', async () => {
      const resumeSpy = vi.spyOn(slaService, 'resumeTimer').mockResolvedValue({
        ...mockPausedTimer,
        status: SlaTimerStatus.ACTIVE,
      });

      const onUpdateMock = vi.fn();

      render(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockPausedTimer}
            applicationNumber="AICTE-2026-002"
            userRole={UserRole.REGIONAL_OFFICER}
            onTimerUpdated={onUpdateMock}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText('Clock Frozen')).toBeInTheDocument();
      expect(
        screen.getByText(/Awaiting certified land records revenue clarification/i),
      ).toBeInTheDocument();

      const resumeBtn = screen.getByRole('button', { name: /Resume Clock/i });
      expect(resumeBtn).toBeInTheDocument();

      fireEvent.click(resumeBtn);

      await waitFor(() => {
        expect(resumeSpy).toHaveBeenCalledWith('app-uuid-1');
        expect(onUpdateMock).toHaveBeenCalled();
      });
    });

    it('opens pause modal and validates justification input', async () => {
      render(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockActiveTimer}
            applicationNumber="AICTE-2026-001"
            userRole={UserRole.SCRUTINY_OFFICER}
          />
        </MemoryRouter>,
      );

      const pauseBtn = screen.getByRole('button', { name: /Pause Clock/i });
      fireEvent.click(pauseBtn);

      expect(screen.getByRole('heading', { name: /Freeze Active SLA Clock/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Regulatory Pause Justification/i)).toBeInTheDocument();
    });

    it('hides pause and resume buttons for unauthorized roles like INSTITUTION_USER and AUDITOR', () => {
      const { rerender } = render(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockActiveTimer}
            applicationNumber="AICTE-2026-001"
            userRole={UserRole.INSTITUTION_USER}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /Pause Clock/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Resume Clock/i })).not.toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockPausedTimer}
            applicationNumber="AICTE-2026-001"
            userRole={UserRole.AUDITOR}
          />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /Pause Clock/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Resume Clock/i })).not.toBeInTheDocument();
    });

    it('displays error banner when resumeTimer fails with HTTP 403 authorization error', async () => {
      vi.spyOn(slaService, 'resumeTimer').mockRejectedValue(
        new Error('Only designated regulatory officers can pause or resume SLA timers (HTTP 403)'),
      );

      render(
        <MemoryRouter>
          <SlaTimerCard
            timer={mockPausedTimer}
            applicationNumber="AICTE-2026-002"
            userRole={UserRole.BUREAU_HEAD}
          />
        </MemoryRouter>,
      );

      const resumeBtn = screen.getByRole('button', { name: /Resume Clock/i });
      fireEvent.click(resumeBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Only designated regulatory officers can pause or resume SLA timers/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('PauseTimerModal', () => {
    it('enforces minimum 5 characters before enabling submission and calls pauseTimer', async () => {
      const pauseSpy = vi.spyOn(slaService, 'pauseTimer').mockResolvedValue({
        ...mockActiveTimer,
        status: SlaTimerStatus.PAUSED,
        pauseReason: 'Valid regulatory reason for audit',
      });

      const onSuccessMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <PauseTimerModal
          isOpen={true}
          onClose={onCloseMock}
          applicationId="app-uuid-1"
          applicationNumber="AICTE-2026-001"
          onSuccess={onSuccessMock}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /Confirm Clock Freeze/i });
      expect(submitBtn).toBeDisabled();

      const textarea = screen.getByLabelText(/Regulatory Pause Justification/i);
      fireEvent.change(textarea, { target: { value: 'Rev' } });
      expect(submitBtn).toBeDisabled();

      fireEvent.change(textarea, {
        target: { value: 'Valid regulatory reason for audit' },
      });
      expect(submitBtn).not.toBeDisabled();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(pauseSpy).toHaveBeenCalledWith('app-uuid-1', 'Valid regulatory reason for audit');
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    it('displays server validation or authorization error when pauseTimer fails', async () => {
      vi.spyOn(slaService, 'pauseTimer').mockRejectedValue(
        new Error('SLA policy does not permit pausing for workflow stage (HTTP 400)'),
      );

      render(
        <PauseTimerModal
          isOpen={true}
          onClose={vi.fn()}
          applicationId="app-uuid-1"
          applicationNumber="AICTE-2026-001"
          onSuccess={vi.fn()}
        />,
      );

      const textarea = screen.getByLabelText(/Regulatory Pause Justification/i);
      fireEvent.change(textarea, {
        target: { value: 'Attempting to pause disallowed timer' },
      });

      const submitBtn = screen.getByRole('button', { name: /Confirm Clock Freeze/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getAllByText(/SLA policy does not permit pausing for workflow stage/i).length,
        ).toBeGreaterThan(0);
      });
    });
  });

  describe('SlaEscalationList', () => {
    it('renders escalations and filters by tier', () => {
      render(
        <MemoryRouter>
          <SlaEscalationList escalations={mockEscalations} />
        </MemoryRouter>,
      );

      expect(screen.getByText('Recorded SLA Escalations')).toBeInTheDocument();
      expect(screen.getByText('Showing 2 of 2 events')).toBeInTheDocument();
      expect(screen.getAllByText('Tier 1 (RO Alert)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tier 2 (Director Breach)').length).toBeGreaterThan(0);

      // Filter by Tier 2
      const tierSelect = screen.getByLabelText(/Filter escalations by tier/i);
      fireEvent.change(tierSelect, { target: { value: SlaTier.TIER_2_DIRECTOR_BREACH } });

      expect(screen.getByText('Showing 1 of 2 events')).toBeInTheDocument();
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();

      // Reset filters
      fireEvent.click(screen.getByText('Reset Filters'));
      expect(screen.getByText('Showing 2 of 2 events')).toBeInTheDocument();
    });

    it('renders and filters escalations containing alternative or unknown tier values gracefully', () => {
      const customEscalations: SlaEscalationProjection[] = [
        {
          id: 'esc-custom-1',
          timerId: 'timer-005',
          applicationId: 'app-uuid-5',
          stage: ApplicationStatus.RECOMMENDED_FOR_EVC,
          tier: 'TIER_1_SCRUTINY_OFFICER' as unknown as SlaTier,
          escalationLevel: 'UNUSUAL_CUSTOM_WARNING' as unknown as SlaEscalationLevel,
          idempotencyKey: 'key-custom-1',
          targetRole: UserRole.SCRUTINY_OFFICER,
          policyId: 'POL_CUSTOM',
          policyVersion: '1.0.0',
          targetDeadline: '2026-11-10T10:00:00.000Z',
          detectedAt: '2026-10-25T12:00:00.000Z',
          recipientDetailsJsonb: {},
          isDispatched: true,
          createdAt: '2026-10-25T12:00:00.000Z',
        },
      ];

      render(
        <MemoryRouter>
          <SlaEscalationList escalations={customEscalations} />
        </MemoryRouter>,
      );

      expect(screen.getAllByText('Tier 1 (RO Alert)').length).toBeGreaterThan(0);
      expect(screen.getByText('Unusual Custom Warning')).toBeInTheDocument();
    });

    it('renders empty state when no escalations exist', () => {
      render(
        <MemoryRouter>
          <SlaEscalationList escalations={[]} />
        </MemoryRouter>,
      );

      expect(screen.getByText('No Recorded Escalations')).toBeInTheDocument();
    });
  });

  describe('ManualReconciliationBanner', () => {
    it('renders for SYSTEM_ADMIN and executes sweep with confirmation', async () => {
      const reconcileSpy = vi.spyOn(slaService, 'reconcileOverdueTimers').mockResolvedValue({
        evaluatedCount: 12,
        warningsEmitted: 3,
        breachesEmitted: 1,
        reconciledAt: '2026-10-26T12:00:00.000Z',
      });

      const onCompletedMock = vi.fn();

      render(
        <ManualReconciliationBanner
          userRole={UserRole.SYSTEM_ADMIN}
          onReconciliationCompleted={onCompletedMock}
        />,
      );

      expect(
        screen.getByRole('heading', {
          name: /Authoritative SLA Timer Database Reconciliation/i,
        }),
      ).toBeInTheDocument();

      const runBtn = screen.getByRole('button', { name: /Run Reconciliation Sweep/i });
      fireEvent.click(runBtn);

      // Confirm modal opens
      expect(
        screen.getByRole('heading', {
          name: /Confirm Privileged SLA Reconciliation Sweep/i,
        }),
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Run Sweep/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(reconcileSpy).toHaveBeenCalledTimes(1);
        expect(onCompletedMock).toHaveBeenCalled();
        expect(
          screen.getByText(/Reconciliation Sweep Completed Successfully/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Evaluated 12 active timers/i)).toBeInTheDocument();
      });
    });

    it('renders nothing for non-admin roles (e.g. INSTITUTION_USER, SCRUTINY_OFFICER)', () => {
      const { container } = render(
        <ManualReconciliationBanner userRole={UserRole.INSTITUTION_USER} />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('DerivedAlertsFeed', () => {
    it('aggregates operational alerts from active warnings, breaches, and escalations', () => {
      render(
        <MemoryRouter>
          <DerivedAlertsFeed
            timers={[mockBreachedTimer]}
            escalations={mockEscalations}
            userRole={UserRole.SCRUTINY_OFFICER}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText('Derived Operational Alerts')).toBeInTheDocument();
      expect(screen.getByText(/SLA Stage Deadline Breached/i)).toBeInTheDocument();
      expect(screen.getByText(/TIER 1 RO ALERT Escalation Event/i)).toBeInTheDocument();
      expect(screen.getByText(/TIER 2 DIRECTOR BREACH Escalation Event/i)).toBeInTheDocument();
    });

    it('renders empty state when there are no alerts', () => {
      render(
        <MemoryRouter>
          <DerivedAlertsFeed timers={[]} escalations={[]} />
        </MemoryRouter>,
      );

      expect(screen.getByText('No Active Alerts')).toBeInTheDocument();
    });
  });
});
