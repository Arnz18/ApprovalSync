/**
 * ApprovalSync — Structured Field Extractor Interface
 * Milestone: DOC-02
 *
 * Defines contracts for extracting domain-specific regulatory fields from
 * recognized document categories and binding them to spatial evidence.
 */

import { DocumentExtractionFinding } from '../../shared/contracts';
import { SupportedDocumentCategory } from './document-classifier.interface';
import { OcrExtractionResult } from './ocr-provider.interface';

export interface ExtractedFieldValue {
  fieldKey: string;
  extractedValue: string | number;
  rawSnippet: string;
  confidenceScore: number;
  finding: DocumentExtractionFinding;
}

export interface DocumentFieldExtractionResult {
  category: SupportedDocumentCategory;
  extractedFields: Record<string, string | number>;
  findings: DocumentExtractionFinding[];
  missingRequiredFields: string[];
  extractionConfidence: number;
}

export interface IFieldExtractor {
  extractFields(
    category: SupportedDocumentCategory,
    ocrResult: OcrExtractionResult,
  ): Promise<DocumentFieldExtractionResult>;
}
