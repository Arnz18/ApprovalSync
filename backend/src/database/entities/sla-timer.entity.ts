/**
 * ApprovalSync — SLA Timer Entity
 * Milestone: BE-02 (Initial Schema), BE-08 (Durable SLA Timers & Escalations)
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
import { ApplicationStatus, SlaTier } from '../../shared/contracts';
import { Application } from './application.entity';
import { SlaTimerStatus } from '../../sla/enums/sla-timer-status.enum';
import { SlaEscalation } from '../../sla/entities/sla-escalation.entity';

@Entity('sla_timers')
export class SlaTimer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_sla_timers_application_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.slaTimers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    enumName: 'application_status_enum',
  })
  stage: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: SlaTier,
    enumName: 'sla_tier_enum',
  })
  tier: SlaTier;

  @Index('idx_sla_timers_status')
  @Column({
    type: 'varchar',
    length: 32,
    default: SlaTimerStatus.ACTIVE,
  })
  status: SlaTimerStatus;

  @Column({
    name: 'policy_id',
    type: 'varchar',
    length: 64,
    default: 'ILLUSTRATIVE_SCRUTINY_POLICY',
  })
  policyId: string;

  @Column({
    name: 'started_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt: Date;

  @Index('idx_sla_timers_target_deadline')
  @Column({ name: 'target_deadline', type: 'timestamptz' })
  targetDeadline: Date;

  @Column({ name: 'warning_deadline', type: 'timestamptz', nullable: true })
  warningDeadline?: Date | null;

  @Column({ name: 'is_warning_sent', type: 'boolean', default: false })
  isWarningSent: boolean;

  @Index('idx_sla_timers_is_breached')
  @Column({ name: 'is_breached', type: 'boolean', default: false })
  isBreached: boolean;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt?: Date | null;

  @Column({ name: 'paused_at', type: 'timestamptz', nullable: true })
  pausedAt?: Date | null;

  @Column({ name: 'resumed_at', type: 'timestamptz', nullable: true })
  resumedAt?: Date | null;

  @Column({
    name: 'total_paused_ms',
    type: 'bigint',
    default: '0',
    transformer: {
      to: (value: number) =>
        value !== undefined && value !== null ? value.toString() : '0',
      from: (value: string | number) => Number(value || 0),
    },
  })
  totalPausedMs: number;

  @Column({ name: 'pause_reason', type: 'text', nullable: true })
  pauseReason?: string | null;

  @Column({ name: 'paused_by_id', type: 'uuid', nullable: true })
  pausedById?: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'last_evaluated_at', type: 'timestamptz', nullable: true })
  lastEvaluatedAt?: Date | null;

  @OneToMany(() => SlaEscalation, (esc) => esc.timer)
  escalations: SlaEscalation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
