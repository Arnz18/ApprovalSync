/**
 * ApprovalSync — Document Management Service
 * Milestone: DOC-01
 *
 * Implements secure document upload, tenant-isolated retrieval, safe streaming downloads,
 * defensive cleanup on storage/DB failure, and server-controlled key generation.
 */

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Readable } from 'stream';
import { Document } from '../database/entities/document.entity';
import { Application } from '../database/entities/application.entity';
import {
  UserRole,
  ApplicationStatus,
  DocumentProcessingStatus,
  DocumentMetadata,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import {
  IStorageAdapter,
  STORAGE_ADAPTER_TOKEN,
} from './interfaces/storage-adapter.interface';
import {
  IMalwareScanner,
  MALWARE_SCANNER_TOKEN,
} from './interfaces/malware-scanner.interface';
import { UploadedFile } from './interfaces/file.interface';
import { FileValidatorService } from './security/file-validator.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

const EDITABLE_APPLICATION_STATUSES = new Set([
  ApplicationStatus.DRAFT,
  ApplicationStatus.DEFICIENCY_ISSUED,
]);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    @Inject(MALWARE_SCANNER_TOKEN)
    private readonly malwareScanner: IMalwareScanner,
    private readonly fileValidator: FileValidatorService,
  ) {}

  /**
   * Upload and persist an application attachment with end-to-end security checks.
   */
  async uploadDocument(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    file: UploadedFile,
    uploadDto: UploadDocumentDto,
  ): Promise<DocumentMetadata> {
    // 1. Verify application existence
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Application with ID '${applicationId}' was not found.`,
      });
    }

    // 2. Enforce tenancy: INSTITUTION_USER can only upload to their own institution's application
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot upload documents to another institution application.',
        });
      }
    } else {
      // Regulatory and audit roles are observers; uploads are restricted to institution applicants
      throw new ForbiddenException({
        code: 'ERR_FORBIDDEN',
        message:
          'Access denied: only institution users can upload application documents.',
      });
    }

    // 3. Verify application lifecycle status allows document modification
    if (!EDITABLE_APPLICATION_STATUSES.has(application.status)) {
      throw new BadRequestException({
        code: 'ERR_APPLICATION_LOCKED',
        message: `Cannot upload documents: application is in '${application.status}' status. Document upload is restricted to draft and deficiency response stages.`,
      });
    }

    // 4. File binary signature, magic bytes, extension, and size validation
    const validated = this.fileValidator.validate(file);

    // 5. Malware scanning adapter check
    const scanResult = await this.malwareScanner.scan(
      validated.buffer,
      validated.sanitizedFileName,
    );

    if (scanResult.isThreat) {
      this.logger.warn(
        `Upload blocked by malware scanner: threat '${scanResult.threatName}' detected in '${validated.sanitizedFileName}' for application ${applicationId}`,
      );
      throw new BadRequestException({
        code: 'ERR_MALWARE_DETECTED',
        message: `Upload rejected: file failed security scan (${scanResult.threatName || 'threat detected'}).`,
      });
    }

    // 6. Generate server-controlled document identifier and storage key
    const documentId = uuidv4();
    const extension = path.extname(validated.sanitizedFileName);
    const storageKey = `documents/${application.id}/${documentId}${extension}`;

    // 7. Store file privately behind storage adapter
    let storageSaveResult;
    try {
      storageSaveResult = await this.storageAdapter.save(
        storageKey,
        validated.buffer,
        validated.mimeType,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Storage adapter failed to save document key '${storageKey}': ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException({
        code: 'ERR_STORAGE_FAILURE',
        message: 'Failed to write document to secure storage.',
      });
    }

    // 8. Persist document metadata in database with atomic cleanup on failure
    try {
      const documentEntity = this.documentRepository.create({
        id: documentId,
        applicationId: application.id,
        documentType: uploadDto.documentType,
        fileName: validated.sanitizedFileName,
        mimeType: validated.mimeType,
        fileSizeBytes: validated.fileSizeBytes,
        storagePath: storageSaveResult.storagePath,
        fileHashSha256: validated.sha256Checksum,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {
          originalName: file.originalname,
          description: uploadDto.description,
          malwareScan: {
            status: scanResult.status,
            engine: scanResult.engine,
            scannedAt: scanResult.scannedAt,
            details: scanResult.details,
          },
        },
      });

      const saved = await this.documentRepository.save(documentEntity);

      this.logger.log(
        `Document ${saved.id} (${saved.documentType}) uploaded successfully for application ${application.id}`,
      );

      return this.toMetadataProjection(saved);
    } catch (dbErr: unknown) {
      // Defensive cleanup: delete stored file so no orphan file remains on disk
      this.logger.error(
        `Database persistence failed for document '${documentId}'. Rolling back storage file '${storageKey}'...`,
        (dbErr as Error).stack,
      );

      try {
        await this.storageAdapter.delete(storageKey);
      } catch (cleanupErr: unknown) {
        this.logger.error(
          `Failed to clean up storage file '${storageKey}' after DB error: ${(cleanupErr as Error).message}`,
        );
      }

      throw new InternalServerErrorException({
        code: 'ERR_DATABASE_ERROR',
        message: 'Failed to record document metadata in database.',
      });
    }
  }

  /**
   * Retrieves safe metadata for a specific document with tenant isolation.
   */
  async getDocumentById(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<DocumentMetadata> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );
    return this.toMetadataProjection(document);
  }

  /**
   * Retrieves all document attachments metadata for an application with tenant verification.
   */
  async getDocumentsForApplication(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<DocumentMetadata[]> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Application with ID '${applicationId}' was not found.`,
      });
    }

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (application.institutionId !== currentUser.institutionId) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot access documents for another institution.',
        });
      }
    }

    const documents = await this.documentRepository.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });

    return documents.map((doc) => this.toMetadataProjection(doc));
  }

  /**
   * Streams a document file for download with tenant verification and safe headers.
   */
  async downloadDocument(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<{
    stream: Readable;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    sha256Checksum: string;
  }> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    const exists = await this.storageAdapter.exists(document.storagePath);
    if (!exists) {
      this.logger.error(
        `Document record ${document.id} references non-existent storage path: ${document.storagePath}`,
      );
      throw new NotFoundException({
        code: 'ERR_FILE_NOT_FOUND',
        message: 'The requested document file does not exist in storage.',
      });
    }

    const stream = await this.storageAdapter.getStream(document.storagePath);

    return {
      stream,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSizeBytes: Number(document.fileSizeBytes),
      sha256Checksum: document.fileHashSha256,
    };
  }

  /**
   * Delete an uploaded document attachment.
   * Restricted to INSTITUTION_USER on draft/deficiency applications.
   */
  async deleteDocument(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<{ success: boolean; id: string }> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    if (currentUser.role !== UserRole.INSTITUTION_USER) {
      throw new ForbiddenException({
        code: 'ERR_FORBIDDEN',
        message:
          'Only institution users may delete draft document attachments.',
      });
    }

    if (!EDITABLE_APPLICATION_STATUSES.has(document.application.status)) {
      throw new BadRequestException({
        code: 'ERR_APPLICATION_LOCKED',
        message: `Cannot delete document: application is in '${document.application.status}' status.`,
      });
    }

    // Delete record from database
    await this.documentRepository.remove(document);

    // Delete file from storage adapter
    await this.storageAdapter.delete(document.storagePath);

    this.logger.log(
      `Document ${documentId} deleted by user ${currentUser.id} from application ${document.applicationId}`,
    );

    return {
      success: true,
      id: documentId,
    };
  }

  /**
   * Helper: finds document and enforces tenant isolation.
   */
  private async findAndAuthorizeDocument(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['application'],
    });

    if (!document) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Document with ID '${documentId}' was not found.`,
      });
    }

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !document.application ||
        document.application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot access documents belonging to another institution.',
        });
      }
    }

    return document;
  }

  /**
   * Maps a Document entity to safe public DocumentMetadata contract.
   * Never leaks internal storagePath.
   */
  toMetadataProjection(document: Document): DocumentMetadata {
    return {
      id: document.id,
      applicationId: document.applicationId,
      documentType: document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSizeBytes: Number(document.fileSizeBytes),
      sha256Checksum: document.fileHashSha256,
      processingStatus: document.processingStatus,
      uploadedAt:
        document.createdAt instanceof Date
          ? document.createdAt.toISOString()
          : String(document.createdAt),
    };
  }
}
