/**
 * ApprovalSync — RuleSet Entity
 * Milestone: BE-05
 *
 * Represents a logical group of regulatory requirements for a domain or application category.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RuleVersion } from './rule-version.entity';

@Entity('rule_sets')
export class RuleSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_rule_sets_code', { unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string | null;

  @Index('idx_rule_sets_application_category')
  @Column({
    name: 'application_category',
    type: 'varchar',
    length: 100,
  })
  applicationCategory: string;

  @Column({
    name: 'issuing_authority',
    type: 'varchar',
    length: 255,
    default: 'AICTE',
  })
  issuingAuthority: string;

  @OneToMany(() => RuleVersion, (version) => version.ruleSet)
  versions: RuleVersion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
