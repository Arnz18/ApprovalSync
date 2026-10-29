/**
 * ApprovalSync — Synthetic Seed Data Definition
 * Milestone: BE-02 / AICTE-26262
 *
 * Synthetic, clearly labeled demo records for local development and stakeholder evaluation.
 * Contains NO real personal data, institutional records, credentials, or production tokens.
 */

import {
  UserRole,
  ApplicationStatus,
  DocumentProcessingStatus,
  SlaTier,
  ComplianceSeverity,
} from '../../shared/contracts';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
  ChecklistItemType,
} from '../../rules/enums';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from '../../undertakings/enums';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { NotificationSeverity } from '../../notifications/enums/notification-severity.enum';

export interface SeedInstitution {
  name: string;
  registrationNumber: string;
  institutionType: string;
  state: string;
  district: string;
  pincode: string;
  address: string;
}

export interface SeedUser {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  institutionRegistrationNumber?: string;
  regionalOffice?: string;
  isActive?: boolean;
}

export interface SeedApplication {
  applicationNumber: string;
  institutionRegistrationNumber: string;
  academicYear: string;
  status: ApplicationStatus;
  programType: string;
  payloadJsonb: Record<string, unknown>;
  submittedAt?: Date;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
}

export interface SeedDocument {
  applicationNumber: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  fileHashSha256: string;
  processingStatus: DocumentProcessingStatus;
  metadata: Record<string, unknown>;
}

export interface SeedAuditLog {
  applicationNumber: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;
  payloadSnapshot: Record<string, unknown>;
  previousHash: string;
  leafHash: string;
  currentHash: string;
}

export interface SeedSlaTimer {
  applicationNumber: string;
  stage: ApplicationStatus;
  tier: SlaTier;
  targetDeadline: Date;
  isBreached: boolean;
}

export interface SeedRuleSet {
  code: string;
  name: string;
  description: string;
  applicationCategory: string;
  issuingAuthority: string;
}

export interface SeedRuleVersion {
  ruleSetCode: string;
  versionNumber: number;
  status: RuleLifecycleStatus;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  sourceTitle: string;
  sourceReference: string;
  sourceClassification: RuleSourceClassification;
  changeSummary?: string;
}

export interface SeedRegulatoryRule {
  ruleSetCode: string;
  versionNumber: number;
  ruleCode: string;
  title: string;
  description: string;
  ruleType: RuleType;
  severity: ComplianceSeverity;
  parametersJsonb: Record<string, unknown>;
  sourceClause?: string;
  sourceClassification?: RuleSourceClassification;
}

export interface SeedChecklistTemplate {
  ruleSetCode: string;
  versionNumber: number;
  code: string;
  name: string;
  description?: string;
  applicationCategory: string;
}

export interface SeedChecklistItem {
  templateCode: string;
  itemCode: string;
  description: string;
  itemType: ChecklistItemType;
  required: boolean;
  evidenceDocumentType?: string;
  displayOrder: number;
  ruleCode?: string;
  guidanceNotes?: string;
}

export interface SeedUndertaking {
  institutionRegistrationNumber: string;
  applicationNumber?: string;
  type: UndertakingType;
  status: UndertakingStatus;
  reviewStatus: UndertakingReviewStatus;
  title: string;
  description?: string;
  documentNumber: string;
  issuingAuthority: string;
  counterpartyName?: string;
  startDate: string;
  expiryDate: string;
  renewalLeadDays: number;
  renewalDueDate?: string;
  metadataJsonb?: Record<string, unknown>;
}

export interface SeedEvcSchedule {
  applicationNumber: string;
  institutionRegistrationNumber: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  visitType: 'PHYSICAL_ON_SITE' | 'VIRTUAL_HYBRID';
  proposedVisitDate: string;
  scheduledVisitDate?: string;
  committeeMembers: {
    name: string;
    designation: string;
    affiliation: string;
    role:
      | 'CHAIRMAN'
      | 'EXPERT_MEMBER'
      | 'ARCHITECT_EXPERT'
      | 'AICTE_REPRESENTATIVE';
    email?: string;
    phone?: string;
    conflictOfInterestDeclared: boolean;
  }[];
  visitNotes?: string;
  outcomeSummary?: string;
  recommendation:
    | 'PENDING'
    | 'RECOMMEND_APPROVAL'
    | 'DEFICIENCY_OBSERVED'
    | 'ESCALATE_TO_SHC';
  scheduledBy?: string;
}

export interface SeedNotification {
  targetRole?: UserRole;
  institutionRegistrationNumber?: string;
  applicationNumber?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  isRead?: boolean;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export const SEED_INSTITUTIONS: SeedInstitution[] = [
  {
    name: 'Apex Institute of Technology & Engineering (DEMO/SYNTHETIC)',
    registrationNumber: 'DEMO-INST-2026-001',
    institutionType: 'Engineering & Technology',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411001',
    address: 'Plot 42, Knowledge Park, Pune (DEMO)',
  },
  {
    name: 'National Polytechnic College (DEMO/SYNTHETIC)',
    registrationNumber: 'DEMO-INST-2026-002',
    institutionType: 'Polytechnic',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    pincode: '560001',
    address: 'Sector 7, Tech Enclave, Bengaluru (DEMO)',
  },
];

export const SEED_USERS: SeedUser[] = [
  {
    name: 'Demo System Administrator',
    email: 'demo.admin@synthetic.approvalsync.local',
    role: UserRole.SYSTEM_ADMIN,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    isActive: true,
  },
  {
    name: 'Demo Institution Representative',
    email: 'demo.institution@synthetic.approvalsync.local',
    role: UserRole.INSTITUTION_USER,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    isActive: true,
  },
  {
    name: 'Demo Institution Representative College B',
    email: 'college.b@synthetic.approvalsync.local',
    role: UserRole.INSTITUTION_USER,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    isActive: true,
  },
  {
    name: 'Demo Scrutiny Officer',
    email: 'demo.scrutiny@synthetic.approvalsync.local',
    role: UserRole.SCRUTINY_OFFICER,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    regionalOffice: 'Western Regional Office (WRO)',
    isActive: true,
  },
  {
    name: 'Demo Regional Officer',
    email: 'demo.regional@synthetic.approvalsync.local',
    role: UserRole.REGIONAL_OFFICER,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    regionalOffice: 'Western Regional Office (WRO)',
    isActive: true,
  },
  {
    name: 'Demo Inactive User',
    email: 'demo.inactive@synthetic.approvalsync.local',
    role: UserRole.INSTITUTION_USER,
    passwordHash:
      '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    isActive: false,
  },
];

/**
 * Core Evaluation Scenarios (AICTE Problem Statement 26262):
 * 1. Newly submitted application awaiting scrutiny (APP-2026-DEMO-001)
 * 2. Application with missing/expired document (APP-2026-DEMO-002)
 * 3. Application awaiting clarification or re-scrutiny (APP-2026-DEMO-003)
 * 4. Application with upcoming compliance deadline (APP-2026-DEMO-004)
 * 5. Overdue compliance item requiring escalation (APP-2026-DEMO-005)
 * 6. Application with EVC visit scheduled (APP-2026-DEMO-006)
 */
export const SEED_APPLICATIONS: SeedApplication[] = [
  // Scenario 1: Newly submitted application awaiting initial scrutiny
  {
    applicationNumber: 'APP-2026-DEMO-001',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.SUBMITTED,
    programType: 'Undergraduate Engineering (B.Tech)',
    payloadJsonb: {
      facultyCount: 48,
      landAreaAcres: 12.5,
      builtUpAreaSqMeters: 8500,
      scenario: 'Scenario 1: Newly submitted application awaiting scrutiny',
      demoNote:
        'Submitted recently by Apex Institute; pending Scrutiny Officer assignment.',
    },
    submittedAt: new Date('2026-10-27T10:00:00.000Z'),
    assignedOfficerName: 'Awaiting Officer Assignment',
  },
  // Scenario 2: Under scrutiny review with missing or expired document
  {
    applicationNumber: 'APP-2026-DEMO-002',
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    academicYear: '2026-2027',
    status: ApplicationStatus.UNDER_SCRUTINY,
    programType: 'Diploma in Engineering',
    payloadJsonb: {
      facultyCount: 24,
      landAreaAcres: 6.0,
      builtUpAreaSqMeters: 4200,
      scenario: 'Scenario 2: Application with a missing or expired document',
      missingDocumentNote:
        'Annual Fire Safety No-Objection Certificate expired; Building Plan pending verification.',
    },
    submittedAt: new Date('2026-10-01T10:00:00.000Z'),
    assignedOfficerId: 'scrutiny-officer-01',
    assignedOfficerName: 'Dr. S. K. Sharma (Scrutiny Desk)',
  },
  // Scenario 3: Clarification resubmitted; awaiting re-scrutiny
  {
    applicationNumber: 'APP-2026-DEMO-003',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.RESUBMITTED,
    programType: 'Postgraduate Engineering (M.Tech Computer Science)',
    payloadJsonb: {
      facultyCount: 20,
      landAreaAcres: 8.5,
      builtUpAreaSqMeters: 6200,
      scenario: 'Scenario 3: Application awaiting clarification or re-scrutiny',
      deficiencyResolutionNote:
        'Rectified Format 1 Affidavit and updated laboratory rosters submitted.',
    },
    submittedAt: new Date('2026-09-20T11:00:00.000Z'),
    assignedOfficerId: 'scrutiny-officer-01',
    assignedOfficerName: 'Dr. S. K. Sharma (Scrutiny Desk)',
  },
  // Scenario 4: Under scrutiny with upcoming compliance renewal deadline
  {
    applicationNumber: 'APP-2026-DEMO-004',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.UNDER_SCRUTINY,
    programType: 'Undergraduate Artificial Intelligence & Data Science',
    payloadJsonb: {
      facultyCount: 36,
      landAreaAcres: 10.0,
      builtUpAreaSqMeters: 7500,
      scenario: 'Scenario 4: Application with an upcoming compliance deadline',
      complianceNotice:
        'Prescribed Compliance Undertaking renewal due within 15 days.',
    },
    submittedAt: new Date('2026-10-10T14:30:00.000Z'),
    assignedOfficerId: 'scrutiny-officer-02',
    assignedOfficerName: 'Prof. A. R. Verma (Scrutiny Desk)',
  },
  // Scenario 5: Overdue compliance item requiring regulatory escalation
  {
    applicationNumber: 'APP-2026-DEMO-005',
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    academicYear: '2026-2027',
    status: ApplicationStatus.DEFICIENCY_ISSUED,
    programType: 'Vocational Technical & Skill Programs',
    payloadJsonb: {
      facultyCount: 16,
      landAreaAcres: 5.5,
      builtUpAreaSqMeters: 3900,
      scenario: 'Scenario 5: Overdue compliance item requiring escalation',
      escalationNote:
        'Campus temporary annex lease deed expired 30+ days ago. Tier 2 escalation raised.',
    },
    submittedAt: new Date('2026-08-20T09:00:00.000Z'),
    assignedOfficerId: 'regional-officer-01',
    assignedOfficerName: 'Dr. V. N. Patil (Regional Directorate)',
  },
  // Scenario 6: Cleared scrutiny; EVC committee inspection scheduled
  {
    applicationNumber: 'APP-2026-DEMO-006',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.RECOMMENDED_FOR_EVC,
    programType: 'Autonomous Technical Campus',
    payloadJsonb: {
      facultyCount: 64,
      landAreaAcres: 16.0,
      builtUpAreaSqMeters: 13500,
      scenario: 'Scenario 6: Application with an EVC visit scheduled',
      evcDetails:
        'Documentary scrutiny completed. On-site Expert Visit Committee assigned for 2026-11-15.',
    },
    submittedAt: new Date('2026-09-01T12:00:00.000Z'),
    assignedOfficerId: 'evc-team-wro',
    assignedOfficerName: 'EVC Team Western Zone (3 Experts)',
  },
];

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    applicationNumber: 'APP-2026-DEMO-001',
    documentType: 'LAND_DOCUMENT',
    fileName: 'apex_institute_land_title_deed.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1542000,
    storagePath: '/demo/documents/app1/land_deed.pdf',
    fileHashSha256:
      'c1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    processingStatus: DocumentProcessingStatus.UPLOADED,
    metadata: { verified: true, synthetic: true, pages: 6 },
  },
  {
    applicationNumber: 'APP-2026-DEMO-002',
    documentType: 'LAND_DOCUMENT',
    fileName: 'demo_land_title_deed.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1048576,
    storagePath: '/demo/documents/app2/land_deed.pdf',
    fileHashSha256:
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    processingStatus: DocumentProcessingStatus.UPLOADED,
    metadata: { verified: false, synthetic: true, pages: 4 },
  },
  {
    applicationNumber: 'APP-2026-DEMO-002',
    documentType: 'FIRE_SAFETY_CERTIFICATE',
    fileName: 'fire_safety_noc_expired.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 842100,
    storagePath: '/demo/documents/app2/fire_noc.pdf',
    fileHashSha256:
      'a9b8c7d6e5f4a9b8c7d6e5f4a9b8c7d6e5f4a9b8c7d6e5f4a9b8c7d6e5f4a9b8',
    processingStatus: DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
    metadata: { expired: true, expiryDate: '2026-06-30', synthetic: true },
  },
  {
    applicationNumber: 'APP-2026-DEMO-003',
    documentType: 'AFFIDAVIT_UNDERTAKING',
    fileName: 'rectified_format_1_affidavit.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1204000,
    storagePath: '/demo/documents/app3/rectified_affidavit.pdf',
    fileHashSha256:
      'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2',
    processingStatus: DocumentProcessingStatus.UPLOADED,
    metadata: { rectification: true, formatId: 'FORMAT-1', synthetic: true },
  },
  {
    applicationNumber: 'APP-2026-DEMO-006',
    documentType: 'BUILDING_PLAN_APPROVAL',
    fileName: 'master_infrastructure_blueprint.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 3450000,
    storagePath: '/demo/documents/app6/blueprint.pdf',
    fileHashSha256:
      'd4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3',
    processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
    metadata: { approvedByTownPlanning: true, synthetic: true },
  },
];

export const SEED_AUDIT_LOGS: SeedAuditLog[] = [
  {
    applicationNumber: 'APP-2026-DEMO-001',
    actorId: 'usr-demo-001',
    actorRole: UserRole.INSTITUTION_USER,
    eventType: 'APPLICATION_SUBMITTED',
    payloadSnapshot: {
      applicationNumber: 'APP-2026-DEMO-001',
      action: 'SUBMIT',
      submittedAt: '2026-10-27T10:00:00.000Z',
    },
    previousHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    leafHash:
      '3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b',
    currentHash:
      '9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
  },
  {
    applicationNumber: 'APP-2026-DEMO-002',
    actorId: 'usr-demo-002',
    actorRole: UserRole.INSTITUTION_USER,
    eventType: 'APPLICATION_SUBMITTED',
    payloadSnapshot: {
      applicationNumber: 'APP-2026-DEMO-002',
      action: 'SUBMIT',
      submittedAt: '2026-10-01T10:00:00.000Z',
    },
    previousHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    leafHash:
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    currentHash:
      '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
  },
  {
    applicationNumber: 'APP-2026-DEMO-003',
    actorId: 'usr-demo-001',
    actorRole: UserRole.INSTITUTION_USER,
    eventType: 'APPLICATION_RESUBMITTED',
    payloadSnapshot: {
      applicationNumber: 'APP-2026-DEMO-003',
      action: 'RESUBMIT',
      resubmittedAt: '2026-10-22T14:00:00.000Z',
    },
    previousHash:
      '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    leafHash:
      '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    currentHash:
      '8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e',
  },
];

export const SEED_SLA_TIMERS: SeedSlaTimer[] = [
  {
    applicationNumber: 'APP-2026-DEMO-001',
    stage: ApplicationStatus.SUBMITTED,
    tier: SlaTier.TIER_1_RO_ALERT,
    targetDeadline: new Date('2026-11-05T18:00:00.000Z'),
    isBreached: false,
  },
  {
    applicationNumber: 'APP-2026-DEMO-002',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_1_RO_ALERT,
    targetDeadline: new Date('2026-10-15T18:00:00.000Z'),
    isBreached: true,
  },
  {
    applicationNumber: 'APP-2026-DEMO-004',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_1_RO_ALERT,
    targetDeadline: new Date('2026-11-12T18:00:00.000Z'),
    isBreached: false,
  },
  {
    applicationNumber: 'APP-2026-DEMO-006',
    stage: ApplicationStatus.RECOMMENDED_FOR_EVC,
    tier: SlaTier.TIER_1_RO_ALERT,
    targetDeadline: new Date('2026-11-20T18:00:00.000Z'),
    isBreached: false,
  },
];

export const SEED_RULE_SETS: SeedRuleSet[] = [
  {
    code: 'AICTE-APH-2026-27',
    name: 'Approval Process Handbook 2026-27 Norms',
    description:
      'Prescribed AICTE statutory norms governing land tenure, building specifications, laboratory equipment, and faculty cadres.',
    applicationCategory: 'TECHNICAL_CAMPUS',
    issuingAuthority: 'Regulation Bureau, AICTE New Delhi',
  },
  {
    code: 'AICTE-APH-POLY-2026',
    name: 'Approval Process Handbook 2026-27 Polytechnic Norms',
    description:
      'Norms for diploma-level engineering and technology institutions.',
    applicationCategory: 'POLYTECHNIC',
    issuingAuthority: 'Regulation Bureau, AICTE New Delhi',
  },
];

export const SEED_RULE_VERSIONS: SeedRuleVersion[] = [
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    status: RuleLifecycleStatus.PUBLISHED,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Approval Process Handbook 2026-27',
    sourceReference: 'AICTE/AB/APH/2026-27/Chapter-1',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
    changeSummary:
      'Mandatory 30-year lease with minimum 25-year live residual tenure.',
  },
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 2,
    status: RuleLifecycleStatus.DRAFT,
    effectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Approval Process Handbook 2027-28 (Proposed)',
    sourceReference: 'AICTE/AB/APH/2027-28/Draft',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
    changeSummary: 'Proposed updates for virtual lab simulations.',
  },
  {
    ruleSetCode: 'AICTE-APH-POLY-2026',
    versionNumber: 1,
    status: RuleLifecycleStatus.PUBLISHED,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Polytechnic Norms Handbook 2026-27',
    sourceReference: 'AICTE/AB/POLY/2026-27/Chapter-2',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
    changeSummary: 'Baseline polytechnic laboratory and land norms.',
  },
];

export const SEED_REGULATORY_RULES: SeedRegulatoryRule[] = [
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    ruleCode: 'RULE-LAND-01',
    title: 'Minimum Registered Land Lease Duration & Live Validity',
    description:
      'Institutions operating on leased land must possess a registered lease deed of at least 30 years duration with at least 25 years remaining live validity.',
    ruleType: RuleType.INFRASTRUCTURE_LAND,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      minimumTotalLeaseYears: 30,
      minimumRemainingLiveYears: 25,
      requiresRegisteredDeed: true,
    },
    sourceClause: 'Chapter I, Clause 1.4.3',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
  },
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    ruleCode: 'RULE-LAND-02',
    title: 'Contiguous Campus Land Area Requirement',
    description:
      'Technical campuses in Urban/Mega areas require minimum 7.5 contiguous acres of unencumbered land.',
    ruleType: RuleType.INFRASTRUCTURE_LAND,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      minAcresUrban: 7.5,
      minAcresRural: 10.0,
      requiresContiguous: true,
    },
    sourceClause: 'Chapter I, Clause 1.4.1',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
  },
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    ruleCode: 'RULE-SAFETY-01',
    title: 'Annual Fire Safety No-Objection Certificate',
    description:
      'Valid Fire Safety NOC from State/Municipal Fire Services Authority is mandatory before inspection.',
    ruleType: RuleType.INFRASTRUCTURE_BUILTUP,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      requiredIssuingAuthority: 'STATE_OR_MUNICIPAL_FIRE_SERVICE',
      validityYears: 1,
    },
    sourceClause: 'Chapter I, Clause 1.5.2',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
  },
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    ruleCode: 'RULE-FACULTY-01',
    title: 'Student-to-Faculty Ratio & Cadre Proportion',
    description:
      'Prescribed faculty ratio of 1:20 in engineering degree programs with Cadre Ratio 1:2:6.',
    ruleType: RuleType.FACULTY_RATIO,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      maxStudentToFacultyRatio: 20,
      cadreRatio: '1:2:6',
    },
    sourceClause: 'Chapter VII, Clause 7.1',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
  },
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    ruleCode: 'RULE-BARRIER-01',
    title: 'Barrier-Free Physical Environment for Divyangjan',
    description:
      'Ramps, lifts, disabled-accessible washrooms, and braille signage are statutory requirements.',
    ruleType: RuleType.BARRIER_FREE_ENVIRONMENT,
    severity: ComplianceSeverity.ADVISORY_FLAG,
    parametersJsonb: {
      requiresRamps: true,
      requiresLifts: true,
      requiresDisabledToilets: true,
    },
    sourceClause: 'Chapter I, Clause 1.6.4',
    sourceClassification: RuleSourceClassification.VERIFIED_REGULATORY,
  },
];

export const SEED_CHECKLIST_TEMPLATES: SeedChecklistTemplate[] = [
  {
    ruleSetCode: 'AICTE-APH-2026-27',
    versionNumber: 1,
    code: 'CHK-ENGG-UG-INTAKE',
    name: 'Undergraduate Engineering Program Scrutiny Checklist',
    description:
      'Standard documentary checklist for new undergraduate engineering programs.',
    applicationCategory: 'TECHNICAL_CAMPUS',
  },
  {
    ruleSetCode: 'AICTE-APH-POLY-2026',
    versionNumber: 1,
    code: 'CHK-POLY-DIP-INTAKE',
    name: 'Polytechnic Diploma Program Scrutiny Checklist',
    description:
      'Standard documentary checklist for diploma technical institutes.',
    applicationCategory: 'POLYTECHNIC',
  },
];

export const SEED_CHECKLIST_ITEMS: SeedChecklistItem[] = [
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-LAND-DEED',
    description:
      'Registered Land Title Deed or Registered Lease Deed (Min 30-year duration)',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'LAND_TITLE_DEED',
    displayOrder: 10,
    ruleCode: 'RULE-LAND-01',
    guidanceNotes:
      'Verify registered date, remaining validity >= 25 years, and lessor title.',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-LAND-CONVERSION',
    description:
      'Government Land Use Conversion Certificate for Educational Purposes',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'LAND_USE_CERTIFICATE',
    displayOrder: 20,
    ruleCode: 'RULE-LAND-02',
    guidanceNotes:
      'Non-Agricultural (NA) permission from Competent Revenue Authority.',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-FIRE-NOC',
    description: 'Current Valid Fire Safety Certificate (Form B)',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'FIRE_SAFETY_CERTIFICATE',
    displayOrder: 30,
    ruleCode: 'RULE-SAFETY-01',
    guidanceNotes:
      'Verify certificate validity period and building occupancy classification.',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-FACULTY-LIST',
    description: 'Faculty Cadre and Student-to-Faculty Ratio Declaration',
    itemType: ChecklistItemType.INFRASTRUCTURE_METRIC,
    required: true,
    displayOrder: 40,
    ruleCode: 'RULE-FACULTY-01',
    guidanceNotes:
      'Verify qualification certificates and cadre proportions (Professor : Associate : Assistant).',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-BARRIER-FREE',
    description:
      'Architect Certificate verifying Barrier-Free Environment (Ramps, Lifts, Toilets)',
    itemType: ChecklistItemType.AFFIDAVIT_UNDERTAKING,
    required: true,
    displayOrder: 50,
    ruleCode: 'RULE-BARRIER-01',
    guidanceNotes:
      'Certificate from registered architect under Council of Architecture (COA).',
  },
  {
    templateCode: 'CHK-POLY-DIP-INTAKE',
    itemCode: 'CHK-POLY-LAND-DEED',
    description: 'Registered Land Deed for Polytechnic Campus',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'LAND_TITLE_DEED',
    displayOrder: 10,
    ruleCode: 'RULE-LAND-01',
    guidanceNotes: 'Demo verification of polytechnic land documents.',
  },
];

export const SEED_UNDERTAKINGS: SeedUndertaking[] = [
  {
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    type: UndertakingType.LAND_LEASE,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: '30-Year Registered Land Lease Deed (Haveli Survey No. 452/1)',
    description:
      'Registered lease for 7.5 contiguous acres granted by Maharashtra Industrial Development Corporation.',
    documentNumber: 'DEED-MAH-2020-8841',
    issuingAuthority: 'Sub-Registrar Haveli, Pune',
    counterpartyName: 'Maharashtra Industrial Development Corporation (MIDC)',
    startDate: '2020-01-15',
    expiryDate: '2050-01-14',
    renewalLeadDays: 180,
    renewalDueDate: '2049-07-18',
    metadataJsonb: {
      surveyNumber: '452/1',
      contiguousAcres: 7.5,
      isSyntheticDemo: true,
    },
  },
  {
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    applicationNumber: 'APP-2026-DEMO-001',
    type: UndertakingType.AFFIDAVIT_UNDERTAKING,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: 'AICTE Prescribed Compliance & Anti-Ragging Affidavit (Format 1)',
    description:
      'Statutory institutional undertaking affirming adherence to AICTE Approval Process Handbook norms.',
    documentNumber: 'AFF-PUN-2026-0042',
    issuingAuthority: 'Notary Public, Pune District Court',
    counterpartyName: 'Member Secretary, AICTE',
    startDate: '2026-01-01',
    expiryDate: '2027-01-01',
    renewalLeadDays: 30,
    renewalDueDate: '2026-12-02',
    metadataJsonb: {
      formatId: 'FORMAT-1',
      notaryRegistration: 'NOTARY-MAH-4412',
      isSyntheticDemo: true,
    },
  },
  {
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    applicationNumber: 'APP-2026-DEMO-004',
    type: UndertakingType.FIRE_SAFETY_CLEARANCE,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: 'State Fire Service Annual Fire Safety No-Objection Certificate',
    description:
      'Annual building safety clearance for academic and administrative blocks. Renewal due soon.',
    documentNumber: 'FIRE-PUN-2025-9921',
    issuingAuthority: 'Pune Municipal Fire Brigade',
    counterpartyName: 'Director of Fire Services, Maharashtra',
    startDate: '2025-11-20',
    expiryDate: '2026-11-20',
    renewalLeadDays: 30,
    renewalDueDate: '2026-10-21',
    metadataJsonb: {
      buildingBlocks: ['Block A (Academic)', 'Block B (Laboratories)'],
      isSyntheticDemo: true,
      scenario: 'Scenario 4: Upcoming renewal deadline',
    },
  },
  {
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    applicationNumber: 'APP-2026-DEMO-005',
    type: UndertakingType.BUILDING_LEASE,
    status: UndertakingStatus.EXPIRED,
    reviewStatus: UndertakingReviewStatus.DEFICIENT,
    title: 'Short-Term Temporary Workshop Annex Lease (Expired)',
    description:
      'Expired lease agreement for temporary mechanical workshop annex. Breached statutory renewal window.',
    documentNumber: 'LEASE-PUN-2023-0104',
    issuingAuthority: 'Sub-Registrar Kothrud',
    counterpartyName: 'Kothrud Industrial Estate Pvt Ltd',
    startDate: '2023-01-01',
    expiryDate: '2024-01-01',
    renewalLeadDays: 90,
    renewalDueDate: '2023-10-03',
    metadataJsonb: {
      expiredRemark: 'Breached statutory renewal window. Escalation raised.',
      isSyntheticDemo: true,
      scenario: 'Scenario 5: Overdue compliance item requiring escalation',
    },
  },
];

/**
 * Synthetic EVC Inspection Schedules (Scenario 6)
 */
export const SEED_EVC_SCHEDULES: SeedEvcSchedule[] = [
  {
    applicationNumber: 'APP-2026-DEMO-006',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    status: 'SCHEDULED',
    visitType: 'PHYSICAL_ON_SITE',
    proposedVisitDate: '2026-11-15T10:00:00.000Z',
    scheduledVisitDate: '2026-11-15T10:00:00.000Z',
    committeeMembers: [
      {
        name: 'Prof. Anirudh K. Joshi',
        designation: 'Senior Professor & Dean of Academics',
        affiliation: 'Indian Institute of Technology Bombay',
        role: 'CHAIRMAN',
        email: 'anirudh.joshi@iitb.ac.in',
        phone: '+91 98201 12345',
        conflictOfInterestDeclared: false,
      },
      {
        name: 'Dr. Meenakshi Sundaram',
        designation: 'Professor, Mechanical Engineering',
        affiliation: 'College of Engineering Pune (COEP)',
        role: 'EXPERT_MEMBER',
        email: 'm.sundaram@coep.ac.in',
        phone: '+91 94220 54321',
        conflictOfInterestDeclared: false,
      },
      {
        name: 'Ar. Rajeshwar Rao',
        designation: 'Registered Senior Architect (COA)',
        affiliation: 'Council of Architecture Nominee',
        role: 'ARCHITECT_EXPERT',
        email: 'rajeshwar.rao@coa.gov.in',
        phone: '+91 98110 98765',
        conflictOfInterestDeclared: false,
      },
    ],
    visitNotes:
      'Physical inspection of engineering laboratories, barrier-free access ramps, fire safety systems, and library holdings.',
    outcomeSummary:
      'Preliminary documentary inspection complete; awaiting on-site visit.',
    recommendation: 'PENDING',
    scheduledBy:
      'REGIONAL_OFFICER (demo.regional@synthetic.approvalsync.local)',
  },
];

/**
 * Synthetic In-App Notifications for Scenario Walkthrough
 */
export const SEED_NOTIFICATIONS: SeedNotification[] = [
  {
    targetRole: UserRole.SCRUTINY_OFFICER,
    applicationNumber: 'APP-2026-DEMO-001',
    type: NotificationType.DEADLINE_REMINDER,
    severity: NotificationSeverity.INFO,
    title: 'New Application Submitted: APP-2026-DEMO-001',
    message:
      'Apex Institute has submitted application APP-2026-DEMO-001 for B.Tech Intake. Scrutiny assignment required.',
    link: '/scrutiny/APP-2026-DEMO-001',
    idempotencyKey: 'seed_notif_app1_submitted',
    metadata: {
      applicationNumber: 'APP-2026-DEMO-001',
      scenario: 'Scenario 1',
    },
  },
  {
    targetRole: UserRole.SCRUTINY_OFFICER,
    applicationNumber: 'APP-2026-DEMO-002',
    type: NotificationType.SLA_WARNING,
    severity: NotificationSeverity.WARNING,
    title: 'SLA Warning: APP-2026-DEMO-002 Near Deadline',
    message:
      'Application APP-2026-DEMO-002 has reached 80% of Scrutiny review window (24h remaining). Document discrepancy noted.',
    link: '/scrutiny/APP-2026-DEMO-002',
    idempotencyKey: 'seed_notif_app2_sla_warning',
    metadata: {
      applicationNumber: 'APP-2026-DEMO-002',
      scenario: 'Scenario 2',
    },
  },
  {
    targetRole: UserRole.SCRUTINY_OFFICER,
    applicationNumber: 'APP-2026-DEMO-003',
    type: NotificationType.DEFICIENCY_NOTICE,
    severity: NotificationSeverity.INFO,
    title: 'Clarification Resubmitted: APP-2026-DEMO-003',
    message:
      'Apex Institute has uploaded rectified compliance evidence. Ready for Re-Scrutiny evaluation.',
    link: '/scrutiny/APP-2026-DEMO-003',
    idempotencyKey: 'seed_notif_app3_resubmitted',
    metadata: {
      applicationNumber: 'APP-2026-DEMO-003',
      scenario: 'Scenario 3',
    },
  },
  {
    targetRole: UserRole.INSTITUTION_USER,
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    applicationNumber: 'APP-2026-DEMO-004',
    type: NotificationType.DEADLINE_REMINDER,
    severity: NotificationSeverity.WARNING,
    title: 'Upcoming Compliance Deadline: Fire Safety Clearance',
    message:
      'Annual Fire Safety No-Objection Certificate renewal is due in 15 days. Please ensure timely submission.',
    link: '/undertakings',
    idempotencyKey: 'seed_notif_app4_renewal_reminder',
    metadata: { scenario: 'Scenario 4' },
  },
  {
    targetRole: UserRole.REGIONAL_OFFICER,
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    applicationNumber: 'APP-2026-DEMO-005',
    type: NotificationType.COMPLIANCE_OVERDUE,
    severity: NotificationSeverity.CRITICAL,
    title: 'Overdue Compliance Escalation: Workshop Annex Lease',
    message:
      'Statutory lease agreement for National Polytechnic Annex has expired. Tier 2 escalation logged.',
    link: '/undertakings',
    idempotencyKey: 'seed_notif_app5_compliance_overdue',
    metadata: { scenario: 'Scenario 5' },
  },
  {
    targetRole: UserRole.REGIONAL_OFFICER,
    applicationNumber: 'APP-2026-DEMO-006',
    type: NotificationType.EVC_SCHEDULED,
    severity: NotificationSeverity.INFO,
    title: 'EVC Inspection Scheduled: APP-2026-DEMO-006',
    message:
      'Expert Visit Committee on-site inspection confirmed for 15-Nov-2026. 3 committee members notified.',
    link: '/evc/APP-2026-DEMO-006',
    idempotencyKey: 'seed_notif_app6_evc_scheduled',
    metadata: { scenario: 'Scenario 6' },
  },
];
