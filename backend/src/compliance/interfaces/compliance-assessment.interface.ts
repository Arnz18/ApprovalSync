/**
 * ApprovalSync — Compliance Assessment Interface
 * Milestone: DOC-06
 *
 * Defines the unified compliance assessment result structure.
 */

import { ComplianceFinding } from './compliance-finding.interface';
import { InfrastructureReviewSummary } from './infrastructure-evidence.interface';

export interface ComplianceSummary {
  totalRulesEvaluated: number;
  criticalDeficienciesCount: number;
  advisoryFlagsCount: number;
  compliantCount: number;
  inspectionRecommendedCount: number;
  hasCriticalDeficiency: boolean;
  requiresPhysicalInspection: boolean;
}

export interface ComplianceAssessmentResult {
  applicationId: string;
  applicationNumber: string;
  institutionId: string;
  programType: string;
  academicYear: string;
  evaluatedAt: string;
  isAdvisory: true; // ADR-004

  // Applicable rule set & version resolved from BE-05
  ruleSetCode?: string;
  ruleSetName?: string;
  ruleVersionNumber?: number;
  ruleVersionId?: string;
  checklistCode?: string;

  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  infrastructureReview: InfrastructureReviewSummary;
  disclaimer: string;
}
