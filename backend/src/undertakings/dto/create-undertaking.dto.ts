/**
 * ApprovalSync — Create Undertaking DTO
 * Milestone: BE-09
 */

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UndertakingType } from '../enums';

export class CreateUndertakingDto {
  @ApiPropertyOptional({
    description:
      'Target institution ID (required for regulatory officers, inferred for institution users)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({
    description:
      'Optional application ID to associate this undertaking with an active approval workflow',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiProperty({
    description: 'Classification of the undertaking or lease record',
    enum: UndertakingType,
    example: UndertakingType.LAND_LEASE,
  })
  @IsEnum(UndertakingType)
  type: UndertakingType;

  @ApiProperty({
    description:
      'Title or summary description of the undertaking or lease deed',
    example: 'Registered 30-Year Land Lease Deed for Pune Campus',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of terms, covenants, or clauses',
    example:
      'Survey No. 452/1 comprising 7.5 contiguous acres in Pune District.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Document registration number, deed number, or NOC serial number',
    example: 'PUN-REG-DEED-2024-99881',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Issuing or registering statutory authority',
    example: 'Sub-Registrar Office Haveli Pune',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string;

  @ApiPropertyOptional({
    description:
      'Counterparty name (e.g. Lessor, Trust, Landlord, Sponsoring Society)',
    example: 'Maharashtra Industrial Development Corporation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyName?: string;

  @ApiProperty({
    description: 'Commencement / effective date in YYYY-MM-DD format',
    example: '2024-01-15',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Expiry or tenure completion date in YYYY-MM-DD format',
    example: '2054-01-14',
  })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({
    description:
      'Renewal notification lead time in days (default 60 days, or 180 for land lease)',
    example: 180,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  renewalLeadDays?: number;

  @ApiPropertyOptional({
    description: 'Associated document attachment ID in document vault',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description:
      'Custom metadata payload (tenure years, land area acres, survey numbers, etc.)',
    example: { tenureYears: 30, acreage: 7.5, surveyNumber: '452/1' },
  })
  @IsOptional()
  @IsObject()
  metadataJsonb?: Record<string, unknown>;
}
