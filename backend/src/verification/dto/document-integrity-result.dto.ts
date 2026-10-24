/**
 * ApprovalSync — Document Integrity Response DTOs
 * Milestone: DOC-04
 */

import { ApiProperty } from '@nestjs/swagger';
import { ValidationFindingDto } from './validation-result.dto';
import { DocumentIntegrityResult } from '../interfaces';

export class DocumentIntegrityResultDto implements DocumentIntegrityResult {
  @ApiProperty({
    description: 'Document UUID',
    example: 'd9b73673-8a3e-4b62-97b7-658b148c26bb',
  })
  documentId: string;

  @ApiProperty({
    description: 'Document original file name',
    example: 'land_title_deed.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'MIME type of document binary',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Overall integrity status disposition',
    enum: ['PASS', 'WARNING', 'FAIL', 'UNAVAILABLE'],
    example: 'PASS',
  })
  overallStatus: 'PASS' | 'WARNING' | 'FAIL' | 'UNAVAILABLE';

  @ApiProperty({
    description: 'List of structural and anomaly findings',
    type: [ValidationFindingDto],
  })
  findings: ValidationFindingDto[];

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp when evaluation was performed',
    example: '2026-10-24T15:00:00.000Z',
  })
  evaluatedAt: string;
}
