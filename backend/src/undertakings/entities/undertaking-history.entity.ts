/**
 * ApprovalSync — Undertaking History Entity
 * Milestone: BE-09
 *
 * Implements immutable domain-level history tracking for undertakings and lease records.
 * Retains complete state snapshots, status transitions, review notes, and supersession links.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../shared/contracts';
import { Undertaking } from './undertaking.entity';
import { UndertakingStatus, UndertakingReviewStatus } from '../enums';

@Entity('undertaking_history')
export class UndertakingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_undertaking_history_undertaking_id')
  @Column({ name: 'undertaking_id', type: 'uuid' })
  undertakingId: string;

  @ManyToOne(() => Undertaking, (u) => u.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'undertaking_id' })
  undertaking: Undertaking;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ name: 'from_status', type: 'varchar', length: 32, nullable: true })
  fromStatus?: UndertakingStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 32 })
  toStatus: UndertakingStatus;

  @Column({
    name: 'from_review_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  fromReviewStatus?: UndertakingReviewStatus | null;

  @Column({
    name: 'to_review_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  toReviewStatus?: UndertakingReviewStatus | null;

  @Column({ name: 'actor_id', type: 'varchar', length: 100 })
  actorId: string;

  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
  })
  actorRole: UserRole;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail?: string | null;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason?: string | null;

  @Column({ name: 'snapshot_jsonb', type: 'jsonb', default: {} })
  snapshotJsonb: Record<string, unknown>;

  @Index('idx_undertaking_history_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
