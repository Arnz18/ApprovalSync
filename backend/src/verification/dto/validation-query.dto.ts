/**
 * ApprovalSync — Validation Query DTO
 * Milestone: DOC-03
 *
 * Query parameters for triggering or querying document validation results.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidationQueryDto {
  @ApiPropertyOptional({
    description:
      'If true, forces re-evaluation of all rules instead of returning cached result',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recalculate?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Optional reference date for expiry calculations (ISO 8601). Defaults to current time.',
    example: '2026-10-24T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
