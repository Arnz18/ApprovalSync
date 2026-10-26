/**
 * ApprovalSync — Renew Undertaking DTO
 * Milestone: BE-09
 */

import {
  IsDateString,
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenewUndertakingDto {
  @ApiProperty({
    description: 'New start / renewal effective date in YYYY-MM-DD format',
    example: '2025-07-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'New expiry date in YYYY-MM-DD format',
    example: '2055-06-30',
  })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({
    description: 'Updated renewal lead time in days',
    example: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  renewalLeadDays?: number;

  @ApiPropertyOptional({
    description: 'New renewal document registration or deed reference number',
    example: 'PUN-REG-RENEWAL-2025-0012',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'New or updated counterparty name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyName?: string;

  @ApiPropertyOptional({
    description: 'Document attachment ID of the renewal instrument',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Renewal justification or covenant modification notes',
    example:
      'Tenure extended for 30 years with registered supplemental lease agreement.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  renewalNotes?: string;

  @ApiPropertyOptional({
    description: 'Additional renewal metadata payload',
  })
  @IsOptional()
  @IsObject()
  metadataJsonb?: Record<string, unknown>;
}
