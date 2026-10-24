/**
 * ApprovalSync — Timeline Query DTO
 * Milestone: BE-06
 */

import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TimelineQueryDto {
  @ApiPropertyOptional({ description: 'Page number (>= 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (1-100)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Sort order by creation timestamp',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'], {
    message: 'sortOrder must be ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
