/**
 * ApprovalSync — Document Integrity & Tamper Anomaly Service Tests
 * Milestone: DOC-04
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentIntegrityService } from './document-integrity.service';
import { Document } from '../../database/entities/document.entity';
import { STORAGE_ADAPTER_TOKEN } from '../../documents/interfaces/storage-adapter.interface';
import { ComplianceSeverity } from '../../shared/contracts';
import { ValidationOutcome } from '../enums';

describe('DocumentIntegrityService', () => {
  let service: DocumentIntegrityService;
  let mockStorageAdapter: any;

  beforeEach(async () => {
    mockStorageAdapter = {
      getBuffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentIntegrityService,
        {
          provide: STORAGE_ADAPTER_TOKEN,
          useValue: mockStorageAdapter,
        },
      ],
    }).compile();

    service = module.get<DocumentIntegrityService>(DocumentIntegrityService);
  });

  describe('PDF Structural Validity', () => {
    it('should pass cleanly for a valid, static PDF document', async () => {
      const validPdfBuffer = Buffer.from(
        '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(validPdfBuffer);

      const doc = {
        id: 'doc-valid-pdf',
        fileName: 'statutory_noc.pdf',
        mimeType: 'application/pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        storagePath: 'documents/app-1/statutory_noc.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      expect(result.overallStatus).toBe('PASS');
      const cleanFinding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-CLEAN',
      );
      expect(cleanFinding).toBeDefined();
      expect(cleanFinding?.outcome).toBe(ValidationOutcome.NO_ANOMALY_DETECTED);
      expect(cleanFinding?.severity).toBe(ComplianceSeverity.COMPLIANT);
      expect(cleanFinding?.isAdvisory).toBe(true);
    });

    it('should flag critical deficiency when PDF header is missing or corrupted', async () => {
      const corruptHeaderBuffer = Buffer.from('NOT-A-PDF-FILE\n1 0 obj\n%%EOF');
      mockStorageAdapter.getBuffer.mockResolvedValue(corruptHeaderBuffer);

      const doc = {
        id: 'doc-bad-header',
        fileName: 'corrupt_doc.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/corrupt_doc.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      expect(result.overallStatus).toBe('FAIL');
      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-PDF-INVALID-HEADER',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    });

    it('should flag truncated PDF when %%EOF trailer is absent', async () => {
      const truncatedBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nstream incomplete data',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(truncatedBuffer);

      const doc = {
        id: 'doc-truncated',
        fileName: 'truncated.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/truncated.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-PDF-TRUNCATED',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    });
  });

  describe('Active Content & Script Detection', () => {
    it('should detect and flag embedded JavaScript action in PDF', async () => {
      const activeContentBuffer = Buffer.from(
        '%PDF-1.6\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("malicious script");) >>\nendobj\n%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(activeContentBuffer);

      const doc = {
        id: 'doc-js',
        fileName: 'script_payload.pdf',
        mimeType: 'application/pdf',
        documentType: 'BUILDING_PLAN_APPROVAL',
        storagePath: 'documents/app-1/script_payload.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      expect(result.overallStatus).toBe('FAIL');
      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-PDF-ACTIVE-CONTENT',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
      expect(finding?.message).toContain('JavaScript');
    });

    it('should detect and flag /Launch action in PDF', async () => {
      const launchBuffer = Buffer.from(
        '%PDF-1.5\n<< /Launch << /F (cmd.exe) >> >>\n%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(launchBuffer);

      const doc = {
        id: 'doc-launch',
        fileName: 'launch_cmd.pdf',
        mimeType: 'application/pdf',
        documentType: 'BUILDING_PLAN_APPROVAL',
        storagePath: 'documents/app-1/launch_cmd.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-PDF-ACTIVE-CONTENT',
      );
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('launch action');
    });
  });

  describe('Metadata Timeline Inversion & Future Dates', () => {
    it('should flag timeline inversion when ModDate precedes CreationDate', async () => {
      // Creation: 2024-05-10, ModDate: 2020-01-01
      const invertedTimelineBuffer = Buffer.from(
        '%PDF-1.4\n' +
          '/CreationDate (D:20240510120000Z)\n' +
          '/ModDate (D:20200101120000Z)\n' +
          '%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(invertedTimelineBuffer);

      const doc = {
        id: 'doc-inverted-time',
        fileName: 'timeline_anomaly.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/timeline_anomaly.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-METADATA-TIMELINE-INVERSION',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should flag creation date in the distant future', async () => {
      const futureDateBuffer = Buffer.from(
        '%PDF-1.4\n/CreationDate (D:20991231235959Z)\n%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(futureDateBuffer);

      const doc = {
        id: 'doc-future-date',
        fileName: 'future_stamp.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/future_stamp.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-METADATA-FUTURE-DATE',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
    });
  });

  describe('Digital Signature Detection & Trust Seam', () => {
    it('should detect digital signature dictionary and report CCA trust store unconfigured in local runtime', async () => {
      const signedPdfBuffer = Buffer.from(
        '%PDF-1.7\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [0 100 200 300] >>\n%%EOF',
      );
      mockStorageAdapter.getBuffer.mockResolvedValue(signedPdfBuffer);

      const doc = {
        id: 'doc-signed-pdf',
        fileName: 'digitally_signed_deed.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/digitally_signed_deed.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const sigFinding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-DIGITAL-SIGNATURE',
      );
      expect(sigFinding).toBeDefined();
      expect(sigFinding?.outcome).toBe(ValidationOutcome.SOURCE_UNAVAILABLE);
      expect(sigFinding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(sigFinding?.message).toContain('national CCA trust store');
      expect(sigFinding?.metadata?.trustStoreConfigured).toBe(false);
    });
  });

  describe('Image Integrity & Editing Software Heuristics', () => {
    it('should detect Adobe Photoshop metadata tag in image certificate', async () => {
      const photoshopJpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe1]), // JPEG SOI + APP1
        Buffer.from('Photoshop 3.0 8BIM Adobe Photoshop 2024'),
        Buffer.from([0xff, 0xd9]), // JPEG EOI
      ]);
      mockStorageAdapter.getBuffer.mockResolvedValue(photoshopJpeg);

      const doc = {
        id: 'doc-ps-image',
        fileName: 'edited_certificate.jpg',
        mimeType: 'image/jpeg',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        storagePath: 'documents/app-1/edited_certificate.jpg',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-IMAGE-EDITING-TOOL',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(finding?.message).toContain('Adobe Photoshop');
    });

    it('should flag corrupted image with truncated trailer', async () => {
      const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]); // Missing 0xFF, 0xD9
      mockStorageAdapter.getBuffer.mockResolvedValue(truncatedJpeg);

      const doc = {
        id: 'doc-bad-jpeg',
        fileName: 'broken.jpg',
        mimeType: 'image/jpeg',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/broken.jpg',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-IMAGE-CORRUPT',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    });
  });

  describe('OCR Extraction Discrepancy & Storage Errors', () => {
    it('should flag date order inversion when extracted issue date is after expiry date', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF');
      mockStorageAdapter.getBuffer.mockResolvedValue(validPdfBuffer);

      const doc = {
        id: 'doc-inverted-dates',
        fileName: 'noc.pdf',
        mimeType: 'application/pdf',
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        storagePath: 'documents/app-1/noc.pdf',
        metadata: {
          analysisReport: {
            extractedFields: {
              issueDate: '2027-01-01',
              expiryDate: '2024-01-01',
            },
          },
        },
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-DATE-ORDER-INVERSION',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(finding?.severity).toBe(ComplianceSeverity.CRITICAL_DEFICIENCY);
    });

    it('should report SOURCE_UNAVAILABLE when storage adapter fails to read document', async () => {
      mockStorageAdapter.getBuffer.mockRejectedValue(
        new Error('Disk I/O error'),
      );

      const doc = {
        id: 'doc-unreadable',
        fileName: 'unreadable.pdf',
        mimeType: 'application/pdf',
        documentType: 'LAND_TITLE_DEED',
        storagePath: 'documents/app-1/unreadable.pdf',
      } as unknown as Document;

      const result = await service.evaluateDocumentIntegrity(doc);

      expect(result.overallStatus).toBe('UNAVAILABLE');
      const finding = result.findings.find(
        (f) => f.ruleId === 'DOC-INT-STORAGE-UNAVAILABLE',
      );
      expect(finding).toBeDefined();
      expect(finding?.outcome).toBe(ValidationOutcome.SOURCE_UNAVAILABLE);
    });
  });
});
