/**
 * ApprovalSync — JWT Claims Payload Interface
 * Milestone: BE-03
 */

import { UserRole } from '../../shared/contracts';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string | null;
  regionalOffice?: string | null;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
