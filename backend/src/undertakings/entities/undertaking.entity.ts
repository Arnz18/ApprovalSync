/**
 * ApprovalSync — Undertaking & Lease Record Entity
 * Milestone: BE-09
 *
 * Persists institutional undertakings, leases, covenants, validity periods,
 * renewal windows, and supersession links.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Institution } from '../../database/entities/institution.entity';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import { User } from '../../database/entities/user.entity';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from '../enums';
import { UndertakingHistory } from './undertaking-history.entity';

@Entity('undertakings')
export class Undertaking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_undertakings_institution_id')
  @Column({ name: 'institution_id', type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Index('idx_undertakings_application_id')
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId?: string | null;

  @ManyToOne(() => Application, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'application_id' })
  application?: Application | null;

  @Index('idx_undertakings_type')
  @Column({ type: 'varchar', length: 64 })
  type: UndertakingType;

  @Index('idx_undertakings_status')
  @Column({
    type: 'varchar',
    length: 32,
    default: UndertakingStatus.DRAFT,
  })
  status: UndertakingStatus;

  @Column({
    name: 'review_status',
    type: 'varchar',
    length: 32,
    default: UndertakingReviewStatus.PENDING_REVIEW,
  })
  reviewStatus: UndertakingReviewStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'document_number',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  documentNumber?: string | null;

  @Column({
    name: 'issuing_authority',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  issuingAuthority?: string | null;

  @Column({
    name: 'counterparty_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  counterpartyName?: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Index('idx_undertakings_expiry_date')
  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Index('idx_undertakings_renewal_due_date')
  @Column({ name: 'renewal_due_date', type: 'date' })
  renewalDueDate: string;

  @Column({ name: 'renewal_lead_days', type: 'int', default: 60 })
  renewalLeadDays: number;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId?: string | null;

  @ManyToOne(() => Document, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'document_id' })
  document?: Document | null;

  @Column({ name: 'superseded_by_id', type: 'uuid', nullable: true })
  supersededById?: string | null;

  @ManyToOne(() => Undertaking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'superseded_by_id' })
  supersededBy?: Undertaking | null;

  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId?: string | null;

  @ManyToOne(() => Undertaking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supersedes_id' })
  supersedes?: Undertaking | null;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string | null;

  @Column({ name: 'metadata_jsonb', type: 'jsonb', default: {} })
  metadataJsonb: Record<string, unknown>;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UndertakingHistory, (h) => h.undertaking)
  history: UndertakingHistory[];
}
