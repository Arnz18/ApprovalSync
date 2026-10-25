/**
 * ApprovalSync — Authorized DigiLocker Adapter Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AuthorizedDigiLockerAdapter,
  AUTHORIZED_DIGILOCKER_PROVIDER_ID,
} from './authorized-digilocker.adapter';
import { ProviderCapability, ProviderVerificationOutcome } from '../interfaces';
import { VerificationStatus } from '../../shared/contracts';

describe('AuthorizedDigiLockerAdapter', () => {
  let adapter: AuthorizedDigiLockerAdapter;
  let mockConfigService: Partial<ConfigService>;

  const setupAdapter = async (
    configValues: Record<string, string | undefined>,
  ) => {
    mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizedDigiLockerAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    return module.get<AuthorizedDigiLockerAdapter>(AuthorizedDigiLockerAdapter);
  };

  describe('Unconfigured State (Default Prototype Baseline)', () => {
    beforeEach(async () => {
      adapter = await setupAdapter({});
    });

    it('should declare correct provider identity and non-simulation status', () => {
      expect(adapter.providerId).toBe(AUTHORIZED_DIGILOCKER_PROVIDER_ID);
      expect(adapter.isSimulated).toBe(false);
      expect(adapter.isLiveProviderConfigured).toBe(false);
      expect(adapter.providerName).toContain('DigiLocker');
    });

    it('should declare capabilities and supported document types', () => {
      expect(adapter.capabilities).toContain(
        ProviderCapability.SIGNATURE_VERIFICATION,
      );
      expect(adapter.capabilities).toContain(
        ProviderCapability.REGISTRATION_LOOKUP,
      );
      expect(adapter.supports('LAND_TITLE_DEED')).toBe(true);
      expect(adapter.supports('FIRE_SAFETY_CERTIFICATE')).toBe(true);
    });

    it('should truthfully return SOURCE_UNAVAILABLE when unconfigured without throwing', async () => {
      const response = await adapter.verify({
        documentId: 'doc-unconfigured',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-1234',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(response.isSimulated).toBe(false);
      expect(response.comparisonSummary).toContain('unconfigured');
      expect(
        response.limitations.some((l) => l.includes('Official government')),
      ).toBe(true);
      expect(response.isAdvisory).toBe(true);
    });

    it('should return NOT_SUPPORTED for unsupported document category', async () => {
      const response = await adapter.verify({
        documentId: 'doc-unsupported',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'UNKNOWN_CATEGORY',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.NOT_SUPPORTED);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
    });
  });

  describe('SSRF & Outbound URL Security Defenses', () => {
    beforeEach(async () => {
      adapter = await setupAdapter({
        DIGILOCKER_ISSUER_URL: 'https://api.digilocker.gov.in/public/v1',
        DIGILOCKER_CLIENT_ID: 'test-client-id',
        DIGILOCKER_CLIENT_SECRET: 'test-client-secret',
      });
    });

    it('should allow valid DigiLocker government domain', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://api.digilocker.gov.in/v1/verify',
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.hostname).toBe('api.digilocker.gov.in');
    });

    it('should allow API Setu domain', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://apisetu.gov.in/certificate/v1',
      );
      expect(parsed).not.toBeNull();
    });

    it('should allow localhost for local development and test doubles', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'http://localhost:8080/mock-digilocker',
      );
      expect(parsed).not.toBeNull();
    });

    it('should reject unapproved external domain (SSRF defense)', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://attacker-domain.com/fake-api',
      );
      expect(parsed).toBeNull();
    });

    it('should reject cloud metadata service URL (169.254.169.254)', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://169.254.169.254/latest/meta-data/',
      );
      expect(parsed).toBeNull();
    });

    it('should reject Google cloud metadata service host', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'https://metadata.google.internal/computeMetadata/v1/',
      );
      expect(parsed).toBeNull();
    });

    it('should reject insecure HTTP on external host', () => {
      const parsed = adapter.validateOutboundEndpoint(
        'http://api.digilocker.gov.in/insecure',
      );
      expect(parsed).toBeNull();
    });
  });

  describe('Credential Redaction & Log Hygiene', () => {
    beforeEach(async () => {
      adapter = await setupAdapter({});
    });

    it('should redact Bearer authorization tokens from log text', () => {
      const raw =
        'Request sent with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret';
      const sanitized = adapter.sanitizeForLogs(raw);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('should redact client_secret query or body parameters', () => {
      const raw =
        'URL: https://api.gov.in?client_secret=super_secret_key_1234&id=5';
      const sanitized = adapter.sanitizeForLogs(raw);
      expect(sanitized).not.toContain('super_secret_key_1234');
      expect(sanitized).toContain('client_secret=[REDACTED]');
    });

    it('should redact apiKey parameters', () => {
      const raw = 'Header: apiKey=confidential_api_token_abc';
      const sanitized = adapter.sanitizeForLogs(raw);
      expect(sanitized).not.toContain('confidential_api_token_abc');
      expect(sanitized).toContain('apiKey=[REDACTED]');
    });
  });

  describe('Configured Live Invocation Error & Timeout Handling', () => {
    let globalFetchBackup: typeof global.fetch;

    beforeEach(async () => {
      globalFetchBackup = global.fetch;
      adapter = await setupAdapter({
        DIGILOCKER_ISSUER_URL: 'https://api.digilocker.gov.in/public/v1',
        DIGILOCKER_CLIENT_ID: 'test-client',
        DIGILOCKER_CLIENT_SECRET: 'test-secret',
        DIGILOCKER_API_KEY: 'test-key',
      });
    });

    afterEach(() => {
      global.fetch = globalFetchBackup;
    });

    it('should handle remote network error without crashing and map to SOURCE_UNAVAILABLE', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED: connection refused'));

      const response = await adapter.verify({
        documentId: 'doc-live-err',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-99',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(response.comparisonSummary).toContain('transport failure');
    });

    it('should handle request timeout and map to SOURCE_UNAVAILABLE', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValue(abortError);

      const response = await adapter.verify({
        documentId: 'doc-timeout',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-99',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(response.comparisonSummary).toContain('timed out');
    });

    it('should handle malformed JSON from remote provider and map to MANUAL_REVIEW_REQUIRED', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: jest
          .fn()
          .mockResolvedValue('<html><body>Bad Gateway</body></html>'),
      } as unknown as Response);

      const response = await adapter.verify({
        documentId: 'doc-malformed',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-99',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
      );
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.comparisonSummary).toContain('not valid JSON');
    });

    it('should handle oversized response payload and reject for safety', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-length': '2000000' }), // 2MB > 1MB limit
        text: jest.fn().mockResolvedValue('large-data'),
      } as unknown as Response);

      const response = await adapter.verify({
        documentId: 'doc-oversized',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-99',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.comparisonSummary).toContain(
        'exceeded maximum safe payload',
      );
    });

    it('should parse valid verified remote response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            verified: true,
            summary: 'Official DigiLocker certificate confirmed.',
            reference: 'DL-GOV-2026-9901',
          }),
        ),
      } as unknown as Response);

      const response = await adapter.verify({
        documentId: 'doc-live-verified',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'DEED-99',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(response.isSimulated).toBe(false);
      expect(response.sourceReference).toBe('DL-GOV-2026-9901');
    });
  });
});
