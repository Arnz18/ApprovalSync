/**
 * ApprovalSync — Duplicate Detection Response DTOs
 * Milestone: DOC-04
 */

import { ApiProperty } from '@nestjs/swagger';
import { ValidationFindingDto } from './validation-result.dto';
import { DuplicateDetectionResult } from '../interfaces';

export class DuplicateDetectionResultDto implements DuplicateDetectionResult {
  @ApiProperty({
    description: 'Application UUID',
    example: 'c1b489a2-5b92-49f3-8cfb-6d35a0d33e51',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Total documents evaluated for duplicates',
    example: 6,
  })
  totalDocumentsEvaluated: number;

  @ApiProperty({
    description: 'Count of exact cryptographic duplicates detected',
    example: 0,
  })
  exactDuplicatesCount: number;

  @ApiProperty({
    description: 'Count of near-duplicates detected',
    example: 0,
  })
  nearDuplicatesCount: number;

  @ApiProperty({
    description: 'List of duplicate detection findings',
    type: [ValidationFindingDto],
  })
  findings: ValidationFindingDto[];

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp when evaluation was performed',
    example: '2026-10-24T15:00:00.000Z',
  })
  evaluatedAt: string;
}
