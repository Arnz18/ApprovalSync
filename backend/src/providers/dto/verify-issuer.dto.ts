/**
 * ApprovalSync — Verify Issuer Request DTO
 * Milestone: DOC-05
 *
 * DTO for requesting external or simulated issuer verification for a document.
 */

import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SimulationScenario } from '../interfaces';

export class VerifyIssuerDto {
  @ApiPropertyOptional({
    description:
      'Explicit provider identifier to execute verification with (e.g. SIMULATED_ISSUER_ADAPTER, AUTHORIZED_DIGILOCKER_ADAPTER). If omitted, default provider is selected.',
    example: 'SIMULATED_ISSUER_ADAPTER',
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({
    description:
      'Deterministic simulation scenario override for testing and evaluator demonstration.',
    enum: [
      'MATCH',
      'MISMATCH',
      'EXPIRED',
      'PENDING',
      'UNAVAILABLE',
      'UNSUPPORTED',
      'MANUAL_REVIEW',
    ],
    example: 'MATCH',
  })
  @IsOptional()
  @IsIn([
    'MATCH',
    'MISMATCH',
    'EXPIRED',
    'PENDING',
    'UNAVAILABLE',
    'UNSUPPORTED',
    'MANUAL_REVIEW',
  ])
  simulateScenario?: SimulationScenario;

  @ApiPropertyOptional({
    description:
      'Document registration or deed number override if not extracted by OCR.',
    example: 'MAH-PUN-2024-REG-09821',
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'State jurisdiction (e.g. Maharashtra, Karnataka).',
    example: 'Maharashtra',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'District revenue circle (e.g. Pune, Bengaluru Urban).',
    example: 'Pune',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    description: 'Land khasra / parcel / plot identifier.',
    example: '42/1A',
  })
  @IsOptional()
  @IsString()
  khasraNumber?: string;
}
