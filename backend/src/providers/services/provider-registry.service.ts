/**
 * ApprovalSync — Provider Registry Service
 * Milestone: DOC-05
 *
 * Manages registered verification providers and ensures deterministic provider selection.
 * CRITICAL RULE: If a caller explicitly requests an authorized provider, this registry
 * will NEVER silently fall back to a simulated mock provider.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IVerificationProvider } from '../interfaces';
import { SimulatedIssuerAdapter } from '../adapters/simulated-issuer.adapter';
import { AuthorizedDigiLockerAdapter } from '../adapters/authorized-digilocker.adapter';
import { AuthorizedLandRegistryAdapter } from '../adapters/authorized-land-registry.adapter';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<string, IVerificationProvider>();

  constructor(
    private readonly simulatedIssuerAdapter: SimulatedIssuerAdapter,
    private readonly authorizedDigiLockerAdapter: AuthorizedDigiLockerAdapter,
    private readonly authorizedLandRegistryAdapter: AuthorizedLandRegistryAdapter,
  ) {
    this.registerProvider(this.simulatedIssuerAdapter);
    this.registerProvider(this.authorizedDigiLockerAdapter);
    this.registerProvider(this.authorizedLandRegistryAdapter);
  }

  /**
   * Registers a verification provider adapter in the runtime registry.
   */
  public registerProvider(provider: IVerificationProvider): void {
    this.providers.set(provider.providerId, provider);
    this.logger.log(
      `Registered verification provider '${provider.providerId}' (isSimulated=${provider.isSimulated}, isLiveConfigured=${provider.isLiveProviderConfigured})`,
    );
  }

  /**
   * Retrieves a provider by explicit provider ID.
   */
  public getProvider(providerId: string): IVerificationProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Returns all currently registered verification providers.
   */
  public getAllProviders(): IVerificationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns the system default verification provider (Simulated sandbox for hackathon demo).
   */
  public getDefaultProvider(): IVerificationProvider {
    return this.simulatedIssuerAdapter;
  }

  /**
   * Resolves a verification provider deterministically based on explicit caller selection
   * or document category default.
   *
   * GUARANTEE: Never silently substitutes a mock provider if a specific real provider was requested.
   */
  public resolveProvider(
    providerId?: string,
    documentType?: string,
  ): IVerificationProvider {
    if (providerId) {
      const provider = this.getProvider(providerId);
      if (!provider) {
        throw new NotFoundException({
          code: 'ERR_RESOURCE_NOT_FOUND',
          message: `Verification provider with ID '${providerId}' is not registered in the system. Available providers: ${Array.from(
            this.providers.keys(),
          ).join(', ')}`,
        });
      }

      // Return the explicitly requested provider directly (even if unconfigured,
      // so it can truthfully return SOURCE_UNAVAILABLE rather than silent mock fallback).
      return provider;
    }

    // Default resolution when no explicit provider ID was requested
    if (documentType) {
      const landCategories = ['LAND_TITLE_DEED', 'LAND_USE_CERTIFICATE'];
      if (
        landCategories.includes(documentType.toUpperCase()) &&
        this.authorizedLandRegistryAdapter.isLiveProviderConfigured
      ) {
        return this.authorizedLandRegistryAdapter;
      }
    }

    return this.getDefaultProvider();
  }
}
