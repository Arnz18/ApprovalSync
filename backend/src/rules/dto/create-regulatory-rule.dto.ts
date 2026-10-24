/**
 * ApprovalSync — Create RegulatoryRule DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceSeverity } from '../../shared/contracts';
import { RuleType, RuleSourceClassification } from '../enums';

export class CreateRegulatoryRuleDto {
  @ApiProperty({
    description: 'Unique rule code within version (e.g. RULE-LAND-01)',
    example: 'RULE-LAND-01',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'ruleCode is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'ruleCode must contain only uppercase alphanumeric characters, underscores, and hyphens',
  })
  ruleCode: string;

  @ApiProperty({
    description: 'Concise human-readable title of the rule',
    example: 'Minimum Land Requirement for Rural UG Engineering',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'title is required' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Full textual specification of the regulatory rule',
    example:
      'Institutions situated in non-metro/rural areas must possess a contiguous land parcel of at least 7.5 acres.',
  })
  @IsNotEmpty({ message: 'description is required' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Regulatory category of rule',
    enum: RuleType,
    example: RuleType.INFRASTRUCTURE_LAND,
  })
  @IsNotEmpty({ message: 'ruleType is required' })
  @IsEnum(RuleType, {
    message: 'ruleType must be a valid RuleType enum value',
  })
  ruleType: RuleType;

  @ApiPropertyOptional({
    description: 'Severity classification if rule is violated',
    enum: ComplianceSeverity,
    default: ComplianceSeverity.CRITICAL_DEFICIENCY,
    example: ComplianceSeverity.CRITICAL_DEFICIENCY,
  })
  @IsOptional()
  @IsEnum(ComplianceSeverity, {
    message: 'severity must be a valid ComplianceSeverity enum value',
  })
  severity?: ComplianceSeverity;

  @ApiProperty({
    description: 'Structured rule parameters (strictly validated JSON object)',
    example: {
      minLandAcres: 7.5,
      areaType: 'RURAL',
      continguousRequired: true,
    },
  })
  @IsNotEmpty({ message: 'parametersJsonb is required' })
  @IsObject({ message: 'parametersJsonb must be a valid JSON object' })
  parametersJsonb: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Specific section, clause, or paragraph reference in handbook',
    example: 'APH 2024-27 Clause 1.4.1',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceClause?: string;

  @ApiPropertyOptional({
    description: 'Override source classification for this specific rule',
    enum: RuleSourceClassification,
    example: RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  })
  @IsOptional()
  @IsEnum(RuleSourceClassification, {
    message:
      'sourceClassification must be a valid RuleSourceClassification enum value',
  })
  sourceClassification?: RuleSourceClassification;
}
