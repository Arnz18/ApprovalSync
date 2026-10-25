/**
 * ApprovalSync — Compliance Finding Interface
 * Milestone: DOC-06 (Compliance Evidence and Infrastructure Review Assist)
 *
 * Defines structured, traceable compliance findings linked to versioned regulatory
 * rules and checklist items. Preserves ADR-004 Human Sovereignty (advisory findings).
 */

import { BoundingBox, ComplianceSeverity } from '../../shared/contracts';
import { RuleSourceClassification } from '../../rules/enums';

export interface EvidenceReference {
  documentId?: string;
  documentType?: string;
  fileName?: string;
  fieldKey?: string;
  extractedValue?: string | number | null;
  declaredValue?: string | number | null;
  boundingBox?: BoundingBox;
  pageNumber?: number;
  notes?: string;
}

export interface ComplianceFinding {
  id: string;
  findingCode: string;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  isAdvisory: true; // Strictly advisory per ADR-004 Human Sovereignty
  category:
    'DOCUMENTARY' | 'INFRASTRUCTURE' | 'CADRE_RATIO' | 'SAFETY_ACCESSIBILITY';

  // Regulatory rule linkage
  ruleCode?: string;
  ruleVersionId?: string;
  ruleVersionNumber?: number;
  checklistTemplateCode?: string;
  checklistItemCode?: string;
  sourceClause?: string;
  sourceClassification?: RuleSourceClassification;

  // Evidence references
  evidence: EvidenceReference[];

  // Inspection assist flags
  requiresPhysicalInspection: boolean;
  recommendedAction: string;
  limitations: string[];
}
