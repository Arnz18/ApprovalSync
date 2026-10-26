/**
 * ApprovalSync — Institutional Undertakings & Leases Domain Types
 * Milestone: FE-07
 * Strict integration with BE-09 Undertakings Controller & Contracts.
 */

import { UserRole, PaginationMeta } from '../api/types';

// -----------------------------------------------------------------------------
// Domain Enums (Mirroring backend/src/undertakings/enums)
// -----------------------------------------------------------------------------

export enum UndertakingType {
  LAND_LEASE = 'LAND_LEASE',
  BUILDING_LEASE = 'BUILDING_LEASE',
  AFFIDAVIT_UNDERTAKING = 'AFFIDAVIT_UNDERTAKING',
  FIRE_SAFETY_CLEARANCE = 'FIRE_SAFETY_CLEARANCE',
  STRUCTURAL_STABILITY = 'STRUCTURAL_STABILITY',
  LAND_USE_CONVERSION = 'LAND_USE_CONVERSION',
  EQUIPMENT_SAFETY = 'EQUIPMENT_SAFETY',
  GENERAL_COMPLIANCE = 'GENERAL_COMPLIANCE',
}

export enum UndertakingStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  RENEWAL_DUE = 'RENEWAL_DUE',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED',
  TERMINATED = 'TERMINATED',
}

export enum UndertakingReviewStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  DEFICIENT = 'DEFICIENT',
  REJECTED = 'REJECTED',
}

// -----------------------------------------------------------------------------
// Projections and Responses (Mirroring backend/src/undertakings/dto)
// -----------------------------------------------------------------------------

export interface UndertakingProjection {
  id: string;
  institutionId: string;
  applicationId?: string | null;
  type: UndertakingType;
  status: UndertakingStatus;
  reviewStatus: UndertakingReviewStatus;
  title: string;
  description?: string | null;
  documentNumber?: string | null;
  issuingAuthority?: string | null;
  counterpartyName?: string | null;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  renewalDueDate: string; // YYYY-MM-DD
  renewalLeadDays: number;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isRenewalDue: boolean;
  isExpired: boolean;
  documentId?: string | null;
  supersededById?: string | null;
  supersedesId?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  metadataJsonb: Record<string, unknown>;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  disclaimer: string;
}

export interface UndertakingHistoryEntry {
  id: string;
  undertakingId: string;
  action: string;
  fromStatus?: UndertakingStatus | null;
  toStatus: UndertakingStatus;
  fromReviewStatus?: UndertakingReviewStatus | null;
  toReviewStatus?: UndertakingReviewStatus | null;
  actorId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
  changeReason?: string | null;
  snapshotJsonb: Record<string, unknown>;
  createdAt: string;
}

export interface UndertakingReconcileResult {
  scannedCount: number;
  activeCount: number;
  expiringSoonCount: number;
  renewalDueCount: number;
  expiredCount: number;
  transitionedCount: number;
  transitionedIds: string[];
  evaluationDate: string;
  disclaimer: string;
}

export interface UndertakingsListResponse {
  items: UndertakingProjection[];
  pagination: PaginationMeta;
}

// -----------------------------------------------------------------------------
// Request DTOs
// -----------------------------------------------------------------------------

export interface CreateUndertakingDto {
  institutionId?: string;
  applicationId?: string;
  type: UndertakingType;
  title: string;
  description?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  counterpartyName?: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  renewalLeadDays?: number;
  documentId?: string;
  metadataJsonb?: Record<string, unknown>;
}

export interface UpdateUndertakingDto {
  title?: string;
  description?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  counterpartyName?: string;
  documentId?: string;
  metadataJsonb?: Record<string, unknown>;
}

export interface ReviewUndertakingDto {
  reviewStatus: UndertakingReviewStatus;
  reviewNotes: string;
  effectiveStatus?: UndertakingStatus;
}

export interface RenewUndertakingDto {
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  renewalLeadDays?: number;
  documentNumber?: string;
  counterpartyName?: string;
  documentId?: string;
  renewalNotes?: string;
  metadataJsonb?: Record<string, unknown>;
}

export interface UndertakingQueryParams {
  institutionId?: string;
  applicationId?: string;
  type?: UndertakingType;
  status?: UndertakingStatus;
  reviewStatus?: UndertakingReviewStatus;
  expiringWithinDays?: number;
  isExpired?: boolean;
  search?: string;
  documentNumber?: string;
  asOfDate?: string;
  sortBy?: 'expiryDate' | 'renewalDueDate' | 'startDate' | 'createdAt' | 'title' | string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
  page?: number;
  limit?: number;
}
