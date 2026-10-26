/**
 * ApprovalSync — Role-Based Route Access & Navigation Mapping
 * Milestone: FE-02
 *
 * Adheres strictly to the frozen UserRole enum from FND-02 / BE-03.
 * Defines permitted roles for each frontend route, default role landing paths,
 * and human-readable role labels.
 */

import { UserRole } from '../api/types';

export interface RoutePermissionConfig {
  path: string;
  label: string;
  allowedRoles: UserRole[];
  description: string;
}

/**
 * Platform Route Permissions Matrix
 * The backend remains the authoritative security boundary;
 * this matrix governs client-side presentation and route guards.
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionConfig> = {
  '/': {
    path: '/',
    label: 'Workspace Overview',
    allowedRoles: [
      UserRole.INSTITUTION_USER,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.EVC_INSPECTOR,
      UserRole.SHC_SAC_MEMBER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
    description: 'General system status, metrics, and role landing summary.',
  },
  '/dashboard': {
    path: '/dashboard',
    label: 'Dashboards & SLA',
    allowedRoles: [
      UserRole.INSTITUTION_USER,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.EVC_INSPECTOR,
      UserRole.SHC_SAC_MEMBER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
    description:
      'Role-specific dashboards, real-time SLA monitors, alert streams, and regulatory analytics.',
  },
  '/applications': {
    path: '/applications',
    label: 'Application Intake',
    allowedRoles: [UserRole.INSTITUTION_USER, UserRole.SYSTEM_ADMIN],
    description: 'Application drafting, category checklists, and submission wizard.',
  },
  '/scrutiny': {
    path: '/scrutiny',
    label: 'Scrutiny Queue',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Documentary scrutiny, AI anomaly review, and officer disposition.',
  },
  '/verification': {
    path: '/verification',
    label: 'Document AI & Checks',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.EVC_INSPECTOR,
      UserRole.SYSTEM_ADMIN,
    ],
    description: 'Duplicate detection, perceptual hash comparison, and anomaly inspection.',
  },
  '/evc': {
    path: '/evc',
    label: 'EVC Ground Inspection',
    allowedRoles: [
      UserRole.EVC_INSPECTOR,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.SHC_SAC_MEMBER,
    ],
    description: 'On-site committee inspection scheduling, photo proof, and findings.',
  },
  '/rules': {
    path: '/rules',
    label: 'APH Regulatory Rules',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
    description: 'Approval Process Handbook rule sets and versioned validation policies.',
  },
  '/audit': {
    path: '/audit',
    label: 'Audit Ledger & Proofs',
    allowedRoles: [UserRole.AUDITOR, UserRole.BUREAU_HEAD, UserRole.SYSTEM_ADMIN],
    description: 'Append-only SHA-256 cryptographic audit event log and Merkle proofs.',
  },
  '/undertakings': {
    path: '/undertakings',
    label: 'Undertakings & Leases',
    allowedRoles: [
      UserRole.INSTITUTION_USER,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
    description:
      'Institutional undertakings, registered land/facility leases, expiry tracking, and renewal management.',
  },
  '/settings': {
    path: '/settings',
    label: 'Platform Settings',
    allowedRoles: [
      UserRole.INSTITUTION_USER,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.EVC_INSPECTOR,
      UserRole.SHC_SAC_MEMBER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
    description: 'Environment diagnostics, API health monitoring, and client preferences.',
  },
};

/**
 * Formats a UserRole enum value into a clear institutional title
 */
export function formatRoleName(role?: UserRole | string | null): string {
  if (!role) return 'Unauthenticated';
  switch (role) {
    case UserRole.INSTITUTION_USER:
      return 'Institution Representative';
    case UserRole.SCRUTINY_OFFICER:
      return 'Scrutiny Officer';
    case UserRole.REGIONAL_OFFICER:
      return 'Regional Officer';
    case UserRole.EVC_INSPECTOR:
      return 'EVC Inspector';
    case UserRole.SHC_SAC_MEMBER:
      return 'SHC / SAC Member';
    case UserRole.BUREAU_HEAD:
      return 'Bureau Head';
    case UserRole.SYSTEM_ADMIN:
      return 'System Administrator';
    case UserRole.AUDITOR:
      return 'Independent Auditor';
    default:
      return String(role);
  }
}

/**
 * Returns the default designated landing route for a given user role
 */
export function getDefaultRouteForRole(role?: UserRole | null): string {
  if (!role) return '/';
  switch (role) {
    case UserRole.INSTITUTION_USER:
      return '/applications';
    case UserRole.SCRUTINY_OFFICER:
    case UserRole.REGIONAL_OFFICER:
      return '/scrutiny';
    case UserRole.EVC_INSPECTOR:
      return '/evc';
    case UserRole.AUDITOR:
      return '/audit';
    case UserRole.BUREAU_HEAD:
    case UserRole.SYSTEM_ADMIN:
    case UserRole.SHC_SAC_MEMBER:
    default:
      return '/';
  }
}

/**
 * Checks whether a given role has client-side access permission to a route path
 * Defaults to false (deny by default) if role or path is unsupported.
 */
export function canRoleAccessRoute(role: UserRole | undefined | null, path: string): boolean {
  if (!role) return false;
  // Normalize path by stripping trailing slash
  const normalizedPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  const config = ROUTE_PERMISSIONS[normalizedPath];
  if (!config) {
    // If unknown route, fail closed
    return false;
  }
  return config.allowedRoles.includes(role);
}

/**
 * Sanitizes and validates a post-login return destination URL to prevent
 * open redirect vulnerabilities.
 */
export function getSafeReturnUrl(rawTarget?: unknown): string {
  if (typeof rawTarget !== 'string' || !rawTarget) {
    return '/';
  }
  // Must be a relative path starting with a single '/'
  // Reject protocol-relative '//', backslashes '\', and absolute URIs 'http://'
  if (
    rawTarget.startsWith('/') &&
    !rawTarget.startsWith('//') &&
    !rawTarget.includes('\\') &&
    !rawTarget.includes(':')
  ) {
    // Don't redirect back to /login
    if (rawTarget === '/login') {
      return '/';
    }
    return rawTarget;
  }
  return '/';
}
