/**
 * ApprovalSync — Authentication API Service
 * Milestone: FE-02
 * Implements BE-03 Auth Endpoints:
 * - POST /api/v1/auth/login
 * - GET /api/v1/auth/me
 */

import { apiClient, ApiClient } from '../client';
import { LoginCredentials, LoginResponseData, AuthUser } from '../../auth/types';

export class AuthService {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * Authenticate user credentials against POST /api/v1/auth/login
   * Note: authToken is explicitly passed as null to suppress any existing bearer token
   * on public authentication calls.
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    return this.client.post<LoginResponseData>('/auth/login', credentials, {
      authToken: null,
    });
  }

  /**
   * Retrieve current user profile against GET /api/v1/auth/me
   * Uses either the explicitly passed bearer token or the client's token provider.
   */
  public async getMe(token?: string): Promise<AuthUser> {
    const options = token ? { authToken: token } : {};
    return this.client.get<AuthUser>('/auth/me', undefined, options);
  }
}

// Export singleton instance
export const authService = new AuthService();
