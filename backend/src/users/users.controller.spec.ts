/**
 * ApprovalSync — UsersController Unit Tests
 * Milestone: BE-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockTargetUser: User = {
    id: 'user-aaa-111',
    email: 'user.a@synthetic.approvalsync.local',
    name: 'College Rep A',
    role: UserRole.INSTITUTION_USER,
    passwordHash: 'hash',
    institutionId: 'inst-111',
    regionalOffice: null,
    isActive: true,
    createdAt: new Date('2026-10-22T14:30:00.000Z'),
    updatedAt: new Date('2026-10-22T14:30:00.000Z'),
  };

  const mockTargetUserB: User = {
    id: 'user-bbb-222',
    email: 'user.b@synthetic.approvalsync.local',
    name: 'College Rep B',
    role: UserRole.INSTITUTION_USER,
    passwordHash: 'hash',
    institutionId: 'inst-222',
    regionalOffice: null,
    isActive: true,
    createdAt: new Date('2026-10-22T14:30:00.000Z'),
    updatedAt: new Date('2026-10-22T14:30:00.000Z'),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      toSafeProjection: jest.fn((u: User) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        institutionId: u.institutionId,
        regionalOffice: u.regionalOffice,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('getUserById', () => {
    it('should allow user to access their own profile', async () => {
      usersService.findById.mockResolvedValue(mockTargetUser);

      const caller: AuthUserPrincipal = {
        id: 'user-aaa-111',
        email: 'user.a@synthetic.approvalsync.local',
        name: 'College Rep A',
        role: UserRole.INSTITUTION_USER,
        institutionId: 'inst-111',
      };

      const result = await controller.getUserById('user-aaa-111', caller);
      expect(result).toBeDefined();
      expect(result.id).toBe('user-aaa-111');
      expect(
        (result as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should prevent INSTITUTION_USER from accessing another institution user (IDOR prevention)', async () => {
      usersService.findById.mockResolvedValue(mockTargetUserB);

      const callerFromInstA: AuthUserPrincipal = {
        id: 'user-aaa-111',
        email: 'user.a@synthetic.approvalsync.local',
        name: 'College Rep A',
        role: UserRole.INSTITUTION_USER,
        institutionId: 'inst-111',
      };

      await expect(
        controller.getUserById('user-bbb-222', callerFromInstA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.getUserById('user-bbb-222', callerFromInstA),
      ).rejects.toThrow(
        'Access denied: cannot access user from another institution.',
      );
    });

    it('should allow SCRUTINY_OFFICER to access institution user profile', async () => {
      usersService.findById.mockResolvedValue(mockTargetUser);

      const officer: AuthUserPrincipal = {
        id: 'officer-999',
        email: 'officer@synthetic.approvalsync.local',
        name: 'Scrutiny Officer',
        role: UserRole.SCRUTINY_OFFICER,
      };

      const result = await controller.getUserById('user-aaa-111', officer);
      expect(result.id).toBe('user-aaa-111');
    });

    it('should throw NotFoundException when target user does not exist for an officer', async () => {
      usersService.findById.mockResolvedValue(null);

      const caller: AuthUserPrincipal = {
        id: 'officer-999',
        email: 'officer@synthetic.approvalsync.local',
        name: 'Scrutiny Officer',
        role: UserRole.SCRUTINY_OFFICER,
      };

      await expect(
        controller.getUserById('nonexistent-uuid', caller),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when INSTITUTION_USER queries nonexistent external user (preventing enumeration)', async () => {
      usersService.findById.mockResolvedValue(null);

      const callerFromInstA: AuthUserPrincipal = {
        id: 'user-aaa-111',
        email: 'user.a@synthetic.approvalsync.local',
        name: 'College Rep A',
        role: UserRole.INSTITUTION_USER,
        institutionId: 'inst-111',
      };

      await expect(
        controller.getUserById('nonexistent-uuid', callerFromInstA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.getUserById('nonexistent-uuid', callerFromInstA),
      ).rejects.toThrow(
        'Access denied: cannot access user from another institution.',
      );
    });
  });
});
