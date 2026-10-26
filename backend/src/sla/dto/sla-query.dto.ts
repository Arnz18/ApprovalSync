/**
 * ApprovalSync — SLA Query DTO
 * Milestone: BE-08
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '../../shared/contracts';
import { SlaTimerStatus } from '../enums/sla-timer-status.enum';

export class SlaTimerQueryDto {
  @ApiPropertyOptional({
    description: 'Filter timers by lifecycle status',
    enum: SlaTimerStatus,
  })
  @IsOptional()
  @IsEnum(SlaTimerStatus)
  status?: SlaTimerStatus;

  @ApiPropertyOptional({
    description: 'Filter timers by workflow stage',
    enum: ApplicationStatus,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  stage?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
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
}

export class SlaEscalationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
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
}
