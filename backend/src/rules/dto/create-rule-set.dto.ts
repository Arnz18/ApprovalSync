/**
 * ApprovalSync — Create RuleSet DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleSetDto {
  @ApiProperty({
    description:
      'Unique rule set code (uppercase letters, numbers, and hyphens)',
    example: 'RULESET-ENGG-UG',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'code is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'code must contain only uppercase alphanumeric characters, underscores, and hyphens',
  })
  code: string;

  @ApiProperty({
    description: 'Descriptive name of the rule set',
    example: 'AICTE Undergraduate Engineering Regulatory Norms',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description or scope of applicability',
    example:
      'Regulatory norms covering land, built-up area, and faculty ratios for UG Engineering colleges',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Target application category',
    example: 'Undergraduate Engineering',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'applicationCategory is required' })
  @IsString()
  @MaxLength(100)
  applicationCategory: string;

  @ApiPropertyOptional({
    description: 'Issuing regulatory authority',
    example: 'AICTE',
    default: 'AICTE',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string;
}
