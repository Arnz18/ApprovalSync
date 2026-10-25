/**
 * ApprovalSync — Simulated Issuer Adapter Tests
 * Milestone: DOC-05
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  SimulatedIssuerAdapter,
  SIMULATED_ISSUER_PROVIDER_ID,
} from './simulated-issuer.adapter';
import { ProviderCapability, ProviderVerificationOutcome } from '../interfaces';
import { VerificationStatus } from '../../shared/contracts';

describe('SimulatedIssuerAdapter', () => {
  let adapter: SimulatedIssuerAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimulatedIssuerAdapter],
    }).compile();

    adapter = module.get<SimulatedIssuerAdapter>(SimulatedIssuerAdapter);
  });

  describe('Identity & Capability Declarations', () => {
    it('should declare correct provider identity and simulation flags', () => {
      expect(adapter.providerId).toBe(SIMULATED_ISSUER_PROVIDER_ID);
      expect(adapter.isSimulated).toBe(true);
      expect(adapter.isLiveProviderConfigured).toBe(true);
      expect(adapter.providerName).toContain('Simulated');
    });

    it('should declare capabilities including land search, registration lookup, and signature', () => {
      expect(adapter.capabilities).toContain(
        ProviderCapability.LAND_RECORD_SEARCH,
      );
      expect(adapter.capabilities).toContain(
        ProviderCapability.REGISTRATION_LOOKUP,
      );
      expect(adapter.capabilities).toContain(
        ProviderCapability.SIGNATURE_VERIFICATION,
      );
    });

    it('should correctly evaluate supported document types', () => {
      expect(adapter.supports('LAND_TITLE_DEED')).toBe(true);
      expect(adapter.supports('FIRE_SAFETY_CERTIFICATE')).toBe(true);
      expect(adapter.supports('BUILDING_PLAN_APPROVAL')).toBe(true);
      expect(adapter.supports('UNKNOWN_OTHER')).toBe(false);
      expect(adapter.supports('')).toBe(false);
    });
  });

  describe('Unsupported Document Handling', () => {
    it('should return NOT_SUPPORTED mapped to MANUAL_REVIEW_REQUIRED for unsupported categories', async () => {
      const response = await adapter.verify({
        documentId: 'doc-1',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'UNKNOWN_OTHER',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.NOT_SUPPORTED);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.isSimulated).toBe(true);
      expect(response.isAdvisory).toBe(true);
      expect(response.comparisonSummary).toContain('not supported');
      expect(response.limitations.length).toBeGreaterThan(0);
      expect(response.providerMetadata?.isMock).toBe(true);
    });
  });

  describe('Insufficient Information Handling', () => {
    it('should return MANUAL_REVIEW_REQUIRED when no document number or land identifiers are provided', async () => {
      const response = await adapter.verify({
        documentId: 'doc-2',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
      );
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.comparisonSummary).toContain(
        'Insufficient identifying information',
      );
      expect(response.isSimulated).toBe(true);
      expect(response.providerMetadata?.isMock).toBe(true);
    });
  });

  describe('Deterministic Scenarios (Explicit Scenario Overrides)', () => {
    it('should return VERIFIED_MOCK for explicit MATCH scenario', async () => {
      const response = await adapter.verify({
        documentId: 'doc-match',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        simulateScenario: 'MATCH',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(response.status).toBe(VerificationStatus.VERIFIED_MOCK);
      expect(response.isSimulated).toBe(true);
      expect(response.sourceReference).toBeDefined();
      expect(response.comparisonSummary).toContain('matches');
      expect(response.providerMetadata?.isMock).toBe(true);
      expect(response.providerMetadata?.disclaimer).toContain('simulated');
      expect(response.isAdvisory).toBe(true);
    });

    it('should return UNTRUSTED_ISSUER for explicit MISMATCH scenario', async () => {
      const response = await adapter.verify({
        documentId: 'doc-mismatch',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        simulateScenario: 'MISMATCH',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.MISMATCH_DETECTED,
      );
      expect(response.status).toBe(VerificationStatus.UNTRUSTED_ISSUER);
      expect(response.discrepantFields.length).toBeGreaterThan(0);
      expect(response.isSimulated).toBe(true);
      expect(response.isAdvisory).toBe(true);
    });

    it('should return MANUAL_REVIEW_REQUIRED for explicit EXPIRED scenario', async () => {
      const response = await adapter.verify({
        documentId: 'doc-expired',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        simulateScenario: 'EXPIRED',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.EXPIRED);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.isSimulated).toBe(true);
      expect(
        response.discrepantFields.some((f) => f.field === 'expiryDate'),
      ).toBe(true);
    });

    it('should return MANUAL_REVIEW_REQUIRED for explicit PENDING scenario', async () => {
      const response = await adapter.verify({
        documentId: 'doc-pending',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'BUILDING_PLAN_APPROVAL',
        simulateScenario: 'PENDING',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.PENDING);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.isSimulated).toBe(true);
    });

    it('should return SOURCE_UNAVAILABLE for explicit UNAVAILABLE scenario', async () => {
      const response = await adapter.verify({
        documentId: 'doc-unavail',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        simulateScenario: 'UNAVAILABLE',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(response.comparisonSummary).toContain('unavailable');
      expect(response.isSimulated).toBe(true);
    });
  });

  describe('Synthetic Fixture Record Lookups', () => {
    it('should verify matching land title deed fixture MAH-PUN-2024-REG-09821', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-match',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'MAH-PUN-2024-REG-09821',
        institutionName: 'Demo Institute of Technology',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(response.status).toBe(VerificationStatus.VERIFIED_MOCK);
      expect(response.sourceReference).toBe('TXN-MH-PUN-2024-88412-SIMULATED');
      expect(response.isSimulated).toBe(true);
      expect(
        response.matchedFields.some((f) => f.field === 'documentNumber'),
      ).toBe(true);
    });

    it('should detect mismatch for fixture MAH-PUN-2024-REG-99999', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-mismatch',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'MAH-PUN-2024-REG-99999',
        institutionName: 'Demo Institute of Technology',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.MISMATCH_DETECTED,
      );
      expect(response.status).toBe(VerificationStatus.UNTRUSTED_ISSUER);
      expect(
        response.discrepantFields.some((f) => f.field === 'institutionName'),
      ).toBe(true);
    });

    it('should detect expired certificate fixture FIRE-NOC-2021-332', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-expired',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        documentNumber: 'FIRE-NOC-2021-332',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.EXPIRED);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(
        response.discrepantFields.some((f) => f.field === 'expiryDate'),
      ).toBe(true);
    });

    it('should detect pending approval fixture BPA-2026-PEND-7788', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-pending',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'BUILDING_PLAN_APPROVAL',
        documentNumber: 'BPA-2026-PEND-7788',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.PENDING);
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
    });

    it('should return SOURCE_UNAVAILABLE for fixture MAH-SRV-UNAVAIL-503', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-unavail',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'MAH-SRV-UNAVAIL-503',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(response.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
    });

    it('should return MANUAL_REVIEW_REQUIRED when record is not found in sandbox', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-unknown',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        documentNumber: 'UNKNOWN-DEED-12345',
      });

      expect(response.outcome).toBe(
        ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
      );
      expect(response.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(response.comparisonSummary).toContain('No matching record found');
    });

    it('should verify land record by khasra number 42/1A in Pune district', async () => {
      const response = await adapter.verify({
        documentId: 'doc-fixture-khasra',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        khasraNumber: '42/1A',
        district: 'Pune',
        institutionName: 'Demo Institute of Technology',
      });

      expect(response.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(response.status).toBe(VerificationStatus.VERIFIED_MOCK);
    });
  });

  describe('Truthful Simulation Demarcation (ADR-003 / TB-6)', () => {
    it('should never claim genuine government verification on any response', async () => {
      const response = await adapter.verify({
        documentId: 'doc-sim-check',
        applicationId: 'app-1',
        institutionId: 'inst-1',
        documentType: 'LAND_TITLE_DEED',
        simulateScenario: 'MATCH',
      });

      expect(response.isSimulated).toBe(true);
      expect(response.providerMetadata?.isMock).toBe(true);
      expect(response.providerMetadata?.verificationScope).toBe(
        'SYNTHETIC_TEST_FIXTURE_ONLY',
      );
      expect(response.limitations.some((l) => l.includes('simulated'))).toBe(
        true,
      );
      expect(response.isAdvisory).toBe(true);
    });
  });
});
