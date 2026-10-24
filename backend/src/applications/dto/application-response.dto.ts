/**
 * ApprovalSync — Application Response Projection Interfaces
 * Milestone: BE-04
 */

import {
  ApplicationStatus,
  DocumentProcessingStatus,
} from '../../shared/contracts';

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
