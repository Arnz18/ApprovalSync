/**
 * ApprovalSync — Synthetic Seed Data Definition
 * Milestone: BE-02
 *
 * Synthetic, clearly labeled demo records for local development validation.
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
    // Synthetic bcrypt hash for demo password 'DemoPass@123'
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

export const SEED_APPLICATIONS: SeedApplication[] = [
  {
    applicationNumber: 'APP-2026-DEMO-001',
    institutionRegistrationNumber: 'DEMO-INST-2026-001',
    academicYear: '2026-2027',
    status: ApplicationStatus.DRAFT,
    programType: 'Undergraduate Engineering',
    payloadJsonb: {
      facultyCount: 48,
      landAreaAcres: 12.5,
      builtUpAreaSqMeters: 8500,
      demoNote: 'Synthetic draft application payload for schema validation',
    },
  },
  {
    applicationNumber: 'APP-2026-DEMO-002',
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    academicYear: '2026-2027',
    status: ApplicationStatus.SUBMITTED,
    programType: 'Diploma in Engineering',
    payloadJsonb: {
      facultyCount: 24,
      landAreaAcres: 6.0,
      builtUpAreaSqMeters: 4200,
      demoNote: 'Synthetic submitted application payload for schema validation',
    },
    submittedAt: new Date('2026-10-01T10:00:00.000Z'),
  },
];

export const SEED_DOCUMENTS: SeedDocument[] = [
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
    metadata: {
      verified: false,
      synthetic: true,
      pages: 4,
    },
  },
];

export const SEED_AUDIT_LOGS: SeedAuditLog[] = [
  {
    applicationNumber: 'APP-2026-DEMO-002',
    actorId: 'usr-demo-001',
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
];

export const SEED_SLA_TIMERS: SeedSlaTimer[] = [
  {
    applicationNumber: 'APP-2026-DEMO-002',
    stage: ApplicationStatus.UNDER_SCRUTINY,
    tier: SlaTier.TIER_1_RO_ALERT,
    targetDeadline: new Date('2026-10-15T18:00:00.000Z'),
    isBreached: false,
  },
];

export const SEED_RULE_SETS: SeedRuleSet[] = [
  {
    code: 'RULESET-ENGG-UG',
    name: 'AICTE Undergraduate Engineering Regulatory Norms',
    description:
      'Regulatory norms covering land, built-up area, and faculty cadre ratios for UG Engineering colleges (APH 2024-2027 cycle)',
    applicationCategory: 'Undergraduate Engineering',
    issuingAuthority: 'AICTE',
  },
  {
    code: 'RULESET-POLY-DIP',
    name: 'AICTE Diploma in Engineering Norms (Demo)',
    description:
      'Illustrative prototype norms for Polytechnic and Diploma institutions',
    applicationCategory: 'Diploma in Engineering',
    issuingAuthority: 'AICTE',
  },
];

export const SEED_RULE_VERSIONS: SeedRuleVersion[] = [
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    status: RuleLifecycleStatus.PUBLISHED,
    effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Approval Process Handbook (APH) 2024-2027',
    sourceReference: 'AICTE APH 2024-27 Chapter 1 & 2',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
    changeSummary:
      'Baseline regulatory norms under APH 2024-2027 cycle. Subject to human review.',
  },
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 2,
    status: RuleLifecycleStatus.DRAFT,
    effectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Approval Process Handbook (Draft 2027 Revision)',
    sourceReference: 'Draft Working Document 2027',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
    changeSummary:
      'Draft revision exploring revised sustainable built-up requirements.',
  },
  {
    ruleSetCode: 'RULESET-POLY-DIP',
    versionNumber: 1,
    status: RuleLifecycleStatus.PUBLISHED,
    effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
    effectiveTo: null,
    sourceTitle: 'AICTE Prototype Diploma Regulations (Illustrative)',
    sourceReference: 'Hackathon Prototype Rulebook',
    sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
    changeSummary: 'Synthetic demo rulebook for polytechnic evaluation.',
  },
];

export const SEED_REGULATORY_RULES: SeedRegulatoryRule[] = [
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    ruleCode: 'RULE-LAND-01',
    title: 'Minimum Land Requirement for Rural UG Engineering',
    description:
      'Institutions situated in non-metro/rural areas must possess a contiguous land parcel of at least 7.5 acres.',
    ruleType: RuleType.INFRASTRUCTURE_LAND,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      minLandAcres: 7.5,
      areaType: 'RURAL',
      contiguousRequired: true,
    },
    sourceClause: 'APH 2024-27 Clause 1.4.1',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  },
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    ruleCode: 'RULE-BUILTUP-01',
    title: 'Minimum Built-up Area for Engineering Intake',
    description:
      'Institutions with approved intake up to 300 students must maintain at least 4,000 square meters of instructional and administrative built-up space.',
    ruleType: RuleType.INFRASTRUCTURE_BUILTUP,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      minBuiltUpAreaSqMeters: 4000,
      baseStudentIntake: 300,
    },
    sourceClause: 'APH 2024-27 Clause 1.4.3',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  },
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    ruleCode: 'RULE-FACULTY-01',
    title: 'Student to Faculty Cadre Ratio',
    description:
      'The overall full-time student-to-faculty ratio in undergraduate engineering courses must not exceed 20:1.',
    ruleType: RuleType.FACULTY_RATIO,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      maxStudentFacultyRatio: 20,
      cadreRatioCadreBreakdown: '1:2:6',
    },
    sourceClause: 'APH 2024-27 Clause 2.1.2',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  },
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    ruleCode: 'RULE-BARRIER-01',
    title: 'Barrier-Free Environment and Accessibility',
    description:
      'Campus must incorporate ramps, accessible elevators, and disabled-friendly sanitary facilities.',
    ruleType: RuleType.BARRIER_FREE_ENVIRONMENT,
    severity: ComplianceSeverity.ADVISORY_FLAG,
    parametersJsonb: {
      rampsRequired: true,
      accessibleToiletsRequired: true,
      liftMandatoryForAboveGPlus1: true,
    },
    sourceClause: 'APH 2024-27 Clause 1.5',
    sourceClassification:
      RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
  },
  {
    ruleSetCode: 'RULESET-POLY-DIP',
    versionNumber: 1,
    ruleCode: 'RULE-POLY-LAND-01',
    title: 'Minimum Land Requirement for Diploma Institutions (Demo)',
    description:
      'Polytechnic institutions must possess at least 4.0 acres of educational land.',
    ruleType: RuleType.INFRASTRUCTURE_LAND,
    severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
    parametersJsonb: {
      minLandAcres: 4.0,
    },
    sourceClause: 'Demo Poly Rulebook Clause 1.1',
    sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
  },
];

export const SEED_CHECKLIST_TEMPLATES: SeedChecklistTemplate[] = [
  {
    ruleSetCode: 'RULESET-ENGG-UG',
    versionNumber: 1,
    code: 'CHK-ENGG-UG-INTAKE',
    name: 'UG Engineering Mandatory Intake Checklist',
    description:
      'Mandatory documentary evidence and metric declarations required for UG engineering approval',
    applicationCategory: 'Undergraduate Engineering',
  },
  {
    ruleSetCode: 'RULESET-POLY-DIP',
    versionNumber: 1,
    code: 'CHK-POLY-DIP-INTAKE',
    name: 'Diploma in Engineering Intake Checklist (Demo)',
    description: 'Mandatory documentation for diploma approval demo',
    applicationCategory: 'Diploma in Engineering',
  },
];

export const SEED_CHECKLIST_ITEMS: SeedChecklistItem[] = [
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-LAND-DEED',
    description:
      'Registered Sale Deed or 30-Year Continuous Government Lease Deed in name of Trust/Society',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'LAND_TITLE_DEED',
    displayOrder: 10,
    ruleCode: 'RULE-LAND-01',
    guidanceNotes:
      'Verify registration validity, lessor tenure, and survey numbers against institution land claims.',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-BUILDING-PLAN',
    description:
      'Approved Building Plan from Competent Town Planning / Municipal Authority',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'BUILDING_PLAN_APPROVAL',
    displayOrder: 20,
    ruleCode: 'RULE-BUILTUP-01',
    guidanceNotes:
      'Verify sanction number, competent authority stamp, and sanctioned carpet area.',
  },
  {
    templateCode: 'CHK-ENGG-UG-INTAKE',
    itemCode: 'CHK-ITEM-FIRE-NOC',
    description:
      'Fire Safety Certificate / No-Objection Certificate from State Fire Service',
    itemType: ChecklistItemType.DOCUMENT_UPLOAD,
    required: true,
    evidenceDocumentType: 'FIRE_SAFETY_CERTIFICATE',
    displayOrder: 30,
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
    ruleCode: 'RULE-POLY-LAND-01',
    guidanceNotes: 'Demo verification of polytechnic land documents.',
  },
];

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
    type: UndertakingType.FIRE_SAFETY_CLEARANCE,
    status: UndertakingStatus.ACTIVE,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: 'State Fire Service Annual Fire Safety No-Objection Certificate',
    description:
      'Annual building safety clearance for academic and administrative blocks.',
    documentNumber: 'FIRE-PUN-2025-9921',
    issuingAuthority: 'Pune Municipal Fire Brigade',
    counterpartyName: 'Director of Fire Services, Maharashtra',
    startDate: '2025-12-01',
    expiryDate: '2026-11-30',
    renewalLeadDays: 60,
    renewalDueDate: '2026-10-01',
    metadataJsonb: {
      buildingBlocks: ['Block A (Academic)', 'Block B (Laboratories)'],
      isSyntheticDemo: true,
    },
  },
  {
    institutionRegistrationNumber: 'DEMO-INST-2026-002',
    type: UndertakingType.BUILDING_LEASE,
    status: UndertakingStatus.EXPIRED,
    reviewStatus: UndertakingReviewStatus.VERIFIED,
    title: 'Short-Term Temporary Workshop Annex Lease (Expired)',
    description:
      'Expired lease agreement for temporary mechanical workshop annex prior to permanent workshop construction.',
    documentNumber: 'LEASE-PUN-2023-0104',
    issuingAuthority: 'Sub-Registrar Kothrud',
    counterpartyName: 'Kothrud Industrial Estate Pvt Ltd',
    startDate: '2023-01-01',
    expiryDate: '2024-01-01',
    renewalLeadDays: 90,
    renewalDueDate: '2023-10-03',
    metadataJsonb: {
      expiredRemark:
        'Replaced by permanent institutional workshop building; retained for historical audit trail.',
      isSyntheticDemo: true,
    },
  },
];
