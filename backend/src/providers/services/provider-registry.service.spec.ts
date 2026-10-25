/**
 * ApprovalSync — Provider Registry Service Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistryService } from './provider-registry.service';
import {
  SimulatedIssuerAdapter,
  SIMULATED_ISSUER_PROVIDER_ID,
} from '../adapters/simulated-issuer.adapter';
import {
  AuthorizedDigiLockerAdapter,
  AUTHORIZED_DIGILOCKER_PROVIDER_ID,
} from '../adapters/authorized-digilocker.adapter';
import {
  AuthorizedLandRegistryAdapter,
  AUTHORIZED_LAND_REGISTRY_PROVIDER_ID,
} from '../adapters/authorized-land-registry.adapter';

describe('ProviderRegistryService', () => {
  let registry: ProviderRegistryService;
  let simulatedAdapter: SimulatedIssuerAdapter;
  let digiLockerAdapter: AuthorizedDigiLockerAdapter;
  let landRegistryAdapter: AuthorizedLandRegistryAdapter;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined), // unconfigured by default
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulatedIssuerAdapter,
        AuthorizedDigiLockerAdapter,
        AuthorizedLandRegistryAdapter,
        ProviderRegistryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    registry = module.get<ProviderRegistryService>(ProviderRegistryService);
    simulatedAdapter = module.get<SimulatedIssuerAdapter>(
      SimulatedIssuerAdapter,
    );
    digiLockerAdapter = module.get<AuthorizedDigiLockerAdapter>(
      AuthorizedDigiLockerAdapter,
    );
    landRegistryAdapter = module.get<AuthorizedLandRegistryAdapter>(
      AuthorizedLandRegistryAdapter,
    );
  });

  describe('Registry Registration & Discovery', () => {
    it('should register all three core providers on initialization', () => {
      const all = registry.getAllProviders();
      expect(all.length).toBe(3);
      expect(registry.getProvider(SIMULATED_ISSUER_PROVIDER_ID)).toBe(
        simulatedAdapter,
      );
      expect(registry.getProvider(AUTHORIZED_DIGILOCKER_PROVIDER_ID)).toBe(
        digiLockerAdapter,
      );
      expect(registry.getProvider(AUTHORIZED_LAND_REGISTRY_PROVIDER_ID)).toBe(
        landRegistryAdapter,
      );
    });

    it('should return SimulatedIssuerAdapter as default provider', () => {
      expect(registry.getDefaultProvider()).toBe(simulatedAdapter);
    });
  });

  describe('Deterministic Provider Selection (No Silent Mock Fallback)', () => {
    it('should return AuthorizedDigiLockerAdapter when explicitly requested by ID even if unconfigured', () => {
      const resolved = registry.resolveProvider(
        AUTHORIZED_DIGILOCKER_PROVIDER_ID,
        'LAND_TITLE_DEED',
      );

      expect(resolved).toBe(digiLockerAdapter);
      expect(resolved.providerId).toBe(AUTHORIZED_DIGILOCKER_PROVIDER_ID);
      expect(resolved.isSimulated).toBe(false);
      // Crucial: Must NOT have fallen back to simulated adapter
      expect(resolved).not.toBe(simulatedAdapter);
    });

    it('should return AuthorizedLandRegistryAdapter when explicitly requested by ID even if unconfigured', () => {
      const resolved = registry.resolveProvider(
        AUTHORIZED_LAND_REGISTRY_PROVIDER_ID,
        'LAND_TITLE_DEED',
      );

      expect(resolved).toBe(landRegistryAdapter);
      expect(resolved.isSimulated).toBe(false);
      expect(resolved).not.toBe(simulatedAdapter);
    });

    it('should return SimulatedIssuerAdapter when explicitly requested by ID', () => {
      const resolved = registry.resolveProvider(
        SIMULATED_ISSUER_PROVIDER_ID,
        'LAND_TITLE_DEED',
      );

      expect(resolved).toBe(simulatedAdapter);
      expect(resolved.isSimulated).toBe(true);
    });

    it('should throw NotFoundException when an unknown provider ID is requested', () => {
      expect(() =>
        registry.resolveProvider('NON_EXISTENT_ADAPTER_XYZ'),
      ).toThrow(NotFoundException);
    });

    it('should fallback to default provider when no provider ID is specified and no live provider is configured', () => {
      const resolved = registry.resolveProvider(undefined, 'LAND_TITLE_DEED');
      expect(resolved).toBe(simulatedAdapter);
    });
  });
});
