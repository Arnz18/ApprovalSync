/**
 * ApprovalSync — Workflow Timeline Event Entity
 * Milestone: BE-06
 *
 * Persists deterministic audit timeline records for application state transitions.
 * Protected against cascading deletion to preserve compliance history.
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
import { ApplicationStatus, UserRole } from '../../shared/contracts';
import { Application } from '../../database/entities/application.entity';

@Entity('workflow_timeline_events')
export class WorkflowTimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_workflow_timeline_events_app_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.timelineEvents, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ApplicationStatus,
  })
  fromStatus: ApplicationStatus;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: ApplicationStatus,
  })
  toStatus: ApplicationStatus;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 100 })
  actorId: string;

  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: UserRole,
  })
  actorRole: UserRole;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string | null;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  correlationId?: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
