/**
 * ApprovalSync — Update Undertaking DTO
 * Milestone: BE-09
 */

import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUndertakingDto {
  @ApiPropertyOptional({
    description: 'Updated title of the undertaking record',
    example: 'Updated Land Lease Deed for Pune Campus',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of terms, covenants, or clauses',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated registration number or deed number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Updated issuing authority',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string;

  @ApiPropertyOptional({
    description: 'Updated counterparty or lessor name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterpartyName?: string;

  @ApiPropertyOptional({
    description: 'Updated document attachment ID',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata payload',
  })
  @IsOptional()
  @IsObject()
  metadataJsonb?: Record<string, unknown>;
}
