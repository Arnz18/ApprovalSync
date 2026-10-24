/**
 * ApprovalSync — AI Document Processor Service Unit Tests
 * Milestone: DOC-02
 */

import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AiDocumentProcessorService } from './ai-document-processor.service';
import { DocumentClassificationService } from './document-classification.service';
import { FieldExtractionService } from './field-extraction.service';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import {
  ApplicationStatus,
  DocumentProcessingStatus,
  UserRole,
} from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { IStorageAdapter } from '../../documents/interfaces/storage-adapter.interface';
import {
  IOcrProvider,
  OcrExtractionResult,
} from '../interfaces/ocr-provider.interface';
import { SupportedDocumentCategory } from '../interfaces/document-classifier.interface';

describe('AiDocumentProcessorService', () => {
  let service: AiDocumentProcessorService;
  let docRepo: jest.Mocked<Repository<Document>>;
  let appRepo: jest.Mocked<Repository<Application>>;
  let storageAdapter: jest.Mocked<IStorageAdapter>;
  let ocrProvider: jest.Mocked<IOcrProvider>;
  let classificationService: jest.Mocked<DocumentClassificationService>;
  let fieldExtractionService: jest.Mocked<FieldExtractionService>;

  const instUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'inst@test.local',
    name: 'Test Institution User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const otherInstUser: AuthUserPrincipal = {
    id: 'user-inst-2',
    email: 'inst2@test.local',
    name: 'Other Institution User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-2',
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'officer-1',
    email: 'officer@aicte.gov.in',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
  };

  const createMockDocument = (overrides?: Partial<Document>): Document => ({
    id: 'doc-uuid-1',
    applicationId: 'app-uuid-1',
    documentType: 'LAND_TITLE_DEED',
    fileName: 'registered_deed.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 2048,
    storagePath: 'documents/app-uuid-1/doc-uuid-1.pdf',
    fileHashSha256: 'abc123sha256',
    processingStatus: DocumentProcessingStatus.UPLOADED,
    metadata: {},
    createdAt: new Date('2026-10-24T10:00:00Z'),
    updatedAt: new Date('2026-10-24T10:00:00Z'),
    application: {
      id: 'app-uuid-1',
      institutionId: 'inst-1',
      status: ApplicationStatus.DRAFT,
    } as Application,
    ...overrides,
  });

  const mockOcrResult: OcrExtractionResult = {
    rawText:
      'REGISTERED LEASE DEED Deed Number: DEED/2024/7891 Tenure: 30 Years',
    tokens: [
      {
        text: 'DEED/2024/7891',
        confidence: 0.95,
        pageNumber: 1,
        boundingBox: {
          pageNumber: 1,
          xMin: 50,
          yMin: 100,
          xMax: 200,
          yMax: 120,
        },
      },
    ],
    pages: [],
    confidenceScore: 0.94,
    providerMetadata: {
      providerId: 'MOCK',
      isMock: true,
      processingTimeMs: 15,
    },
  };

  beforeEach(() => {
    docRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
    } as unknown as jest.Mocked<Repository<Document>>;

    appRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Application>>;

    storageAdapter = {
      save: jest.fn(),
      getBuffer: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-1.4 mock content')),
      getStream: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
    };

    ocrProvider = {
      providerId: 'SYNTHETIC_MOCK',
      isLiveProviderConfigured: true,
      extractTextAndTokens: jest.fn().mockResolvedValue(mockOcrResult),
    };

    classificationService = {
      classify: jest.fn().mockResolvedValue({
        category: SupportedDocumentCategory.LAND_TITLE_DEED,
        confidenceScore: 0.95,
        matchedKeywords: ['lease deed'],
        isRecognized: true,
      }),
    } as unknown as jest.Mocked<DocumentClassificationService>;

    fieldExtractionService = {
      extractFields: jest.fn().mockResolvedValue({
        category: SupportedDocumentCategory.LAND_TITLE_DEED,
        extractedFields: { deedNumber: 'DEED/2024/7891', leaseTenureYears: 30 },
        findings: [
          {
            fieldKey: 'deedNumber',
            extractedValue: 'DEED/2024/7891',
            confidenceScore: 0.95,
            evidenceLocation: {
              pageNumber: 1,
              xMin: 50,
              yMin: 100,
              xMax: 200,
              yMax: 120,
            },
            isAdvisory: true,
          },
        ],
        missingRequiredFields: [],
        extractionConfidence: 0.95,
      }),
    } as unknown as jest.Mocked<FieldExtractionService>;

    service = new AiDocumentProcessorService(
      docRepo,
      appRepo,
      storageAdapter,
      ocrProvider,
      classificationService,
      fieldExtractionService,
    );
  });

  describe('processDocument()', () => {
    it('should successfully process a valid document and update status to OCR_EXTRACTED', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      const report = await service.processDocument('doc-uuid-1', instUser);

      expect(report).toBeDefined();
      expect(report.documentId).toBe('doc-uuid-1');
      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.OCR_EXTRACTED,
      );
      expect(report.ocrConfidence).toBe(0.94);
      expect(report.extractedFields.deedNumber).toBe('DEED/2024/7891');
      expect(report.extractedFields.leaseTenureYears).toBe(30);
      expect(report.findings).toHaveLength(1);
      expect(report.anomalyFlags).toHaveLength(0);

      // Verify repository persistence
      expect(docRepo.save).toHaveBeenCalled();
      const savedDoc =
        docRepo.save.mock.calls[docRepo.save.mock.calls.length - 1][0];
      expect(savedDoc?.processingStatus).toBe(
        DocumentProcessingStatus.OCR_EXTRACTED,
      );
      expect(savedDoc?.metadata?.analysisReport).toBeDefined();
    });

    it('should transition to MANUAL_REVIEW_REQUIRED when OCR confidence is below 0.85', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      ocrProvider.extractTextAndTokens.mockResolvedValueOnce({
        ...mockOcrResult,
        confidenceScore: 0.72,
      });

      const report = await service.processDocument('doc-uuid-1', instUser);

      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
      );
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'LOW_OCR_CONFIDENCE',
          isAdvisory: true,
        }),
      );
    });

    it('should transition to MANUAL_REVIEW_REQUIRED when declared documentType mismatches classification', async () => {
      const doc = createMockDocument({ documentType: 'LAND_TITLE_DEED' });
      docRepo.findOne.mockResolvedValue(doc);

      classificationService.classify.mockResolvedValueOnce({
        category: SupportedDocumentCategory.BUILDING_PLAN_APPROVAL,
        confidenceScore: 0.92,
        matchedKeywords: ['building plan'],
        isRecognized: true,
      });

      const report = await service.processDocument('doc-uuid-1', instUser);

      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
      );
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'CATEGORY_MISMATCH',
          isAdvisory: true,
        }),
      );
    });

    it('should transition to MANUAL_REVIEW_REQUIRED when critical statutory fields are missing', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      fieldExtractionService.extractFields.mockResolvedValueOnce({
        category: SupportedDocumentCategory.LAND_TITLE_DEED,
        extractedFields: { deedNumber: 'DEED/2024/7891' },
        findings: [],
        missingRequiredFields: ['leaseTenureYears', 'registrationDate'],
        extractionConfidence: 0.9,
      });

      const report = await service.processDocument('doc-uuid-1', instUser);

      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
      );
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_STATUTORY_FIELD',
          description: expect.stringContaining('leaseTenureYears'),
          isAdvisory: true,
        }),
      );
    });

    it('should transition to FAILED_OCR on engine failure without throwing unhandled exception', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      ocrProvider.extractTextAndTokens.mockRejectedValueOnce(
        new Error('OCR engine timeout: 10000ms exceeded'),
      );

      const report = await service.processDocument('doc-uuid-1', instUser);

      expect(report.processingStatus).toBe(DocumentProcessingStatus.FAILED_OCR);
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'FAILED_OCR',
          description: expect.stringContaining('OCR engine timeout'),
        }),
      );
      expect(docRepo.save).toHaveBeenCalled();
    });

    it('should return cached report when already extracted and forceReprocess is false', async () => {
      const existingReport = {
        documentId: 'doc-uuid-1',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        ocrConfidence: 0.96,
        extractedFields: { deedNumber: 'CACHED' },
        findings: [],
        anomalyFlags: [],
        processedAt: '2026-10-24T12:00:00Z',
      };

      const doc = createMockDocument({
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: { analysisReport: existingReport },
      });
      docRepo.findOne.mockResolvedValue(doc);

      const report = await service.processDocument('doc-uuid-1', instUser, {
        forceReprocess: false,
      });

      expect(report.extractedFields.deedNumber).toBe('CACHED');
      expect(ocrProvider.extractTextAndTokens).not.toHaveBeenCalled();
    });

    it('should enforce tenant isolation and reject processing across institutions with 403 Forbidden', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      await expect(
        service.processDocument('doc-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Scrutiny Officer to process documents across institutions', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      const report = await service.processDocument(
        'doc-uuid-1',
        scrutinyOfficer,
      );
      expect(report).toBeDefined();
      expect(report.documentId).toBe('doc-uuid-1');
    });

    it('should throw 404 NotFoundException when document does not exist', async () => {
      docRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processDocument('non-existent-uuid', instUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalysisReport()', () => {
    it('should return existing analysis report for owner institution', async () => {
      const existingReport = {
        documentId: 'doc-uuid-1',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        ocrConfidence: 0.94,
        extractedFields: { deedNumber: 'DEED/2024/7891' },
        findings: [],
        anomalyFlags: [],
        processedAt: '2026-10-24T12:00:00Z',
      };

      const doc = createMockDocument({
        metadata: { analysisReport: existingReport },
      });
      docRepo.findOne.mockResolvedValue(doc);

      const result = await service.getAnalysisReport('doc-uuid-1', instUser);
      expect(result.extractedFields.deedNumber).toBe('DEED/2024/7891');
    });

    it('should reject getAnalysisReport from other institution with 403 Forbidden', async () => {
      const doc = createMockDocument();
      docRepo.findOne.mockResolvedValue(doc);

      await expect(
        service.getAnalysisReport('doc-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
