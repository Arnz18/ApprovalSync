/**
 * ApprovalSync — Upload Document DTOs
 * Milestone: DOC-01
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsUUID,
} from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Document classification type or checklist item identifier',
    example: 'LAND_TITLE_DEED',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'documentType must contain only uppercase alphanumeric characters, underscores, or hyphens',
  })
  documentType: string;

  @ApiPropertyOptional({
    description: 'Optional human-readable description or contextual notes',
    example: '30-year registered lease deed registered on 2020-05-15',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UploadDocumentDirectDto extends UploadDocumentDto {
  @ApiProperty({
    description: 'Application UUID to which the document will be attached',
    example: '7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e',
  })
  @IsUUID('4')
  @IsNotEmpty()
  applicationId: string;
}
