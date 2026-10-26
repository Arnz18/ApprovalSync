/**
 * ApprovalSync — Merkle Proof Verification DTO
 * Milestone: BE-07
 */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  Length,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';

export class MerkleProofStepDto {
  @ApiProperty({
    description: '64-character hexadecimal SHA-256 hash of sibling node',
    example: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  })
  @IsString()
  @Length(64, 64)
  hash: string;

  @ApiProperty({
    description: 'Position of sibling node relative to the evaluated node',
    enum: ['left', 'right'],
    example: 'right',
  })
  @IsString()
  @IsIn(['left', 'right'])
  position: 'left' | 'right';
}

export class VerifyProofDto {
  @ApiProperty({
    description: '64-character hexadecimal RFC 6962 leaf hash',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsString()
  @Length(64, 64)
  leafHash: string;

  @ApiProperty({
    description: 'Expected 64-character hexadecimal RFC 6962 Merkle root hash',
    example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  })
  @IsString()
  @Length(64, 64)
  expectedRoot: string;

  @ApiProperty({
    description:
      'Chronological ordered proof path steps upward from leaf to root',
    type: [MerkleProofStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MerkleProofStepDto)
  proofPath: MerkleProofStepDto[];
}
