/**
 * ApprovalSync — Application & Document Intake Types
 * Milestone: FE-03
 * Conforms strictly to BE-04 (Applications) and DOC-01 (Documents) contracts.
 */

import { ApplicationStatus, DocumentProcessingStatus } from '../api/types';

export { ApplicationStatus, DocumentProcessingStatus };

// -----------------------------------------------------------------------------
// Application DTOs & Projections (BE-04)
// -----------------------------------------------------------------------------

export interface CreateApplicationDto {
  academicYear: string;
  programType: string;
  payloadJsonb?: Record<string, unknown>;
}

export interface UpdateApplicationDto {
  academicYear?: string;
  programType?: string;
  payloadJsonb?: Record<string, unknown>;
}

export interface ApplicationInstitutionSummary {
  id: string;
  name: string;
  registrationNumber: string;
  state?: string;
  district?: string;
}

export interface ApplicationProjection {
  id: string;
  applicationNumber: string;
  institutionId: string;
  academicYear: string;
  status: ApplicationStatus;
  programType: string;
  payloadJsonb: Record<string, unknown>;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  institution?: ApplicationInstitutionSummary;
  documentsCount?: number;
}

export interface ApplicationListResponse {
  items: ApplicationProjection[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// -----------------------------------------------------------------------------
// Document Metadata & Upload DTOs (DOC-01)
// -----------------------------------------------------------------------------

export interface DocumentMetadataProjection {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  processingStatus: DocumentProcessingStatus;
  uploadedAt: string;
}

export interface UploadDocumentDto {
  documentType: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Statutory Document Requirements by Program Category (DOC-03 & DOC-01)
// -----------------------------------------------------------------------------

export interface DocumentRequirement {
  documentType: string;
  displayName: string;
  isMandatory: boolean;
  description: string;
  sourceClause?: string;
}

export const PROGRAM_TYPES = [
  'Undergraduate Engineering & Technology',
  'Postgraduate Management (MBA / PGDM)',
  'Pharmacy (B.Pharm / M.Pharm)',
  'Diploma in Engineering / Polytechnic',
  'Extension of Approval (EoA) / Existing Institution',
  'General Technical Institution',
] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export function resolveCategoryKey(programType?: string): string {
  if (!programType) return 'GENERAL_TECHNICAL_INSTITUTION';
  const norm = programType.toUpperCase().trim();
  if (norm.includes('ENGINEERING') || norm.includes('TECHNOLOGY') || norm.includes('B.TECH')) {
    if (norm.includes('DIPLOMA') || norm.includes('POLYTECHNIC')) {
      return 'POLYTECHNIC_DIPLOMA';
    }
    return 'ENGINEERING_TECHNOLOGY';
  }
  if (norm.includes('POLYTECHNIC') || norm.includes('DIPLOMA')) return 'POLYTECHNIC_DIPLOMA';
  if (norm.includes('MANAGEMENT') || norm.includes('MBA') || norm.includes('PGDM'))
    return 'MANAGEMENT';
  if (norm.includes('PHARMACY') || norm.includes('PHARM')) return 'PHARMACY';
  if (norm.includes('EXTENSION') || norm.includes('EOA') || norm.includes('EXISTING'))
    return 'EXTENSION_OF_APPROVAL';
  return 'GENERAL_TECHNICAL_INSTITUTION';
}

export const CATEGORY_REQUIREMENTS: Record<string, DocumentRequirement[]> = {
  ENGINEERING_TECHNOLOGY: [
    {
      documentType: 'LAND_TITLE_DEED',
      displayName: 'Land Title / Ownership Deed',
      isMandatory: true,
      description:
        'Registered Sale Deed or 30-Year Continuous Government Lease Deed in name of Trust/Society',
      sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4',
    },
    {
      documentType: 'LAND_USE_CERTIFICATE',
      displayName: 'Land Use Certificate / Conversion Order',
      isMandatory: true,
      description: 'Certificate of Land Use / Conversion Order from Competent Revenue Authority',
      sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.2',
    },
    {
      documentType: 'BUILDING_PLAN_APPROVAL',
      displayName: 'Sanctioned Building Plan',
      isMandatory: true,
      description: 'Approved Building Plan by Competent Municipal or Town Planning Authority',
      sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.3',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Fire Safety Certificate / NOC',
      isMandatory: true,
      description: 'Valid Fire Safety Certificate / NOC from State Fire Service Authority',
      sourceClause: 'APH 2024-27 Chapter 1 Clause 1.5.1',
    },
    {
      documentType: 'SOCIETY_TRUST_REGISTRATION',
      displayName: 'Trust / Society Registration Certificate',
      isMandatory: true,
      description: 'Registration Certificate of Sponsoring Society/Trust/Section 8 Company',
      sourceClause: 'APH 2024-27 Chapter 1 Clause 1.2',
    },
  ],

  POLYTECHNIC_DIPLOMA: [
    {
      documentType: 'LAND_TITLE_DEED',
      displayName: 'Land Title / Lease Deed',
      isMandatory: true,
      description: 'Registered Land Deed for Polytechnic Campus',
      sourceClause: 'Demo Poly Rulebook Clause 1.1',
    },
    {
      documentType: 'BUILDING_PLAN_APPROVAL',
      displayName: 'Sanctioned Building Plan',
      isMandatory: true,
      description: 'Approved Building Plan for Polytechnic Campus',
      sourceClause: 'Demo Poly Rulebook Clause 1.2',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Fire Safety Certificate / NOC',
      isMandatory: true,
      description: 'Valid Fire Safety NOC from State Fire Service',
      sourceClause: 'Demo Poly Rulebook Clause 1.3',
    },
    {
      documentType: 'SOCIETY_TRUST_REGISTRATION',
      displayName: 'Trust / Society Registration',
      isMandatory: true,
      description: 'Registration Certificate of Sponsoring Trust/Society',
      sourceClause: 'Demo Poly Rulebook Clause 1.4',
    },
  ],

  MANAGEMENT: [
    {
      documentType: 'LAND_TITLE_DEED',
      displayName: 'Land Title / Lease Deed',
      isMandatory: true,
      description: 'Registered Title / Lease Deed for Educational Institution',
      sourceClause: 'APH 2024-27 Management Norms',
    },
    {
      documentType: 'BUILDING_PLAN_APPROVAL',
      displayName: 'Sanctioned Building Plan',
      isMandatory: true,
      description: 'Approved Building Plan by Competent Local Authority',
      sourceClause: 'APH 2024-27 Management Norms',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Fire Safety NOC',
      isMandatory: true,
      description: 'Fire Safety Certificate from Fire Department',
      sourceClause: 'APH 2024-27 Management Norms',
    },
    {
      documentType: 'SOCIETY_TRUST_REGISTRATION',
      displayName: 'Trust / Society Registration Certificate',
      isMandatory: true,
      description: 'Trust or Society Registration Certificate',
      sourceClause: 'APH 2024-27 Management Norms',
    },
  ],

  PHARMACY: [
    {
      documentType: 'LAND_TITLE_DEED',
      displayName: 'Land Title / Lease Deed',
      isMandatory: true,
      description: 'Registered Title Deed for Pharmacy Institution',
      sourceClause: 'APH 2024-27 Pharmacy Norms',
    },
    {
      documentType: 'LAND_USE_CERTIFICATE',
      displayName: 'Land Use Certificate',
      isMandatory: true,
      description: 'Land Use Certificate for Educational Purposes',
      sourceClause: 'APH 2024-27 Pharmacy Norms',
    },
    {
      documentType: 'BUILDING_PLAN_APPROVAL',
      displayName: 'Sanctioned Building Plan (with Labs)',
      isMandatory: true,
      description: 'Sanctioned Building Plan with Laboratory Provisions',
      sourceClause: 'APH 2024-27 Pharmacy Norms',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Fire Safety NOC (Chemical/Flammable)',
      isMandatory: true,
      description: 'Valid Fire Safety NOC for Chemical/Flammable Laboratories',
      sourceClause: 'APH 2024-27 Pharmacy Norms',
    },
    {
      documentType: 'SOCIETY_TRUST_REGISTRATION',
      displayName: 'Trust / Society Registration Certificate',
      isMandatory: true,
      description: 'Trust or Society Registration Certificate',
      sourceClause: 'APH 2024-27 Pharmacy Norms',
    },
  ],

  EXTENSION_OF_APPROVAL: [
    {
      documentType: 'AICTE_APPROVAL_LETTER',
      displayName: 'Prior Year AICTE Approval Letter',
      isMandatory: true,
      description: 'Previous Academic Year AICTE Approval Letter',
      sourceClause: 'APH 2024-27 Chapter 2 Clause 2.1',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Current Fire Safety Certificate / NOC',
      isMandatory: true,
      description: 'Current Valid Fire Safety Certificate / NOC',
      sourceClause: 'APH 2024-27 Chapter 2 Clause 2.3',
    },
  ],

  GENERAL_TECHNICAL_INSTITUTION: [
    {
      documentType: 'LAND_TITLE_DEED',
      displayName: 'Land Title / Ownership Deed',
      isMandatory: true,
      description: 'Registered Title Deed or 30-Year Continuous Government Lease Deed',
      sourceClause: 'APH 2024-27 Standard Baseline',
    },
    {
      documentType: 'LAND_USE_CERTIFICATE',
      displayName: 'Land Use Certificate',
      isMandatory: true,
      description: 'Certificate of Land Use / Conversion Order',
      sourceClause: 'APH 2024-27 Standard Baseline',
    },
    {
      documentType: 'BUILDING_PLAN_APPROVAL',
      displayName: 'Sanctioned Building Plan',
      isMandatory: true,
      description: 'Sanctioned Building Plan by Competent Authority',
      sourceClause: 'APH 2024-27 Standard Baseline',
    },
    {
      documentType: 'FIRE_SAFETY_CERTIFICATE',
      displayName: 'Fire Safety Certificate / NOC',
      isMandatory: true,
      description: 'Fire Safety NOC from State Fire Service',
      sourceClause: 'APH 2024-27 Standard Baseline',
    },
    {
      documentType: 'SOCIETY_TRUST_REGISTRATION',
      displayName: 'Trust / Society Registration Certificate',
      isMandatory: true,
      description: 'Registration Certificate of Sponsoring Trust/Society',
      sourceClause: 'APH 2024-27 Standard Baseline',
    },
  ],
};

// -----------------------------------------------------------------------------
// Wizard State Model
// -----------------------------------------------------------------------------

export enum WizardStep {
  INSTITUTION_INFO = 1,
  PROGRAM_FACILITIES = 2,
  DOCUMENT_UPLOAD = 3,
  REVIEW_SUBMIT = 4,
  CONFIRMATION = 5,
}

export interface ApplicationWizardState {
  currentStep: WizardStep;
  highestVisitedStep: WizardStep;
  academicYear: string;
  programType: string;
  facultyCount: number | '';
  landAreaAcres: number | '';
  builtUpAreaSqMeters: number | '';
  libraryBooksCount: number | '';
  laboratoryCount: number | '';
  coursesProposed: string[];
  declarationAccepted: boolean;
  applicationId?: string;
  applicationNumber?: string;
  institutionId?: string;
  status?: ApplicationStatus;
  submittedAt?: string | null;
  uploadedDocuments: DocumentMetadataProjection[];
  isSubmitting: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string;
  errorMessage?: string;
}

export const INITIAL_WIZARD_STATE: ApplicationWizardState = {
  currentStep: WizardStep.INSTITUTION_INFO,
  highestVisitedStep: WizardStep.INSTITUTION_INFO,
  academicYear: '2026-2027',
  programType: 'Undergraduate Engineering & Technology',
  facultyCount: 48,
  landAreaAcres: 12.5,
  builtUpAreaSqMeters: 8500,
  libraryBooksCount: 12000,
  laboratoryCount: 16,
  coursesProposed: [
    'Computer Science & Engineering (Intake: 120)',
    'Mechanical Engineering (Intake: 60)',
  ],
  declarationAccepted: false,
  uploadedDocuments: [],
  isSubmitting: false,
  saveStatus: 'idle',
};
