/**
 * ApprovalSync — Document Response DTOs
 * Milestone: DOC-01
 *
 * Exposes safe document attachment metadata without leaking internal storage keys,
 * absolute paths, or hosting infrastructure details.
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentMetadata,
  DocumentProcessingStatus,
} from '../../shared/contracts';

export class DocumentMetadataDto implements DocumentMetadata {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'd9b1c7a2-4e3f-4a5b-8c6d-1e2f3a4b5c6d',
  })
  id: string;

  @ApiProperty({
    description: 'Associated application identifier',
    example: '7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Document classification type',
    example: 'LAND_TITLE_DEED',
  })
  documentType: string;

  @ApiProperty({
    description: 'Sanitized original file name',
    example: 'registered_land_deed.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'Verified MIME type',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  fileSizeBytes: number;

  @ApiProperty({
    description: 'Cryptographic SHA-256 checksum in hexadecimal format',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  sha256Checksum: string;

  @ApiProperty({
    description: 'Current document processing pipeline status',
    enum: DocumentProcessingStatus,
    example: DocumentProcessingStatus.UPLOADED,
  })
  processingStatus: DocumentProcessingStatus;

  @ApiProperty({
    description: 'UTC ISO 8601 timestamp of upload ingestion',
    example: '2026-10-24T12:00:00.000Z',
  })
  uploadedAt: string;
}

export class DocumentDeleteResponseDto {
  @ApiProperty({
    description: 'Indicates successful deletion',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Identifier of the deleted document',
    example: 'd9b1c7a2-4e3f-4a5b-8c6d-1e2f3a4b5c6d',
  })
  id: string;
}
