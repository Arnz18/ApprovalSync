/**
 * ApprovalSync — Create ChecklistTemplate DTO
 * Milestone: BE-05
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChecklistTemplateDto {
  @ApiProperty({
    description: 'Unique template code within rule version',
    example: 'CHK-ENGG-UG-INTAKE',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'code is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'code must contain only uppercase alphanumeric characters, underscores, and hyphens',
  })
  code: string;

  @ApiProperty({
    description: 'Descriptive title of the checklist template',
    example: 'Mandatory Documentary & Infrastructure Intake Checklist',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the checklist scope',
    example:
      'Initial intake requirements for new UG Engineering institution approval',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Application category associated with this checklist template',
    example: 'Undergraduate Engineering',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'applicationCategory is required' })
  @IsString()
  @MaxLength(100)
  applicationCategory: string;
}
