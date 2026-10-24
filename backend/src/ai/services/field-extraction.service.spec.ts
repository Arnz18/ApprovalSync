/**
 * ApprovalSync — Structured Field Extraction Service Unit Tests
 * Milestone: DOC-02
 */

import { FieldExtractionService } from './field-extraction.service';
import { SupportedDocumentCategory } from '../interfaces/document-classifier.interface';
import { OcrExtractionResult } from '../interfaces/ocr-provider.interface';

describe('FieldExtractionService', () => {
  let service: FieldExtractionService;

  beforeEach(() => {
    service = new FieldExtractionService();
  });

  const createMockOcrResult = (
    rawText: string,
    tokens: Array<{ text: string; confidence?: number }>,
  ): OcrExtractionResult => ({
    rawText,
    tokens: tokens.map((t, idx) => ({
      text: t.text,
      confidence: t.confidence ?? 0.95,
      pageNumber: 1,
      boundingBox: {
        pageNumber: 1,
        xMin: 50 + idx * 20,
        yMin: 100,
        xMax: 65 + idx * 20,
        yMax: 120,
      },
    })),
    pages: [
      {
        pageNumber: 1,
        text: rawText,
        width: 612,
        height: 792,
        confidence: 0.95,
        tokens: [],
      },
    ],
    confidenceScore: 0.95,
    providerMetadata: {
      providerId: 'MOCK_TEST',
      isMock: true,
      processingTimeMs: 10,
    },
  });

  describe('extractFields() for LAND_TITLE_DEED', () => {
    it('should extract deed number, registration date, tenure, and land area with spatial bounding boxes', async () => {
      const rawText = `
        REGISTERED LEASE DEED
        Deed Number: DEED/2024/7891
        Date of Registration: 15/04/2022
        Sub-Registrar Office: Pune South
        Lessor Name: Shri Rajeshwar Patil
        Lessee Name: Vidya Pratishthan Educational Trust
        Land Area: 5.25 Acres
        Survey Number: 124/2A Khasra 45/1
        Tenure of Lease: 30 Years
      `;

      const ocrResult = createMockOcrResult(rawText, [
        { text: 'DEED/2024/7891', confidence: 0.98 },
        { text: '15/04/2022', confidence: 0.96 },
        { text: '30', confidence: 0.99 },
        { text: '5.25', confidence: 0.97 },
      ]);

      const result = await service.extractFields(
        SupportedDocumentCategory.LAND_TITLE_DEED,
        ocrResult,
      );

      expect(result.extractedFields.deedNumber).toBe('DEED/2024/7891');
      expect(result.extractedFields.registrationDate).toBe('2022-04-15');
      expect(result.extractedFields.leaseTenureYears).toBe(30);
      expect(result.extractedFields.landAreaAcres).toBe(5.25);
      expect(result.extractedFields.lessorName).toContain(
        'Shri Rajeshwar Patil',
      );
      expect(result.missingRequiredFields).toHaveLength(0);

      // Verify findings and evidence bounding boxes
      expect(result.findings.length).toBeGreaterThanOrEqual(4);
      for (const finding of result.findings) {
        expect(finding.isAdvisory).toBe(true);
        expect(finding.confidenceScore).toBeGreaterThanOrEqual(0.9);
        expect(finding.evidenceLocation).toBeDefined();
        expect(finding.evidenceLocation.pageNumber).toBe(1);
        expect(finding.evidenceLocation.xMax).toBeGreaterThan(
          finding.evidenceLocation.xMin,
        );
      }
    });

    it('should flag missingRequiredFields when statutory fields are absent in deed', async () => {
      const rawText = `
        REGISTERED LEASE DEED
        Sub-Registrar Office Pune South
        Lessor Name: Shri Rajeshwar Patil
        Lessee Name: Vidya Pratishthan Educational Trust
      `;

      const ocrResult = createMockOcrResult(rawText, []);
      const result = await service.extractFields(
        SupportedDocumentCategory.LAND_TITLE_DEED,
        ocrResult,
      );

      expect(result.missingRequiredFields).toContain('deedNumber');
      expect(result.missingRequiredFields).toContain('registrationDate');
      expect(result.missingRequiredFields).toContain('leaseTenureYears');
    });
  });

  describe('extractFields() for BUILDING_PLAN_APPROVAL', () => {
    it('should extract approval number, date, total built up area, and FAR', async () => {
      const rawText = `
        MUNICIPAL CORPORATION TOWN PLANNING
        SANCTIONED BUILDING PLAN APPROVAL
        Approval Number: BPA-MC-2023-456
        Approval Date: 20/01/2023
        Total Built-up Area: 5420.75 Sq.m
        Carpet Area: 4800.00 Sq.m
        Floor Area Ratio: 1.75
      `;

      const ocrResult = createMockOcrResult(rawText, [
        { text: 'BPA-MC-2023-456' },
        { text: '20/01/2023' },
        { text: '5420.75' },
      ]);

      const result = await service.extractFields(
        SupportedDocumentCategory.BUILDING_PLAN_APPROVAL,
        ocrResult,
      );

      expect(result.extractedFields.approvalNumber).toBe('BPA-MC-2023-456');
      expect(result.extractedFields.approvalDate).toBe('2023-01-20');
      expect(result.extractedFields.totalBuiltUpAreaSqm).toBe(5420.75);
      expect(result.extractedFields.carpetAreaSqm).toBe(4800.0);
      expect(result.extractedFields.floorAreaRatio).toBe(1.75);
      expect(result.missingRequiredFields).toHaveLength(0);
    });
  });

  describe('normalizeDate()', () => {
    it('should correctly normalize DD/MM/YYYY to YYYY-MM-DD', () => {
      expect(service.normalizeDate('15/04/2022')).toBe('2022-04-15');
      expect(service.normalizeDate('01-08-2023')).toBe('2023-08-01');
      expect(service.normalizeDate('2024-11-20')).toBe('2024-11-20');
    });

    it('should handle short two-digit year DD/MM/YY', () => {
      expect(service.normalizeDate('15/04/24')).toBe('2024-04-15');
    });
  });
});
