/**
 * ApprovalSync — Workflow Controller Unit Tests
 * Milestone: BE-06
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ApplicationStatus, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let service: jest.Mocked<WorkflowService>;

  const mockUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'scrutiny@synthetic.approvalsync.local',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const appId = 'b0000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const mockWorkflowService = {
      executeTransition: jest.fn(),
      getTimeline: jest.fn(),
      getAllowedTransitions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
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

    controller = module.get<WorkflowController>(WorkflowController);
    service = module.get(WorkflowService);
  });

  describe('executeTransition', () => {
    it('delegates transition execution to service with correlation id', async () => {
      const mockResult: any = {
        success: true,
        applicationId: appId,
        previousStatus: ApplicationStatus.SUBMITTED,
        currentStatus: ApplicationStatus.UNDER_SCRUTINY,
      };
      service.executeTransition.mockResolvedValueOnce(mockResult);

      const result = await controller.executeTransition(
        appId,
        mockUser,
        { targetStatus: ApplicationStatus.UNDER_SCRUTINY },
        'corr-1234',
      );

      expect(service.executeTransition).toHaveBeenCalledWith(
        appId,
        mockUser,
        { targetStatus: ApplicationStatus.UNDER_SCRUTINY },
        'corr-1234',
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('getTimeline', () => {
    it('delegates timeline queries to service', async () => {
      const mockTimeline: any = { items: [], pagination: {} };
      service.getTimeline.mockResolvedValueOnce(mockTimeline);

      const result = await controller.getTimeline(appId, mockUser, {
        page: 1,
        limit: 20,
      });

      expect(service.getTimeline).toHaveBeenCalledWith(appId, mockUser, {
        page: 1,
        limit: 20,
      });
      expect(result).toBe(mockTimeline);
    });
  });

  describe('getAllowedTransitions', () => {
    it('delegates allowed transitions query to service', async () => {
      const mockAllowed: any = [
        {
          toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          eventType: 'DEFICIENCY_COMMUNICATED',
        },
      ];
      service.getAllowedTransitions.mockResolvedValueOnce(mockAllowed);

      const result = await controller.getAllowedTransitions(appId, mockUser);

      expect(service.getAllowedTransitions).toHaveBeenCalledWith(
        appId,
        mockUser,
      );
      expect(result).toBe(mockAllowed);
    });
  });
});
