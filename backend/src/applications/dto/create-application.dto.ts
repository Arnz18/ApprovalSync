/**
 * ApprovalSync — Create Application Intake DTO
 * Milestone: BE-04
 */

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Academic year for approval (e.g. 2026-2027)',
    example: '2026-2027',
    maxLength: 20,
  })
  @IsNotEmpty({ message: 'academicYear is required' })
  @IsString()
  @MaxLength(20)
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must follow the format YYYY-YYYY (e.g. 2026-2027)',
  })
  academicYear: string;

  @ApiProperty({
    description: 'Program or curriculum type',
    example: 'Undergraduate Engineering',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'programType is required' })
  @IsString()
  @MaxLength(100)
  programType: string;

  @ApiPropertyOptional({
    description:
      'Category-specific dynamic JSONB application details (e.g. facultyCount, landAreaAcres, builtUpAreaSqMeters)',
    example: {
      facultyCount: 48,
      landAreaAcres: 12.5,
      builtUpAreaSqMeters: 8500,
      coursesProposed: [
        'Computer Science and Engineering',
        'Mechanical Engineering',
      ],
    },
  })
  @IsOptional()
  @IsObject({ message: 'payloadJsonb must be a valid JSON object' })
  payloadJsonb?: Record<string, unknown>;
}
