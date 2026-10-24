/**
 * ApprovalSync — Update Application DTO
 * Milestone: BE-04
 */

import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    description: 'Academic year for approval (e.g. 2026-2027)',
    example: '2026-2027',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must follow the format YYYY-YYYY (e.g. 2026-2027)',
  })
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'Program or curriculum type',
    example: 'Undergraduate Engineering',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  programType?: string;

  @ApiPropertyOptional({
    description:
      'Category-specific dynamic JSONB application details to merge/update',
    example: {
      facultyCount: 52,
      landAreaAcres: 12.5,
      builtUpAreaSqMeters: 9200,
    },
  })
  @IsOptional()
  @IsObject({ message: 'payloadJsonb must be a valid JSON object' })
  payloadJsonb?: Record<string, unknown>;
}
