/**
 * ApprovalSync — Login Response DTO
 * Milestone: BE-03
 */

import { ApiProperty } from '@nestjs/swagger';
import { AuthUserProjection } from '../interfaces/auth-user.interface';
import { UserRole } from '../../shared/contracts';

export class UserSummaryDto implements AuthUserProjection {
  @ApiProperty({ example: '8f7a6b5c-4d3e-2f1a-0b9c-8d7e6f5a4b3c' })
  id: string;

  @ApiProperty({ example: 'demo.institution@synthetic.approvalsync.local' })
  email: string;

  @ApiProperty({ example: 'Demo Institution Representative' })
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.INSTITUTION_USER })
  role: UserRole;

  @ApiProperty({
    example: '7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e',
    nullable: true,
  })
  institutionId?: string | null;

  @ApiProperty({ example: 'Western Regional Office (WRO)', nullable: true })
  regionalOffice?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-10-22T14:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-22T14:35:12.000Z' })
  updatedAt: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Signed JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token lifetime in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Authenticated user projection',
    type: UserSummaryDto,
  })
  user: UserSummaryDto;
}
