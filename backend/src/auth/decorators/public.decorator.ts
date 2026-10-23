/**
 * ApprovalSync — Public Route Decorator
 * Marks an endpoint as unauthenticated in deny-by-default environment.
 * Milestone: BE-03
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
