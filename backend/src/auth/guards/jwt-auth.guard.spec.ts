/**
 * ApprovalSync — JwtAuthGuard Unit Tests
 * Milestone: BE-03
 */

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '../../shared/contracts';
import { UsersService } from '../../users/users.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;

  const mockContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers: { ...headers },
      user: undefined,
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'app.nodeEnv') return 'development';
        if (key === 'jwt.secret') return 'test_jwt_secret_min_32_characters_ok';
        if (key === 'jwt.issuer') return 'approvalsync-auth';
        if (key === 'jwt.audience') return 'approvalsync-client';
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-uuid-1234',
        email: 'officer@synthetic.approvalsync.local',
        name: 'Scrutiny Officer',
        role: UserRole.SCRUTINY_OFFICER,
        institutionId: null,
        regionalOffice: 'Western Regional Office (WRO)',
        isActive: true,
      }),
    } as unknown as jest.Mocked<UsersService>;

    guard = new JwtAuthGuard(
      reflector,
      jwtService,
      configService,
      usersService,
    );
  });

  it('should allow access if route is marked as @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = mockContext();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should reject requests with missing Authorization header', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing or invalid authentication token.',
    );
  });

  it('should reject requests with non-Bearer Authorization header format', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should successfully verify valid Bearer token and attach authenticated principal to request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer valid.jwt.token' });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid-1234',
      email: 'officer@synthetic.approvalsync.local',
      name: 'Scrutiny Officer',
      role: UserRole.SCRUTINY_OFFICER,
      institutionId: null,
      regionalOffice: 'Western Regional Office (WRO)',
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe('user-uuid-1234');
    expect(req.user?.email).toBe('officer@synthetic.approvalsync.local');
    expect(req.user?.role).toBe(UserRole.SCRUTINY_OFFICER);
  });

  it('should reject expired, malformed, or invalidly signed tokens', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer expired.jwt.token' });

    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing or invalid authentication token.',
    );
  });

  it('should reject token missing required claims (sub, email, role)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer token.missing.claims' });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid',
      // email is missing
      role: UserRole.INSTITUTION_USER,
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject token with unrecognized role string', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer token.bad.role' });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid',
      email: 'test@example.com',
      role: 'SUPER_HACKER_ROOT',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should accept developer identity headers in development mode for early integration stubs', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({
      'x-dev-user-id': 'dev-user-001',
      'x-dev-user-role': UserRole.SCRUTINY_OFFICER,
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    expect(req.user?.id).toBe('dev-user-001');
    expect(req.user?.role).toBe(UserRole.SCRUTINY_OFFICER);
  });

  it('should strictly ignore developer identity headers in production mode', async () => {
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        if (key === 'app.nodeEnv') return 'production';
        return defaultValue;
      },
    );

    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({
      'x-dev-user-id': 'dev-user-001',
      'x-dev-user-role': UserRole.SCRUTINY_OFFICER,
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject request if user in token is deactivated in database (isActive: false)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer valid.jwt.token' });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid-1234',
      email: 'officer@synthetic.approvalsync.local',
      role: UserRole.SCRUTINY_OFFICER,
    });

    usersService.findById.mockResolvedValue({
      id: 'user-uuid-1234',
      email: 'officer@synthetic.approvalsync.local',
      name: 'Scrutiny Officer',
      role: UserRole.SCRUTINY_OFFICER,
      institutionId: null,
      regionalOffice: null,
      isActive: false, // Account deactivated!
    } as unknown as any);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'User account no longer active or found.',
    );
  });

  it('should reject request if user in token is no longer found in database', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer valid.jwt.token' });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'deleted-user-uuid',
      email: 'deleted@synthetic.approvalsync.local',
      role: UserRole.INSTITUTION_USER,
    });

    usersService.findById.mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'User account no longer active or found.',
    );
  });

  it('should derive current role and institution from database rather than trusting stale token claims', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = mockContext({ authorization: 'Bearer stale.token' });

    // Token was issued when user had SCRUTINY_OFFICER role and institution-A
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid-1234',
      email: 'user@synthetic.approvalsync.local',
      role: UserRole.SCRUTINY_OFFICER,
      institutionId: 'inst-A',
    });

    // In DB, user was reassigned to AUDITOR role and institution-B
    usersService.findById.mockResolvedValue({
      id: 'user-uuid-1234',
      email: 'user@synthetic.approvalsync.local',
      name: 'Reassigned User',
      role: UserRole.AUDITOR,
      institutionId: 'inst-B',
      regionalOffice: null,
      isActive: true,
    } as unknown as any);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>();
    expect(req.user?.role).toBe(UserRole.AUDITOR); // Fresh from DB!
    expect(req.user?.institutionId).toBe('inst-B'); // Fresh from DB!
  });
});
