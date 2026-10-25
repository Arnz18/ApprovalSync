/**
 * ApprovalSync — Provider Discovery DTO
 * Milestone: DOC-05
 *
 * Exposes registered verification provider metadata, capabilities, and simulation status.
 */

import { ApiProperty } from '@nestjs/swagger';

export class ProviderDiscoveryDto {
  @ApiProperty({
    description: 'Unique identifier of the verification provider',
    example: 'SIMULATED_ISSUER_ADAPTER',
  })
  providerId: string;

  @ApiProperty({
    description: 'Human-readable provider name',
    example: 'Simulated DigiLocker & State Registry Sandbox',
  })
  providerName: string;

  @ApiProperty({
    description:
      'Indicates whether the provider operates using simulated synthetic fixtures',
    example: true,
  })
  isSimulated: boolean;

  @ApiProperty({
    description:
      'Indicates whether authorized live credentials and approved endpoint are configured',
    example: true,
  })
  isLiveProviderConfigured: boolean;

  @ApiProperty({
    description: 'List of document categories supported by this adapter',
    example: ['LAND_TITLE_DEED', 'FIRE_SAFETY_CERTIFICATE'],
  })
  supportedDocumentTypes: string[];

  @ApiProperty({
    description: 'Operational capabilities provided by this adapter',
    example: ['LAND_RECORD_SEARCH', 'REGISTRATION_LOOKUP'],
  })
  capabilities: string[];

  @ApiProperty({
    description: 'Statutory or simulation disclaimer',
    example: 'Simulated sandbox double for prototype evaluation.',
  })
  disclaimer: string;
}
