/**
 * ApprovalSync — Finite State Machine (FSM) Transition Matrix & Guard Rules
 * Milestone: BE-06
 *
 * Defines the authoritative state transition rules, allowed roles, comment requirements,
 * and terminal state invariants for the Application approval lifecycle.
 */

import { ApplicationStatus, UserRole } from '../../shared/contracts';

export interface WorkflowTransitionRule {
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  allowedRoles: UserRole[];
  requiresComment: boolean;
  eventType: string;
  description: string;
  requiresTenantCheck: boolean;
}

export const TERMINAL_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
]);

export const WORKFLOW_TRANSITIONS: WorkflowTransitionRule[] = [
  // 1. Initial College Submission
  {
    fromStatus: ApplicationStatus.DRAFT,
    toStatus: ApplicationStatus.SUBMITTED,
    allowedRoles: [UserRole.INSTITUTION_USER],
    requiresComment: false,
    eventType: 'APPLICATION_SUBMITTED',
    description:
      'Institution seals and submits draft application for regulatory review',
    requiresTenantCheck: true,
  },
  // 2. Withdrawal from Draft
  {
    fromStatus: ApplicationStatus.DRAFT,
    toStatus: ApplicationStatus.WITHDRAWN,
    allowedRoles: [UserRole.INSTITUTION_USER],
    requiresComment: true,
    eventType: 'APPLICATION_WITHDRAWN',
    description: 'Institution formally withdraws draft application',
    requiresTenantCheck: true,
  },
  // 3. Start Documentary Scrutiny
  {
    fromStatus: ApplicationStatus.SUBMITTED,
    toStatus: ApplicationStatus.UNDER_SCRUTINY,
    allowedRoles: [UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER],
    requiresComment: false,
    eventType: 'SCRUTINY_STARTED',
    description:
      'Scrutiny Officer commences documentary review and verification',
    requiresTenantCheck: false,
  },
  // 4. Withdrawal from Submitted (Prior to Scrutiny)
  {
    fromStatus: ApplicationStatus.SUBMITTED,
    toStatus: ApplicationStatus.WITHDRAWN,
    allowedRoles: [UserRole.INSTITUTION_USER],
    requiresComment: true,
    eventType: 'APPLICATION_WITHDRAWN',
    description: 'Institution formally retracts application prior to scrutiny',
    requiresTenantCheck: true,
  },
  // 5. Issue Deficiencies to College
  {
    fromStatus: ApplicationStatus.UNDER_SCRUTINY,
    toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
    allowedRoles: [UserRole.SCRUTINY_OFFICER],
    requiresComment: true,
    eventType: 'DEFICIENCY_COMMUNICATED',
    description:
      'Scrutiny Officer issues formal deficiency notice to institution',
    requiresTenantCheck: false,
  },
  // 6. Recommend for Expert Visit Committee (EVC)
  {
    fromStatus: ApplicationStatus.UNDER_SCRUTINY,
    toStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
    allowedRoles: [UserRole.SCRUTINY_OFFICER],
    requiresComment: false,
    eventType: 'RECOMMENDED_FOR_EVC',
    description:
      'Scrutiny Officer clears documentary review and recommends on-site/virtual EVC inspection',
    requiresTenantCheck: false,
  },
  // 7. Bureau Head Rejection from Scrutiny
  {
    fromStatus: ApplicationStatus.UNDER_SCRUTINY,
    toStatus: ApplicationStatus.REJECTED,
    allowedRoles: [UserRole.BUREAU_HEAD],
    requiresComment: true,
    eventType: 'APPLICATION_REJECTED',
    description: 'Bureau Head rejects application following scrutiny findings',
    requiresTenantCheck: false,
  },
  // 8. Resubmission by Institution after Rectifying Deficiencies
  {
    fromStatus: ApplicationStatus.DEFICIENCY_ISSUED,
    toStatus: ApplicationStatus.RESUBMITTED,
    allowedRoles: [UserRole.INSTITUTION_USER],
    requiresComment: true,
    eventType: 'APPLICATION_RESUBMITTED',
    description:
      'Institution uploads corrective documentary evidence and resubmits',
    requiresTenantCheck: true,
  },
  // 9. Withdrawal from Deficiency Issued
  {
    fromStatus: ApplicationStatus.DEFICIENCY_ISSUED,
    toStatus: ApplicationStatus.WITHDRAWN,
    allowedRoles: [UserRole.INSTITUTION_USER],
    requiresComment: true,
    eventType: 'APPLICATION_WITHDRAWN',
    description:
      'Institution elects to withdraw application following deficiency notice',
    requiresTenantCheck: true,
  },
  // 10. Re-Scrutiny of Resubmitted Application
  {
    fromStatus: ApplicationStatus.RESUBMITTED,
    toStatus: ApplicationStatus.UNDER_SCRUTINY,
    allowedRoles: [UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER],
    requiresComment: false,
    eventType: 'RE_SCRUTINY_STARTED',
    description:
      'Scrutiny Officer initiates re-scrutiny on corrected application',
    requiresTenantCheck: false,
  },
  // 11. EVC Inspection Started
  {
    fromStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
    toStatus: ApplicationStatus.EVC_IN_PROGRESS,
    allowedRoles: [UserRole.EVC_INSPECTOR, UserRole.REGIONAL_OFFICER],
    requiresComment: false,
    eventType: 'EVC_INSPECTION_STARTED',
    description:
      'Expert Visit Committee initiates on-site or virtual infrastructure inspection',
    requiresTenantCheck: false,
  },
  // 12. Final Approval after EVC
  {
    fromStatus: ApplicationStatus.EVC_IN_PROGRESS,
    toStatus: ApplicationStatus.APPROVED,
    allowedRoles: [UserRole.BUREAU_HEAD],
    requiresComment: false,
    eventType: 'APPLICATION_APPROVED',
    description:
      'Bureau Head grants statutory approval following favorable EVC inspection',
    requiresTenantCheck: false,
  },
  // 13. Escalation to Standing Hearing Committee (SHC)
  {
    fromStatus: ApplicationStatus.EVC_IN_PROGRESS,
    toStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
    allowedRoles: [
      UserRole.EVC_INSPECTOR,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
    ],
    requiresComment: true,
    eventType: 'RECOMMENDED_FOR_SHC',
    description:
      'EVC flags unresolved discrepancies; escalated to Standing Hearing Committee (SHC)',
    requiresTenantCheck: false,
  },
  // 14. Final Rejection after EVC
  {
    fromStatus: ApplicationStatus.EVC_IN_PROGRESS,
    toStatus: ApplicationStatus.REJECTED,
    allowedRoles: [UserRole.BUREAU_HEAD],
    requiresComment: true,
    eventType: 'APPLICATION_REJECTED',
    description:
      'Bureau Head issues final rejection following unfavorable EVC report',
    requiresTenantCheck: false,
  },
  // 15. Final Approval after SHC Hearing
  {
    fromStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
    toStatus: ApplicationStatus.APPROVED,
    allowedRoles: [UserRole.BUREAU_HEAD],
    requiresComment: false,
    eventType: 'APPLICATION_APPROVED',
    description:
      'Bureau Head grants statutory approval following Standing Hearing Committee review',
    requiresTenantCheck: false,
  },
  // 16. Final Rejection after SHC Hearing
  {
    fromStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
    toStatus: ApplicationStatus.REJECTED,
    allowedRoles: [UserRole.BUREAU_HEAD],
    requiresComment: true,
    eventType: 'APPLICATION_REJECTED',
    description:
      'Bureau Head issues final rejection following Standing Hearing Committee review',
    requiresTenantCheck: false,
  },
];

/**
 * Checks whether an ApplicationStatus is a terminal state.
 */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Finds the specific transition rule from the matrix.
 */
export function findTransitionRule(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
): WorkflowTransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.fromStatus === fromStatus && rule.toStatus === toStatus,
  );
}

/**
 * Returns all permitted next transitions for a given status, optionally filtered by user role.
 */
export function getAllowedTransitions(
  fromStatus: ApplicationStatus,
  role?: UserRole,
): WorkflowTransitionRule[] {
  if (isTerminalStatus(fromStatus)) {
    return [];
  }
  return WORKFLOW_TRANSITIONS.filter((rule) => {
    if (rule.fromStatus !== fromStatus) return false;
    if (role && !rule.allowedRoles.includes(role)) return false;
    return true;
  });
}
