/**
 * ApprovalSync — Audit Log Entity (Tamper-Evident Hash Chained Ledger)
 * Milestone: BE-02
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../shared/contracts';
import { Application } from './application.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ name: 'sequence_number', type: 'bigint' })
  sequenceNumber: string;

  @Index('idx_audit_logs_application_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.auditLogs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'actor_id', type: 'varchar', length: 100 })
  actorId: string;

  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
  })
  actorRole: UserRole;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb', default: {} })
  payloadSnapshot: Record<string, unknown>;

  @Column({ name: 'previous_hash', type: 'varchar', length: 64 })
  previousHash: string;

  @Column({ name: 'leaf_hash', type: 'varchar', length: 64 })
  leafHash: string;

  @Index('idx_audit_logs_current_hash')
  @Column({ name: 'current_hash', type: 'varchar', length: 64 })
  currentHash: string;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;
}
