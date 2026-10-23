/**
 * ApprovalSync — Authenticated User Principal & Projection
 * Milestone: BE-03
 */

import { UserRole } from '../../shared/contracts';

/**
 * Principal attached to authenticated request (`request.user`)
 */
export interface AuthUserPrincipal {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string | null;
  regionalOffice?: string | null;
}

/**
 * Safe User projection returned across API responses (never includes passwordHash)
 */
export interface AuthUserProjection {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string | null;
  regionalOffice?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
