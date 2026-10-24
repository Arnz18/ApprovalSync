/**
 * ApprovalSync — Cross-Record Consistency Service Unit Tests
 * Milestone: DOC-03
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CrossRecordConsistencyService } from './cross-record-consistency.service';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome } from '../enums';

describe('CrossRecordConsistencyService', () => {
  let service: CrossRecordConsistencyService;

  const mockInstitution: Institution = {
    id: 'inst-1',
    name: 'Apex Institute of Technology & Engineering (DEMO/SYNTHETIC)',
    registrationNumber: 'DEMO-INST-2026-001',
    institutionType: 'Engineering & Technology',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411001',
    address: 'Plot 42, Knowledge Park, Pune',
  } as unknown as Institution;

  const mockApplication: Application = {
    id: 'app-1',
    applicationNumber: 'APP-2026-A1B2C3D4',
    institutionId: 'inst-1',
    academicYear: '2026-2027',
    programType: 'Undergraduate Engineering',
    payloadJsonb: {
      institutionName:
        'Apex Institute of Technology & Engineering (DEMO/SYNTHETIC)',
      trustName: 'Apex Educational Trust',
      surveyNumber: '42/1',
      landAreaAcres: 10.0,
      builtUpAreaSqMeters: 5000,
    },
  } as unknown as Application;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrossRecordConsistencyService],
    }).compile();

    service = module.get<CrossRecordConsistencyService>(
      CrossRecordConsistencyService,
    );
  });

  describe('computeSimilarity and normalizeText', () => {
    it('should normalize punctuation and stopwords safely', () => {
      const norm = service.normalizeText(
        'Apex Institute of Technology, Pvt. Ltd.',
        true,
      );
      expect(norm).toBe('apex technology');
    });

    it('should compute high similarity for equivalent legal names', () => {
      const res = service.computeSimilarity(
        'Apex Institute of Technology & Engineering',
        'Apex Institute of Technology',
      );
      expect(res.score).toBeGreaterThanOrEqual(0.85);
    });

    it('should compute low similarity for completely distinct institution names', () => {
      const res = service.computeSimilarity(
        'Apex Institute of Technology',
        'Global Medical College of Sciences',
      );
      expect(res.score).toBeLessThan(0.4);
    });
  });

  describe('evaluateConsistency', () => {
    it('should verify matching institution name, survey number, and land area', () => {
      const documents: Document[] = [
        {
          id: 'doc-deed',
          documentType: 'LAND_TITLE_DEED',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                deedNumber: 'DEED-2026-001',
                lesseeName: 'Apex Institute of Technology',
                surveyNumber: 'Plot 42/1, Sector 4',
                landAreaAcres: 12.5, // Greater than declared 10.0
              },
              findings: [],
            },
          },
        } as unknown as Document,
        {
          id: 'doc-trust',
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                trustName: 'Apex Educational Trust',
                registrationNumber: 'DEMO-INST-2026-001',
              },
              findings: [],
            },
          },
        } as unknown as Document,
        {
          id: 'doc-plan',
          documentType: 'BUILDING_PLAN_APPROVAL',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                totalBuiltUpAreaSqm: 5200, // Satisfies declared 5000
              },
              findings: [],
            },
          },
        } as unknown as Document,
      ];

      const findings = service.evaluateConsistency(
        mockApplication,
        mockInstitution,
        documents,
      );

      // Institution Name match
      const nameMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-NAME-DEED-MATCH',
      );
      expect(nameMatch).toBeDefined();
      expect(nameMatch?.outcome).toBe(ValidationOutcome.MATCH);
      expect(nameMatch?.severity).toBe(ComplianceSeverity.COMPLIANT);

      // Trust Name match
      const trustMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-TRUST-NAME-MATCH',
      );
      expect(trustMatch).toBeDefined();
      expect(trustMatch?.outcome).toBe(ValidationOutcome.MATCH);

      // Registration Number match
      const regMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-REG-NUMBER-MATCH',
      );
      expect(regMatch).toBeDefined();
      expect(regMatch?.outcome).toBe(ValidationOutcome.MATCH);

      // Survey Number match
      const surveyMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-SURVEY-MATCH',
      );
      expect(surveyMatch).toBeDefined();
      expect(surveyMatch?.outcome).toBe(ValidationOutcome.MATCH);

      // Land Area match
      const landMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-LAND-AREA-MATCH',
      );
      expect(landMatch).toBeDefined();
      expect(landMatch?.outcome).toBe(ValidationOutcome.MATCH);

      // Built-up Area match
      const planMatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-BUILTUP-AREA-MATCH',
      );
      expect(planMatch).toBeDefined();
      expect(planMatch?.outcome).toBe(ValidationOutcome.MATCH);
    });

    it('should detect name mismatch between land deed lessee and institution record', () => {
      const documents: Document[] = [
        {
          id: 'doc-deed',
          documentType: 'LAND_TITLE_DEED',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                lesseeName: 'Completely Unrelated Foundation',
              },
              findings: [],
            },
          },
        } as unknown as Document,
      ];

      const findings = service.evaluateConsistency(
        mockApplication,
        mockInstitution,
        documents,
      );

      const nameMismatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-NAME-DEED-MISMATCH',
      );
      expect(nameMismatch).toBeDefined();
      expect(nameMismatch?.outcome).toBe(ValidationOutcome.MISMATCH);
      expect(nameMismatch?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should detect survey number discrepancy between deed and application declaration', () => {
      const documents: Document[] = [
        {
          id: 'doc-deed',
          documentType: 'LAND_TITLE_DEED',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                surveyNumber: 'Survey 999/XYZ', // Does not contain 42/1
              },
              findings: [],
            },
          },
        } as unknown as Document,
      ];

      const findings = service.evaluateConsistency(
        mockApplication,
        mockInstitution,
        documents,
      );

      const surveyMismatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-SURVEY-MISMATCH',
      );
      expect(surveyMismatch).toBeDefined();
      expect(surveyMismatch?.outcome).toBe(ValidationOutcome.MISMATCH);
      expect(surveyMismatch?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should flag land area shortfall as a critical deficiency', () => {
      const documents: Document[] = [
        {
          id: 'doc-deed',
          documentType: 'LAND_TITLE_DEED',
          processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
          metadata: {
            analysisReport: {
              extractedFields: {
                landAreaAcres: 5.0, // Declared is 10.0 acres
              },
              findings: [],
            },
          },
        } as unknown as Document,
      ];

      const findings = service.evaluateConsistency(
        mockApplication,
        mockInstitution,
        documents,
      );

      const landMismatch = findings.find(
        (f) => f.ruleId === 'DOC-XREC-LAND-AREA-MISMATCH',
      );
      expect(landMismatch).toBeDefined();
      expect(landMismatch?.outcome).toBe(ValidationOutcome.MISMATCH);
      expect(landMismatch?.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should flag source unavailable when document extraction is absent', () => {
      const documents: Document[] = []; // No documents

      const findings = service.evaluateConsistency(
        mockApplication,
        mockInstitution,
        documents,
      );

      const unavailable = findings.find(
        (f) => f.ruleId === 'DOC-XREC-NAME-DEED-UNAVAILABLE',
      );
      expect(unavailable).toBeDefined();
      expect(unavailable?.outcome).toBe(ValidationOutcome.SOURCE_UNAVAILABLE);
      expect(unavailable?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });
  });
});
