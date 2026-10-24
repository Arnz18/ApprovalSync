/**
 * ApprovalSync — AI Document Processor Service
 * Milestone: DOC-02
 *
 * Orchestrates document OCR extraction, automatic category classification,
 * structured regulatory field extraction, spatial evidence binding, and
 * confidence scoring with multi-tenant access control and advisory-only flag generation.
 */

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import { DocumentProcessingStatus, UserRole } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import {
  IStorageAdapter,
  STORAGE_ADAPTER_TOKEN,
} from '../../documents/interfaces/storage-adapter.interface';
import {
  IOcrProvider,
  OCR_PROVIDER_TOKEN,
} from '../interfaces/ocr-provider.interface';
import { DocumentClassificationService } from './document-classification.service';
import { FieldExtractionService } from './field-extraction.service';
import {
  AnomalyFlagDto,
  DocumentAnalysisResponseDto,
  ProcessDocumentDto,
} from '../dto';

@Injectable()
export class AiDocumentProcessorService {
  private readonly logger = new Logger(AiDocumentProcessorService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    @Inject(OCR_PROVIDER_TOKEN)
    private readonly ocrProvider: IOcrProvider,
    private readonly classificationService: DocumentClassificationService,
    private readonly fieldExtractionService: FieldExtractionService,
  ) {}

  /**
   * Processes an uploaded document through the OCR extraction and classification pipeline.
   */
  async processDocument(
    documentId: string,
    currentUser: AuthUserPrincipal,
    options?: ProcessDocumentDto,
  ): Promise<DocumentAnalysisResponseDto> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    // 1. Return cached results if already extracted and forceReprocess is not set
    if (
      !options?.forceReprocess &&
      document.processingStatus === DocumentProcessingStatus.OCR_EXTRACTED &&
      document.metadata?.analysisReport
    ) {
      this.logger.debug(
        `Returning existing analysis report for document ${documentId}`,
      );
      return document.metadata.analysisReport as DocumentAnalysisResponseDto;
    }

    // 2. Mark document as actively processing OCR
    document.processingStatus = DocumentProcessingStatus.PROCESSING_OCR;
    await this.documentRepository.save(document);

    // 3. Load document binary from private storage
    let fileBuffer: Buffer;
    try {
      fileBuffer = await this.storageAdapter.getBuffer(document.storagePath);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to retrieve document binary from storage: ${(err as Error).message}`,
      );
      return this.handleProcessingFailure(
        document,
        'ERR_FILE_NOT_FOUND',
        'Document file could not be read from secure storage.',
      );
    }

    // 4. Execute OCR text and spatial token extraction
    let ocrResult;
    try {
      ocrResult = await this.ocrProvider.extractTextAndTokens(
        fileBuffer,
        document.mimeType,
        {
          simulateTimeout: options?.simulateTimeout,
          simulateLowConfidence: options?.simulateLowConfidence,
          simulateCorruptedFile: options?.simulateCorruptedFile,
        },
      );
    } catch (err: unknown) {
      this.logger.error(
        `OCR extraction failed for document ${documentId}: ${(err as Error).message}`,
      );
      return this.handleProcessingFailure(
        document,
        'FAILED_OCR',
        (err as Error).message,
      );
    }

    // 5. Automatic document category classification
    const classification = await this.classificationService.classify(
      ocrResult.rawText,
      ocrResult.tokens,
    );

    // 6. Structured domain field extraction & spatial evidence binding
    const fieldResult = await this.fieldExtractionService.extractFields(
      classification.category,
      ocrResult,
    );

    // 7. Evaluate anomaly flags and confidence thresholds (ADR-004)
    const anomalyFlags: AnomalyFlagDto[] = [];

    // Flag low OCR confidence (< 0.85 per data-contracts.md)
    if (ocrResult.confidenceScore < 0.85) {
      anomalyFlags.push({
        code: 'LOW_OCR_CONFIDENCE',
        description: `Overall OCR extraction confidence (${(ocrResult.confidenceScore * 100).toFixed(1)}%) is below the statutory benchmark of 85%. Manual scrutiny required.`,
        isAdvisory: true,
      });
    }

    // Flag document category discrepancy if classified and recognized
    if (
      classification.isRecognized &&
      document.documentType !== classification.category
    ) {
      anomalyFlags.push({
        code: 'CATEGORY_MISMATCH',
        description: `Declared document type '${document.documentType}' differs from AI classified type '${classification.category}'.`,
        isAdvisory: true,
      });
    }

    // Flag missing required statutory fields for category
    if (fieldResult.missingRequiredFields.length > 0) {
      anomalyFlags.push({
        code: 'MISSING_STATUTORY_FIELD',
        description: `One or more required fields could not be extracted with high confidence: ${fieldResult.missingRequiredFields.join(', ')}.`,
        isAdvisory: true,
      });
    }

    // Flag unknown or unrecognized document categories
    if (!classification.isRecognized) {
      anomalyFlags.push({
        code: 'UNRECOGNIZED_DOCUMENT_TYPE',
        description:
          'Document structure or keywords do not match any recognized AICTE regulatory document schema.',
        isAdvisory: true,
      });
    }

    // 8. Determine final processing status
    const finalStatus =
      anomalyFlags.length > 0
        ? DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED
        : DocumentProcessingStatus.OCR_EXTRACTED;

    const processedAt = new Date().toISOString();

    const analysisReport: DocumentAnalysisResponseDto = {
      documentId: document.id,
      processingStatus: finalStatus,
      ocrConfidence: ocrResult.confidenceScore,
      extractedFields: fieldResult.extractedFields,
      findings: fieldResult.findings,
      anomalyFlags,
      classification: {
        category: classification.category,
        confidence: classification.confidenceScore,
        isRecognized: classification.isRecognized,
      },
      processedAt,
    };

    // 9. Persist analysis report in document metadata and update status
    document.processingStatus = finalStatus;
    document.metadata = {
      ...document.metadata,
      analysisReport,
      ocrClassification: classification.category,
      ocrConfidence: ocrResult.confidenceScore,
      processedAt,
    };

    await this.documentRepository.save(document);

    this.logger.log(
      `Document ${documentId} processed successfully: status=${finalStatus}, category=${classification.category}, confidence=${ocrResult.confidenceScore}`,
    );

    return analysisReport;
  }

  /**
   * Retrieves the analysis report and spatial evidence for a document.
   */
  async getAnalysisReport(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<DocumentAnalysisResponseDto> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    if (document.metadata?.analysisReport) {
      return document.metadata.analysisReport as DocumentAnalysisResponseDto;
    }

    return {
      documentId: document.id,
      processingStatus: document.processingStatus,
      ocrConfidence: 0.0,
      extractedFields: {},
      findings: [],
      anomalyFlags: [],
      processedAt: document.createdAt.toISOString(),
    };
  }

  /**
   * Direct text classification utility.
   */
  async classifyText(rawText: string) {
    return this.classificationService.classify(rawText);
  }

  /**
   * Helper: handles processing failure and persists failed state.
   */
  private async handleProcessingFailure(
    document: Document,
    errorCode: string,
    errorMessage: string,
  ): Promise<DocumentAnalysisResponseDto> {
    const processedAt = new Date().toISOString();
    const finalStatus = DocumentProcessingStatus.FAILED_OCR;

    const failureReport: DocumentAnalysisResponseDto = {
      documentId: document.id,
      processingStatus: finalStatus,
      ocrConfidence: 0.0,
      extractedFields: {},
      findings: [],
      anomalyFlags: [
        {
          code: errorCode,
          description: `Document processing failed: ${errorMessage}`,
          isAdvisory: true,
        },
      ],
      processedAt,
    };

    document.processingStatus = finalStatus;
    document.metadata = {
      ...document.metadata,
      analysisReport: failureReport,
      processingError: {
        code: errorCode,
        message: errorMessage,
        failedAt: processedAt,
      },
    };

    await this.documentRepository.save(document);

    return failureReport;
  }

  /**
   * Helper: finds document and enforces tenancy and role authorization.
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
            'Access denied: tenancy mismatch. You cannot process documents belonging to another institution.',
        });
      }
    }

    return document;
  }
}
