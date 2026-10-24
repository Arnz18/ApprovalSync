/**
 * ApprovalSync — Document Classification Service Unit Tests
 * Milestone: DOC-02
 */

import { DocumentClassificationService } from './document-classification.service';
import { SupportedDocumentCategory } from '../interfaces/document-classifier.interface';

describe('DocumentClassificationService', () => {
  let service: DocumentClassificationService;

  beforeEach(() => {
    service = new DocumentClassificationService();
  });

  describe('classify()', () => {
    it('should classify text containing land lease keywords as LAND_TITLE_DEED', async () => {
      const text = `
        REGISTERED LEASE DEED
        Sub-Registrar Office Pune South
        Deed Number: DEED/2024/7891
        Tenure of Lease: 30 Years
        Survey Number: 124/2A Khasra 45/1
        Lessor: Shri Rajeshwar Patil
        Lessee: Vidya Pratishthan Trust
        Land Area: 5.25 Acres
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(SupportedDocumentCategory.LAND_TITLE_DEED);
      expect(result.isRecognized).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedKeywords).toContain('lease deed');
      expect(result.matchedKeywords).toContain('sub-registrar');
    });

    it('should classify text containing building plan keywords as BUILDING_PLAN_APPROVAL', async () => {
      const text = `
        MUNICIPAL CORPORATION TOWN PLANNING
        SANCTIONED BUILDING PLAN APPROVAL
        Approval Number: BPA-MC-2023-456
        Built-up Area: 5420.75 Sq.m
        Floor Area Ratio (FAR): 1.75
        Plinth Area: 1200 Sq.m
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(
        SupportedDocumentCategory.BUILDING_PLAN_APPROVAL,
      );
      expect(result.isRecognized).toBe(true);
      expect(result.matchedKeywords).toContain('building plan');
      expect(result.matchedKeywords).toContain('built-up area');
    });

    it('should classify text containing change of land use keywords as LAND_USE_CERTIFICATE', async () => {
      const text = `
        OFFICE OF THE DISTRICT COLLECTOR REVENUE DEPARTMENT
        CHANGE OF LAND USE (CLU) CONVERSION CERTIFICATE
        Agricultural to Educational Institutional Zone
        Competent Authority Order No: CLU/2023/112
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(
        SupportedDocumentCategory.LAND_USE_CERTIFICATE,
      );
      expect(result.isRecognized).toBe(true);
      expect(result.matchedKeywords).toContain('change of land use');
    });

    it('should classify text containing fire safety keywords as FIRE_SAFETY_CERTIFICATE', async () => {
      const text = `
        DIRECTORATE OF FIRE PREVENTION AND LIFE SAFETY
        FIRE SAFETY NO OBJECTION CERTIFICATE (FIRE NOC)
        Chief Fire Officer Clearances
        Emergency Evacuation Fire Extinguisher Hydrant systems inspected
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(
        SupportedDocumentCategory.FIRE_SAFETY_CERTIFICATE,
      );
      expect(result.isRecognized).toBe(true);
    });

    it('should classify text containing society registration keywords as SOCIETY_TRUST_REGISTRATION', async () => {
      const text = `
        REGISTRAR OF SOCIETIES AND PUBLIC TRUSTS
        CERTIFICATE OF REGISTRATION UNDER SOCIETIES REGISTRATION ACT 1860
        Trust Deed Memorandum of Association
        Name of Trust: Gyan Ganga Foundation
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(
        SupportedDocumentCategory.SOCIETY_TRUST_REGISTRATION,
      );
      expect(result.isRecognized).toBe(true);
    });

    it('should return UNKNOWN with isRecognized false for unrelated text', async () => {
      const text = `
        THE FLAVORS OF SPRING
        A collection of seasonal soup recipes.
        Tomato basil soup with roasted garlic.
        Simmer for 30 minutes and serve warm with bread.
      `;

      const result = await service.classify(text);

      expect(result.category).toBe(SupportedDocumentCategory.UNKNOWN);
      expect(result.isRecognized).toBe(false);
      expect(result.matchedKeywords.length).toBeLessThan(2);
    });

    it('should return UNKNOWN for empty or whitespace text', async () => {
      const result = await service.classify('   ');

      expect(result.category).toBe(SupportedDocumentCategory.UNKNOWN);
      expect(result.isRecognized).toBe(false);
      expect(result.confidenceScore).toBe(0);
    });
  });
});
