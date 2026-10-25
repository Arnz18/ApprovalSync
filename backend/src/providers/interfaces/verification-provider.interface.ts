/**
 * ApprovalSync — Verification Provider Interface & DI Tokens
 * Milestone: DOC-05
 *
 * Defines the contract implemented by simulated and authorized verification adapters.
 */

import { ProviderCapability } from './provider-capability.enum';
import { NormalizedVerificationRequest } from './verification-request.interface';
import { NormalizedVerificationResponse } from './verification-response.interface';

export const VERIFICATION_PROVIDER_TOKEN = 'VERIFICATION_PROVIDER_TOKEN';
export const PROVIDER_REGISTRY_TOKEN = 'PROVIDER_REGISTRY_TOKEN';

export interface IVerificationProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isSimulated: boolean;
  readonly isLiveProviderConfigured: boolean;
  readonly supportedDocumentTypes: string[];
  readonly capabilities: ProviderCapability[];

  supports(documentType: string): boolean;
  verify(
    request: NormalizedVerificationRequest,
  ): Promise<NormalizedVerificationResponse>;
}
