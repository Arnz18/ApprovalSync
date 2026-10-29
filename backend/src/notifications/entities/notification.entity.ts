/**
 * ApprovalSync — Notification Entity
 * Milestone: AICTE-26262 (Alert & Notification Management)
 *
 * Implements persisted in-app notifications, deadline reminders, SLA escalation alerts,
 * read/unread tracking, and tenant isolation for institutions.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../shared/contracts';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationSeverity } from '../enums/notification-severity.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_notifications_user_id')
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Index('idx_notifications_target_role')
  @Column({
    name: 'target_role',
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  targetRole?: UserRole | null;

  @Index('idx_notifications_institution_id')
  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId?: string | null;

  @Index('idx_notifications_application_id')
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId?: string | null;

  @Index('idx_notifications_undertaking_id')
  @Column({ name: 'undertaking_id', type: 'uuid', nullable: true })
  undertakingId?: string | null;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 50,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column({
    name: 'severity',
    type: 'varchar',
    length: 20,
    default: NotificationSeverity.INFO,
  })
  severity: NotificationSeverity;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'link', type: 'varchar', length: 255, nullable: true })
  link?: string | null;

  @Index('idx_notifications_is_read')
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @Index('idx_notifications_idempotency_key', { unique: true })
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  idempotencyKey?: string | null;

  @Column({ name: 'metadata_jsonb', type: 'jsonb', default: {} })
  metadataJsonb: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

