/**
 * ApprovalSync — Process Document DTO
 * Milestone: DOC-02
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessDocumentDto {
  @ApiPropertyOptional({
    description:
      'Forces re-processing even if document already has extracted OCR results.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  forceReprocess?: boolean;

  @ApiPropertyOptional({
    description:
      'Testing override: Simulates engine timeout during extraction.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  simulateTimeout?: boolean;

  @ApiPropertyOptional({
    description:
      'Testing override: Simulates degraded OCR confidence (< 0.85).',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  simulateLowConfidence?: boolean;

  @ApiPropertyOptional({
    description: 'Testing override: Simulates corrupt file parsing failure.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  simulateCorruptedFile?: boolean;
}

export class DirectClassifyDto {
  @ApiPropertyOptional({
    description:
      'Raw text content to classify against AICTE regulatory categories.',
    example:
      'REGISTERED LEASE DEED Sub-Registrar Pune South Deed Number: DEED/2024/7891',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
