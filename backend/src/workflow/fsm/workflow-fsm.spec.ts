/**
 * ApprovalSync — Workflow FSM Matrix Unit Tests
 * Milestone: BE-06
 */

import { ApplicationStatus, UserRole } from '../../shared/contracts';
import {
  isTerminalStatus,
  findTransitionRule,
  getAllowedTransitions,
  TERMINAL_STATUSES,
  WORKFLOW_TRANSITIONS,
} from './workflow-fsm';

describe('Workflow FSM Transition Matrix', () => {
  describe('Terminal Status Rules', () => {
    it('identifies APPROVED, REJECTED, and WITHDRAWN as terminal statuses', () => {
      expect(isTerminalStatus(ApplicationStatus.APPROVED)).toBe(true);
      expect(isTerminalStatus(ApplicationStatus.REJECTED)).toBe(true);
      expect(isTerminalStatus(ApplicationStatus.WITHDRAWN)).toBe(true);
    });

    it('defines a comprehensive transitions matrix', () => {
      expect(WORKFLOW_TRANSITIONS.length).toBeGreaterThanOrEqual(15);
    });

    it('identifies intermediate statuses as non-terminal', () => {
      expect(isTerminalStatus(ApplicationStatus.DRAFT)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.SUBMITTED)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.UNDER_SCRUTINY)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.DEFICIENCY_ISSUED)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.RESUBMITTED)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.RECOMMENDED_FOR_EVC)).toBe(
        false,
      );
      expect(isTerminalStatus(ApplicationStatus.EVC_IN_PROGRESS)).toBe(false);
      expect(isTerminalStatus(ApplicationStatus.RECOMMENDED_FOR_SHC)).toBe(
        false,
      );
    });

    it('returns empty allowed transitions for terminal statuses regardless of role', () => {
      for (const terminal of TERMINAL_STATUSES) {
        expect(getAllowedTransitions(terminal)).toEqual([]);
        expect(getAllowedTransitions(terminal, UserRole.SYSTEM_ADMIN)).toEqual(
          [],
        );
        expect(getAllowedTransitions(terminal, UserRole.BUREAU_HEAD)).toEqual(
          [],
        );
      }
    });
  });

  describe('Transition Matrix Definitions', () => {
    it('allows DRAFT -> SUBMITTED only for INSTITUTION_USER', () => {
      const rule = findTransitionRule(
        ApplicationStatus.DRAFT,
        ApplicationStatus.SUBMITTED,
      );
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toEqual([UserRole.INSTITUTION_USER]);
      expect(rule?.requiresComment).toBe(false);
      expect(rule?.eventType).toBe('APPLICATION_SUBMITTED');
    });

    it('allows DRAFT -> WITHDRAWN with mandatory comment', () => {
      const rule = findTransitionRule(
        ApplicationStatus.DRAFT,
        ApplicationStatus.WITHDRAWN,
      );
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toContain(UserRole.INSTITUTION_USER);
      expect(rule?.requiresComment).toBe(true);
      expect(rule?.eventType).toBe('APPLICATION_WITHDRAWN');
    });

    it('allows SUBMITTED -> UNDER_SCRUTINY for SCRUTINY_OFFICER and REGIONAL_OFFICER', () => {
      const rule = findTransitionRule(
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toContain(UserRole.SCRUTINY_OFFICER);
      expect(rule?.allowedRoles).toContain(UserRole.REGIONAL_OFFICER);
      expect(rule?.allowedRoles).not.toContain(UserRole.INSTITUTION_USER);
    });

    it('requires comment when issuing deficiencies (UNDER_SCRUTINY -> DEFICIENCY_ISSUED)', () => {
      const rule = findTransitionRule(
        ApplicationStatus.UNDER_SCRUTINY,
        ApplicationStatus.DEFICIENCY_ISSUED,
      );
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toEqual([UserRole.SCRUTINY_OFFICER]);
      expect(rule?.requiresComment).toBe(true);
    });

    it('allows DEFICIENCY_ISSUED -> RESUBMITTED only for INSTITUTION_USER with comment', () => {
      const rule = findTransitionRule(
        ApplicationStatus.DEFICIENCY_ISSUED,
        ApplicationStatus.RESUBMITTED,
      );
      expect(rule).toBeDefined();
      expect(rule?.allowedRoles).toEqual([UserRole.INSTITUTION_USER]);
      expect(rule?.requiresComment).toBe(true);
    });

    it('allows final statutory approval only for BUREAU_HEAD', () => {
      const approvalFromEvc = findTransitionRule(
        ApplicationStatus.EVC_IN_PROGRESS,
        ApplicationStatus.APPROVED,
      );
      expect(approvalFromEvc).toBeDefined();
      expect(approvalFromEvc?.allowedRoles).toEqual([UserRole.BUREAU_HEAD]);

      const approvalFromShc = findTransitionRule(
        ApplicationStatus.RECOMMENDED_FOR_SHC,
        ApplicationStatus.APPROVED,
      );
      expect(approvalFromShc).toBeDefined();
      expect(approvalFromShc?.allowedRoles).toEqual([UserRole.BUREAU_HEAD]);
    });

    it('allows final statutory rejection only for BUREAU_HEAD with mandatory comment', () => {
      const rejectionFromScrutiny = findTransitionRule(
        ApplicationStatus.UNDER_SCRUTINY,
        ApplicationStatus.REJECTED,
      );
      expect(rejectionFromScrutiny).toBeDefined();
      expect(rejectionFromScrutiny?.allowedRoles).toEqual([
        UserRole.BUREAU_HEAD,
      ]);
      expect(rejectionFromScrutiny?.requiresComment).toBe(true);

      const rejectionFromEvc = findTransitionRule(
        ApplicationStatus.EVC_IN_PROGRESS,
        ApplicationStatus.REJECTED,
      );
      expect(rejectionFromEvc).toBeDefined();
      expect(rejectionFromEvc?.allowedRoles).toEqual([UserRole.BUREAU_HEAD]);
      expect(rejectionFromEvc?.requiresComment).toBe(true);
    });

    it('rejects nonexistent transitions', () => {
      expect(
        findTransitionRule(ApplicationStatus.DRAFT, ApplicationStatus.APPROVED),
      ).toBeUndefined();
      expect(
        findTransitionRule(
          ApplicationStatus.DRAFT,
          ApplicationStatus.UNDER_SCRUTINY,
        ),
      ).toBeUndefined();
      expect(
        findTransitionRule(
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.APPROVED,
        ),
      ).toBeUndefined();
      expect(
        findTransitionRule(
          ApplicationStatus.DEFICIENCY_ISSUED,
          ApplicationStatus.APPROVED,
        ),
      ).toBeUndefined();
      expect(
        findTransitionRule(
          ApplicationStatus.UNDER_SCRUTINY,
          ApplicationStatus.EVC_IN_PROGRESS,
        ),
      ).toBeUndefined();
    });

    it('filters allowed transitions by user role accurately', () => {
      const underScrutinyAll = getAllowedTransitions(
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(underScrutinyAll.length).toBeGreaterThan(0);

      // Institution user cannot perform any transitions from UNDER_SCRUTINY
      const institutionAllowed = getAllowedTransitions(
        ApplicationStatus.UNDER_SCRUTINY,
        UserRole.INSTITUTION_USER,
      );
      expect(institutionAllowed).toHaveLength(0);

      // Scrutiny Officer can issue deficiency or recommend for EVC
      const scrutinyAllowed = getAllowedTransitions(
        ApplicationStatus.UNDER_SCRUTINY,
        UserRole.SCRUTINY_OFFICER,
      );
      const targetStatuses = scrutinyAllowed.map((r) => r.toStatus);
      expect(targetStatuses).toContain(ApplicationStatus.DEFICIENCY_ISSUED);
      expect(targetStatuses).toContain(ApplicationStatus.RECOMMENDED_FOR_EVC);
      expect(targetStatuses).not.toContain(ApplicationStatus.REJECTED);

      // Bureau Head can reject from UNDER_SCRUTINY
      const bureauAllowed = getAllowedTransitions(
        ApplicationStatus.UNDER_SCRUTINY,
        UserRole.BUREAU_HEAD,
      );
      expect(bureauAllowed.map((r) => r.toStatus)).toContain(
        ApplicationStatus.REJECTED,
      );
    });
  });
});
