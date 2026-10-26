/**
 * ApprovalSync — SLA Policy Interface
 * Milestone: BE-08
 */

import { ApplicationStatus, SlaTier, UserRole } from '../../shared/contracts';

export type SlaUnit = 'HOURS' | 'DAYS' | 'MINUTES';

export type SlaPolicyClassification =
  'STATUTORY_APH_NORM' | 'ILLUSTRATIVE_DEMO';

export interface SlaPolicy {
  /**
   * Unique policy code identifier (e.g. SLA_POLICY_SUBMITTED_SCRUTINY).
   */
  id: string;

  /**
   * Human-readable title of the policy.
   */
  name: string;

  /**
   * Explanatory summary of the operational deadline.
   */
  description: string;

  /**
   * Applicable application workflow stage.
   */
  stage: ApplicationStatus;

  /**
   * Associated default escalation tier from frozen SlaTier contract.
   */
  tier: SlaTier;

  /**
   * Numerical duration value.
   */
  duration: number;

  /**
   * Time unit (MINUTES, HOURS, DAYS).
   */
  unit: SlaUnit;

  /**
   * Warning threshold as fraction of duration (e.g. 0.75 for 75%).
   */
  warningThresholdFraction: number;

  /**
   * Breach threshold as fraction of duration (1.0 for 100%).
   */
  breachThresholdFraction: number;

  /**
   * Severe breach threshold as fraction of duration (e.g. 1.25 for 125%).
   */
  severeBreachThresholdFraction?: number;

  /**
   * Target role notified on warning.
   */
  warningTargetRole: UserRole;

  /**
   * Target role notified on breach escalation.
   */
  breachTargetRole: UserRole;

  /**
   * Severe breach escalation target role (e.g., BUREAU_HEAD).
   */
  severeBreachTargetRole?: UserRole;

  /**
   * Whether regulatory officers are authorized to pause this timer with justification.
   */
  canPause: boolean;

  /**
   * Classification indicating statutory basis or team-defined demo benchmark.
   */
  classification: SlaPolicyClassification;

  /**
   * Reference citation (APH clause, circular, or demo benchmark note).
   */
  sourceReference: string;

  /**
   * Version of the policy configuration.
   */
  version: string;

  /**
   * Whether policy is currently active.
   */
  isActive: boolean;
}
