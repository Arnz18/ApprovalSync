/**
 * ApprovalSync — Validation Rule and Finding Contracts
 * Milestone: DOC-03
 *
 * Defines contracts for document completeness rules, field validation requirements,
 * structured findings, and composite application validation results.
 */

import { BoundingBox, ComplianceSeverity } from '../../shared/contracts';
import {
  ValidationOutcome,
  ValidationCategory,
  OverallValidationStatus,
} from '../enums';

export interface CategoryDocumentRequirement {
  documentType: string;
  isMandatory: boolean;
  description: string;
  sourceClause?: string;
}

export interface CategoryDocumentRule {
  applicationCategory: string;
  displayName: string;
  requiredDocuments: CategoryDocumentRequirement[];
}

export interface FieldRequirement {
  fieldKey: string;
  label: string;
  type: 'string' | 'date' | 'number';
  required: boolean;
  sourceClause?: string;
}

export interface ValidationFinding {
  ruleId: string;
  category: ValidationCategory;
  outcome: ValidationOutcome;
  severity: ComplianceSeverity;
  message: string;
  documentId?: string;
  documentType?: string;
  fieldKey?: string;
  expectedValue?: string | number;
  observedValue?: string | number;
  evidenceLocation?: BoundingBox;
  confidenceScore?: number;
  isAdvisory: true; // Strictly advisory per ADR-004
  metadata?: Record<string, unknown>;
}

export interface ValidationSummary {
  totalRulesEvaluated: number;
  totalCompliant: number;
  totalDeficiencies: number;
  totalAdvisories: number;
  totalSourceUnavailable: number;
}

export interface ApplicationValidationResult {
  applicationId: string;
  applicationNumber: string;
  institutionId: string;
  programType: string;
  overallStatus: OverallValidationStatus;
  summary: ValidationSummary;
  findings: ValidationFinding[];
  evaluatedAt: string;
  ruleVersion: string;
}
