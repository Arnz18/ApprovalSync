/**
 * ApprovalSync — DocumentsService Unit Tests
 * Milestone: DOC-01
 */

import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { DocumentsService } from './documents.service';
import { Document } from '../database/entities/document.entity';
import { Application } from '../database/entities/application.entity';
import {
  UserRole,
  ApplicationStatus,
  DocumentProcessingStatus,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { IStorageAdapter } from './interfaces/storage-adapter.interface';
import { IMalwareScanner } from './interfaces/malware-scanner.interface';
import { FileValidatorService } from './security/file-validator.service';
import { UploadedFile } from './interfaces/file.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let storageAdapter: jest.Mocked<IStorageAdapter>;
  let malwareScanner: jest.Mocked<IMalwareScanner>;
  let fileValidator: FileValidatorService;

  const instUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'applicant@college-a.edu',
    name: 'Applicant A',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-college-a',
  };

  const otherInstUser: AuthUserPrincipal = {
    id: 'user-inst-2',
    email: 'applicant@college-b.edu',
    name: 'Applicant B',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-college-b',
  };

  const scrutinyOfficer: AuthUserPrincipal = {
    id: 'user-officer-1',
    email: 'scrutiny@aicte.gov.in',
    name: 'Scrutiny Officer',
    role: UserRole.SCRUTINY_OFFICER,
    institutionId: null,
  };

  const mockApplication: Application = {
    id: 'app-uuid-1',
    applicationNumber: 'APP-2026-DEMO-001',
    institutionId: 'inst-college-a',
    academicYear: '2026-2027',
    status: ApplicationStatus.DRAFT,
    programType: 'ENGINEERING',
    payloadJsonb: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: [],
    auditLogs: [],
    slaTimers: [],
    institution: { id: 'inst-college-a', name: 'College A' } as any,
  };

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

  const mockUploadedFile: UploadedFile = {
    fieldname: 'file',
    originalname: 'land_title_deed.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: validPdfBuffer.length,
    buffer: validPdfBuffer,
  };

  beforeEach(() => {
    documentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<Document>>;

    applicationRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Application>>;

    storageAdapter = {
      save: jest.fn(),
      getBuffer: jest.fn(),
      getStream: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    malwareScanner = {
      scan: jest.fn().mockResolvedValue({
        status: 'CLEAN',
        isThreat: false,
        engine: 'MockScanner',
        scannedAt: new Date().toISOString(),
      }),
    };

    fileValidator = new FileValidatorService();

    service = new DocumentsService(
      documentRepo,
      applicationRepo,
      storageAdapter,
      malwareScanner,
      fileValidator,
    );
  });

  describe('uploadDocument', () => {
    it('should successfully upload and persist a document for an authorized applicant', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApplication);
      storageAdapter.save.mockResolvedValue({
        storagePath: `documents/${mockApplication.id}/doc-1.pdf`,
        fileSizeBytes: validPdfBuffer.length,
        sha256Checksum: 'mock-sha256-hash',
      });

      const mockSavedDoc: Document = {
        id: 'doc-uuid-1',
        applicationId: mockApplication.id,
        application: mockApplication,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_title_deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: validPdfBuffer.length,
        storagePath: `documents/${mockApplication.id}/doc-1.pdf`,
        fileHashSha256: 'mock-sha256-hash',
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      documentRepo.create.mockReturnValue(mockSavedDoc);
      documentRepo.save.mockResolvedValue(mockSavedDoc);

      const result = await service.uploadDocument(
        mockApplication.id,
        instUser,
        mockUploadedFile,
        { documentType: 'LAND_TITLE_DEED' },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-uuid-1');
      expect(result.documentType).toBe('LAND_TITLE_DEED');
      expect(result.fileName).toBe('land_title_deed.pdf');
      expect(result.processingStatus).toBe(DocumentProcessingStatus.UPLOADED);
      // Ensure storagePath is NOT leaked in the returned contract
      expect((result as any).storagePath).toBeUndefined();
      expect(storageAdapter.save).toHaveBeenCalled();
      expect(documentRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.uploadDocument('non-existent-app', instUser, mockUploadedFile, {
          documentType: 'LAND_TITLE_DEED',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user belongs to a different institution', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApplication);

      await expect(
        service.uploadDocument(
          mockApplication.id,
          otherInstUser,
          mockUploadedFile,
          { documentType: 'LAND_TITLE_DEED' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if caller is a regulatory role (not institution user)', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApplication);

      await expect(
        service.uploadDocument(
          mockApplication.id,
          scrutinyOfficer,
          mockUploadedFile,
          { documentType: 'LAND_TITLE_DEED' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if application is in SUBMITTED status (locked)', async () => {
      const submittedApp = {
        ...mockApplication,
        status: ApplicationStatus.SUBMITTED,
      };
      applicationRepo.findOne.mockResolvedValue(submittedApp);

      await expect(
        service.uploadDocument(mockApplication.id, instUser, mockUploadedFile, {
          documentType: 'LAND_TITLE_DEED',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException and block upload if malware is detected', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApplication);
      malwareScanner.scan.mockResolvedValue({
        status: 'THREAT_DETECTED',
        isThreat: true,
        threatName: 'EICAR-Standard-AV-Test-File',
        engine: 'MockScanner',
        scannedAt: new Date().toISOString(),
      });

      await expect(
        service.uploadDocument(mockApplication.id, instUser, mockUploadedFile, {
          documentType: 'LAND_TITLE_DEED',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(storageAdapter.save).not.toHaveBeenCalled();
      expect(documentRepo.save).not.toHaveBeenCalled();
    });

    it('should clean up storage file if database save fails (atomic cleanup)', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApplication);
      storageAdapter.save.mockResolvedValue({
        storagePath: `documents/${mockApplication.id}/doc-1.pdf`,
        fileSizeBytes: validPdfBuffer.length,
        sha256Checksum: 'mock-sha256-hash',
      });
      documentRepo.create.mockReturnValue({} as any);
      documentRepo.save.mockRejectedValue(new Error('DB connection dropped'));

      await expect(
        service.uploadDocument(mockApplication.id, instUser, mockUploadedFile, {
          documentType: 'LAND_TITLE_DEED',
        }),
      ).rejects.toThrow(InternalServerErrorException);

      // Verify storage file was cleaned up so no orphan file remains on disk
      expect(storageAdapter.delete).toHaveBeenCalledWith(
        expect.stringContaining(`documents/${mockApplication.id}/`),
      );
    });
  });

  describe('getDocumentById', () => {
    const existingDoc: Document = {
      id: 'doc-uuid-1',
      applicationId: mockApplication.id,
      application: mockApplication,
      documentType: 'LAND_TITLE_DEED',
      fileName: 'land_title_deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
      storagePath: 'documents/app-1/doc-1.pdf',
      fileHashSha256: 'hash-1234',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should retrieve safe document metadata for owner institution', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);

      const result = await service.getDocumentById('doc-uuid-1', instUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-uuid-1');
      expect((result as any).storagePath).toBeUndefined();
    });

    it('should allow regulatory officers to view document metadata across institutions', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);

      const result = await service.getDocumentById(
        'doc-uuid-1',
        scrutinyOfficer,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-uuid-1');
    });

    it('should throw ForbiddenException if institution user attempts cross-tenant query', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);

      await expect(
        service.getDocumentById('doc-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if document does not exist', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDocumentById('missing-doc', instUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadDocument', () => {
    const existingDoc: Document = {
      id: 'doc-uuid-1',
      applicationId: mockApplication.id,
      application: mockApplication,
      documentType: 'LAND_TITLE_DEED',
      fileName: 'land_title_deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
      storagePath: 'documents/app-1/doc-1.pdf',
      fileHashSha256: 'hash-1234',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should stream document file for authorized caller', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);
      storageAdapter.exists.mockResolvedValue(true);
      const mockStream = new Readable({
        read() {
          this.push(validPdfBuffer);
          this.push(null);
        },
      });
      storageAdapter.getStream.mockResolvedValue(mockStream);

      const result = await service.downloadDocument('doc-uuid-1', instUser);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('land_title_deed.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.stream).toBeDefined();
    });

    it('should throw ForbiddenException for cross-institution download attempt', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);

      await expect(
        service.downloadDocument('doc-uuid-1', otherInstUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if stored file is missing from disk', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);
      storageAdapter.exists.mockResolvedValue(false);

      await expect(
        service.downloadDocument('doc-uuid-1', instUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    const existingDoc: Document = {
      id: 'doc-uuid-1',
      applicationId: mockApplication.id,
      application: mockApplication,
      documentType: 'LAND_TITLE_DEED',
      fileName: 'land_title_deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
      storagePath: 'documents/app-1/doc-1.pdf',
      fileHashSha256: 'hash-1234',
      processingStatus: DocumentProcessingStatus.UPLOADED,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete document and clean up storage for owner on draft application', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);
      documentRepo.remove.mockResolvedValue(existingDoc);
      storageAdapter.delete.mockResolvedValue();

      const result = await service.deleteDocument('doc-uuid-1', instUser);

      expect(result.success).toBe(true);
      expect(result.id).toBe('doc-uuid-1');
      expect(documentRepo.remove).toHaveBeenCalledWith(existingDoc);
      expect(storageAdapter.delete).toHaveBeenCalledWith(
        existingDoc.storagePath,
      );
    });

    it('should reject deletion if application is in SUBMITTED status', async () => {
      const submittedDoc = {
        ...existingDoc,
        application: {
          ...mockApplication,
          status: ApplicationStatus.SUBMITTED,
        },
      };
      documentRepo.findOne.mockResolvedValue(submittedDoc);

      await expect(
        service.deleteDocument('doc-uuid-1', instUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deletion by non-institution user', async () => {
      documentRepo.findOne.mockResolvedValue(existingDoc);

      await expect(
        service.deleteDocument('doc-uuid-1', scrutinyOfficer),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
