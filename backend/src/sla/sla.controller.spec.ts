/**
 * ApprovalSync — SLA Controller Unit Tests
 * Milestone: BE-08
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole, ApplicationStatus, SlaTier } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { SlaTimerStatus } from './enums/sla-timer-status.enum';
import { ILLUSTRATIVE_DISCLAIMER } from './policies/sla-policies.config';

describe('SlaController', () => {
  let controller: SlaController;
  let service: jest.Mocked<SlaService>;

  const mockUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'scrutiny@synthetic.approvalsync.local',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const appId = 'b0000000-0000-0000-0000-000000000001';
  const timerId = 'c0000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const mockSlaService = {
      getTimersForApplication: jest.fn(),
      getActiveTimerForApplication: jest.fn(),
      pauseTimer: jest.fn(),
      resumeTimer: jest.fn(),
      mapTimerToDto: jest.fn((t) => ({
        id: t.id || timerId,
        applicationId: t.applicationId || appId,
        stage: t.stage || ApplicationStatus.UNDER_SCRUTINY,
        tier: t.tier || SlaTier.TIER_1_RO_ALERT,
        status: t.status || SlaTimerStatus.ACTIVE,
        policyId: t.policyId || 'SLA_STAGE_SCRUTINY',
        startedAt: new Date().toISOString(),
        targetDeadline: new Date().toISOString(),
        warningDeadline: null,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      getPolicies: jest.fn(),
      getEscalations: jest.fn(),
      reconcileOverdueTimers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlaController],
      providers: [
        {
          provide: SlaService,
          useValue: mockSlaService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<SlaController>(SlaController);
    service = module.get(SlaService);
  });

  describe('getTimersForApplication', () => {
    it('delegates to service', async () => {
      const mockResult: any = { data: [], meta: {} };
      service.getTimersForApplication.mockResolvedValueOnce(mockResult);

      const res = await controller.getTimersForApplication(appId, mockUser, {});
      expect(service.getTimersForApplication).toHaveBeenCalledWith(
        appId,
        mockUser,
        {},
      );
      expect(res).toBe(mockResult);
    });
  });

  describe('getActiveTimerForApplication', () => {
    it('delegates to service', async () => {
      const mockResult: any = { id: timerId };
      service.getActiveTimerForApplication.mockResolvedValueOnce(mockResult);

      const res = await controller.getActiveTimerForApplication(
        appId,
        mockUser,
      );
      expect(service.getActiveTimerForApplication).toHaveBeenCalledWith(
        appId,
        mockUser,
      );
      expect(res).toBe(mockResult);
    });
  });

  describe('pauseTimer', () => {
    it('calls service.pauseTimer and returns mapped DTO', async () => {
      const timerEntity: any = { id: timerId, status: SlaTimerStatus.PAUSED };
      service.pauseTimer.mockResolvedValueOnce(timerEntity);

      const res = await controller.pauseTimer(appId, mockUser, {
        reason: 'Awaiting court clarification',
      });

      expect(service.pauseTimer).toHaveBeenCalledWith(appId, mockUser, {
        reason: 'Awaiting court clarification',
      });
      expect(service.mapTimerToDto).toHaveBeenCalledWith(timerEntity);
      expect(res.id).toBe(timerId);
    });
  });

  describe('resumeTimer', () => {
    it('calls service.resumeTimer and returns mapped DTO', async () => {
      const timerEntity: any = { id: timerId, status: SlaTimerStatus.ACTIVE };
      service.resumeTimer.mockResolvedValueOnce(timerEntity);

      const res = await controller.resumeTimer(appId, mockUser);

      expect(service.resumeTimer).toHaveBeenCalledWith(appId, mockUser);
      expect(service.mapTimerToDto).toHaveBeenCalledWith(timerEntity);
      expect(res.id).toBe(timerId);
    });
  });

  describe('getPolicies', () => {
    it('calls service.getPolicies and returns policy list', () => {
      const mockPolicies: any = [
        { id: 'SLA_1', name: 'Test', disclaimer: ILLUSTRATIVE_DISCLAIMER },
      ];
      service.getPolicies.mockReturnValueOnce(mockPolicies);

      const res = controller.getPolicies();
      expect(service.getPolicies).toHaveBeenCalled();
      expect(res).toBe(mockPolicies);
    });
  });

  describe('getEscalations', () => {
    it('delegates to service.getEscalations', async () => {
      const mockResult: any = { data: [], meta: {} };
      service.getEscalations.mockResolvedValueOnce(mockResult);

      const res = await controller.getEscalations(
        { page: 1, limit: 10 },
        mockUser,
      );
      expect(service.getEscalations).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        mockUser,
      );
      expect(res).toBe(mockResult);
    });
  });

  describe('reconcile', () => {
    it('delegates to service.reconcileOverdueTimers', async () => {
      const mockResult: any = {
        evaluatedCount: 2,
        warningsEmitted: 1,
        breachesEmitted: 1,
        reconciledAt: new Date().toISOString(),
      };
      service.reconcileOverdueTimers.mockResolvedValueOnce(mockResult);

      const res = await controller.reconcile();
      expect(service.reconcileOverdueTimers).toHaveBeenCalled();
      expect(res).toBe(mockResult);
    });
  });
});
