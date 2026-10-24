/**
 * ApprovalSync — ChecklistTemplate Entity
 * Milestone: BE-05
 *
 * Represents a structured checklist template bound to an immutable rule version.
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
  Unique,
} from 'typeorm';
import { RuleVersion } from './rule-version.entity';
import { ChecklistItem } from './checklist-item.entity';

@Entity('checklist_templates')
@Unique('uq_checklist_templates_version_code', ['ruleVersionId', 'code'])
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_checklist_templates_version_id')
  @Column({ name: 'rule_version_id', type: 'uuid' })
  ruleVersionId: string;

  @ManyToOne(() => RuleVersion, (version) => version.checklistTemplates, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'rule_version_id' })
  ruleVersion: RuleVersion;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index('idx_checklist_templates_category')
  @Column({ name: 'application_category', type: 'varchar', length: 100 })
  applicationCategory: string;

  @OneToMany(() => ChecklistItem, (item) => item.template)
  items: ChecklistItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
