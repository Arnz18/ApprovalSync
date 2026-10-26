/**
 * ApprovalSync — Configurable SLA Policies
 * Milestone: BE-08
 *
 * NOTE ON REGULATORY ACCURACY:
 * Official AICTE Approval Process Handbook (APH) regulations outline general processing
 * timeframes but do not specify rigid millisecond/hourly statutory deadlines for every internal
 * scrutiny transition. Therefore, all policies configured below are classified strictly as
 * ILLUSTRATIVE_DEMO for Smart India Hackathon evaluation.
 * They must NOT be cited as binding statutory AICTE rejection criteria.
 */

import { ApplicationStatus, SlaTier, UserRole } from '../../shared/contracts';
import { SlaPolicy, SlaUnit } from './sla-policy.interface';

export const ILLUSTRATIVE_DISCLAIMER =
  'This SLA policy contains illustrative operational thresholds configured for hackathon demonstration. It does NOT represent official statutory AICTE rejection rules.';

export const DEFAULT_SLA_POLICIES: SlaPolicy[] = [
  {
    id: 'SLA_SUBMITTED_TO_SCRUTINY',
    name: 'Application Intake & Scrutiny Queue Allocation SLA',
    description:
      'Target timeframe for regional scrutiny queue assignment and initial scrutiny pick-up following application submission.',
    stage: ApplicationStatus.SUBMITTED,
    tier: SlaTier.TIER_1_RO_ALERT,
    duration: 7,
    unit: 'DAYS',
    warningThresholdFraction: 0.75, // Warning at 5.25 days
    breachThresholdFraction: 1.0, // Breach at 7 days
    severeBreachThresholdFraction: 1.25, // Severe breach at 8.75 days
    warningTargetRole: UserRole.REGIONAL_OFFICER,
    breachTargetRole: UserRole.BUREAU_HEAD,
    severeBreachTargetRole: UserRole.SYSTEM_ADMIN,
    canPause: false,
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 Procedural Benchmark (Illustrative Hackathon Prototype)',
    version: '1.0.0',
    isActive: true,
  },
  {
    id: 'SLA_UNDER_SCRUTINY_EVALUATION',
    name: 'Scrutiny Officer Document Verification SLA',
    description:
      'Timeframe for scrutiny officer to complete documentary verification and record findings or issue deficiency notices.',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_2_DIRECTOR_BREACH,
    duration: 15,
    unit: 'DAYS',
    warningThresholdFraction: 0.8, // Warning at 12 days
    breachThresholdFraction: 1.0, // Breach at 15 days
    severeBreachThresholdFraction: 1.2, // Severe breach at 18 days
    warningTargetRole: UserRole.SCRUTINY_OFFICER,
    breachTargetRole: UserRole.REGIONAL_OFFICER,
    severeBreachTargetRole: UserRole.BUREAU_HEAD,
    canPause: true, // Regulatory pause permitted if awaiting state revenue records
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 Procedural Benchmark (Illustrative Hackathon Prototype)',
    version: '1.0.0',
    isActive: true,
  },
  {
    id: 'SLA_DEFICIENCY_RESPONSE_WINDOW',
    name: 'Institutional Deficiency Clarification Window',
    description:
      'Statutory window granted to institution to upload required documentary clarifications following deficiency notice.',
    stage: ApplicationStatus.DEFICIENCY_ISSUED,
    tier: SlaTier.TIER_1_RO_ALERT,
    duration: 10,
    unit: 'DAYS',
    warningThresholdFraction: 0.7, // Warning at 7 days
    breachThresholdFraction: 1.0, // Breach at 10 days
    severeBreachThresholdFraction: 1.3,
    warningTargetRole: UserRole.INSTITUTION_USER,
    breachTargetRole: UserRole.SCRUTINY_OFFICER,
    severeBreachTargetRole: UserRole.REGIONAL_OFFICER,
    canPause: true, // Pause allowed if portal maintenance or natural calamity
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 Chapter 1 Procedural Guidelines (Illustrative Demo)',
    version: '1.0.0',
    isActive: true,
  },
  {
    id: 'SLA_RESUBMITTED_SCRUTINY',
    name: 'Re-Scrutiny of Clarifications SLA',
    description:
      'Expedited review timeframe for scrutiny officers to evaluate rectified deficiency documents.',
    stage: ApplicationStatus.RESUBMITTED,
    tier: SlaTier.TIER_1_RO_ALERT,
    duration: 7,
    unit: 'DAYS',
    warningThresholdFraction: 0.75,
    breachThresholdFraction: 1.0,
    severeBreachThresholdFraction: 1.25,
    warningTargetRole: UserRole.SCRUTINY_OFFICER,
    breachTargetRole: UserRole.REGIONAL_OFFICER,
    severeBreachTargetRole: UserRole.BUREAU_HEAD,
    canPause: false,
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 Procedural Benchmark (Illustrative Hackathon Prototype)',
    version: '1.0.0',
    isActive: true,
  },
  {
    id: 'SLA_EVC_INSPECTION_TIMEFRAME',
    name: 'Expert Visit Committee Physical Inspection SLA',
    description:
      'Timeframe for ground expert inspection, geo-tagged photo collation, and committee report submission.',
    stage: ApplicationStatus.EVC_IN_PROGRESS,
    tier: SlaTier.TIER_2_DIRECTOR_BREACH,
    duration: 14,
    unit: 'DAYS',
    warningThresholdFraction: 0.75,
    breachThresholdFraction: 1.0,
    severeBreachThresholdFraction: 1.25,
    warningTargetRole: UserRole.EVC_INSPECTOR,
    breachTargetRole: UserRole.REGIONAL_OFFICER,
    severeBreachTargetRole: UserRole.BUREAU_HEAD,
    canPause: true,
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 EVC Guidelines (Illustrative Hackathon Prototype)',
    version: '1.0.0',
    isActive: true,
  },
  {
    id: 'SLA_RECOMMENDED_FOR_SHC',
    name: 'Standing Hearing Committee Appellate Schedule SLA',
    description:
      'Timeframe for appellate hearing scheduling and committee recommendation issuance.',
    stage: ApplicationStatus.RECOMMENDED_FOR_SHC,
    tier: SlaTier.TIER_3_COUNCIL_LOCK,
    duration: 21,
    unit: 'DAYS',
    warningThresholdFraction: 0.75,
    breachThresholdFraction: 1.0,
    severeBreachThresholdFraction: 1.25,
    warningTargetRole: UserRole.SHC_SAC_MEMBER,
    breachTargetRole: UserRole.BUREAU_HEAD,
    severeBreachTargetRole: UserRole.SYSTEM_ADMIN,
    canPause: false,
    classification: 'ILLUSTRATIVE_DEMO',
    sourceReference:
      'AICTE APH 2024-25 SHC/SAC Norms (Illustrative Hackathon Prototype)',
    version: '1.0.0',
    isActive: true,
  },
];

/**
 * Converts a duration and unit into milliseconds.
 */
export function convertDurationToMs(duration: number, unit: SlaUnit): number {
  if (duration < 0) {
    throw new Error(`SLA duration must be non-negative. Received: ${duration}`);
  }
  switch (unit) {
    case 'MINUTES':
      return duration * 60 * 1000;
    case 'HOURS':
      return duration * 60 * 60 * 1000;
    case 'DAYS':
      return duration * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported SLA unit: ${unit}`);
  }
}

/**
 * Resolves the configured active policy for a workflow stage.
 */
export function resolvePolicyForStage(
  stage: ApplicationStatus,
  policies: SlaPolicy[] = DEFAULT_SLA_POLICIES,
): SlaPolicy | null {
  const match = policies.find((p) => p.stage === stage && p.isActive);
  return match || null;
}

/**
 * Calculates target and warning deadlines from startedAt and policy rules.
 */
export function calculateDeadlines(
  policy: SlaPolicy,
  startedAt: Date,
): {
  targetDeadline: Date;
  warningDeadline: Date;
  severeBreachDeadline?: Date;
} {
  const durationMs = convertDurationToMs(policy.duration, policy.unit);
  const targetDeadline = new Date(startedAt.getTime() + durationMs);

  const warningMs = Math.round(durationMs * policy.warningThresholdFraction);
  const warningDeadline = new Date(startedAt.getTime() + warningMs);

  let severeBreachDeadline: Date | undefined;
  if (policy.severeBreachThresholdFraction) {
    const severeMs = Math.round(
      durationMs * policy.severeBreachThresholdFraction,
    );
    severeBreachDeadline = new Date(startedAt.getTime() + severeMs);
  }

  return {
    targetDeadline,
    warningDeadline,
    severeBreachDeadline,
  };
}
