/**
 * ApprovalSync — UsersService Unit Tests
 * Milestone: BE-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../shared/contracts';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'test@synthetic.approvalsync.local',
    name: 'Test User',
    role: UserRole.INSTITUTION_USER,
    passwordHash: '$2b$10$syntheticBcryptHashStringForUnitTestingOnly#',
    institutionId: 'inst-123',
    regionalOffice: null,
    isActive: true,
    createdAt: new Date('2026-10-22T14:30:00.000Z'),
    updatedAt: new Date('2026-10-22T14:30:00.000Z'),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('findByEmailForAuth', () => {
    it('should query user by lowercase email and explicitly select passwordHash', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<User>['createQueryBuilder']>,
      );

      const result = await service.findByEmailForAuth(
        '  TEST@SYNTHETIC.APPROVALSYNC.LOCAL  ',
      );
      expect(qb.addSelect).toHaveBeenCalledWith('user.passwordHash');
      expect(qb.where).toHaveBeenCalledWith('LOWER(user.email) = :email', {
        email: 'test@synthetic.approvalsync.local',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById and findSafeUserById', () => {
    it('should find user by id without returning passwordHash in safe projection', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const safe = await service.findSafeUserById(mockUser.id);
      expect(safe).toBeDefined();
      expect(safe?.id).toBe(mockUser.id);
      expect(safe?.email).toBe(mockUser.email);
      expect(
        (safe as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should return null when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const safe = await service.findSafeUserById('nonexistent-uuid');
      expect(safe).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should hash password with bcrypt and return safe projection without passwordHash', async () => {
      userRepo.create.mockImplementation(
        (dto) =>
          ({
            ...dto,
            id: 'new-uuid-1234',
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as unknown as User,
      );
      userRepo.save.mockImplementation(async (entity) => entity as User);

      const result = await service.createUser({
        name: 'New Officer',
        email: 'officer@synthetic.local',
        role: UserRole.SCRUTINY_OFFICER,
        password: 'PlainPassword@123',
      });

      expect(result.id).toBe('new-uuid-1234');
      expect(result.email).toBe('officer@synthetic.local');
      expect(
        (result as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();

      // Verify password was hashed and not saved in plaintext
      const createCall = userRepo.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('PlainPassword@123');
      expect(
        await bcrypt.compare(
          'PlainPassword@123',
          createCall.passwordHash as string,
        ),
      ).toBe(true);
    });
  });
});
