/**
 * ApprovalSync — Application Entity
 * Milestone: BE-02
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
import { ApplicationStatus } from '../../shared/contracts';
import { Institution } from './institution.entity';
import { Document } from './document.entity';
import { AuditLog } from './audit-log.entity';
import { SlaTimer } from './sla-timer.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_applications_app_number', { unique: true })
  @Column({
    name: 'application_number',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  applicationNumber: string;

  @Index('idx_applications_institution_id')
  @Column({ name: 'institution_id', type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, (institution) => institution.applications, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({ name: 'academic_year', type: 'varchar', length: 20 })
  academicYear: string;

  @Index('idx_applications_status')
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  status: ApplicationStatus;

  @Column({ name: 'program_type', type: 'varchar', length: 100 })
  programType: string;

  @Column({ name: 'payload_jsonb', type: 'jsonb', default: {} })
  payloadJsonb: Record<string, unknown>;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Document, (doc) => doc.application)
  documents: Document[];

  @OneToMany(() => AuditLog, (log) => log.application)
  auditLogs: AuditLog[];

  @OneToMany(() => SlaTimer, (timer) => timer.application)
  slaTimers: SlaTimer[];
}
