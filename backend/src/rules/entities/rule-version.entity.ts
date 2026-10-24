/**
 * ApprovalSync — RuleVersion Entity
 * Milestone: BE-05
 *
 * Represents an immutable, versioned snapshot of regulatory rules and checklist requirements.
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
import { RuleLifecycleStatus, RuleSourceClassification } from '../enums';
import { RuleSet } from './rule-set.entity';
import { RegulatoryRule } from './regulatory-rule.entity';
import { ChecklistTemplate } from './checklist-template.entity';

@Entity('rule_versions')
@Unique('uq_rule_versions_ruleset_version', ['ruleSetId', 'versionNumber'])
export class RuleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_rule_versions_rule_set_id')
  @Column({ name: 'rule_set_id', type: 'uuid' })
  ruleSetId: string;

  @ManyToOne(() => RuleSet, (ruleSet) => ruleSet.versions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'rule_set_id' })
  ruleSet: RuleSet;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Index('idx_rule_versions_status')
  @Column({
    type: 'enum',
    enum: RuleLifecycleStatus,
    default: RuleLifecycleStatus.DRAFT,
  })
  status: RuleLifecycleStatus;

  @Index('idx_rule_versions_effective_dates')
  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo?: Date | null;

  @Column({ name: 'source_title', type: 'varchar', length: 255 })
  sourceTitle: string;

  @Column({ name: 'source_reference', type: 'varchar', length: 255 })
  sourceReference: string;

  @Index('idx_rule_versions_classification')
  @Column({
    name: 'source_classification',
    type: 'enum',
    enum: RuleSourceClassification,
    default: RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  })
  sourceClassification: RuleSourceClassification;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary?: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy?: string | null;

  @Column({ name: 'retired_at', type: 'timestamptz', nullable: true })
  retiredAt?: Date | null;

  @Column({ name: 'retired_by', type: 'uuid', nullable: true })
  retiredBy?: string | null;

  @OneToMany(() => RegulatoryRule, (rule) => rule.ruleVersion)
  rules: RegulatoryRule[];

  @OneToMany(() => ChecklistTemplate, (template) => template.ruleVersion)
  checklistTemplates: ChecklistTemplate[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
