/**
 * ApprovalSync — Rule Response Projections
 * Milestone: BE-05
 */

import { ComplianceSeverity } from '../../shared/contracts';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
  ChecklistItemType,
} from '../enums';

export interface RegulatoryRuleProjection {
  id: string;
  ruleVersionId: string;
  ruleCode: string;
  title: string;
  description: string;
  ruleType: RuleType;
  severity: ComplianceSeverity;
  parametersJsonb: Record<string, unknown>;
  sourceClause?: string | null;
  sourceClassification?: RuleSourceClassification | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItemProjection {
  id: string;
  checklistTemplateId: string;
  itemCode: string;
  description: string;
  itemType: ChecklistItemType;
  required: boolean;
  evidenceDocumentType?: string | null;
  displayOrder: number;
  ruleId?: string | null;
  guidanceNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistTemplateProjection {
  id: string;
  ruleVersionId: string;
  code: string;
  name: string;
  description?: string | null;
  applicationCategory: string;
  items?: ChecklistItemProjection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleVersionProjection {
  id: string;
  ruleSetId: string;
  versionNumber: number;
  status: RuleLifecycleStatus;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  sourceTitle: string;
  sourceReference: string;
  sourceClassification: RuleSourceClassification;
  changeSummary?: string | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  retiredAt?: Date | null;
  retiredBy?: string | null;
  rules?: RegulatoryRuleProjection[];
  checklistTemplates?: ChecklistTemplateProjection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleSetProjection {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  applicationCategory: string;
  issuingAuthority: string;
  versions?: RuleVersionProjection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicableRulesResolutionProjection {
  ruleSet: {
    id: string;
    code: string;
    name: string;
    applicationCategory: string;
    issuingAuthority: string;
  };
  ruleVersion: {
    id: string;
    versionNumber: number;
    status: RuleLifecycleStatus;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    sourceTitle: string;
    sourceReference: string;
    sourceClassification: RuleSourceClassification;
    publishedAt?: Date | null;
  };
  evaluationDate: string;
  rules: RegulatoryRuleProjection[];
  checklists: ChecklistTemplateProjection[];
}
