/**
 * ApprovalSync — Application Query and Filter DTO
 * Milestone: BE-04
 */

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  MaxLength,
  IsIn,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../shared/contracts';

export class ApplicationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    description: 'Filter by ApplicationStatus lifecycle state',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description:
      'Search query matching applicationNumber, academicYear, or programType',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    default: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'applicationNumber',
      'academicYear',
      'submittedAt',
      'status',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt',
    'updatedAt',
    'applicationNumber',
    'academicYear',
    'submittedAt',
    'status',
  ])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    default: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description:
      'Filter by institution UUID (regulatory and administrative roles only; ignored for INSTITUTION_USER)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'institutionId must be a valid UUIDv4' })
  institutionId?: string;
}
