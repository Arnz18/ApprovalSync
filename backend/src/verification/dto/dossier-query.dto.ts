/**
 * ApprovalSync — Dossier Verification Query DTO
 * Milestone: DOC-07
 *
 * Query parameters for executing or retrieving consolidated dossier verification reports.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class DossierQueryDto {
  @ApiPropertyOptional({
    description:
      'If true, forces complete multi-pipeline re-evaluation instead of returning cached snapshot',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recalculate?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Optional reference date for regulatory rules and document expiry calculations (ISO 8601). Defaults to current time.',
    example: '2026-10-25T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
