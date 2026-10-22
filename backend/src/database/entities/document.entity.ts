/**
 * ApprovalSync — Document Entity
 * Milestone: BE-02
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentProcessingStatus } from '../../shared/contracts';
import { Application } from './application.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_documents_application_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Index('idx_documents_type')
  @Column({ name: 'document_type', type: 'varchar', length: 100 })
  documentType: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({ name: 'storage_path', type: 'varchar', length: 500 })
  storagePath: string;

  @Column({ name: 'file_hash_sha256', type: 'varchar', length: 64 })
  fileHashSha256: string;

  @Column({
    name: 'processing_status',
    type: 'enum',
    enum: DocumentProcessingStatus,
    default: DocumentProcessingStatus.UPLOADED,
  })
  processingStatus: DocumentProcessingStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
