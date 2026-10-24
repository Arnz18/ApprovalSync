/**
 * ApprovalSync — Document Expiry Service Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentExpiryService } from './document-expiry.service';
import { DateProviderService } from './date-provider.service';
import { DATE_PROVIDER_TOKEN } from '../interfaces/date-provider.interface';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome } from '../enums';

describe('DocumentExpiryService', () => {
  let service: DocumentExpiryService;
  let dateProvider: DateProviderService;

  const REFERENCE_DATE = new Date('2026-10-24T00:00:00.000Z');

  beforeEach(async () => {
    dateProvider = new DateProviderService();
    dateProvider.setOverrideDate(REFERENCE_DATE);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentExpiryService,
        {
          provide: DATE_PROVIDER_TOKEN,
          useValue: dateProvider,
        },
      ],
    }).compile();

    service = module.get<DocumentExpiryService>(DocumentExpiryService);
  });

  describe('parseAndValidateDate', () => {
    it('should parse ISO YYYY-MM-DD dates correctly', () => {
      const result = service.parseAndValidateDate('2026-05-15');
      expect(result.isValid).toBe(true);
      expect(result.normalizedIso).toBe('2026-05-15');
    });

    it('should parse DD/MM/YYYY and DD-MM-YYYY dates correctly', () => {
      const result1 = service.parseAndValidateDate('15/05/2026');
      expect(result1.isValid).toBe(true);
      expect(result1.normalizedIso).toBe('2026-05-15');

      const result2 = service.parseAndValidateDate('28-02-2024');
      expect(result2.isValid).toBe(true);
      expect(result2.normalizedIso).toBe('2024-02-28');
    });

    it('should correctly handle leap years', () => {
      // 2024 is a leap year (Feb 29 valid)
      const leapValid = service.parseAndValidateDate('2024-02-29');
      expect(leapValid.isValid).toBe(true);

      // 2025 is not a leap year (Feb 29 invalid)
      const leapInvalid = service.parseAndValidateDate('2025-02-29');
      expect(leapInvalid.isValid).toBe(false);
      expect(leapInvalid.error).toContain('Impossible calendar day');
    });

    it('should reject impossible dates and malformed strings', () => {
      const feb30 = service.parseAndValidateDate('2026-02-30');
      expect(feb30.isValid).toBe(false);

      const apr31 = service.parseAndValidateDate('2026-04-31');
      expect(apr31.isValid).toBe(false);

      const month13 = service.parseAndValidateDate('2026-13-10');
      expect(month13.isValid).toBe(false);

      const gibberish = service.parseAndValidateDate('not-a-date');
      expect(gibberish.isValid).toBe(false);
    });
  });

  describe('evaluateExpiry', () => {
    it('should detect an expired Fire Safety Certificate', () => {
      const doc: Document = {
        id: 'doc-fire-exp',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'expired_fire_noc.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'NOC-2024-FIRE-99',
              issueDate: '2024-01-15',
              expiryDate: '2025-01-14', // Expired relative to 2026-10-24
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([doc]);

      const expiredFinding = findings.find(
        (f) => f.ruleId === 'DOC-EXP-FIRE-NOC-EXPIRED',
      );
      expect(expiredFinding).toBeDefined();
      expect(expiredFinding?.outcome).toBe(ValidationOutcome.EXPIRED);
      expect(expiredFinding?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
      expect(expiredFinding?.observedValue).toBe('2025-01-14');
    });

    it('should flag a Fire Safety Certificate expiring within 60 days', () => {
      const doc: Document = {
        id: 'doc-fire-soon',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'expiring_soon_fire_noc.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'NOC-2025-FIRE-44',
              issueDate: '2025-11-20',
              expiryDate: '2026-11-20', // ~27 days from 2026-10-24
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([doc]);

      const soonFinding = findings.find(
        (f) => f.ruleId === 'DOC-EXP-FIRE-NOC-EXPIRING-SOON',
      );
      expect(soonFinding).toBeDefined();
      expect(soonFinding?.outcome).toBe(ValidationOutcome.EXPIRING_SOON);
      expect(soonFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should validate an active Fire Safety Certificate with ample validity', () => {
      const doc: Document = {
        id: 'doc-fire-valid',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'valid_fire_noc.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'NOC-2026-FIRE-01',
              issueDate: '2026-08-01',
              expiryDate: '2027-07-31', // Valid for ~9 months
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([doc]);

      const validFinding = findings.find(
        (f) => f.ruleId === 'DOC-EXP-FIRE-NOC-VALID',
      );
      expect(validFinding).toBeDefined();
      expect(validFinding?.outcome).toBe(ValidationOutcome.VALID);
      expect(validFinding?.severity).toBe(ComplianceSeverity.COMPLIANT);
    });

    it('should flag future issue dates as malformed/impossible', () => {
      const doc: Document = {
        id: 'doc-future',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'future_fire_noc.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'NOC-2027-FIRE-FUTURE',
              issueDate: '2027-01-01', // Future date relative to 2026-10-24
              expiryDate: '2028-01-01',
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([doc]);

      const futureFinding = findings.find(
        (f) => f.ruleId === 'DOC-EXP-FIRE-NOC-FUTURE-ISSUE-DATE',
      );
      expect(futureFinding).toBeDefined();
      expect(futureFinding?.outcome).toBe(ValidationOutcome.MALFORMED);
      expect(futureFinding?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should calculate lease tenure expiry on land title deeds', () => {
      // Lease registered in 1990 for 30 years -> expired in 2020
      const expiredLeaseDoc: Document = {
        id: 'doc-lease-exp',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'expired_lease.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'DEED-1990-01',
              registrationDate: '1990-06-15',
              leaseTenureYears: 30,
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([expiredLeaseDoc]);

      const expiredLease = findings.find(
        (f) => f.ruleId === 'DOC-EXP-LEASE-TENURE-EXPIRED',
      );
      expect(expiredLease).toBeDefined();
      expect(expiredLease?.outcome).toBe(ValidationOutcome.EXPIRED);
      expect(expiredLease?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should flag lease tenure below 30 years statutory requirement', () => {
      const shortLeaseDoc: Document = {
        id: 'doc-short-lease',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'short_lease.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'DEED-2020-01',
              registrationDate: '2020-01-01',
              leaseTenureYears: 15, // Below 30 years
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([shortLeaseDoc]);

      const insufficientTenure = findings.find(
        (f) => f.ruleId === 'DOC-EXP-LEASE-TENURE-INSUFFICIENT',
      );
      expect(insufficientTenure).toBeDefined();
      expect(insufficientTenure?.outcome).toBe(ValidationOutcome.DEFICIENT);
      expect(insufficientTenure?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should treat perpetual sale deeds as non-expiring compliant records', () => {
      const saleDeedDoc: Document = {
        id: 'doc-sale-deed',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'perpetual_sale_deed.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'SALE-DEED-2015-99',
              registrationDate: '2015-04-10',
              // No leaseTenureYears => perpetual title
            },
          },
        },
      } as unknown as Document;

      const findings = service.evaluateExpiry([saleDeedDoc]);

      const perpetual = findings.find(
        (f) => f.ruleId === 'DOC-EXP-TITLE-DEED-PERPETUAL',
      );
      expect(perpetual).toBeDefined();
      expect(perpetual?.outcome).toBe(ValidationOutcome.NOT_APPLICABLE);
      expect(perpetual?.severity).toBe(ComplianceSeverity.COMPLIANT);
    });
  });
});
