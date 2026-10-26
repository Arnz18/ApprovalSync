import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slaService } from '../api/services/slaService';
import { apiClient } from '../api/client';
import { SlaTimerStatus, ApplicationStatus, SlaTier, SlaEscalationLevel } from '../sla/types';

describe('SLA Service (FE-05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getApplicationTimers calls GET /applications/:id/sla-timers with query parameters', async () => {
    const mockResponse = {
      data: [
        {
          id: 'timer-1',
          applicationId: 'app-1',
          stage: ApplicationStatus.UNDER_SCRUTINY,
          tier: SlaTier.TIER_1_RO_ALERT,
          status: SlaTimerStatus.ACTIVE,
          policyId: 'POL_1',
          startedAt: '2026-10-20T00:00:00.000Z',
          targetDeadline: '2026-10-27T00:00:00.000Z',
          warningDeadline: '2026-10-25T00:00:00.000Z',
          isWarningSent: false,
          isBreached: false,
          totalPausedMs: 0,
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
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

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockResponse);

    const result = await slaService.getApplicationTimers('app-1', {
      status: SlaTimerStatus.ACTIVE,
      page: 1,
      limit: 20,
    });

    expect(getSpy).toHaveBeenCalledWith('/applications/app-1/sla-timers', {
      status: SlaTimerStatus.ACTIVE,
      page: 1,
      limit: 20,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('timer-1');
  });

  it('getActiveTimer calls GET /applications/:id/sla-timers/active', async () => {
    const mockTimer = {
      id: 'active-timer-1',
      applicationId: 'app-1',
      stage: ApplicationStatus.SUBMITTED,
      tier: SlaTier.TIER_1_RO_ALERT,
      status: SlaTimerStatus.ACTIVE,
      policyId: 'POL_SUBMITTED',
      startedAt: '2026-10-22T00:00:00.000Z',
      targetDeadline: '2026-10-29T00:00:00.000Z',
      warningDeadline: '2026-10-27T00:00:00.000Z',
      isWarningSent: false,
      isBreached: false,
      totalPausedMs: 0,
      createdAt: '2026-10-22T00:00:00.000Z',
      updatedAt: '2026-10-22T00:00:00.000Z',
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockTimer);

    const result = await slaService.getActiveTimer('app-1');

    expect(getSpy).toHaveBeenCalledWith('/applications/app-1/sla-timers/active');
    expect(result?.id).toBe('active-timer-1');
  });

  it('pauseTimer calls POST /applications/:id/sla-timers/pause with justification', async () => {
    const mockPaused = {
      id: 'timer-1',
      applicationId: 'app-1',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_1_RO_ALERT,
      status: SlaTimerStatus.PAUSED,
      policyId: 'POL_1',
      startedAt: '2026-10-20T00:00:00.000Z',
      targetDeadline: '2026-10-27T00:00:00.000Z',
      warningDeadline: '2026-10-25T00:00:00.000Z',
      isWarningSent: false,
      isBreached: false,
      pauseReason: 'Awaiting certified land records verification',
      pausedAt: '2026-10-24T12:00:00.000Z',
      totalPausedMs: 0,
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-24T12:00:00.000Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockPaused);

    const result = await slaService.pauseTimer(
      'app-1',
      'Awaiting certified land records verification',
    );

    expect(postSpy).toHaveBeenCalledWith('/applications/app-1/sla-timers/pause', {
      reason: 'Awaiting certified land records verification',
    });
    expect(result.status).toBe(SlaTimerStatus.PAUSED);
    expect(result.pauseReason).toBe('Awaiting certified land records verification');
  });

  it('resumeTimer calls POST /applications/:id/sla-timers/resume', async () => {
    const mockResumed = {
      id: 'timer-1',
      applicationId: 'app-1',
      stage: ApplicationStatus.UNDER_SCRUTINY,
      tier: SlaTier.TIER_1_RO_ALERT,
      status: SlaTimerStatus.ACTIVE,
      policyId: 'POL_1',
      startedAt: '2026-10-20T00:00:00.000Z',
      targetDeadline: '2026-10-28T00:00:00.000Z',
      warningDeadline: '2026-10-26T00:00:00.000Z',
      isWarningSent: false,
      isBreached: false,
      resumedAt: '2026-10-25T12:00:00.000Z',
      totalPausedMs: 86400000,
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockResumed);

    const result = await slaService.resumeTimer('app-1');

    expect(postSpy).toHaveBeenCalledWith('/applications/app-1/sla-timers/resume', {});
    expect(result.status).toBe(SlaTimerStatus.ACTIVE);
  });

  it('getPolicies calls GET /sla/policies', async () => {
    const mockPolicies = [
      {
        id: 'SLA_SUBMITTED_TO_SCRUTINY',
        name: 'Application Intake SLA',
        description: 'Target for initial pickup',
        stage: ApplicationStatus.SUBMITTED,
        tier: SlaTier.TIER_1_RO_ALERT,
        duration: 7,
        unit: 'DAYS' as const,
        warningThresholdFraction: 0.75,
        breachThresholdFraction: 1.0,
        warningTargetRole: 'REGIONAL_OFFICER',
        breachTargetRole: 'BUREAU_HEAD',
        canPause: false,
        classification: 'ILLUSTRATIVE_DEMO' as const,
        sourceReference: 'AICTE APH 2024-25 Benchmark',
        version: '1.0.0',
        isActive: true,
        disclaimer: 'Illustrative demonstration SLA policy only.',
      },
    ];

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockPolicies);

    const result = await slaService.getPolicies();

    expect(getSpy).toHaveBeenCalledWith('/sla/policies');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('SLA_SUBMITTED_TO_SCRUTINY');
  });

  it('getEscalations calls GET /sla/escalations with pagination parameters', async () => {
    const mockEscalations = {
      data: [
        {
          id: 'esc-1',
          timerId: 'timer-1',
          applicationId: 'app-1',
          stage: ApplicationStatus.UNDER_SCRUTINY,
          tier: SlaTier.TIER_1_RO_ALERT,
          escalationLevel: SlaEscalationLevel.WARNING,
          idempotencyKey: 'key-1',
          targetRole: 'REGIONAL_OFFICER',
          policyId: 'POL_1',
          policyVersion: '1.0.0',
          targetDeadline: '2026-10-27T00:00:00.000Z',
          detectedAt: '2026-10-25T12:00:00.000Z',
          recipientDetailsJsonb: {},
          isDispatched: true,
          createdAt: '2026-10-25T12:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockEscalations);

    const result = await slaService.getEscalations({ page: 1, limit: 10 });

    expect(getSpy).toHaveBeenCalledWith('/sla/escalations', { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('esc-1');
  });

  it('reconcileOverdueTimers calls POST /sla/reconcile', async () => {
    const mockReconcile = {
      evaluatedCount: 15,
      warningsEmitted: 2,
      breachesEmitted: 1,
      reconciledAt: '2026-10-26T12:00:00.000Z',
    };

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockReconcile);

    const result = await slaService.reconcileOverdueTimers();

    expect(postSpy).toHaveBeenCalledWith('/sla/reconcile', {});
    expect(result.evaluatedCount).toBe(15);
    expect(result.warningsEmitted).toBe(2);
    expect(result.breachesEmitted).toBe(1);
  });
});
