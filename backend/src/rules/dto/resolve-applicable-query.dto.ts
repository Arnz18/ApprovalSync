/**
 * ApprovalSync — Resolve Applicable Rules Query DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveApplicableQueryDto {
  @ApiProperty({
    description: 'Target application category (e.g. Undergraduate Engineering)',
    example: 'Undergraduate Engineering',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'category is required' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({
    description:
      'Evaluation date for determining effective rule version (defaults to current date if omitted)',
    example: '2026-10-24T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'evaluationDate must be a valid ISO 8601 date string' },
  )
  evaluationDate?: string;
}
