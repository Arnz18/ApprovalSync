/**
 * ApprovalSync — Current User Decorator
 * Extracts the authenticated principal from request context.
 * Milestone: BE-03
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserPrincipal } from '../interfaces/auth-user.interface';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUserPrincipal | undefined,
    ctx: ExecutionContext,
  ): AuthUserPrincipal | unknown => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthUserPrincipal }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
