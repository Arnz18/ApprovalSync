/**
 * ApprovalSync — EVC Schedule DTOs
 * Milestone: AICTE-26262
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommitteeExpertDto {
  @ApiProperty({ example: 'Prof. Ramesh K. Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Senior Professor, Computer Engineering' })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ example: 'IIT Bombay' })
  @IsString()
  @IsNotEmpty()
  affiliation: string;

  @ApiProperty({
    example: 'CHAIRMAN',
    enum: [
      'CHAIRMAN',
      'EXPERT_MEMBER',
      'ARCHITECT_EXPERT',
      'AICTE_REPRESENTATIVE',
    ],
  })
  @IsEnum([
    'CHAIRMAN',
    'EXPERT_MEMBER',
    'ARCHITECT_EXPERT',
    'AICTE_REPRESENTATIVE',
  ])
  role:
    'CHAIRMAN' | 'EXPERT_MEMBER' | 'ARCHITECT_EXPERT' | 'AICTE_REPRESENTATIVE';

  @ApiPropertyOptional({ example: 'ramesh.sharma@iitb.ac.in' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  conflictOfInterestDeclared: boolean;
}

export class CreateEvcScheduleDto {
  @ApiProperty({ example: '2026-11-15T10:00:00.000Z' })
  @IsDateString()
  proposedVisitDate: string;

  @ApiPropertyOptional({ example: '2026-11-15T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledVisitDate?: string;

  @ApiProperty({
    example: 'PHYSICAL_ON_SITE',
    enum: ['PHYSICAL_ON_SITE', 'VIRTUAL_HYBRID'],
  })
  @IsEnum(['PHYSICAL_ON_SITE', 'VIRTUAL_HYBRID'])
  visitType: 'PHYSICAL_ON_SITE' | 'VIRTUAL_HYBRID';

  @ApiProperty({
    example: 'SCHEDULED',
    enum: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @IsEnum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?:
    'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ApiProperty({ type: [CommitteeExpertDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeExpertDto)
  committeeMembers: CommitteeExpertDto[];

  @ApiPropertyOptional({
    example:
      'Physical inspection of mechanical workshops and library facilities.',
  })
  @IsOptional()
  @IsString()
  visitNotes?: string;

  @ApiPropertyOptional({
    example: 'All norms verified in accordance with APH Chapter I Clause 1.4.',
  })
  @IsOptional()
  @IsString()
  outcomeSummary?: string;

  @ApiPropertyOptional({
    example: 'RECOMMEND_APPROVAL',
    enum: [
      'PENDING',
      'RECOMMEND_APPROVAL',
      'DEFICIENCY_OBSERVED',
      'ESCALATE_TO_SHC',
    ],
  })
  @IsOptional()
  @IsEnum([
    'PENDING',
    'RECOMMEND_APPROVAL',
    'DEFICIENCY_OBSERVED',
    'ESCALATE_TO_SHC',
  ])
  recommendation?:
    | 'PENDING'
    | 'RECOMMEND_APPROVAL'
    | 'DEFICIENCY_OBSERVED'
    | 'ESCALATE_TO_SHC';
}

export class EvcScheduleResponseDto {
  @ApiProperty({ example: '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d' })
  id: string;

  @ApiProperty({ example: 'APP-2026-DEMO-001' })
  applicationId: string;

  @ApiProperty({ example: 'inst-uuid' })
  institutionId: string;

  @ApiProperty({ example: 'SCHEDULED' })
  status: string;

  @ApiProperty({ example: 'PHYSICAL_ON_SITE' })
  visitType: string;

  @ApiProperty({ example: '2026-11-15T10:00:00.000Z' })
  proposedVisitDate: string;

  @ApiPropertyOptional({ example: '2026-11-15T10:00:00.000Z' })
  scheduledVisitDate?: string | null;

  @ApiProperty({ type: [CommitteeExpertDto] })
  committeeMembers: CommitteeExpertDto[];

  @ApiPropertyOptional({ example: 'Inspection notes' })
  visitNotes?: string | null;

  @ApiPropertyOptional({ example: 'Outcome summary' })
  outcomeSummary?: string | null;

  @ApiProperty({ example: 'PENDING' })
  recommendation: string;

  @ApiPropertyOptional({ example: 'Regional Officer WRO' })
  scheduledBy?: string | null;

  @ApiProperty({ example: '2026-10-29T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-29T12:00:00.000Z' })
  updatedAt: string;
}
