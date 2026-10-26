/**
 * ApprovalSync — Audit Checkpoint Entity
 * Milestone: BE-07
 *
 * Persists periodic and verified cryptographic checkpoints of an application's
 * audit ledger chain, binding sequence number, chain head hash, and RFC 6962 Merkle root.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Application } from '../../database/entities/application.entity';

@Entity('audit_checkpoints')
export class AuditCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_audit_checkpoints_app_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'sequence_number', type: 'bigint' })
  sequenceNumber: string;

  @Column({ name: 'chain_head_hash', type: 'varchar', length: 64 })
  chainHeadHash: string;

  @Column({ name: 'merkle_root_hash', type: 'varchar', length: 64 })
  merkleRootHash: string;

  @Column({ name: 'total_blocks', type: 'integer' })
  totalBlocks: number;

  @Column({
    name: 'algorithm',
    type: 'varchar',
    length: 50,
    default: 'RFC6962_SHA256',
  })
  algorithm: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
