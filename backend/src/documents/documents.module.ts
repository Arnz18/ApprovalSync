/**
 * ApprovalSync — Documents Module
 * Milestone: DOC-01
 *
 * Configures the document intake and storage subsystem with swappable
 * storage adapter and malware scanner seams.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../database/entities/document.entity';
import { Application } from '../database/entities/application.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { FileValidatorService } from './security/file-validator.service';
import { MalwareScannerAdapter } from './security/malware-scanner.adapter';
import { LocalStorageAdapter } from './storage/local-storage.adapter';
import { STORAGE_ADAPTER_TOKEN } from './interfaces/storage-adapter.interface';
import { MALWARE_SCANNER_TOKEN } from './interfaces/malware-scanner.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Application]), ConfigModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    FileValidatorService,
    {
      provide: STORAGE_ADAPTER_TOKEN,
      useClass: LocalStorageAdapter,
    },
    {
      provide: MALWARE_SCANNER_TOKEN,
      useClass: MalwareScannerAdapter,
    },
  ],
  exports: [
    DocumentsService,
    FileValidatorService,
    STORAGE_ADAPTER_TOKEN,
    MALWARE_SCANNER_TOKEN,
  ],
})
export class DocumentsModule {}
