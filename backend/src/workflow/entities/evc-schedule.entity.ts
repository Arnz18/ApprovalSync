/**
 * ApprovalSync — Expert Visit Committee (EVC) Schedule Entity
 * Milestone: AICTE-26262
 *
 * Persists EVC ground/virtual inspection dates, committee expert assignments,
 * conflict-of-interest declarations, visit notes, and inspection outcome recommendations.
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
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';

export interface CommitteeExpert {
  name: string;
  designation: string;
  affiliation: string;
  role:
    'CHAIRMAN' | 'EXPERT_MEMBER' | 'ARCHITECT_EXPERT' | 'AICTE_REPRESENTATIVE';
  email?: string;
  phone?: string;
  conflictOfInterestDeclared: boolean;
}

@Entity('evc_schedules')
export class EvcSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_evc_schedules_application_id', { unique: true })
  @Column({ name: 'application_id', type: 'uuid', unique: true })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Index('idx_evc_schedules_institution_id')
  @Column({ name: 'institution_id', type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'SCHEDULED',
  })
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @Column({
    name: 'visit_type',
    type: 'varchar',
    length: 50,
    default: 'PHYSICAL_ON_SITE',
  })
  visitType: 'PHYSICAL_ON_SITE' | 'VIRTUAL_HYBRID';

  @Column({ name: 'proposed_visit_date', type: 'timestamptz' })
  proposedVisitDate: Date;

  @Column({ name: 'scheduled_visit_date', type: 'timestamptz', nullable: true })
  scheduledVisitDate?: Date | null;

  @Column({ name: 'committee_members_jsonb', type: 'jsonb', default: [] })
  committeeMembersJsonb: CommitteeExpert[];

  @Column({ name: 'visit_notes', type: 'text', nullable: true })
  visitNotes?: string | null;

  @Column({ name: 'outcome_summary', type: 'text', nullable: true })
  outcomeSummary?: string | null;

  @Column({
    name: 'recommendation',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  recommendation:
    | 'PENDING'
    | 'RECOMMEND_APPROVAL'
    | 'DEFICIENCY_OBSERVED'
    | 'ESCALATE_TO_SHC';

  @Column({
    name: 'scheduled_by',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  scheduledBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
