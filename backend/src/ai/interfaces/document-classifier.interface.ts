/**
 * ApprovalSync — Document Classifier Interface
 * Milestone: DOC-02
 *
 * Defines contracts for identifying supported document categories from
 * extracted textual tokens and structural keywords.
 */

export enum SupportedDocumentCategory {
  LAND_TITLE_DEED = 'LAND_TITLE_DEED',
  BUILDING_PLAN_APPROVAL = 'BUILDING_PLAN_APPROVAL',
  LAND_USE_CERTIFICATE = 'LAND_USE_CERTIFICATE',
  FIRE_SAFETY_CERTIFICATE = 'FIRE_SAFETY_CERTIFICATE',
  SOCIETY_TRUST_REGISTRATION = 'SOCIETY_TRUST_REGISTRATION',
  AICTE_APPROVAL_LETTER = 'AICTE_APPROVAL_LETTER',
  UNKNOWN = 'UNKNOWN',
}

export interface DocumentClassificationResult {
  category: SupportedDocumentCategory;
  confidenceScore: number; // 0.0 to 1.0
  matchedKeywords: string[];
  isRecognized: boolean;
  alternativeMatches?: Array<{
    category: SupportedDocumentCategory;
    score: number;
  }>;
}

export interface IDocumentClassifier {
  classify(
    rawText: string,
    tokens?: Array<{ text: string }>,
  ): Promise<DocumentClassificationResult>;
}
