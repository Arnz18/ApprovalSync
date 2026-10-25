/**
 * ApprovalSync — Issuer Verification Result DTO
 * Milestone: DOC-05
 *
 * DTO returned by verification endpoints, capturing issuer comparison findings,
 * simulation markers, and human-in-the-loop advisory notices.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MockProviderMetadata,
  VerificationStatus,
} from '../../shared/contracts';
import {
  FieldComparisonResult,
  ProviderVerificationOutcome,
} from '../interfaces';

export class IssuerVerificationResultDto {
  @ApiProperty({
    description: 'Document UUID that was verified',
    example: 'd9b2a1e0-3c4b-4f9e-9d2a-1b2c3d4e5f6a',
  })
  documentId: string;

  @ApiProperty({
    description: 'Application UUID owning the document',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Document category',
    example: 'LAND_TITLE_DEED',
  })
  documentType: string;

  @ApiProperty({
    description: 'Standard contract VerificationStatus',
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED_MOCK,
  })
  status: VerificationStatus;

  @ApiProperty({
    description:
      'Fine-grained provider verification outcome distinguishing match, mismatch, expiry, etc.',
    enum: ProviderVerificationOutcome,
    example: ProviderVerificationOutcome.VERIFIED,
  })
  outcome: ProviderVerificationOutcome;

  @ApiProperty({
    description: 'Provider identifier that evaluated the document',
    example: 'SIMULATED_ISSUER_ADAPTER',
  })
  sourceId: string;

  @ApiProperty({
    description: 'Human-readable provider source name',
    example: 'Simulated DigiLocker & State Registry Sandbox',
  })
  sourceName: string;

  @ApiProperty({
    description:
      'True if outcome was produced by a simulated adapter; False if produced by authorized live source',
    example: true,
  })
  isSimulated: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp of verification in ISO 8601 UTC format',
    example: '2026-10-25T12:00:00.000Z',
  })
  verifiedAt?: string;

  @ApiPropertyOptional({
    description:
      'Registry transaction reference or certificate registration number if supplied by the source',
    example: 'TXN-MH-PUN-2024-88412-SIMULATED',
  })
  sourceReference?: string;

  @ApiProperty({
    description: 'Concise explanation of comparison results',
    example:
      'Document record matches simulated state land records registry exactly.',
  })
  comparisonSummary: string;

  @ApiProperty({
    description: 'Attributes that matched between document and issuer records',
  })
  matchedFields: FieldComparisonResult[];

  @ApiProperty({
    description: 'Discrepancies identified between document and issuer records',
  })
  discrepantFields: FieldComparisonResult[];

  @ApiProperty({
    description: 'Operational and evidentiary limitations of the verification',
    example: ['Simulated verification double for hackathon evaluation.'],
  })
  limitations: string[];

  @ApiPropertyOptional({
    description: 'Additional structured evidentiary metadata',
  })
  evidence?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Standard mock provider metadata when simulated',
  })
  providerMetadata?: MockProviderMetadata;

  @ApiProperty({
    description:
      'ADR-004 Human Sovereignty flag: all automated verification outcomes are strictly advisory',
    example: true,
  })
  isAdvisory: true;
}
