/**
 * ApprovalSync — RegulatoryRule Entity
 * Milestone: BE-05
 *
 * Represents an individual, structured regulatory rule within a rule version.
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
  Unique,
} from 'typeorm';
import { ComplianceSeverity } from '../../shared/contracts';
import { RuleType, RuleSourceClassification } from '../enums';
import { RuleVersion } from './rule-version.entity';

@Entity('regulatory_rules')
@Unique('uq_regulatory_rules_version_code', ['ruleVersionId', 'ruleCode'])
export class RegulatoryRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_regulatory_rules_version_id')
  @Column({ name: 'rule_version_id', type: 'uuid' })
  ruleVersionId: string;

  @ManyToOne(() => RuleVersion, (version) => version.rules, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'rule_version_id' })
  ruleVersion: RuleVersion;

  @Column({ name: 'rule_code', type: 'varchar', length: 100 })
  ruleCode: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index('idx_regulatory_rules_type')
  @Column({
    name: 'rule_type',
    type: 'enum',
    enum: RuleType,
  })
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: ComplianceSeverity,
    default: ComplianceSeverity.CRITICAL_DEFICIENCY,
  })
  severity: ComplianceSeverity;

  @Column({
    name: 'parameters_jsonb',
    type: 'jsonb',
    default: {},
  })
  parametersJsonb: Record<string, unknown>;

  @Column({
    name: 'source_clause',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sourceClause?: string | null;

  @Column({
    name: 'source_classification',
    type: 'enum',
    enum: RuleSourceClassification,
    nullable: true,
  })
  sourceClassification?: RuleSourceClassification | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
