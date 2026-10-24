/**
 * ApprovalSync — Field Completeness Service Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FieldCompletenessService } from './field-completeness.service';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome } from '../enums';

describe('FieldCompletenessService', () => {
  let service: FieldCompletenessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldCompletenessService],
    }).compile();

    service = module.get<FieldCompletenessService>(FieldCompletenessService);
  });

  describe('evaluateFields', () => {
    it('should validate high-confidence statutory fields as compliant with evidence locations', () => {
      const doc: Document = {
        id: 'doc-title',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'DEED/2026/PUNE/4582',
              registrationDate: '2020-05-15',
              leaseTenureYears: 35,
              landAreaAcres: 12.5,
              surveyNumber: '42/1, 42/2',
              lesseeName: 'Apex Educational Trust',
            },
            findings: [
              {
                fieldKey: 'deedNumber',
                extractedValue: 'DEED/2026/PUNE/4582',
                confidenceScore: 0.96,
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.2,
                  xMax: 0.5,
                  yMax: 0.25,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'leaseTenureYears',
                extractedValue: 35,
                confidenceScore: 0.92,
                evidenceLocation: {
                  pageNumber: 2,
                  xMin: 0.2,
                  yMin: 0.4,
                  xMax: 0.4,
                  yMax: 0.45,
                },
                isAdvisory: true,
              },
            ],
            ocrConfidence: 0.94,
          },
        },
      } as unknown as Document;

      const findings = service.evaluateFields([doc]);

      const validDeed = findings.find(
        (f) => f.ruleId === 'DOC-FIELD-VALID-LAND_TITLE_DEED-deedNumber',
      );
      expect(validDeed).toBeDefined();
      expect(validDeed?.outcome).toBe(ValidationOutcome.VALID);
      expect(validDeed?.severity).toBe(ComplianceSeverity.COMPLIANT);
      expect(validDeed?.evidenceLocation?.pageNumber).toBe(1);

      const validTenure = findings.find(
        (f) => f.ruleId === 'DOC-FIELD-VALID-LAND_TITLE_DEED-leaseTenureYears',
      );
      expect(validTenure).toBeDefined();
      expect(validTenure?.outcome).toBe(ValidationOutcome.VALID);
      expect(validTenure?.evidenceLocation?.pageNumber).toBe(2);
    });

    it('should identify missing required fields and generate critical deficiencies', () => {
      const doc: Document = {
        id: 'doc-incomplete',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_cert.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              nocNumber: 'NOC-2026-FIRE-01',
              // missing issueDate and expiryDate
            },
            findings: [
              {
                fieldKey: 'nocNumber',
                extractedValue: 'NOC-2026-FIRE-01',
                confidenceScore: 0.91,
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.1,
                  xMax: 0.4,
                  yMax: 0.15,
                },
                isAdvisory: true,
              },
            ],
            ocrConfidence: 0.9,
          },
        },
      } as unknown as Document;

      const findings = service.evaluateFields([doc]);

      const missingExpiry = findings.find(
        (f) =>
          f.ruleId === 'DOC-FIELD-MISSING-FIRE_SAFETY_CERTIFICATE-expiryDate',
      );
      expect(missingExpiry).toBeDefined();
      expect(missingExpiry?.outcome).toBe(ValidationOutcome.DEFICIENT);
      expect(missingExpiry?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );

      const missingIssue = findings.find(
        (f) =>
          f.ruleId === 'DOC-FIELD-MISSING-FIRE_SAFETY_CERTIFICATE-issueDate',
      );
      expect(missingIssue).toBeDefined();
      expect(missingIssue?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should flag malformed values with critical deficiency', () => {
      const doc: Document = {
        id: 'doc-malformed',
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanction_plan.pdf',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              approvalNumber: 'SANCTION/2026/01',
              approvalDate: 'not-a-valid-date',
              totalBuiltUpAreaSqm: -500, // Invalid negative area
            },
            findings: [],
            ocrConfidence: 0.88,
          },
        },
      } as unknown as Document;

      const findings = service.evaluateFields([doc]);

      const malformedArea = findings.find(
        (f) =>
          f.ruleId ===
          'DOC-FIELD-MALFORMED-BUILDING_PLAN_APPROVAL-totalBuiltUpAreaSqm',
      );
      expect(malformedArea).toBeDefined();
      expect(malformedArea?.outcome).toBe(ValidationOutcome.MALFORMED);
      expect(malformedArea?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );

      const malformedDate = findings.find(
        (f) =>
          f.ruleId ===
          'DOC-FIELD-MALFORMED-BUILDING_PLAN_APPROVAL-approvalDate',
      );
      expect(malformedDate).toBeDefined();
      expect(malformedDate?.outcome).toBe(ValidationOutcome.MALFORMED);
    });

    it('should flag low-confidence field extractions as uncertain advisory flags', () => {
      const doc: Document = {
        id: 'doc-low-conf',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'blurry_deed.pdf',
        processingStatus: DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'DEED/UNKNOWN/12',
              registrationDate: '2021-08-10',
              leaseTenureYears: 30,
            },
            findings: [
              {
                fieldKey: 'deedNumber',
                extractedValue: 'DEED/UNKNOWN/12',
                confidenceScore: 0.65, // Below 0.85 benchmark
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.1,
                  xMax: 0.3,
                  yMax: 0.15,
                },
                isAdvisory: true,
              },
            ],
            ocrConfidence: 0.72,
          },
        },
      } as unknown as Document;

      const findings = service.evaluateFields([doc]);

      const lowConfFinding = findings.find(
        (f) =>
          f.ruleId === 'DOC-FIELD-LOW-CONFIDENCE-LAND_TITLE_DEED-deedNumber',
      );
      expect(lowConfFinding).toBeDefined();
      expect(lowConfFinding?.outcome).toBe(ValidationOutcome.LOW_CONFIDENCE);
      expect(lowConfFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(lowConfFinding?.confidenceScore).toBe(0.65);
    });

    it('should distinguish OCR failure from missing source fields', () => {
      const doc: Document = {
        id: 'doc-ocr-fail',
        documentType: 'LAND_TITLE_DEED',
        fileName: 'damaged_scan.pdf',
        processingStatus: DocumentProcessingStatus.FAILED_OCR,
      } as unknown as Document;

      const findings = service.evaluateFields([doc]);

      expect(findings.length).toBe(1);
      expect(findings[0].outcome).toBe(ValidationOutcome.SOURCE_UNAVAILABLE);
      expect(findings[0].severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(findings[0].ruleId).toContain('DOC-FIELD-OCR-FAILED');
      // Must not assert that statutory fields are missing from original document
      expect(
        findings.some((f) => f.outcome === ValidationOutcome.DEFICIENT),
      ).toBe(false);
    });
  });
});
