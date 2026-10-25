/**
 * ApprovalSync — Evaluate Compliance DTO
 * Milestone: DOC-06
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class EvaluateComplianceDto {
  @ApiPropertyOptional({
    description:
      'Evaluation date for applicable rule version resolution (YYYY-MM-DD)',
    example: '2026-10-25',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'evaluationDate must follow YYYY-MM-DD format',
  })
  evaluationDate?: string;

  @ApiPropertyOptional({
    description: 'Optional explicit RuleSet code to evaluate against',
    example: 'RULESET-ENGG-UG',
  })
  @IsOptional()
  @IsString()
  ruleSetCode?: string;
}
