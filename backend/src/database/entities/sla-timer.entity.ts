/**
 * ApprovalSync — SLA Timer Entity
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
import { ApplicationStatus, SlaTier } from '../../shared/contracts';
import { Application } from './application.entity';

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

  @Column({ name: 'target_deadline', type: 'timestamptz' })
  targetDeadline: Date;

  @Index('idx_sla_timers_is_breached')
  @Column({ name: 'is_breached', type: 'boolean', default: false })
  isBreached: boolean;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
