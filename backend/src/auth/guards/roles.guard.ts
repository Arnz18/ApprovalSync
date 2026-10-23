/**
 * ApprovalSync — Role-Based Access Control (RBAC) Guard
 * Validates authenticated principal role against required @Roles metadata.
 * Milestone: BE-03
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../shared/contracts';
import { AuthUserPrincipal } from '../interfaces/auth-user.interface';

interface RequestWithPrincipal {
  user?: AuthUserPrincipal;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: unauthenticated principal.');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        'Access denied: insufficient permissions for this resource.',
      );
    }

    return true;
  }
}
