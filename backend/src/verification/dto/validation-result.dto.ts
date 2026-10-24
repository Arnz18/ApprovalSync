/**
 * ApprovalSync — Validation Result DTOs
 * Milestone: DOC-03
 *
 * Swagger-annotated response DTOs for document completeness, expiry,
 * and cross-record consistency validation results.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoundingBox, ComplianceSeverity } from '../../shared/contracts';
import {
  ValidationOutcome,
  ValidationCategory,
  OverallValidationStatus,
} from '../enums';
import {
  ValidationFinding,
  ValidationSummary,
  ApplicationValidationResult,
} from '../interfaces';

export class BoundingBoxDto implements BoundingBox {
  @ApiProperty({ description: '1-indexed page number', example: 1 })
  pageNumber: number;

  @ApiProperty({
    description: 'Normalized min X coordinate (0.0 to 1.0)',
    example: 0.12,
  })
  xMin: number;

  @ApiProperty({
    description: 'Normalized min Y coordinate (0.0 to 1.0)',
    example: 0.34,
  })
  yMin: number;

  @ApiProperty({
    description: 'Normalized max X coordinate (0.0 to 1.0)',
    example: 0.56,
  })
  xMax: number;

  @ApiProperty({
    description: 'Normalized max Y coordinate (0.0 to 1.0)',
    example: 0.78,
  })
  yMax: number;
}

export class ValidationFindingDto implements ValidationFinding {
  @ApiProperty({
    description: 'Unique rule identifier',
    example: 'DOC-COMP-MISSING-FIRE_SAFETY_CERTIFICATE',
  })
  ruleId: string;

  @ApiProperty({
    description: 'Validation category',
    enum: ValidationCategory,
    example: ValidationCategory.DOCUMENT_COMPLETENESS,
  })
  category: ValidationCategory;

  @ApiProperty({
    description: 'Specific validation outcome',
    enum: ValidationOutcome,
    example: ValidationOutcome.DEFICIENT,
  })
  outcome: ValidationOutcome;

  @ApiProperty({
    description: 'Statutory compliance severity level',
    enum: ComplianceSeverity,
    example: ComplianceSeverity.CRITICAL_DEFICIENCY,
  })
  severity: ComplianceSeverity;

  @ApiProperty({
    description: 'Human-readable explanation of finding',
    example:
      'Mandatory Fire Safety Certificate is missing for this application.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Related document ID if applicable',
    example: 'd9b73673-8a3e-4b62-97b7-658b148c26bb',
  })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Related document category/type',
    example: 'FIRE_SAFETY_CERTIFICATE',
  })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Field key evaluated if applicable',
    example: 'expiryDate',
  })
  fieldKey?: string;

  @ApiPropertyOptional({
    description: 'Expected benchmark or application value',
    example: 'Apex Institute of Technology',
  })
  expectedValue?: string | number;

  @ApiPropertyOptional({
    description: 'Observed extracted value',
    example: 'Apex Tech Institute',
  })
  observedValue?: string | number;

  @ApiPropertyOptional({
    description: 'Bounding box coordinates on source document page',
    type: BoundingBoxDto,
  })
  evidenceLocation?: BoundingBox;

  @ApiPropertyOptional({
    description: 'Provisional confidence score (0.0 to 1.0)',
    example: 0.94,
  })
  confidenceScore?: number;

  @ApiProperty({
    description:
      'Human Sovereignty guard: findings are strictly advisory (ADR-004)',
    example: true,
    default: true,
  })
  isAdvisory: true;

  @ApiPropertyOptional({
    description: 'Additional audit or comparison metadata',
  })
  metadata?: Record<string, unknown>;
}

export class ValidationSummaryDto implements ValidationSummary {
  @ApiProperty({
    description: 'Total rules evaluated across all categories',
    example: 12,
  })
  totalRulesEvaluated: number;

  @ApiProperty({
    description: 'Number of checks evaluated as compliant',
    example: 9,
  })
  totalCompliant: number;

  @ApiProperty({
    description: 'Number of critical deficiencies detected',
    example: 1,
  })
  totalDeficiencies: number;

  @ApiProperty({
    description: 'Number of advisory warnings detected',
    example: 2,
  })
  totalAdvisories: number;

  @ApiProperty({
    description: 'Number of checks where source data was unavailable',
    example: 0,
  })
  totalSourceUnavailable: number;
}

export class ApplicationValidationResultDto implements ApplicationValidationResult {
  @ApiProperty({
    description: 'Application UUID',
    example: 'c1b489a2-5b92-49f3-8cfb-6d35a0d33e51',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Human-readable application reference number',
    example: 'APP-2026-A1B2C3D4',
  })
  applicationNumber: string;

  @ApiProperty({
    description: 'Institution UUID',
    example: 'e3f16248-18e3-4d69-8db8-1fc442ea3b11',
  })
  institutionId: string;

  @ApiProperty({
    description: 'Application program category',
    example: 'Undergraduate Engineering',
  })
  programType: string;

  @ApiProperty({
    description: 'Overall validation disposition',
    enum: OverallValidationStatus,
    example: OverallValidationStatus.DEFICIENT,
  })
  overallStatus: OverallValidationStatus;

  @ApiProperty({
    description: 'Summary metrics across validation categories',
    type: ValidationSummaryDto,
  })
  summary: ValidationSummaryDto;

  @ApiProperty({
    description: 'List of individual validation findings',
    type: [ValidationFindingDto],
  })
  findings: ValidationFindingDto[];

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp when evaluation was performed',
    example: '2026-10-24T14:30:00.000Z',
  })
  evaluatedAt: string;

  @ApiProperty({
    description: 'Version of the validation rule catalog applied',
    example: '1.0.0',
  })
  ruleVersion: string;
}
