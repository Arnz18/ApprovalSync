/**
 * ApprovalSync — Create RuleVersion DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RuleSourceClassification } from '../enums';

export class CreateRuleVersionDto {
  @ApiProperty({
    description: 'Timestamp or date from which this rule version takes effect',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty({ message: 'effectiveFrom is required' })
  @IsISO8601(
    {},
    { message: 'effectiveFrom must be a valid ISO 8601 date string' },
  )
  effectiveFrom: string;

  @ApiPropertyOptional({
    description:
      'Optional timestamp until which this rule version remains in effect',
    example: '2027-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'effectiveTo must be a valid ISO 8601 date string' },
  )
  effectiveTo?: string;

  @ApiProperty({
    description: 'Title of official regulatory document or publication',
    example: 'AICTE Approval Process Handbook (APH) 2024-2027',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'sourceTitle is required' })
  @IsString()
  @MaxLength(255)
  sourceTitle: string;

  @ApiProperty({
    description: 'Specific reference, chapter, or gazette citation',
    example: 'APH 2024-27 Chapter 1 & 2',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'sourceReference is required' })
  @IsString()
  @MaxLength(255)
  sourceReference: string;

  @ApiProperty({
    description: 'Regulatory source and confidence classification',
    enum: RuleSourceClassification,
    example: RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  })
  @IsNotEmpty({ message: 'sourceClassification is required' })
  @IsEnum(RuleSourceClassification, {
    message:
      'sourceClassification must be one of: VERIFIED_REGULATORY, UNVERIFIED_HUMAN_REVIEW_REQUIRED, ILLUSTRATIVE_DEMO',
  })
  sourceClassification: RuleSourceClassification;

  @ApiPropertyOptional({
    description: 'Summary of changes in this version',
    example:
      'Initial draft of revised land tenure and faculty ratio requirements',
  })
  @IsOptional()
  @IsString()
  changeSummary?: string;
}
