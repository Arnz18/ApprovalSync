/**
 * ApprovalSync — Document Duplicate Detection Interfaces
 * Milestone: DOC-04
 *
 * Defines contracts for exact cryptographic and perceptual near-duplicate
 * detection across application dossiers, with strict tenant isolation.
 */

import { ValidationFinding } from './validation-rule.interface';

export type DuplicateScope =
  'INTRA_APPLICATION' | 'SAME_INSTITUTION' | 'CROSS_INSTITUTION';

export interface DuplicateMatchDetail {
  documentId: string;
  documentType: string;
  fileName: string;
  fileHashSha256: string;
  scope: DuplicateScope;
  isCrossTenant: boolean;
  matchedDocumentId?: string;
  matchedDocumentType?: string;
  matchedFileName?: string;
  matchedApplicationId?: string;
  matchedApplicationNumber?: string;
  matchedInstitutionId?: string;
  matchedInstitutionName?: string;
}

export interface NearDuplicateDetail {
  documentId: string;
  matchedDocumentId: string;
  documentType: string;
  matchedDocumentType: string;
  similarityScore: number;
  method:
    'OCR_TEXT_SIMILARITY' | 'KEY_FIELDS_MATCH' | 'PERCEPTUAL_HASH_HAMMING';
  isSharedTemplate: boolean;
  reasons: string[];
}

export interface DuplicateDetectionResult {
  applicationId: string;
  totalDocumentsEvaluated: number;
  exactDuplicatesCount: number;
  nearDuplicatesCount: number;
  findings: ValidationFinding[];
  evaluatedAt: string;
}
