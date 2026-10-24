/**
 * ApprovalSync — Create ChecklistItem DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemType } from '../enums';

export class CreateChecklistItemDto {
  @ApiProperty({
    description: 'Unique item code within template',
    example: 'CHK-ITEM-LAND-01',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'itemCode is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'itemCode must contain only uppercase alphanumeric characters, underscores, and hyphens',
  })
  itemCode: string;

  @ApiProperty({
    description: 'Detailed description of the requirement',
    example:
      'Registered Sale Deed or 30-Year Continuous Government Lease Deed in name of Trust/Society',
  })
  @IsNotEmpty({ message: 'description is required' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Type of checklist requirement',
    enum: ChecklistItemType,
    example: ChecklistItemType.DOCUMENT_UPLOAD,
  })
  @IsNotEmpty({ message: 'itemType is required' })
  @IsEnum(ChecklistItemType, {
    message: 'itemType must be a valid ChecklistItemType enum value',
  })
  itemType: ChecklistItemType;

  @ApiPropertyOptional({
    description:
      'Whether this checklist item is mandatory for application submission',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description:
      'Expected document type classification for verification (if document upload)',
    example: 'LAND_TITLE_DEED',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  evidenceDocumentType?: string;

  @ApiPropertyOptional({
    description: 'Deterministic display sort order',
    default: 0,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Optional UUID of associated regulatory rule',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ruleId must be a valid UUID v4' })
  ruleId?: string;

  @ApiPropertyOptional({
    description:
      'Operational review notes or guidance for applicant and scrutiny officer',
    example:
      'Verify registration details, lessor tenure, and survey numbers against institution land claims.',
  })
  @IsOptional()
  @IsString()
  guidanceNotes?: string;
}
