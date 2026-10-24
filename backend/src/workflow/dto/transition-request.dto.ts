/**
 * ApprovalSync — Transition Request DTO
 * Milestone: BE-06
 */

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../shared/contracts';

export class TransitionRequestDto {
  @ApiProperty({
    description: 'Target ApplicationStatus to transition into',
    enum: ApplicationStatus,
    example: ApplicationStatus.UNDER_SCRUTINY,
  })
  @IsEnum(ApplicationStatus, {
    message: 'targetStatus must be a valid ApplicationStatus enum value',
  })
  @IsNotEmpty({ message: 'targetStatus is required' })
  targetStatus: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Review comment, justification, or deficiency description',
    example:
      'Documentary scrutiny completed. Deficiencies identified in building plan.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'comment must be a string' })
  @MaxLength(2000, { message: 'comment cannot exceed 2000 characters' })
  comment?: string;

  @ApiPropertyOptional({
    description: 'Structured metadata or references associated with transition',
    example: { checklistVerified: true },
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, unknown>;
}
