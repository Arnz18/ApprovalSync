/**
 * ApprovalSync — Audit Response DTOs
 * Milestone: BE-07
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../shared/contracts';
import { MerkleProofStepDto } from './verify-proof.dto';

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'Monotonic sequence number within ledger',
    example: '1',
  })
  sequenceNumber: string;

  @ApiProperty({
    description: 'Associated application UUID',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  applicationId: string;

  @ApiProperty({
    description: 'ID of authenticated actor who caused the event',
    example: 'usr-1234',
  })
  actorId: string;

  @ApiProperty({
    description: 'Verified role of the actor',
    enum: UserRole,
    example: UserRole.INSTITUTION_USER,
  })
  actorRole: UserRole;

  @ApiProperty({
    description: 'Structured domain event type',
    example: 'APPLICATION_SUBMITTED',
  })
  eventType: string;

  @ApiProperty({
    description: 'Canonical event payload snapshot',
    example: { status: 'SUBMITTED' },
  })
  payloadSnapshot: Record<string, unknown>;

  @ApiProperty({
    description: 'Predecessor 64-char hex SHA-256 hash',
    example: '0000000000000000000000000000000000000000000000000000000000000000',
  })
  previousHash: string;

  @ApiProperty({
    description: 'Canonical payload RFC 8785 SHA-256 leaf hash',
    example: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  })
  leafHash: string;

  @ApiProperty({
    description: 'Current entry cryptographic binding hash',
    example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  })
  currentHash: string;

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp of audit event entry',
    example: '2026-10-26T12:00:00.000Z',
  })
  timestamp: string;
}

export class AuditVerificationResponseDto {
  @ApiProperty({
    description: 'Application UUID verified',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  applicationId: string;

  @ApiProperty({
    description:
      'Whether the sequential cryptographic chain is intact and valid',
    example: true,
  })
  isChainValid: boolean;

  @ApiProperty({
    description: 'Total sequential blocks verified from genesis',
    example: 5,
  })
  totalBlocksVerified: number;

  @ApiPropertyOptional({
    description:
      'Sequence number of the first broken/tampered block if invalid',
    example: 3,
  })
  brokenBlockSequence?: number;

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp of verification execution',
    example: '2026-10-26T12:00:00.000Z',
  })
  verifiedAt: string;

  @ApiPropertyOptional({
    description: 'RFC 6962 Merkle root computed across the verified blocks',
    example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  })
  merkleRootHash?: string;
}

export class AuditCheckpointResponseDto {
  @ApiProperty({
    description: 'Checkpoint unique UUID',
    example: 'c0000000-0000-0000-0000-000000000001',
  })
  id: string;

  @ApiProperty({
    description: 'Application UUID',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Highest sequence number covered by this checkpoint',
    example: '5',
  })
  sequenceNumber: string;

  @ApiProperty({
    description: 'SHA-256 current hash of the head block',
    example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  })
  chainHeadHash: string;

  @ApiProperty({
    description:
      'RFC 6962 Merkle root covering all blocks up to sequence number',
    example: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  })
  merkleRootHash: string;

  @ApiProperty({ description: 'Total blocks covered', example: 5 })
  totalBlocks: number;

  @ApiProperty({
    description: 'Cryptographic algorithm specification',
    example: 'RFC6962_SHA256',
  })
  algorithm: string;

  @ApiProperty({
    description: 'ISO 8601 UTC timestamp of checkpoint generation',
    example: '2026-10-26T12:00:00.000Z',
  })
  createdAt: string;
}

export class MerkleProofResponseDto {
  @ApiProperty({
    description: 'Application UUID',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Sequence number of the target block',
    example: '2',
  })
  sequenceNumber: string;

  @ApiProperty({
    description: '0-based leaf index within the Merkle tree',
    example: 1,
  })
  leafIndex: number;

  @ApiProperty({ description: 'Total leaves in the Merkle tree', example: 5 })
  totalLeaves: number;

  @ApiProperty({
    description: 'RFC 6962 Leaf hash SHA-256(0x00 || currentHash)',
    example: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  })
  leafHash: string;

  @ApiProperty({
    description: 'Sibling hashes and positions for upward traversal',
    type: [MerkleProofStepDto],
  })
  proofPath: MerkleProofStepDto[];

  @ApiProperty({
    description: 'Expected RFC 6962 Merkle root',
    example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  })
  expectedRoot: string;
}
