/**
 * ApprovalSync — AI & Document Processing Module
 * Milestone: DOC-02
 *
 * Configures the document-AI pipeline, OCR provider adapter seams,
 * classification, field extraction, and evidence-linking services.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../database/entities/document.entity';
import { Application } from '../database/entities/application.entity';
import { DocumentsModule } from '../documents/documents.module';
import { AiController } from './ai.controller';
import { DocumentClassificationService } from './services/document-classification.service';
import { FieldExtractionService } from './services/field-extraction.service';
import { AiDocumentProcessorService } from './services/ai-document-processor.service';
import { DeterministicOcrAdapter } from './adapters/deterministic-ocr.adapter';
import { TesseractOcrAdapter } from './adapters/tesseract-ocr.adapter';
import { GoogleDocAiAdapter } from './adapters/google-docai.adapter';
import { OCR_PROVIDER_TOKEN } from './interfaces/ocr-provider.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Application]),
    ConfigModule,
    DocumentsModule,
  ],
  controllers: [AiController],
  providers: [
    DocumentClassificationService,
    FieldExtractionService,
    DeterministicOcrAdapter,
    TesseractOcrAdapter,
    GoogleDocAiAdapter,
    {
      provide: OCR_PROVIDER_TOKEN,
      useClass: DeterministicOcrAdapter,
    },
    AiDocumentProcessorService,
  ],
  exports: [
    AiDocumentProcessorService,
    DocumentClassificationService,
    FieldExtractionService,
    OCR_PROVIDER_TOKEN,
  ],
})
export class AiModule {}
