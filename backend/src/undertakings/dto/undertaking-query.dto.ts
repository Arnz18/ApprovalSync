/**
 * ApprovalSync — Undertaking Query Filter DTO
 * Milestone: BE-09
 */

import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from '../enums';

export class UndertakingQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by institution ID (officer/admin only; institution users are strictly tenant-scoped)',
  })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by associated application ID',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by undertaking type',
    enum: UndertakingType,
  })
  @IsOptional()
  @IsEnum(UndertakingType)
  type?: UndertakingType;

  @ApiPropertyOptional({
    description: 'Filter by lifecycle status',
    enum: UndertakingStatus,
  })
  @IsOptional()
  @IsEnum(UndertakingStatus)
  status?: UndertakingStatus;

  @ApiPropertyOptional({
    description: 'Filter by review verification status',
    enum: UndertakingReviewStatus,
  })
  @IsOptional()
  @IsEnum(UndertakingReviewStatus)
  reviewStatus?: UndertakingReviewStatus;

  @ApiPropertyOptional({
    description: 'Filter records expiring within a specified number of days',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiringWithinDays?: number;

  @ApiPropertyOptional({
    description: 'Filter records that are already expired',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isExpired?: boolean;

  @ApiPropertyOptional({
    description:
      'Search string across title, document number, issuing authority, or counterparty name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific document or registration deed number',
    example: 'DEED-MAH-2020-8841',
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    description:
      'Evaluation date in YYYY-MM-DD format for derived status calculations (defaults to current date)',
    example: '2025-05-15',
  })
  @IsOptional()
  @IsString()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'expiryDate',
    enum: ['expiryDate', 'renewalDueDate', 'startDate', 'createdAt', 'title'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'expiryDate';

  @ApiPropertyOptional({
    description: 'Sort direction',
    default: 'ASC',
    enum: ['ASC', 'DESC', 'asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page (max 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
