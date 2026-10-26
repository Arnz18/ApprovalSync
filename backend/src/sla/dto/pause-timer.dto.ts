/**
 * ApprovalSync — Pause SLA Timer Request DTO
 * Milestone: BE-08
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PauseTimerDto {
  @ApiProperty({
    description:
      'Mandatory regulatory justification for pausing the SLA clock (e.g., awaiting state revenue records or court decree)',
    example:
      'Awaiting official certified revenue map clarification from State Land Records department.',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Pause reason must be at least 5 characters in length',
  })
  @MaxLength(500, {
    message: 'Pause reason cannot exceed 500 characters',
  })
  reason: string;
}
