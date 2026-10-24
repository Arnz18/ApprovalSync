/**
 * ApprovalSync — Near-Duplicate & Perceptual Similarity Service
 * Milestone: DOC-04
 *
 * Implements explainable near-duplicate detection using:
 * 1. Normalized OCR text and character 3-gram similarity.
 * 2. Statutory identifier key-field matching (e.g., certificate numbers across rescans).
 * 3. Boilerplate template discrimination (preventing shared forms from false duplicate flags).
 * 4. 64-bit perceptual hash comparison via Hamming distance.
 *
 * Strictly adheres to ADR-004: All findings are advisory and never claim proof of forgery.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Document } from '../../database/entities/document.entity';
import { ComplianceSeverity } from '../../shared/contracts';
import { ValidationCategory, ValidationOutcome } from '../enums';
import { ValidationFinding, NearDuplicateDetail } from '../interfaces';

export interface NearDuplicateComparisonResult {
  isNearDuplicate: boolean;
  isSharedTemplate: boolean;
  similarityScore: number;
  method:
    'OCR_TEXT_SIMILARITY' | 'KEY_FIELDS_MATCH' | 'PERCEPTUAL_HASH_HAMMING';
  reasons: string[];
  finding?: ValidationFinding;
}

const STATUTORY_IDENTIFIER_FIELDS = [
  'certificateNumber',
  'registrationNumber',
  'landSurveyNumber',
  'khasraNumber',
  'deedNumber',
  'planApprovalNumber',
  'societyRegistrationNumber',
];

@Injectable()
export class NearDuplicateDetectionService {
  private readonly logger = new Logger(NearDuplicateDetectionService.name);

  // Configurable similarity threshold for text/layout near-duplicate flagging
  private readonly textSimilarityThreshold = 0.85;
  private readonly hammingDistanceThreshold = 10; // Max bit differences in 64-bit hash (84.4% similar)

  /**
   * Compares two documents to detect whether they are near-duplicates (rescans/recompression)
   * or distinct submissions on a shared template.
   */
  compareDocuments(
    docA: Document,
    docB: Document,
  ): NearDuplicateComparisonResult {
    // If identical document entities or same file hash, exact duplicate logic handles it
    if (docA.id === docB.id || docA.fileHashSha256 === docB.fileHashSha256) {
      return {
        isNearDuplicate: false,
        isSharedTemplate: false,
        similarityScore: 1.0,
        method: 'OCR_TEXT_SIMILARITY',
        reasons: ['Documents have identical file hash (exact duplicate).'],
      };
    }

    const reportA = (docA.metadata?.analysisReport || {}) as {
      rawText?: string;
      extractedFields?: Record<string, string | number>;
      classification?: { category?: string };
    };

    const reportB = (docB.metadata?.analysisReport || {}) as {
      rawText?: string;
      extractedFields?: Record<string, string | number>;
      classification?: { category?: string };
    };

    // If neither document has extracted OCR text, comparison is unavailable
    if (
      !reportA.extractedFields &&
      !reportB.extractedFields &&
      !reportA.rawText &&
      !reportB.rawText
    ) {
      return {
        isNearDuplicate: false,
        isSharedTemplate: false,
        similarityScore: 0.0,
        method: 'OCR_TEXT_SIMILARITY',
        reasons: [
          'OCR extraction data is unavailable for one or both documents.',
        ],
        finding: {
          ruleId: 'DOC-DUP-NEAR-UNAVAILABLE',
          category: ValidationCategory.DUPLICATE_DETECTION,
          outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Near-duplicate text comparison unavailable for document '${docA.fileName}': OCR extraction report not found.`,
          documentId: docA.id,
          documentType: docA.documentType,
          isAdvisory: true,
          metadata: {
            targetDocumentId: docB.id,
            reason: 'Missing OCR extraction metadata',
          },
        },
      };
    }

    // 1. Check for statutory identifier key-field match across different files
    const identifierMatch = this.checkIdentifierMatch(
      reportA.extractedFields,
      reportB.extractedFields,
    );

    if (identifierMatch.matched) {
      const finding: ValidationFinding = {
        ruleId: 'DOC-DUP-NEAR-IDENTIFIER-MATCH',
        category: ValidationCategory.DUPLICATE_DETECTION,
        outcome: ValidationOutcome.NEAR_DUPLICATE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Potential rescan or alternate copy: document '${docA.fileName}' shares identical statutory identifier (${identifierMatch.fieldKey}: '${identifierMatch.value}') with document '${docB.fileName}', but file hashes differ.`,
        documentId: docA.id,
        documentType: docA.documentType,
        fieldKey: identifierMatch.fieldKey,
        observedValue: String(identifierMatch.value),
        confidenceScore: 0.95,
        isAdvisory: true,
        metadata: {
          matchedDocumentId: docB.id,
          matchedFileName: docB.fileName,
          matchedFieldKey: identifierMatch.fieldKey,
          matchedValue: identifierMatch.value,
          similarityMethod: 'KEY_FIELDS_MATCH',
        },
      };

      return {
        isNearDuplicate: true,
        isSharedTemplate: false,
        similarityScore: 0.95,
        method: 'KEY_FIELDS_MATCH',
        reasons: [
          `Identical statutory identifier '${identifierMatch.fieldKey}' found in both documents.`,
        ],
        finding,
      };
    }

    // 2. Compute textual and layout similarity from OCR text
    const textA = reportA.rawText || this.fieldsToText(reportA.extractedFields);
    const textB = reportB.rawText || this.fieldsToText(reportB.extractedFields);

    if (textA && textB) {
      const similarity = this.computeTextSimilarity(textA, textB);

      // Check if this is a shared template (boilerplate similarity >= 0.75, but differing entity details)
      const isShared = this.detectSharedTemplate(
        reportA.extractedFields,
        reportB.extractedFields,
      );

      if (isShared && similarity >= 0.75) {
        return {
          isNearDuplicate: false,
          isSharedTemplate: true,
          similarityScore: similarity,
          method: 'OCR_TEXT_SIMILARITY',
          reasons: [
            `Documents exhibit ${(similarity * 100).toFixed(1)}% layout similarity but have distinct applicant or institution entities. Classified as standard regulatory template sharing.`,
          ],
          finding: {
            ruleId: 'DOC-DUP-SHARED-TEMPLATE',
            category: ValidationCategory.DUPLICATE_DETECTION,
            outcome: ValidationOutcome.VALID,
            severity: ComplianceSeverity.COMPLIANT,
            message: `Document '${docA.fileName}' shares standard regulatory template layout with '${docB.fileName}' (${(similarity * 100).toFixed(1)}% layout match), with distinct institutional entity details.`,
            documentId: docA.id,
            documentType: docA.documentType,
            confidenceScore: similarity,
            isAdvisory: true,
            metadata: {
              matchedDocumentId: docB.id,
              similarityScore: similarity,
              classification: 'SHARED_STATUTORY_TEMPLATE',
            },
          },
        };
      }

      // Check if similarity meets near-duplicate threshold (>= 0.85)
      if (similarity >= this.textSimilarityThreshold) {
        // Legitimate near-duplicate detection
        const finding: ValidationFinding = {
          ruleId: 'DOC-DUP-NEAR-HIGH-SIMILARITY',
          category: ValidationCategory.DUPLICATE_DETECTION,
          outcome: ValidationOutcome.NEAR_DUPLICATE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Near-duplicate document detected: document '${docA.fileName}' has ${(similarity * 100).toFixed(1)}% textual similarity to '${docB.fileName}'. May represent a rescanned or re-compressed copy.`,
          documentId: docA.id,
          documentType: docA.documentType,
          confidenceScore: similarity,
          isAdvisory: true,
          metadata: {
            matchedDocumentId: docB.id,
            matchedFileName: docB.fileName,
            similarityScore: similarity,
            similarityMethod: 'OCR_TEXT_SIMILARITY',
          },
        };

        return {
          isNearDuplicate: true,
          isSharedTemplate: false,
          similarityScore: similarity,
          method: 'OCR_TEXT_SIMILARITY',
          reasons: [
            `High textual similarity score of ${(similarity * 100).toFixed(1)}% meets threshold of ${(this.textSimilarityThreshold * 100).toFixed(0)}%.`,
          ],
          finding,
        };
      }

      return {
        isNearDuplicate: false,
        isSharedTemplate: false,
        similarityScore: similarity,
        method: 'OCR_TEXT_SIMILARITY',
        reasons: [
          `Text similarity score of ${(similarity * 100).toFixed(1)}% is below near-duplicate threshold of ${(this.textSimilarityThreshold * 100).toFixed(0)}%.`,
        ],
      };
    }

    return {
      isNearDuplicate: false,
      isSharedTemplate: false,
      similarityScore: 0.0,
      method: 'OCR_TEXT_SIMILARITY',
      reasons: ['Insufficient text extracted for comparison.'],
    };
  }

  /**
   * Evaluates pairwise near-duplicates among a set of documents for an application.
   */
  evaluateApplicationNearDuplicates(documents: Document[]): {
    findings: ValidationFinding[];
    nearDuplicates: NearDuplicateDetail[];
  } {
    const findings: ValidationFinding[] = [];
    const nearDuplicates: NearDuplicateDetail[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const docA = documents[i];
        const docB = documents[j];

        const pairKey = [docA.id, docB.id].sort().join(':');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const result = this.compareDocuments(docA, docB);

        if (result.finding) {
          findings.push(result.finding);
        }

        if (result.isNearDuplicate) {
          nearDuplicates.push({
            documentId: docA.id,
            matchedDocumentId: docB.id,
            documentType: docA.documentType,
            matchedDocumentType: docB.documentType,
            similarityScore: result.similarityScore,
            method: result.method,
            isSharedTemplate: result.isSharedTemplate,
            reasons: result.reasons,
          });
        }
      }
    }

    return { findings, nearDuplicates };
  }

  /**
   * Checks whether two document field dictionaries share an identical statutory identifier.
   */
  private checkIdentifierMatch(
    fieldsA?: Record<string, string | number>,
    fieldsB?: Record<string, string | number>,
  ): { matched: boolean; fieldKey?: string; value?: string | number } {
    if (!fieldsA || !fieldsB) {
      return { matched: false };
    }

    for (const key of STATUTORY_IDENTIFIER_FIELDS) {
      const valA = fieldsA[key];
      const valB = fieldsB[key];

      if (valA && valB) {
        const normA = String(valA).trim().toUpperCase();
        const normB = String(valB).trim().toUpperCase();

        if (normA.length >= 4 && normA === normB) {
          return { matched: true, fieldKey: key, value: valA };
        }
      }
    }

    return { matched: false };
  }

  /**
   * Determines whether high similarity is due to a standard statutory template.
   */
  private detectSharedTemplate(
    fieldsA?: Record<string, string | number>,
    fieldsB?: Record<string, string | number>,
  ): boolean {
    if (!fieldsA || !fieldsB) return false;

    const nameA = String(fieldsA.institutionName || fieldsA.applicantName || '')
      .trim()
      .toLowerCase();
    const nameB = String(fieldsB.institutionName || fieldsB.applicantName || '')
      .trim()
      .toLowerCase();

    // If both specify institution/applicant names and they are distinctly different
    if (nameA.length > 3 && nameB.length > 3 && nameA !== nameB) {
      return true;
    }

    // Check certificate / deed number differences
    const certA = String(fieldsA.certificateNumber || fieldsA.deedNumber || '')
      .trim()
      .toLowerCase();
    const certB = String(fieldsB.certificateNumber || fieldsB.deedNumber || '')
      .trim()
      .toLowerCase();

    if (certA.length > 3 && certB.length > 3 && certA !== certB) {
      return true;
    }

    return false;
  }

  /**
   * Computes hybrid textual similarity using token Jaccard overlap and 3-gram shingles.
   */
  computeTextSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    // 1. Token Jaccard similarity (ignoring standard filler words)
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    let intersectionCount = 0;
    for (const t of set1) {
      if (set2.has(t)) {
        intersectionCount++;
      }
    }

    const unionCount = new Set([...set1, ...set2]).size;
    const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

    // 2. Character 3-gram similarity for typographical robustness
    const shingleScore = this.computeShingleSimilarity(text1, text2);

    // Weighted blend: 60% token semantics, 40% character shingles
    return Number((0.6 * jaccard + 0.4 * shingleScore).toFixed(4));
  }

  /**
   * Computes character 3-gram shingle overlap between two strings.
   */
  private computeShingleSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
    const s2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();

    if (s1 === s2) return 1.0;
    if (s1.length < 3 || s2.length < 3) return 0;

    const shingles1 = new Set<string>();
    for (let i = 0; i <= s1.length - 3; i++) {
      shingles1.add(s1.substring(i, i + 3));
    }

    const shingles2 = new Set<string>();
    for (let i = 0; i <= s2.length - 3; i++) {
      shingles2.add(s2.substring(i, i + 3));
    }

    let shared = 0;
    for (const sh of shingles1) {
      if (shingles2.has(sh)) shared++;
    }

    const total = new Set([...shingles1, ...shingles2]).size;
    return total > 0 ? shared / total : 0;
  }

  /**
   * Tokenizes text into normalized words, filtering out minimal punctuation.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  /**
   * Serializes a dictionary of extracted fields into a single text representation.
   */
  private fieldsToText(fields?: Record<string, string | number>): string {
    if (!fields) return '';
    return Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' ');
  }

  /**
   * Computes the Hamming distance between two 64-bit hex perceptual hashes.
   */
  computeHammingDistance(hexHash1: string, hexHash2: string): number {
    const clean1 = hexHash1.trim().replace(/^0x/, '');
    const clean2 = hexHash2.trim().replace(/^0x/, '');

    if (
      !/^[0-9a-fA-F]{16}$/.test(clean1) ||
      !/^[0-9a-fA-F]{16}$/.test(clean2)
    ) {
      throw new Error(
        'Perceptual hash must be a 16-character (64-bit) hex string.',
      );
    }

    // Process in two 32-bit chunks
    const chunk1A = parseInt(clean1.substring(0, 8), 16);
    const chunk1B = parseInt(clean1.substring(8, 16), 16);

    const chunk2A = parseInt(clean2.substring(0, 8), 16);
    const chunk2B = parseInt(clean2.substring(8, 16), 16);

    const xorA = (chunk1A ^ chunk2A) >>> 0;
    const xorB = (chunk1B ^ chunk2B) >>> 0;

    return this.popcount(xorA) + this.popcount(xorB);
  }

  /**
   * Converts Hamming distance to a normalized similarity score (0.0 to 1.0).
   */
  similarityFromHammingDistance(
    distance: number,
    totalBits: number = 64,
  ): number {
    if (distance <= 0) return 1.0;
    if (distance >= totalBits) return 0.0;
    return Number((1.0 - distance / totalBits).toFixed(4));
  }

  /**
   * Counts number of set bits (1s) in a 32-bit unsigned integer (popcount).
   */
  private popcount(n: number): number {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
}
