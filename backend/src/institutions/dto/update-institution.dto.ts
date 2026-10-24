/**
 * ApprovalSync — Update Institution Profile DTO
 * Milestone: BE-04
 */

import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstitutionDto {
  @ApiPropertyOptional({
    description: 'Official registered institution name',
    example: 'Apex Institute of Technology & Engineering',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Institution type or category',
    example: 'Engineering & Technology',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institutionType?: string;

  @ApiPropertyOptional({
    description: 'State where institution is located',
    example: 'Maharashtra',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    description: 'District where institution is located',
    example: 'Pune',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({
    description: 'Postal PIN code (6 digits)',
    example: '411001',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'pincode must be a valid 6-digit Indian postal PIN code',
  })
  pincode?: string;

  @ApiPropertyOptional({
    description: 'Full campus street address',
    example: 'Plot 42, Knowledge Park, Pune',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
