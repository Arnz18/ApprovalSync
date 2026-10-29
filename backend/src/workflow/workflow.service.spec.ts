/**
 * ApprovalSync — Workflow Service Unit Tests
 * Milestone: BE-06
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { Application } from '../database/entities/application.entity';
import { WorkflowTimelineEvent } from './entities/workflow-timeline-event.entity';
import { EvcSchedule } from './entities/evc-schedule.entity';
import { ApplicationStatus, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let timelineRepo: jest.Mocked<Repository<WorkflowTimelineEvent>>;

  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const instId2 = 'a0000000-0000-0000-0000-000000000002';
  const appId1 = 'b0000000-0000-0000-0000-000000000001';

  const institutionUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'college.a@synthetic.approvalsync.local',
    name: 'Representative College A',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  const otherInstitutionUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'college.b@synthetic.approvalsync.local',
    name: 'Representative College B',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId2,
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000003',
    email: 'scrutiny@synthetic.approvalsync.local',
    name: 'Officer Sharma',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const bureauHead: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000004',
    email: 'bureau.head@synthetic.approvalsync.local',
    name: 'Director Verma',
    role: UserRole.BUREAU_HEAD,
  };

  const mockDraftApplication: Application = {
    id: appId1,
    applicationNumber: 'APP-2026-TEST001',
    institutionId: instId1,
    institution: {} as any,
    academicYear: '2026-2027',
    programType: 'Engineering',
    status: ApplicationStatus.DRAFT,
    payloadJsonb: {},
    submittedAt: null,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    documents: [],
    auditLogs: [],
    slaTimers: [],
    timelineEvents: [],
  };

  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn((entityClass, entity) => {
        if (!entity) return Promise.resolve(entityClass);
        return Promise.resolve({
          ...entity,
          id: entity.id || 'gen-uuid-1234',
          createdAt: new Date(),
        });
      }),
      create: jest.fn((entityClass, plain) => ({
        ...plain,
        id: 'gen-uuid-1234',
        createdAt: new Date(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkflowTimelineEvent),
          useValue: {
            findAndCount: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EvcSchedule),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((plain) => ({ ...plain, id: 'evc-uuid-1' })),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: any) => cb(mockEntityManager)),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    applicationRepo = module.get(getRepositoryToken(Application));
    timelineRepo = module.get(getRepositoryToken(WorkflowTimelineEvent));
  });

  describe('executeTransition', () => {
    it('executes valid DRAFT -> SUBMITTED transition and saves timeline event under lock', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
      });

      const result = await service.executeTransition(
        appId1,
        institutionUser,
        { targetStatus: ApplicationStatus.SUBMITTED },
        'corr-test-123',
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Application, {
        where: { id: appId1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe(ApplicationStatus.DRAFT);
      expect(result.currentStatus).toBe(ApplicationStatus.SUBMITTED);
      expect(result.timelineEvent).toBeDefined();
      expect(result.timelineEvent.eventType).toBe('APPLICATION_SUBMITTED');
      expect(result.timelineEvent.actorId).toBe(institutionUser.id);
      expect(result.timelineEvent.actorRole).toBe(UserRole.INSTITUTION_USER);
    });

    it('rejects cross-tenant transition attempt with 403 Forbidden', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
      });

      await expect(
        service.executeTransition(appId1, otherInstitutionUser, {
          targetStatus: ApplicationStatus.SUBMITTED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects nonexistent application with 403 for INSTITUTION_USER (anti-enumeration)', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.executeTransition('non-existent-uuid', institutionUser, {
          targetStatus: ApplicationStatus.SUBMITTED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects nonexistent application with 404 for regulatory role', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.executeTransition('non-existent-uuid', scrutinyOfficer, {
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects transition from terminal status with 400 Bad Request', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.APPROVED,
      });

      await expect(
        service.executeTransition(appId1, bureauHead, {
          targetStatus: ApplicationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid state transition according to FSM graph with 400', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.DRAFT,
      });

      await expect(
        service.executeTransition(appId1, bureauHead, {
          targetStatus: ApplicationStatus.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transition when caller role is not authorized with 403', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.SUBMITTED,
      });

      // Institution user is not authorized to start scrutiny
      await expect(
        service.executeTransition(appId1, institutionUser, {
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects transition requiring comment when comment is missing with 400', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.UNDER_SCRUTINY,
      });

      // UNDER_SCRUTINY -> DEFICIENCY_ISSUED requires comment
      await expect(
        service.executeTransition(appId1, scrutinyOfficer, {
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully executes transition requiring comment when comment is provided', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.UNDER_SCRUTINY,
      });

      const result = await service.executeTransition(appId1, scrutinyOfficer, {
        targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
        comment: 'Missing mandatory land registration deed.',
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(result.currentStatus).toBe(ApplicationStatus.DEFICIENCY_ISSUED);
      expect(result.timelineEvent.comment).toBe(
        'Missing mandatory land registration deed.',
      );
    });

    it('enforces programType and academicYear validation on submission', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        programType: '',
      });

      await expect(
        service.executeTransition(appId1, institutionUser, {
          targetStatus: ApplicationStatus.SUBMITTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTimeline', () => {
    it('returns chronological timeline events with pagination metadata', async () => {
      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
      });

      const mockEvents: WorkflowTimelineEvent[] = [
        {
          id: 'ev-1',
          applicationId: appId1,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.SUBMITTED,
          eventType: 'APPLICATION_SUBMITTED',
          actorId: institutionUser.id,
          actorRole: UserRole.INSTITUTION_USER,
          comment: null,
          correlationId: null,
          metadata: {},
          createdAt: new Date('2026-10-10T00:00:00Z'),
          application: {} as any,
        },
      ];

      timelineRepo.findAndCount.mockResolvedValueOnce([mockEvents, 1]);

      const result = await service.getTimeline(appId1, institutionUser, {
        page: 1,
        limit: 10,
        sortOrder: 'ASC',
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('rejects cross-tenant timeline inspection for INSTITUTION_USER with 403', async () => {
      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
      });

      await expect(
        service.getTimeline(appId1, otherInstitutionUser, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns permitted transitions filtered by caller role', async () => {
      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockDraftApplication,
        status: ApplicationStatus.UNDER_SCRUTINY,
      });

      const allowed = await service.getAllowedTransitions(
        appId1,
        scrutinyOfficer,
      );

      const targetStatuses = allowed.map((a) => a.toStatus);
      expect(targetStatuses).toContain(ApplicationStatus.DEFICIENCY_ISSUED);
      expect(targetStatuses).toContain(ApplicationStatus.RECOMMENDED_FOR_EVC);
      expect(targetStatuses).not.toContain(ApplicationStatus.APPROVED);
    });
  });
});
