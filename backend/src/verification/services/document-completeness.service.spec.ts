/**
 * ApprovalSync — Document Completeness Service Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentCompletenessService } from './document-completeness.service';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome } from '../enums';

describe('DocumentCompletenessService', () => {
  let service: DocumentCompletenessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentCompletenessService],
    }).compile();

    service = module.get<DocumentCompletenessService>(
      DocumentCompletenessService,
    );
  });

  describe('resolveCategory', () => {
    it('should resolve Undergraduate Engineering to ENGINEERING_TECHNOLOGY', () => {
      expect(service.resolveCategory('Undergraduate Engineering')).toBe(
        'ENGINEERING_TECHNOLOGY',
      );
      expect(service.resolveCategory('B.Tech in Computer Science')).toBe(
        'ENGINEERING_TECHNOLOGY',
      );
    });

    it('should resolve Diploma programs to POLYTECHNIC_DIPLOMA', () => {
      expect(service.resolveCategory('Diploma in Engineering')).toBe(
        'POLYTECHNIC_DIPLOMA',
      );
      expect(service.resolveCategory('Polytechnic Studies')).toBe(
        'POLYTECHNIC_DIPLOMA',
      );
    });

    it('should resolve Management programs to MANAGEMENT', () => {
      expect(service.resolveCategory('Postgraduate Management (MBA)')).toBe(
        'MANAGEMENT',
      );
      expect(service.resolveCategory('PGDM Executive')).toBe('MANAGEMENT');
    });

    it('should resolve Pharmacy programs to PHARMACY', () => {
      expect(service.resolveCategory('Bachelor of Pharmacy')).toBe('PHARMACY');
    });

    it('should resolve Extension of Approval to EXTENSION_OF_APPROVAL', () => {
      expect(service.resolveCategory('Extension of Approval (EoA)')).toBe(
        'EXTENSION_OF_APPROVAL',
      );
    });

    it('should fallback to GENERAL_TECHNICAL_INSTITUTION for unknown or missing category', () => {
      expect(service.resolveCategory(undefined)).toBe(
        'GENERAL_TECHNICAL_INSTITUTION',
      );
      expect(service.resolveCategory('Custom Applied Sciences')).toBe(
        'GENERAL_TECHNICAL_INSTITUTION',
      );
    });
  });

  describe('evaluateCompleteness', () => {
    const mockApplication: Application = {
      id: 'app-1',
      applicationNumber: 'APP-2026-TEST',
      institutionId: 'inst-1',
      academicYear: '2026-2027',
      programType: 'Undergraduate Engineering',
      payloadJsonb: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Application;

    it('should detect missing mandatory documents for Undergraduate Engineering', () => {
      const documents: Document[] = []; // No documents uploaded

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const missingFindings = findings.filter(
        (f) =>
          f.outcome === ValidationOutcome.DEFICIENT &&
          f.severity === ComplianceSeverity.CRITICAL_DEFICIENCY,
      );

      // Should be 5 missing documents for ENGINEERING_TECHNOLOGY
      expect(missingFindings.length).toBe(5);
      const missingTypes = missingFindings.map((f) => f.documentType);
      expect(missingTypes).toContain('LAND_TITLE_DEED');
      expect(missingTypes).toContain('LAND_USE_CERTIFICATE');
      expect(missingTypes).toContain('BUILDING_PLAN_APPROVAL');
      expect(missingTypes).toContain('FIRE_SAFETY_CERTIFICATE');
      expect(missingTypes).toContain('SOCIETY_TRUST_REGISTRATION');
    });

    it('should mark all mandatory requirements as valid when uploaded and extracted', () => {
      const documents: Document[] = [
        {
          id: 'doc-1',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'land_deed.pdf',
          fileHashSha256: 'hash-1',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'LAND_TITLE_DEED' },
        } as unknown as Document,
        {
          id: 'doc-2',
          documentType: 'LAND_USE_CERTIFICATE',
          fileName: 'clu.pdf',
          fileHashSha256: 'hash-2',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'LAND_USE_CERTIFICATE' },
        } as unknown as Document,
        {
          id: 'doc-3',
          documentType: 'BUILDING_PLAN_APPROVAL',
          fileName: 'building_plan.pdf',
          fileHashSha256: 'hash-3',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'BUILDING_PLAN_APPROVAL' },
        } as unknown as Document,
        {
          id: 'doc-4',
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          fileName: 'fire_noc.pdf',
          fileHashSha256: 'hash-4',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'FIRE_SAFETY_CERTIFICATE' },
        } as unknown as Document,
        {
          id: 'doc-5',
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          fileName: 'trust_reg.pdf',
          fileHashSha256: 'hash-5',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'SOCIETY_TRUST_REGISTRATION' },
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const satisfied = findings.filter(
        (f) =>
          f.outcome === ValidationOutcome.VALID &&
          f.severity === ComplianceSeverity.COMPLIANT,
      );
      expect(satisfied.length).toBe(5);

      const deficiencies = findings.filter(
        (f) => f.severity === ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
      expect(deficiencies.length).toBe(0);
    });

    it('should flag duplicate uploads of the same mandatory document type', () => {
      const documents: Document[] = [
        {
          id: 'doc-1a',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'land_deed_v1.pdf',
          fileHashSha256: 'hash-1a',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        } as unknown as Document,
        {
          id: 'doc-1b',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'land_deed_v2.pdf',
          fileHashSha256: 'hash-1b',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const duplicateFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-DUPLICATE-TYPE-LAND_TITLE_DEED',
      );
      expect(duplicateFinding).toBeDefined();
      expect(duplicateFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(duplicateFinding?.isAdvisory).toBe(true);
    });

    it('should flag duplicate identical file submissions by SHA-256 hash', () => {
      const documents: Document[] = [
        {
          id: 'doc-1',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'land_deed.pdf',
          fileHashSha256: 'identical-sha256-hash',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        } as unknown as Document,
        {
          id: 'doc-2',
          documentType: 'LAND_USE_CERTIFICATE',
          fileName: 'duplicate_copy.pdf',
          fileHashSha256: 'identical-sha256-hash',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const hashFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-DUPLICATE-HASH',
      );
      expect(hashFinding).toBeDefined();
      expect(hashFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should flag failed OCR processing as source unavailable and not claim document satisfied', () => {
      const documents: Document[] = [
        {
          id: 'doc-failed',
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          fileName: 'corrupted_scan.pdf',
          fileHashSha256: 'hash-f',
          processingStatus: DocumentProcessingStatus.FAILED_OCR,
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const ocrFailedFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-OCR-FAILED-doc-failed',
      );
      expect(ocrFailedFinding).toBeDefined();
      expect(ocrFailedFinding?.outcome).toBe(
        ValidationOutcome.SOURCE_UNAVAILABLE,
      );
      expect(ocrFailedFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);

      const unsatisfied = findings.find(
        (f) => f.ruleId === 'DOC-COMP-UNSATISFIED-FIRE_SAFETY_CERTIFICATE',
      );
      expect(unsatisfied).toBeDefined();
      expect(unsatisfied?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should flag category mismatch when declared type differs from AI classification', () => {
      const documents: Document[] = [
        {
          id: 'doc-mismatch',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'wrongly_labeled.pdf',
          fileHashSha256: 'hash-m',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'BUILDING_PLAN_APPROVAL' },
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const mismatchFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-CATEGORY-MISMATCH-doc-mismatch',
      );
      expect(mismatchFinding).toBeDefined();
      expect(mismatchFinding?.expectedValue).toBe('LAND_TITLE_DEED');
      expect(mismatchFinding?.observedValue).toBe('BUILDING_PLAN_APPROVAL');
      expect(mismatchFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should flag unrecognized document type when classification is UNKNOWN', () => {
      const documents: Document[] = [
        {
          id: 'doc-unk',
          documentType: 'LAND_TITLE_DEED',
          fileName: 'random_notes.pdf',
          fileHashSha256: 'hash-u',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: { ocrClassification: 'UNKNOWN' },
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const unkFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-UNRECOGNIZED-doc-unk',
      );
      expect(unkFinding).toBeDefined();
      expect(unkFinding?.outcome).toBe(ValidationOutcome.INCONCLUSIVE);
      expect(unkFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should mark supplementary/optional documents as not applicable without error', () => {
      const documents: Document[] = [
        {
          id: 'doc-extra',
          documentType: 'AICTE_APPROVAL_LETTER', // Not mandatory for initial UG engineering intake
          fileName: 'old_letter.pdf',
          fileHashSha256: 'hash-e',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        } as unknown as Document,
      ];

      const findings = service.evaluateCompleteness(mockApplication, documents);

      const extraFinding = findings.find(
        (f) => f.ruleId === 'DOC-COMP-ADDITIONAL-DOC-doc-extra',
      );
      expect(extraFinding).toBeDefined();
      expect(extraFinding?.outcome).toBe(ValidationOutcome.NOT_APPLICABLE);
      expect(extraFinding?.severity).toBe(ComplianceSeverity.COMPLIANT);
    });
  });
});
