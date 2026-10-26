/**
 * ApprovalSync — Undertaking Response DTOs
 * Milestone: BE-09
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from '../enums';
import { UserRole } from '../../shared/contracts';

export class UndertakingResponseDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  institutionId: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  applicationId?: string | null;

  @ApiProperty({ enum: UndertakingType, example: UndertakingType.LAND_LEASE })
  type: UndertakingType;

  @ApiProperty({ enum: UndertakingStatus, example: UndertakingStatus.ACTIVE })
  status: UndertakingStatus;

  @ApiProperty({
    enum: UndertakingReviewStatus,
    example: UndertakingReviewStatus.VERIFIED,
  })
  reviewStatus: UndertakingReviewStatus;

  @ApiProperty({
    example: 'Registered 30-Year Land Lease Deed for Pune Campus',
  })
  title: string;

  @ApiPropertyOptional({
    example: 'Survey No. 452/1 comprising 7.5 contiguous acres',
  })
  description?: string | null;

  @ApiPropertyOptional({ example: 'PUN-REG-DEED-2024-99881' })
  documentNumber?: string | null;

  @ApiPropertyOptional({ example: 'Sub-Registrar Office Haveli Pune' })
  issuingAuthority?: string | null;

  @ApiPropertyOptional({
    example: 'Maharashtra Industrial Development Corporation',
  })
  counterpartyName?: string | null;

  @ApiProperty({ example: '2024-01-15' })
  startDate: string;

  @ApiProperty({ example: '2054-01-14' })
  expiryDate: string;

  @ApiProperty({ example: '2053-07-18' })
  renewalDueDate: string;

  @ApiProperty({ example: 180 })
  renewalLeadDays: number;

  @ApiProperty({ example: 10700 })
  daysRemaining: number;

  @ApiProperty({ example: false })
  isExpiringSoon: boolean;

  @ApiProperty({ example: false })
  isRenewalDue: boolean;

  @ApiProperty({ example: false })
  isExpired: boolean;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  documentId?: string | null;

  @ApiPropertyOptional()
  supersededById?: string | null;

  @ApiPropertyOptional()
  supersedesId?: string | null;

  @ApiPropertyOptional()
  reviewedById?: string | null;

  @ApiPropertyOptional()
  reviewedAt?: string | null;

  @ApiPropertyOptional()
  reviewNotes?: string | null;

  @ApiProperty({ example: {} })
  metadataJsonb: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({
    description:
      'Mandatory regulatory disclaimer adhering to ADR-004 Human Sovereignty',
    example:
      'Illustrative demonstration undertaking and lease tracking policy. AICTE statutory covenants and lease validity norms are governed by the AICTE Approval Process Handbook. Expiry calculations provide decision support and do not constitute statutory revocation or rejection.',
  })
  disclaimer: string;
}

export class UndertakingHistoryResponseDto {
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  undertakingId: string;

  @ApiProperty({ example: 'SUPERSEDED' })
  action: string;

  @ApiPropertyOptional({
    enum: UndertakingStatus,
    example: UndertakingStatus.ACTIVE,
  })
  fromStatus?: UndertakingStatus | null;

  @ApiProperty({
    enum: UndertakingStatus,
    example: UndertakingStatus.SUPERSEDED,
  })
  toStatus: UndertakingStatus;

  @ApiPropertyOptional({ enum: UndertakingReviewStatus })
  fromReviewStatus?: UndertakingReviewStatus | null;

  @ApiPropertyOptional({ enum: UndertakingReviewStatus })
  toReviewStatus?: UndertakingReviewStatus | null;

  @ApiProperty({ example: 'user-officer-uuid' })
  actorId: string;

  @ApiProperty({ enum: UserRole, example: UserRole.REGIONAL_OFFICER })
  actorRole: UserRole;

  @ApiPropertyOptional({ example: 'officer@approvalsync.local' })
  actorEmail?: string | null;

  @ApiPropertyOptional({
    example: 'Replaced with renewed registered lease deed No. 0012',
  })
  changeReason?: string | null;

  @ApiProperty()
  snapshotJsonb: Record<string, unknown>;

  @ApiProperty({ example: '2025-07-01T10:00:00.000Z' })
  createdAt: string;
}

export class UndertakingReconcileResponseDto {
  @ApiProperty({ example: 12 })
  scannedCount: number;

  @ApiProperty({ example: 8 })
  activeCount: number;

  @ApiProperty({ example: 2 })
  expiringSoonCount: number;

  @ApiProperty({ example: 1 })
  renewalDueCount: number;

  @ApiProperty({ example: 1 })
  expiredCount: number;

  @ApiProperty({ example: 4 })
  transitionedCount: number;

  @ApiProperty({ example: ['11111111-1111-1111-1111-111111111111'] })
  transitionedIds: string[];

  @ApiProperty({ example: '2025-05-15' })
  evaluationDate: string;

  @ApiProperty({
    example:
      'Illustrative demonstration undertaking and lease tracking policy. AICTE statutory covenants and lease validity norms are governed by the AICTE Approval Process Handbook. Expiry calculations provide decision support and do not constitute statutory revocation or rejection.',
  })
  disclaimer: string;
}
