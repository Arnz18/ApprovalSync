/**
 * ApprovalSync — Infrastructure Evidence Interface
 * Milestone: DOC-06
 *
 * Defines models for physical plant documentary review assist,
 * surface area consistency, barrier-free checks, and EVC inspection triggers.
 */

export interface InfrastructureMetricComparison {
  metricName: string;
  declaredValue?: number | string | null;
  extractedValue?: number | string | null;
  regulatoryStandard?: number | string | null;
  unit: string;
  status: 'COMPLIANT' | 'DEFICIENT' | 'UNVERIFIED' | 'DISCREPANCY';
  deviationPercentage?: number;
  notes?: string;
}

export interface InfrastructureReviewSummary {
  landCompliant: boolean;
  builtUpAreaCompliant: boolean;
  barrierFreeDeclared: boolean;
  fireSafetyValid: boolean;
  evcInspectionRecommended: boolean;
  inspectionTriggerReasons: string[];
  heuristicLimitations: string[];
}
