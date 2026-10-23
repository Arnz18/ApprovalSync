/**
 * ApprovalSync — JWT Authentication Guard
 * Deny-by-default guard validating Bearer JWT tokens.
 * Milestone: BE-03
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthUserPrincipal } from '../interfaces/auth-user.interface';
import { UserRole } from '../../shared/contracts';
import { UsersService } from '../../users/users.service';

interface AuthenticatedRequest extends Request {
  user?: AuthUserPrincipal;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // In non-production environments only, check for documented developer header stubs
      const nodeEnv = this.configService.get<string>(
        'app.nodeEnv',
        'development',
      );
      if (nodeEnv !== 'production') {
        const devUserId = request.headers['x-dev-user-id'] as string;
        const devRole = request.headers['x-dev-user-role'] as string;
        if (
          devUserId &&
          devRole &&
          Object.values(UserRole).includes(devRole as UserRole)
        ) {
          request.user = {
            id: devUserId,
            email: `${devUserId}@synthetic.local`,
            name: `Developer Stub (${devUserId})`,
            role: devRole as UserRole,
            institutionId:
              (request.headers['x-institution-id'] as string) || null,
          };
          return true;
        }
      }

      throw new UnauthorizedException(
        'Missing or invalid authentication token.',
      );
    }

    try {
      const secret = this.configService.get<string>('jwt.secret');
      const issuer = this.configService.get<string>('jwt.issuer');
      const audience = this.configService.get<string>('jwt.audience');

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
        issuer,
        audience,
        algorithms: ['HS256'],
      });

      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException(
          'Token payload is missing required principal claims.',
        );
      }

      if (!Object.values(UserRole).includes(payload.role)) {
        throw new UnauthorizedException('Token contains an unrecognized role.');
      }

      // Revalidate active account status and derive fresh role/tenant scope from persistence layer
      const persistedUser = await this.usersService.findById(payload.sub);
      if (!persistedUser || !persistedUser.isActive) {
        this.logger.debug(
          `Authentication rejected: user ${payload.sub} not found or inactive in database`,
        );
        throw new UnauthorizedException(
          'User account no longer active or found.',
        );
      }

      request.user = {
        id: persistedUser.id,
        email: persistedUser.email,
        name: persistedUser.name,
        role: persistedUser.role,
        institutionId: persistedUser.institutionId || null,
        regionalOffice: persistedUser.regionalOffice || null,
      };

      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      const message = (err as Error)?.message || 'JWT verification failed';
      this.logger.debug(`Authentication rejected: ${message}`);
      throw new UnauthorizedException(
        'Missing or invalid authentication token.',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token.trim();
  }
}
