/**
 * ApprovalSync — ChecklistItem Entity
 * Milestone: BE-05
 *
 * Represents an individual requirement or evidence verification item in a checklist.
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
import { ChecklistItemType } from '../enums';
import { ChecklistTemplate } from './checklist-template.entity';
import { RegulatoryRule } from './regulatory-rule.entity';

@Entity('checklist_items')
@Unique('uq_checklist_items_template_code', ['checklistTemplateId', 'itemCode'])
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_checklist_items_template_id')
  @Column({ name: 'checklist_template_id', type: 'uuid' })
  checklistTemplateId: string;

  @ManyToOne(() => ChecklistTemplate, (template) => template.items, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'checklist_template_id' })
  template: ChecklistTemplate;

  @Column({ name: 'item_code', type: 'varchar', length: 100 })
  itemCode: string;

  @Column({ type: 'text' })
  description: string;

  @Index('idx_checklist_items_type')
  @Column({
    name: 'item_type',
    type: 'enum',
    enum: ChecklistItemType,
  })
  itemType: ChecklistItemType;

  @Column({ type: 'boolean', default: true })
  required: boolean;

  @Column({
    name: 'evidence_document_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  evidenceDocumentType?: string | null;

  @Index('idx_checklist_items_display_order')
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId?: string | null;

  @ManyToOne(() => RegulatoryRule, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rule_id' })
  rule?: RegulatoryRule | null;

  @Column({ name: 'guidance_notes', type: 'text', nullable: true })
  guidanceNotes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
