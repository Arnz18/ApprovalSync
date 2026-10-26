/**
 * ApprovalSync — SLA Service Unit Tests
 * Milestone: BE-08
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaTimer } from '../database/entities/sla-timer.entity';
import { Application } from '../database/entities/application.entity';
import { SlaEscalation } from './entities/sla-escalation.entity';
import { SlaTimerStatus } from './enums/sla-timer-status.enum';
import { SlaEscalationLevel } from './enums/sla-escalation-level.enum';
import { SlaClockService } from './clock/sla-clock.service';
import { SlaQueueService } from './queue/sla-queue.service';
import { ApplicationStatus, UserRole, SlaTier } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { ILLUSTRATIVE_DISCLAIMER } from './policies/sla-policies.config';

describe('SlaService', () => {
  let service: SlaService;
  let clock: SlaClockService;
  let timerRepo: jest.Mocked<Repository<SlaTimer>>;
  let escalationRepo: jest.Mocked<Repository<SlaEscalation>>;

  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const instId2 = 'a0000000-0000-0000-0000-000000000002';
  const appId1 = 'b0000000-0000-0000-0000-000000000001';
  const timerId1 = 'c0000000-0000-0000-0000-000000000001';

  const institutionUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'college.a@synthetic.approvalsync.local',
    name: 'College A User',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000003',
    email: 'scrutiny@synthetic.approvalsync.local',
    name: 'Officer Sharma',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const auditor: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000004',
    email: 'auditor@synthetic.approvalsync.local',
    name: 'Auditor Patel',
    role: UserRole.AUDITOR,
  };

  const baseDate = new Date('2026-10-01T10:00:00.000Z');

  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((entityClass, entity) => {
        if (!entity) return Promise.resolve(entityClass);
        return Promise.resolve({
          ...entity,
          id: entity.id || 'gen-timer-id',
          createdAt: entity.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }),
      create: jest.fn((entityClass, plain) => ({
        ...plain,
        id: plain.id || 'gen-timer-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        SlaClockService,
        {
          provide: SlaQueueService,
          useValue: {
            enqueueTimerCheck: jest.fn().mockResolvedValue('job-id-123'),
            isQueueAvailable: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: getRepositoryToken(SlaTimer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SlaEscalation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => cb(mockEntityManager)),
            manager: mockEntityManager,
          },
        },
      ],
    }).compile();

    service = module.get<SlaService>(SlaService);
    clock = module.get<SlaClockService>(SlaClockService);
    timerRepo = module.get(getRepositoryToken(SlaTimer));
    escalationRepo = module.get(getRepositoryToken(SlaEscalation));

    clock.setTime(baseDate);
  });

  describe('handleWorkflowTransitionInTransaction', () => {
    it('creates an active timer with deterministic deadlines when transitioning to SUBMITTED', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      const result = await service.handleWorkflowTransitionInTransaction(
        mockEntityManager,
        {
          applicationId: appId1,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.SUBMITTED,
          actorId: institutionUser.id,
          actorRole: institutionUser.role,
        },
      );

      expect(result).toBeDefined();
      expect(result?.stage).toBe(ApplicationStatus.SUBMITTED);
      expect(result?.status).toBe(SlaTimerStatus.ACTIVE);
      expect(result?.tier).toBe(SlaTier.TIER_1_RO_ALERT);
      // Policy for SUBMITTED is 7 days target, warning threshold fraction 0.75 (5.25 days)
      const targetExpected = new Date(
        baseDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const warningExpected = new Date(
        baseDate.getTime() + 7 * 0.75 * 24 * 60 * 60 * 1000,
      );
      expect(result?.targetDeadline.toISOString()).toBe(
        targetExpected.toISOString(),
      );
      expect(result?.warningDeadline?.toISOString()).toBe(
        warningExpected.toISOString(),
      );
    });

    it('completes existing active timers and creates new timer when moving to UNDER_SCRUTINY', async () => {
      const activeTimer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.SUBMITTED,
        status: SlaTimerStatus.ACTIVE,
      };
      mockEntityManager.find.mockResolvedValue([activeTimer]);

      const result = await service.handleWorkflowTransitionInTransaction(
        mockEntityManager,
        {
          applicationId: appId1,
          fromStatus: ApplicationStatus.SUBMITTED,
          toStatus: ApplicationStatus.UNDER_SCRUTINY,
          actorId: scrutinyOfficer.id,
          actorRole: scrutinyOfficer.role,
        },
      );

      expect(activeTimer.status).toBe(SlaTimerStatus.COMPLETED);
      expect(activeTimer.completedAt).toEqual(baseDate);
      expect(result).toBeDefined();
      expect(result?.stage).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(result?.status).toBe(SlaTimerStatus.ACTIVE);
    });

    it('cancels existing timers and creates no new timer on terminal status APPROVED', async () => {
      const activeTimer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.RECOMMENDED_FOR_SHC,
        status: SlaTimerStatus.ACTIVE,
      };
      mockEntityManager.find.mockResolvedValue([activeTimer]);

      const result = await service.handleWorkflowTransitionInTransaction(
        mockEntityManager,
        {
          applicationId: appId1,
          fromStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
          toStatus: ApplicationStatus.APPROVED,
          actorId: scrutinyOfficer.id,
          actorRole: scrutinyOfficer.role,
        },
      );

      expect(activeTimer.status).toBe(SlaTimerStatus.CANCELLED);
      expect(activeTimer.cancelledAt).toEqual(baseDate);
      expect(result).toBeNull();
    });
  });

  describe('pauseTimer', () => {
    it('throws ForbiddenException when an INSTITUTION_USER attempts to pause', async () => {
      await expect(
        service.pauseTimer(appId1, institutionUser, {
          reason: 'Legal dispute pending court order',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.pauseTimer(appId1, scrutinyOfficer, {
          reason: 'Pending physical document verification',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no active timer exists', async () => {
      // 1st findOne: application found
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: appId1, institutionId: instId1 })
        // 2nd findOne: no active timer
        .mockResolvedValueOnce(null)
        // 3rd findOne: no paused timer
        .mockResolvedValueOnce(null);

      await expect(
        service.pauseTimer(appId1, scrutinyOfficer, {
          reason: 'Valid justification reason',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when timer is already paused', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: appId1, institutionId: instId1 })
        .mockResolvedValueOnce(null) // no active
        .mockResolvedValueOnce({ id: timerId1, status: SlaTimerStatus.PAUSED }); // already paused

      await expect(
        service.pauseTimer(appId1, scrutinyOfficer, {
          reason: 'Valid justification reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully pauses an active timer and records pauseReason and pausedAt', async () => {
      const activeTimer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.UNDER_SCRUTINY,
        status: SlaTimerStatus.ACTIVE,
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: appId1, institutionId: instId1 })
        .mockResolvedValueOnce(activeTimer);

      const paused = await service.pauseTimer(appId1, scrutinyOfficer, {
        reason: 'Court stay order received',
      });

      expect(paused.status).toBe(SlaTimerStatus.PAUSED);
      expect(paused.pauseReason).toBe('Court stay order received');
      expect(paused.pausedById).toBe(scrutinyOfficer.id);
      expect(paused.pausedAt).toEqual(baseDate);
    });
  });

  describe('resumeTimer', () => {
    it('throws ForbiddenException when unauthorized user calls resume', async () => {
      await expect(
        service.resumeTimer(appId1, institutionUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when no paused timer exists', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: appId1, institutionId: instId1 })
        .mockResolvedValueOnce(null);

      await expect(
        service.resumeTimer(appId1, scrutinyOfficer),
      ).rejects.toThrow(NotFoundException);
    });

    it('resumes timer and shifts targetDeadline forward by exact elapsed pause duration', async () => {
      const pausedAt = new Date('2026-10-01T10:00:00.000Z');
      const originalTarget = new Date('2026-10-08T10:00:00.000Z');
      const originalWarning = new Date('2026-10-06T10:00:00.000Z');

      const pausedTimer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.UNDER_SCRUTINY,
        status: SlaTimerStatus.PAUSED,
        pausedAt,
        targetDeadline: originalTarget,
        warningDeadline: originalWarning,
        totalPausedMs: 0,
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: appId1, institutionId: instId1 })
        .mockResolvedValueOnce(pausedTimer);

      // Advance clock by exactly 2 hours (7200000 ms)
      const resumeTime = new Date(pausedAt.getTime() + 7200000);
      clock.setTime(resumeTime);

      const resumed = await service.resumeTimer(appId1, scrutinyOfficer);

      expect(resumed.status).toBe(SlaTimerStatus.ACTIVE);
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.resumedAt).toEqual(resumeTime);
      expect(resumed.totalPausedMs).toBe(7200000);
      expect(new Date(resumed.targetDeadline).getTime()).toBe(
        originalTarget.getTime() + 7200000,
      );
      expect(new Date(resumed.warningDeadline!).getTime()).toBe(
        originalWarning.getTime() + 7200000,
      );
    });
  });

  describe('evaluateTimerInTransaction', () => {
    it('does nothing when now is before warning and target deadlines', async () => {
      const timer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.UNDER_SCRUTINY,
        tier: SlaTier.TIER_1_RO_ALERT,
        status: SlaTimerStatus.ACTIVE,
        warningDeadline: new Date(baseDate.getTime() + 50000),
        targetDeadline: new Date(baseDate.getTime() + 100000),
        isWarningSent: false,
        isBreached: false,
      };
      mockEntityManager.findOne.mockResolvedValue(timer);

      const evalResult = await service.evaluateTimerInTransaction(
        mockEntityManager,
        timerId1,
      );

      expect(evalResult.warningEmitted).toBe(false);
      expect(evalResult.breachEmitted).toBe(false);
      expect(timer.isWarningSent).toBe(false);
      expect(timer.isBreached).toBe(false);
    });

    it('emits WARNING escalation when now >= warningDeadline and is idempotent on repeat', async () => {
      const timer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.UNDER_SCRUTINY,
        tier: SlaTier.TIER_1_RO_ALERT,
        status: SlaTimerStatus.ACTIVE,
        warningDeadline: new Date(baseDate.getTime() - 1000), // reached
        targetDeadline: new Date(baseDate.getTime() + 100000),
        isWarningSent: false,
        isBreached: false,
      };

      // 1st lookup: timer. 2nd lookup: check existing warning (null)
      mockEntityManager.findOne
        .mockResolvedValueOnce(timer)
        .mockResolvedValueOnce(null);

      const evalResult1 = await service.evaluateTimerInTransaction(
        mockEntityManager,
        timerId1,
      );

      expect(evalResult1.warningEmitted).toBe(true);
      expect(evalResult1.breachEmitted).toBe(false);
      expect(timer.isWarningSent).toBe(true);

      // 2nd evaluation: timer already has isWarningSent = true
      mockEntityManager.findOne.mockResolvedValueOnce(timer);
      const evalResult2 = await service.evaluateTimerInTransaction(
        mockEntityManager,
        timerId1,
      );
      expect(evalResult2.warningEmitted).toBe(false);
    });

    it('emits BREACH escalation when now >= targetDeadline and transitions status to BREACHED', async () => {
      const timer: Partial<SlaTimer> = {
        id: timerId1,
        applicationId: appId1,
        stage: ApplicationStatus.UNDER_SCRUTINY,
        tier: SlaTier.TIER_1_RO_ALERT,
        status: SlaTimerStatus.ACTIVE,
        warningDeadline: new Date(baseDate.getTime() - 20000),
        targetDeadline: new Date(baseDate.getTime() - 1000), // reached
        isWarningSent: true,
        isBreached: false,
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(timer)
        .mockResolvedValueOnce(null); // no existing breach escalation record

      const evalResult = await service.evaluateTimerInTransaction(
        mockEntityManager,
        timerId1,
      );

      expect(evalResult.breachEmitted).toBe(true);
      expect(timer.isBreached).toBe(true);
      expect(timer.status).toBe(SlaTimerStatus.BREACHED);
      expect(timer.escalatedAt).toEqual(baseDate);
    });
  });

  describe('reconcileOverdueTimers', () => {
    it('queries overdue active timers and evaluates them in transactions', async () => {
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: timerId1,
            applicationId: appId1,
            status: SlaTimerStatus.ACTIVE,
            targetDeadline: new Date(baseDate.getTime() - 1000),
            isBreached: false,
            isWarningSent: true,
          },
        ]),
      };
      timerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Inside evaluateTimerInTransaction: findOne timer, findOne escalation check
      mockEntityManager.findOne
        .mockResolvedValueOnce({
          id: timerId1,
          applicationId: appId1,
          stage: ApplicationStatus.UNDER_SCRUTINY,
          tier: SlaTier.TIER_1_RO_ALERT,
          status: SlaTimerStatus.ACTIVE,
          targetDeadline: new Date(baseDate.getTime() - 1000),
          isBreached: false,
          isWarningSent: true,
        })
        .mockResolvedValueOnce(null);

      const result = await service.reconcileOverdueTimers();

      expect(result.evaluatedCount).toBe(1);
      expect(result.breachesEmitted).toBe(1);
      expect(result.warningsEmitted).toBe(0);
      expect(result.reconciledAt).toBe(baseDate.toISOString());
    });
  });

  describe('getTimersForApplication', () => {
    it('throws NotFoundException when an INSTITUTION_USER accesses another institution app', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: appId1,
        institutionId: instId2, // different
      });

      await expect(
        service.getTimersForApplication(appId1, institutionUser, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns paginated timers when authorized', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: appId1,
        institutionId: instId1,
      });

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: timerId1,
              applicationId: appId1,
              stage: ApplicationStatus.SUBMITTED,
              tier: SlaTier.TIER_1_RO_ALERT,
              status: SlaTimerStatus.ACTIVE,
              targetDeadline: baseDate,
              createdAt: baseDate,
              updatedAt: baseDate,
            },
          ],
          1,
        ]),
      };
      timerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const res = await service.getTimersForApplication(
        appId1,
        institutionUser,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe(timerId1);
      expect(res.meta.totalItems).toBe(1);
    });
  });

  describe('getPolicies', () => {
    it('returns all default policies with the required illustrative demo disclaimer', () => {
      const policies = service.getPolicies();
      expect(policies.length).toBeGreaterThan(0);
      for (const policy of policies) {
        expect(policy.disclaimer).toBe(ILLUSTRATIVE_DISCLAIMER);
        expect(policy.classification).toBe('ILLUSTRATIVE_DEMO');
      }
    });
  });

  describe('getEscalations', () => {
    it('throws ForbiddenException when INSTITUTION_USER requests escalations', async () => {
      await expect(service.getEscalations({}, institutionUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns paginated escalations for regulatory / auditor roles', async () => {
      escalationRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'esc-123',
            timerId: timerId1,
            applicationId: appId1,
            stage: ApplicationStatus.UNDER_SCRUTINY,
            tier: SlaTier.TIER_1_RO_ALERT,
            escalationLevel: SlaEscalationLevel.WARNING,
            idempotencyKey: `sla-esc:${timerId1}:TIER_1_RO_ALERT:WARNING`,
            targetRole: UserRole.REGIONAL_OFFICER,
            policyId: 'SLA-STAGE-SCRUTINY',
            policyVersion: '1.0.0',
            targetDeadline: baseDate,
            detectedAt: baseDate,
            isDispatched: true,
            createdAt: baseDate,
          } as any,
        ],
        1,
      ]);

      const res = await service.getEscalations({ page: 1, limit: 10 }, auditor);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('esc-123');
      expect(res.data[0].escalationLevel).toBe(SlaEscalationLevel.WARNING);
    });
  });
});
