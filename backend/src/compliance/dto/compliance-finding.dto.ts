/**
 * ApprovalSync — Compliance Finding DTO
 * Milestone: DOC-06
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceSeverity } from '../../shared/contracts';
import { RuleSourceClassification } from '../../rules/enums';

export class EvidenceReferenceDto {
  @ApiPropertyOptional({ description: 'Referenced document UUID' })
  documentId?: string;

  @ApiPropertyOptional({ description: 'Referenced document category type' })
  documentType?: string;

  @ApiPropertyOptional({ description: 'Document filename' })
  fileName?: string;

  @ApiPropertyOptional({ description: 'Field key extracted or evaluated' })
  fieldKey?: string;

  @ApiPropertyOptional({ description: 'Extracted value from document AI' })
  extractedValue?: string | number | null;

  @ApiPropertyOptional({ description: 'Declared value in application payload' })
  declaredValue?: string | number | null;

  @ApiPropertyOptional({
    description: 'Page number where evidence was located',
  })
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'Evidence extraction notes' })
  notes?: string;
}

export class ComplianceFindingDto {
  @ApiProperty({ description: 'Unique finding UUID' })
  id: string;

  @ApiProperty({
    description: 'Stable finding code (e.g. DEF_LAND_AREA_INSUFFICIENT)',
  })
  findingCode: string;

  @ApiProperty({ description: 'Human-readable title' })
  title: string;

  @ApiProperty({ description: 'Detailed explanatory finding description' })
  description: string;

  @ApiProperty({
    enum: ComplianceSeverity,
    description: 'Finding severity classification',
  })
  severity: ComplianceSeverity;

  @ApiProperty({
    example: true,
    description: 'Advisory-only indicator per ADR-004 Human Sovereignty',
  })
  isAdvisory: true;

  @ApiProperty({
    enum: [
      'DOCUMENTARY',
      'INFRASTRUCTURE',
      'CADRE_RATIO',
      'SAFETY_ACCESSIBILITY',
    ],
    description: 'Finding domain category',
  })
  category:
    'DOCUMENTARY' | 'INFRASTRUCTURE' | 'CADRE_RATIO' | 'SAFETY_ACCESSIBILITY';

  @ApiPropertyOptional({ description: 'Linked regulatory rule code' })
  ruleCode?: string;

  @ApiPropertyOptional({ description: 'Linked regulatory rule version UUID' })
  ruleVersionId?: string;

  @ApiPropertyOptional({ description: 'Linked regulatory rule version number' })
  ruleVersionNumber?: number;

  @ApiPropertyOptional({ description: 'Linked checklist template code' })
  checklistTemplateCode?: string;

  @ApiPropertyOptional({ description: 'Linked checklist item code' })
  checklistItemCode?: string;

  @ApiPropertyOptional({ description: 'Source handbook / statute clause' })
  sourceClause?: string;

  @ApiPropertyOptional({
    enum: RuleSourceClassification,
    description: 'Source classification of the rule',
  })
  sourceClassification?: RuleSourceClassification;

  @ApiProperty({
    type: [EvidenceReferenceDto],
    description: 'Evidence references and document linkages',
  })
  evidence: EvidenceReferenceDto[];

  @ApiProperty({
    description:
      'Whether finding triggers a recommendation for on-site physical inspection by EVC',
  })
  requiresPhysicalInspection: boolean;

  @ApiProperty({
    description: 'Recommended next action for scrutiny officer or applicant',
  })
  recommendedAction: string;

  @ApiProperty({
    type: [String],
    description: 'Documentary or heuristic limitations',
  })
  limitations: string[];
}
