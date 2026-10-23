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
} from '../../shared/contracts';

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
