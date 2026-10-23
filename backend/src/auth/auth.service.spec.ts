/**
 * ApprovalSync — Authentication Service Unit Tests
 * Milestone: BE-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../shared/contracts';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const syntheticPassword = 'DemoPass@123';
  let realBcryptHash: string;

  const mockUser: User = {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'demo.institution@synthetic.approvalsync.local',
    name: 'Demo Representative',
    role: UserRole.INSTITUTION_USER,
    passwordHash: '',
    institutionId: '99999999-8888-7777-6666-555555555555',
    regionalOffice: null,
    isActive: true,
    createdAt: new Date('2026-10-22T14:30:00.000Z'),
    updatedAt: new Date('2026-10-22T14:30:00.000Z'),
  };

  beforeAll(async () => {
    realBcryptHash = await bcrypt.hash(syntheticPassword, 10);
    mockUser.passwordHash = realBcryptHash;
  });

  beforeEach(async () => {
    const mockUsersService = {
      findByEmailForAuth: jest.fn(),
      findSafeUserById: jest.fn(),
      toSafeProjection: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId || null,
        regionalOffice: user.regionalOffice || null,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };

    const mockJwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValue(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.synthetic.jwt',
        ),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.expiresIn') return '3600s';
        if (key === 'jwt.secret') return 'test_jwt_secret_32_characters_long';
        if (key === 'jwt.issuer') return 'approvalsync-auth';
        if (key === 'jwt.audience') return 'approvalsync-client';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should successfully authenticate valid credentials and return JWT with safe user projection', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({ ...mockUser });

      const result = await authService.login({
        email: 'demo.institution@synthetic.approvalsync.local',
        password: syntheticPassword,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.synthetic.jwt',
      );
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role).toBe(UserRole.INSTITUTION_USER);
      expect(result.user.institutionId).toBe(mockUser.institutionId);

      // Invariant: passwordHash is NEVER present on returned user projection
      expect(
        (result.user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        institutionId: mockUser.institutionId,
        regionalOffice: null,
      });
    });

    it('should normalize and trim uppercase/spaced email addresses before lookup', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({ ...mockUser });

      await authService.login({
        email: '  DEMO.INSTITUTION@SYNTHETIC.APPROVALSYNC.LOCAL  ',
        password: syntheticPassword,
      });

      expect(usersService.findByEmailForAuth).toHaveBeenCalledWith(
        'demo.institution@synthetic.approvalsync.local',
      );
    });

    it('should reject invalid password with generic UnauthorizedException without password leakage', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({ ...mockUser });

      await expect(
        authService.login({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: 'IncorrectPassword#999',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        authService.login({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: 'IncorrectPassword#999',
        }),
      ).rejects.toThrow('Invalid email or password.');
    });

    it('should reject nonexistent email with identical generic UnauthorizedException (preventing enumeration)', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await expect(
        authService.login({
          email: 'nonexistent@synthetic.approvalsync.local',
          password: syntheticPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(compareSpy).toHaveBeenCalled();
      compareSpy.mockRestore();
    });

    it('should reject disabled / inactive accounts with identical generic message', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: syntheticPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        authService.login({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: syntheticPassword,
        }),
      ).rejects.toThrow('Invalid email or password.');
    });

    it('should reject accounts without passwordHash configured', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({
        ...mockUser,
        passwordHash: '',
      });

      await expect(
        authService.login({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: syntheticPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return safe projection for active authenticated user', async () => {
      usersService.findSafeUserById.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        institutionId: mockUser.institutionId,
        regionalOffice: null,
        isActive: true,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });

      const user = await authService.getMe(mockUser.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(mockUser.id);
      expect(user.email).toBe(mockUser.email);
      expect(
        (user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
    });

    it('should reject if user is not found or inactive', async () => {
      usersService.findSafeUserById.mockResolvedValue(null);

      await expect(authService.getMe('nonexistent-uuid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
