/**
 * ApprovalSync — Verification Module
 * Milestone: DOC-03
 *
 * Configures the document completeness, field completeness, expiry date validation,
 * cross-record consistency matching, and validation orchestration services.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { Document } from '../database/entities/document.entity';
import { DocumentsModule } from '../documents/documents.module';
import { VerificationController } from './verification.controller';
import { DateProviderService } from './services/date-provider.service';
import { DocumentCompletenessService } from './services/document-completeness.service';
import { FieldCompletenessService } from './services/field-completeness.service';
import { DocumentExpiryService } from './services/document-expiry.service';
import { CrossRecordConsistencyService } from './services/cross-record-consistency.service';
import { NearDuplicateDetectionService } from './services/near-duplicate-detection.service';
import { DocumentDuplicateDetectionService } from './services/document-duplicate-detection.service';
import { DocumentIntegrityService } from './services/document-integrity.service';
import { ValidationOrchestratorService } from './services/validation-orchestrator.service';
import { DATE_PROVIDER_TOKEN } from './interfaces/date-provider.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Institution, Document]),
    ConfigModule,
    DocumentsModule,
  ],
  controllers: [VerificationController],
  providers: [
    DateProviderService,
    {
      provide: DATE_PROVIDER_TOKEN,
      useExisting: DateProviderService,
    },
    DocumentCompletenessService,
    FieldCompletenessService,
    DocumentExpiryService,
    CrossRecordConsistencyService,
    NearDuplicateDetectionService,
    DocumentDuplicateDetectionService,
    DocumentIntegrityService,
    ValidationOrchestratorService,
  ],
  exports: [
    ValidationOrchestratorService,
    DocumentCompletenessService,
    FieldCompletenessService,
    DocumentExpiryService,
    CrossRecordConsistencyService,
    NearDuplicateDetectionService,
    DocumentDuplicateDetectionService,
    DocumentIntegrityService,
    DATE_PROVIDER_TOKEN,
    DateProviderService,
  ],
})
export class VerificationModule {}
