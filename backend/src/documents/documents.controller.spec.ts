/**
 * ApprovalSync — DocumentsController Unit Tests
 * Milestone: DOC-01
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import {
  UserRole,
  DocumentProcessingStatus,
  DocumentMetadata,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UploadedFile } from './interfaces/file.interface';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: jest.Mocked<DocumentsService>;

  const mockUser: AuthUserPrincipal = {
    id: 'user-inst-1',
    email: 'user@college.edu',
    name: 'College User',
    role: UserRole.INSTITUTION_USER,
    institutionId: 'inst-1',
  };

  const mockMetadata: DocumentMetadata = {
    id: 'doc-uuid-1',
    applicationId: 'app-uuid-1',
    documentType: 'LAND_TITLE_DEED',
    fileName: 'land_deed.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    sha256Checksum: 'abcdef1234567890',
    processingStatus: DocumentProcessingStatus.UPLOADED,
    uploadedAt: new Date().toISOString(),
  };

  const mockFile: UploadedFile = {
    fieldname: 'file',
    originalname: 'land_deed.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4\ntest'),
  };

  beforeEach(async () => {
    service = {
      uploadDocument: jest.fn(),
      getDocumentById: jest.fn(),
      downloadDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getDocumentsForApplication: jest.fn(),
      toMetadataProjection: jest.fn(),
    } as unknown as jest.Mocked<DocumentsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should upload application document successfully', async () => {
    service.uploadDocument.mockResolvedValue(mockMetadata);

    const result = await controller.uploadApplicationDocument(
      'app-uuid-1',
      mockUser,
      mockFile,
      { documentType: 'LAND_TITLE_DEED' },
    );

    expect(result).toBe(mockMetadata);
    expect(service.uploadDocument).toHaveBeenCalledWith(
      'app-uuid-1',
      mockUser,
      mockFile,
      { documentType: 'LAND_TITLE_DEED' },
    );
  });

  it('should throw BadRequestException if file is omitted in upload request', async () => {
    await expect(
      controller.uploadApplicationDocument(
        'app-uuid-1',
        mockUser,
        undefined as any,
        { documentType: 'LAND_TITLE_DEED' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should retrieve document metadata by ID', async () => {
    service.getDocumentById.mockResolvedValue(mockMetadata);

    const result = await controller.getDocumentMetadata('doc-uuid-1', mockUser);

    expect(result).toBe(mockMetadata);
    expect(service.getDocumentById).toHaveBeenCalledWith(
      'doc-uuid-1',
      mockUser,
    );
  });

  it('should download document file and pipe stream to response with secure headers', async () => {
    const mockStream = new Readable({
      read() {
        this.push(Buffer.from('test'));
        this.push(null);
      },
    });

    service.downloadDocument.mockResolvedValue({
      stream: mockStream,
      fileName: 'land_deed.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      sha256Checksum: 'hash-1234',
    });

    const mockRes = {
      set: jest.fn(),
    } as unknown as Response;

    const pipeSpy = jest
      .spyOn(mockStream, 'pipe')
      .mockImplementation(() => mockRes as any);

    await controller.downloadDocument('doc-uuid-1', mockUser, mockRes);

    expect(service.downloadDocument).toHaveBeenCalledWith(
      'doc-uuid-1',
      mockUser,
    );
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="land_deed.pdf"',
        'Content-Length': 1024,
        'X-Content-Type-Options': 'nosniff',
      }),
    );
    expect(pipeSpy).toHaveBeenCalledWith(mockRes);
  });

  it('should delete document attachment', async () => {
    service.deleteDocument.mockResolvedValue({
      success: true,
      id: 'doc-uuid-1',
    });

    const result = await controller.deleteDocument('doc-uuid-1', mockUser);

    expect(result).toEqual({ success: true, id: 'doc-uuid-1' });
    expect(service.deleteDocument).toHaveBeenCalledWith('doc-uuid-1', mockUser);
  });
});
