/**
 * ApprovalSync — Document Analysis Response DTO
 * Milestone: DOC-02
 *
 * Implements the shared DocumentAnalysisReport contract with Swagger annotations.
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  BoundingBox,
  DocumentAnalysisReport,
  DocumentExtractionFinding,
  DocumentProcessingStatus,
} from '../../shared/contracts';

export class BoundingBoxDto implements BoundingBox {
  @ApiProperty({ description: '1-indexed page number in document', example: 1 })
  pageNumber: number;

  @ApiProperty({
    description: 'Left horizontal coordinate in points',
    example: 50,
  })
  xMin: number;

  @ApiProperty({
    description: 'Top vertical coordinate in points',
    example: 100,
  })
  yMin: number;

  @ApiProperty({
    description: 'Right horizontal coordinate in points',
    example: 350,
  })
  xMax: number;

  @ApiProperty({
    description: 'Bottom vertical coordinate in points',
    example: 125,
  })
  yMax: number;
}

export class DocumentExtractionFindingDto implements DocumentExtractionFinding {
  @ApiProperty({
    description: 'Canonical domain field key',
    example: 'leaseTenureYears',
  })
  fieldKey: string;

  @ApiProperty({ description: 'Extracted normalized value', example: 30 })
  extractedValue: string | number;

  @ApiProperty({
    description: 'Provider extraction confidence score (0.0 to 1.0)',
    example: 0.96,
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Spatial evidence bounding box',
    type: BoundingBoxDto,
  })
  evidenceLocation: BoundingBox;

  @ApiProperty({
    description: 'Indicates this is an advisory finding under ADR-004',
    example: true,
  })
  isAdvisory: true;
}

export class AnomalyFlagDto {
  @ApiProperty({
    description: 'Anomaly identification code',
    example: 'LOW_OCR_CONFIDENCE',
  })
  code: string;

  @ApiProperty({
    description:
      'Human-readable explanation of why this finding requires manual review',
    example: 'OCR confidence 0.72 is below the 0.85 threshold.',
  })
  description: string;

  @ApiProperty({
    description: 'Indicates this is an advisory indicator',
    example: true,
  })
  isAdvisory: true;

  @ApiProperty({
    description: 'Optional bounding box location for anomaly',
    required: false,
  })
  boundingLocation?: BoundingBox;
}

export class DocumentAnalysisResponseDto implements DocumentAnalysisReport {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'c8a2b5e1-8894-4d22-9214-411a7f66a2de',
  })
  documentId: string;

  @ApiProperty({
    description: 'Current document processing state',
    enum: DocumentProcessingStatus,
    example: DocumentProcessingStatus.OCR_EXTRACTED,
  })
  processingStatus: DocumentProcessingStatus;

  @ApiProperty({
    description: 'Composite OCR confidence score (0.0 to 1.0)',
    example: 0.94,
  })
  ocrConfidence: number;

  @ApiProperty({
    description: 'Key-value map of normalized extracted statutory fields',
    example: {
      deedNumber: 'DEED/2024/7891',
      leaseTenureYears: 30,
      landAreaAcres: 5.25,
    },
  })
  extractedFields: Record<string, string | number>;

  @ApiProperty({
    description:
      'Detailed spatial evidence findings linked to OCR bounding boxes',
    type: [DocumentExtractionFindingDto],
  })
  findings: DocumentExtractionFinding[];

  @ApiProperty({
    description:
      'Advisory-only anomaly flags surfacing items requiring officer scrutiny',
    type: [AnomalyFlagDto],
  })
  anomalyFlags: AnomalyFlagDto[];

  @ApiProperty({
    description: 'AI document classification metadata',
    required: false,
    example: { category: 'LAND_TITLE_DEED', confidence: 0.95 },
  })
  classification?: {
    category: string;
    confidence: number;
    isRecognized: boolean;
  };

  @ApiProperty({
    description: 'UTC ISO timestamp when analysis was performed',
    example: '2026-10-24T18:00:00.000Z',
  })
  processedAt: string;
}
