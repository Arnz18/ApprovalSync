/**
 * ApprovalSync — Review Undertaking DTO
 * Milestone: BE-09
 */

import {
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UndertakingReviewStatus, UndertakingStatus } from '../enums';

export class ReviewUndertakingDto {
  @ApiProperty({
    description: 'Review officer disposition on the undertaking evidence',
    enum: UndertakingReviewStatus,
    example: UndertakingReviewStatus.VERIFIED,
  })
  @IsEnum(UndertakingReviewStatus)
  reviewStatus: UndertakingReviewStatus;

  @ApiProperty({
    description: 'Mandatory officer review justification and findings notes',
    example:
      'Corroborated 30-year lease tenure against registered sub-registrar deed No. 99881. Covenants conform to APH 2024-27 norms.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reviewNotes: string;

  @ApiPropertyOptional({
    description:
      'Optionally set lifecycle status to ACTIVE upon verified review',
    enum: UndertakingStatus,
    example: UndertakingStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UndertakingStatus)
  effectiveStatus?: UndertakingStatus;
}
