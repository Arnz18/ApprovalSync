/**
 * ApprovalSync — Authorized Land Registry Adapter Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AuthorizedLandRegistryAdapter,
  AUTHORIZED_LAND_REGISTRY_PROVIDER_ID,
} from './authorized-land-registry.adapter';
import { ProviderCapability, ProviderVerificationOutcome } from '../interfaces';
import { VerificationStatus } from '../../shared/contracts';

describe('AuthorizedLandRegistryAdapter', () => {
  let adapter: AuthorizedLandRegistryAdapter;
  let mockConfigService: Partial<ConfigService>;

  const setupAdapter = async (
    configValues: Record<string, string | undefined>,
  ) => {
    mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizedLandRegistryAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    return module.get<AuthorizedLandRegistryAdapter>(
      AuthorizedLandRegistryAdapter,
    );
  };

  describe('Unconfigured State', () => {
    beforeEach(async () => {
      adapter = await setupAdapter({});
    });

    it('should declare correct provider identity and capabilities', () => {
      expect(adapter.providerId).toBe(AUTHORIZED_LAND_REGISTRY_PROVIDER_ID);
      expect(adapter.isSimulated).toBe(false);
      expect(adapter.isLiveProviderConfigured).toBe(false);
      expect(adapter.capabilities).toContain(
        ProviderCapability.LAND_RECORD_SEARCH,
      );
      expect(adapter.supports('LAND_TITLE_DEED')).toBe(true);
      expect(adapter.supports('FIRE_SAFETY_CERTIFICATE')).toBe(false);
    });

    it('should return NOT_SUPPORTED for non-land document types', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fire',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.NOT_SUPPORTED);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.comparisonSummary).toContain('not a land record');
    });

    it('should return SOURCE_UNAVAILABLE when credentials are unconfigured without throwing', async () => {
      const response = await adapter.verify({
        documentId: 'doc-land',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        khasraNumber: '42/1A',
        district: 'Pune',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(response.isSimulated).toBe(false);
      expect(response.comparisonSummary).toContain('unconfigured');
    });
  });

  describe('SSRF & Security Defenses', () => {
    beforeEach(async () => {
      adapter = await setupAdapter({
        LAND_REGISTRY_BASE_URL: 'https://mahabhulekh.maharashtra.gov.in',
        LAND_REGISTRY_API_KEY: 'test-api-key',
      });
    });

    it('should allow approved state revenue portal host', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://mahabhulekh.maharashtra.gov.in/api/v1',
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.hostname).toBe('mahabhulekh.maharashtra.gov.in');
    });

    it('should allow national land records host', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://landrecords.gov.in/search',
      );
      expect(parsed).not.toBeNull();
    });

    it('should reject unapproved attacker URL', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://attacker-site.com/fake-bhulekh',
      );
      expect(parsed).toBeNull();
    });

    it('should reject link-local/cloud metadata service', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://169.254.169.254/latest/meta-data/',
      );
      expect(parsed).toBeNull();
    });

    it('should sanitize API key from log strings', () => {
      const raw = 'URL: https://gov.in?apiKey=super_secret_land_key_99&param=1';
      const sanitized = adapter.sanitizeForLogs(raw);
      expect(sanitized).not.toContain('super_secret_land_key_99');
      expect(sanitized).toContain('apiKey=[REDACTED]');
    });
  });

  describe('Configured Live Invocation', () => {
    let globalFetchBackup: typeof global.fetch;

    beforeEach(async () => {
      globalFetchBackup = global.fetch;
      adapter = await setupAdapter({
        LAND_REGISTRY_BASE_URL: 'https://mahabhulekh.maharashtra.gov.in',
        LAND_REGISTRY_API_KEY: 'test-api-key',
      });
    });

    afterEach(() => {
      global.fetch = globalFetchBackup;
    });

    it('should handle remote network failure and map to SOURCE_UNAVAILABLE', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network unreachable'));

      const response = await adapter.verify({
        documentId: 'doc-net-err',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        khasraNumber: '42/1A',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
    });

    it('should handle remote request timeout and map to SOURCE_UNAVAILABLE', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValue(abortError);

      const response = await adapter.verify({
        documentId: 'doc-to',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        khasraNumber: '42/1A',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.comparisonSummary).toContain('timed out');
    });

    it('should parse valid verified remote response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            verified: true,
            summary: 'Mahabhulekh land parcel verified.',
            reference: 'MH-REV-2026-4401',
          }),
        ),
      } as unknown as Response);

      const response = await adapter.verify({
        documentId: 'doc-valid',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        khasraNumber: '42/1A',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(response.sourceReference).toBe('MH-REV-2026-4401');
      expect(response.isSimulated).toBe(false);
    });
  });
});
