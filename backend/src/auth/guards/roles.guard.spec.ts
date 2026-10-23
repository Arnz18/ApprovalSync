/**
 * ApprovalSync — RolesGuard Unit Tests
 * Milestone: BE-03
 */

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../shared/contracts';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockContext = (user?: { role?: UserRole }) => {
    const request = { user };
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

    guard = new RolesGuard(reflector);
  });

  it('should allow access if route is marked @Public()', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'isPublic') return true;
      return undefined;
    });

    const ctx = mockContext({ role: UserRole.INSTITUTION_USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access if route has no @Roles() constraint', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = mockContext({ role: UserRole.INSTITUTION_USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user role matches required role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'roles') return [UserRole.SCRUTINY_OFFICER];
      return undefined;
    });

    const ctx = mockContext({ role: UserRole.SCRUTINY_OFFICER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user role matches one of multiple permitted roles', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'roles')
        return [UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER];
      return undefined;
    });

    const ctx = mockContext({ role: UserRole.REGIONAL_OFFICER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject access with 403 ForbiddenException when user has insufficient role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'roles') return [UserRole.BUREAU_HEAD];
      return undefined;
    });

    const ctx = mockContext({ role: UserRole.INSTITUTION_USER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Access denied: insufficient permissions for this resource.',
    );
  });

  it('should reject access with 403 ForbiddenException when principal is missing on protected route', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === 'roles') return [UserRole.SCRUTINY_OFFICER];
      return undefined;
    });

    const ctx = mockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
