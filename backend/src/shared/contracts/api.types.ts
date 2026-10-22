/**
 * ApprovalSync — Shared API Types & DTO Definitions
 * Milestone: FND-02
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string; // ISO 8601 UTC
    correlationId: string; // UUIDv4
    pagination?: PaginationMeta;
  };
}

export interface FieldError {
  field: string;
  message: string;
  rule?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    correlationId: string;
    details?: FieldError[];
  };
}

export interface MockProviderMetadata {
  isMock: true;
  provider: string; // e.g. "SIMULATED_DIGILOCKER_SANDBOX"
  verificationScope: string; // e.g. "SYNTHETIC_TEST_CERTIFICATE_ONLY"
  disclaimer: string;
}

export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 20;
  sortBy?: string = 'createdAt';
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
