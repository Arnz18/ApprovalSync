/**
 * ApprovalSync — Compliance Assessment Result DTO
 * Milestone: DOC-06
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceFindingDto } from './compliance-finding.dto';

export class ComplianceSummaryDto {
  @ApiProperty({ description: 'Total versioned rules evaluated' })
  totalRulesEvaluated: number;

  @ApiProperty({ description: 'Count of critical deficiencies detected' })
  criticalDeficienciesCount: number;

  @ApiProperty({ description: 'Count of advisory flags generated' })
  advisoryFlagsCount: number;

  @ApiProperty({ description: 'Count of compliant rules verified' })
  compliantCount: number;

  @ApiProperty({
    description: 'Count of rules triggering physical inspection recommendation',
  })
  inspectionRecommendedCount: number;

  @ApiProperty({
    description: 'True if at least one critical deficiency exists',
  })
  hasCriticalDeficiency: boolean;

  @ApiProperty({ description: 'True if on-site EVC inspection is recommended' })
  requiresPhysicalInspection: boolean;
}

export class InfrastructureReviewSummaryDto {
  @ApiProperty({ description: 'Whether land area meets regulatory threshold' })
  landCompliant: boolean;

  @ApiProperty({
    description: 'Whether built-up instructional/admin area meets norms',
  })
  builtUpAreaCompliant: boolean;

  @ApiProperty({
    description: 'Whether barrier-free environment declarations exist',
  })
  barrierFreeDeclared: boolean;

  @ApiProperty({ description: 'Whether fire safety certificate is unexpired' })
  fireSafetyValid: boolean;

  @ApiProperty({
    description:
      'Whether Expert Visit Committee physical inspection is recommended',
  })
  evcInspectionRecommended: boolean;

  @ApiProperty({
    type: [String],
    description: 'Triggers necessitating on-site physical inspection',
  })
  inspectionTriggerReasons: string[];

  @ApiProperty({
    type: [String],
    description: 'Heuristic limitations and disclaimer statements',
  })
  heuristicLimitations: string[];
}

export class ComplianceAssessmentResultDto {
  @ApiProperty({ description: 'Application UUID' })
  applicationId: string;

  @ApiProperty({ description: 'Application registration number' })
  applicationNumber: string;

  @ApiProperty({ description: 'Institution UUID' })
  institutionId: string;

  @ApiProperty({ description: 'Curriculum program type' })
  programType: string;

  @ApiProperty({ description: 'Academic approval cycle year' })
  academicYear: string;

  @ApiProperty({ description: 'ISO-8601 evaluation timestamp' })
  evaluatedAt: string;

  @ApiProperty({
    example: true,
    description: 'Advisory finding indicator per ADR-004',
  })
  isAdvisory: true;

  @ApiPropertyOptional({ description: 'Resolved rule set code' })
  ruleSetCode?: string;

  @ApiPropertyOptional({ description: 'Resolved rule set name' })
  ruleSetName?: string;

  @ApiPropertyOptional({ description: 'Resolved rule version number' })
  ruleVersionNumber?: number;

  @ApiPropertyOptional({ description: 'Resolved rule version UUID' })
  ruleVersionId?: string;

  @ApiPropertyOptional({ description: 'Resolved checklist template code' })
  checklistCode?: string;

  @ApiProperty({
    type: ComplianceSummaryDto,
    description: 'Summary statistics of compliance evaluation',
  })
  summary: ComplianceSummaryDto;

  @ApiProperty({
    type: [ComplianceFindingDto],
    description: 'Detailed list of structured compliance findings',
  })
  findings: ComplianceFindingDto[];

  @ApiProperty({
    type: InfrastructureReviewSummaryDto,
    description: 'Infrastructure evidence review assist summary',
  })
  infrastructureReview: InfrastructureReviewSummaryDto;

  @ApiProperty({
    description: 'Mandatory human sovereignty and prototype disclaimer',
  })
  disclaimer: string;
}
