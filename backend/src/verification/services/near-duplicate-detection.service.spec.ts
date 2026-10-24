/**
 * ApprovalSync — Near-Duplicate Detection Service Tests
 * Milestone: DOC-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NearDuplicateDetectionService } from './near-duplicate-detection.service';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome } from '../enums';
import { ComplianceSeverity } from '../../shared/contracts';

describe('NearDuplicateDetectionService', () => {
  let service: NearDuplicateDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NearDuplicateDetectionService],
    }).compile();

    service = module.get<NearDuplicateDetectionService>(
      NearDuplicateDetectionService,
    );
  });

  describe('Hamming distance and perceptual hash calculations', () => {
    it('should compute zero distance for identical 64-bit hex hashes', () => {
      const hash = 'a1b2c3d4e5f60718';
      const distance = service.computeHammingDistance(hash, hash);
      expect(distance).toBe(0);
      expect(service.similarityFromHammingDistance(distance)).toBe(1.0);
    });

    it('should compute distance of 1 bit for single-bit difference', () => {
      // 0x0000000000000000 vs 0x0000000000000001
      const hash1 = '0000000000000000';
      const hash2 = '0000000000000001';
      const distance = service.computeHammingDistance(hash1, hash2);
      expect(distance).toBe(1);
      expect(service.similarityFromHammingDistance(distance)).toBe(
        Number((63 / 64).toFixed(4)),
      );
    });

    it('should compute distance of 64 bits for inverted hashes', () => {
      const hash1 = '0000000000000000';
      const hash2 = 'ffffffffffffffff';
      const distance = service.computeHammingDistance(hash1, hash2);
      expect(distance).toBe(64);
      expect(service.similarityFromHammingDistance(distance)).toBe(0.0);
    });

    it('should reject invalid length hex hash', () => {
      expect(() => service.computeHammingDistance('abc', 'def')).toThrow(
        'Perceptual hash must be a 16-character (64-bit) hex string.',
      );
    });
  });

  describe('compareDocuments — Statutory Identifier Matching', () => {
    it('should detect near-duplicate when statutory certificate number matches across different files', () => {
      const docA = {
        id: 'doc-uuid-1',
        fileName: 'fire_noc_scan1.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'hash-aaa-111',
        metadata: {
          analysisReport: {
            extractedFields: {
              certificateNumber: 'NOC/FIRE/2026/89412',
              issuerAuthority: 'Delhi Fire Service',
            },
          },
        },
      } as unknown as Document;

      const docB = {
        id: 'doc-uuid-2',
        fileName: 'fire_noc_scan2.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'hash-bbb-222',
        metadata: {
          analysisReport: {
            extractedFields: {
              certificateNumber: 'NOC/FIRE/2026/89412',
              issuerAuthority: 'Delhi Fire Service',
            },
          },
        },
      } as unknown as Document;

      const result = service.compareDocuments(docA, docB);

      expect(result.isNearDuplicate).toBe(true);
      expect(result.method).toBe('KEY_FIELDS_MATCH');
      expect(result.finding).toBeDefined();
      expect(result.finding?.outcome).toBe(ValidationOutcome.NEAR_DUPLICATE);
      expect(result.finding?.fieldKey).toBe('certificateNumber');
      expect(result.finding?.isAdvisory).toBe(true);
    });
  });

  describe('compareDocuments — Text & Template Similarity', () => {
    it('should flag near-duplicate when raw text similarity meets threshold (>= 0.88)', () => {
      const docA = {
        id: 'doc-uuid-1',
        fileName: 'lease_agreement_v1.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'hash-111',
        metadata: {
          analysisReport: {
            rawText:
              'This registered lease deed is made on 15th January 2024 between the lessor and lessee Apex Education Trust for Survey No 452/1 comprising 7.5 acres in Pune.',
          },
        },
      } as unknown as Document;

      const docB = {
        id: 'doc-uuid-2',
        fileName: 'lease_agreement_v2.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'hash-222',
        metadata: {
          analysisReport: {
            rawText:
              'This registered lease deed is made on 15th January 2024 between the lessor and lessee Apex Education Trust for Survey No 452/1 comprising 7.5 acres in Pune Maharashtra.',
          },
        },
      } as unknown as Document;

      const result = service.compareDocuments(docA, docB);

      expect(result.isNearDuplicate).toBe(true);
      expect(result.method).toBe('OCR_TEXT_SIMILARITY');
      expect(result.similarityScore).toBeGreaterThanOrEqual(0.88);
      expect(result.finding?.outcome).toBe(ValidationOutcome.NEAR_DUPLICATE);
      expect(result.finding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should recognize shared standard regulatory template and not flag near-duplicate when entity names differ', () => {
      const docA = {
        id: 'doc-uuid-1',
        fileName: 'fire_cert_college_a.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'hash-111',
        metadata: {
          analysisReport: {
            rawText:
              'Government of Maharashtra Directorate of Fire Safety. Sub-Divisional Fire Station Office Mumbai. This is to certify that an inspection was carried out in accordance with Fire Prevention and Life Safety Measures Act 2006. Certified that the building premises of Apex Institute of Technology has installed all required fire prevention and life safety apparatus in compliance with national building code norms certificate number 1001 issued for academic year.',
            extractedFields: {
              institutionName: 'Apex Institute of Technology',
              certificateNumber: 'CERT-1001',
            },
          },
        },
      } as unknown as Document;

      const docB = {
        id: 'doc-uuid-2',
        fileName: 'fire_cert_college_b.pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileHashSha256: 'hash-222',
        metadata: {
          analysisReport: {
            rawText:
              'Government of Maharashtra Directorate of Fire Safety. Sub-Divisional Fire Station Office Mumbai. This is to certify that an inspection was carried out in accordance with Fire Prevention and Life Safety Measures Act 2006. Certified that the building premises of Zenith Polytechnic College has installed all required fire prevention and life safety apparatus in compliance with national building code norms certificate number 9999 issued for academic year.',
            extractedFields: {
              institutionName: 'Zenith Polytechnic College',
              certificateNumber: 'CERT-9999',
            },
          },
        },
      } as unknown as Document;

      const result = service.compareDocuments(docA, docB);

      expect(result.isNearDuplicate).toBe(false);
      expect(result.isSharedTemplate).toBe(true);
      expect(result.finding?.ruleId).toBe('DOC-DUP-SHARED-TEMPLATE');
      expect(result.finding?.outcome).toBe(ValidationOutcome.VALID);
      expect(result.finding?.severity).toBe(ComplianceSeverity.COMPLIANT);
    });

    it('should return SOURCE_UNAVAILABLE finding when OCR metadata is missing for documents', () => {
      const docA = {
        id: 'doc-uuid-1',
        fileName: 'unprocessed_1.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'hash-111',
        metadata: {},
      } as unknown as Document;

      const docB = {
        id: 'doc-uuid-2',
        fileName: 'unprocessed_2.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'hash-222',
        metadata: {},
      } as unknown as Document;

      const result = service.compareDocuments(docA, docB);

      expect(result.isNearDuplicate).toBe(false);
      expect(result.finding?.outcome).toBe(
        ValidationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(result.finding?.ruleId).toBe('DOC-DUP-NEAR-UNAVAILABLE');
    });

    it('should report no near-duplicate when documents are completely different', () => {
      const docA = {
        id: 'doc-uuid-1',
        fileName: 'balance_sheet.pdf',
        documentType: 'AUDITED_BALANCE_SHEET',
        fileHashSha256: 'hash-111',
        metadata: {
          analysisReport: {
            rawText:
              'Financial statements balance sheet fixed assets reserves surplus equity share capital bank balance loan liability.',
          },
        },
      } as unknown as Document;

      const docB = {
        id: 'doc-uuid-2',
        fileName: 'building_plan.pdf',
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileHashSha256: 'hash-222',
        metadata: {
          analysisReport: {
            rawText:
              'Municipal Town Planning department sanctioned architectural blueprint instructional area circulation area total builtup 12000 sqm.',
          },
        },
      } as unknown as Document;

      const result = service.compareDocuments(docA, docB);

      expect(result.isNearDuplicate).toBe(false);
      expect(result.similarityScore).toBeLessThan(0.4);
    });
  });

  describe('evaluateApplicationNearDuplicates', () => {
    it('should evaluate pairwise combinations and collect findings', () => {
      const doc1 = {
        id: 'doc-1',
        fileName: 'doc1.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'h1',
        metadata: {
          analysisReport: {
            extractedFields: { deedNumber: 'DEED-999' },
          },
        },
      } as unknown as Document;

      const doc2 = {
        id: 'doc-2',
        fileName: 'doc2.pdf',
        documentType: 'LAND_TITLE_DEED',
        fileHashSha256: 'h2',
        metadata: {
          analysisReport: {
            extractedFields: { deedNumber: 'DEED-999' },
          },
        },
      } as unknown as Document;

      const { findings, nearDuplicates } =
        service.evaluateApplicationNearDuplicates([doc1, doc2]);

      expect(nearDuplicates.length).toBe(1);
      expect(findings.length).toBe(1);
      expect(findings[0].outcome).toBe(ValidationOutcome.NEAR_DUPLICATE);
    });
  });
});
