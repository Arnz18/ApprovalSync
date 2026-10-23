/**
 * ApprovalSync — Roles Decorator
 * Declares required UserRole(s) for route authorization.
 * Milestone: BE-03
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '../../shared/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
