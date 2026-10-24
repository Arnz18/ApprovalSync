/**
 * ApprovalSync — Structured Field Extraction & Evidence Linking Service
 * Milestone: DOC-02
 *
 * Extracts domain-specific statutory fields based on document category,
 * normalizes dates and numeric metrics, maps spatial bounding box evidence
 * from OCR tokens, and attaches advisory-only findings.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BoundingBox, DocumentExtractionFinding } from '../../shared/contracts';
import { SupportedDocumentCategory } from '../interfaces/document-classifier.interface';
import {
  DocumentFieldExtractionResult,
  IFieldExtractor,
} from '../interfaces/field-extractor.interface';
import {
  OcrExtractionResult,
  OcrToken,
} from '../interfaces/ocr-provider.interface';

interface FieldRule {
  fieldKey: string;
  pattern: RegExp;
  type: 'string' | 'date' | 'number';
  required?: boolean;
}

@Injectable()
export class FieldExtractionService implements IFieldExtractor {
  private readonly logger = new Logger(FieldExtractionService.name);

  // Field extraction patterns keyed by category
  private readonly categoryFieldRules: Record<
    SupportedDocumentCategory,
    FieldRule[]
  > = {
    [SupportedDocumentCategory.LAND_TITLE_DEED]: [
      {
        fieldKey: 'deedNumber',
        pattern:
          /(?:Deed\s*(?:Number|No\.?|#)|Registered\s+Deed\s*(?:No\.?|Number)|DEED\s*NO\.?)[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'registrationDate',
        pattern:
          /(?:Date of Registration|Registration Date|Dated)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
      {
        fieldKey: 'leaseTenureYears',
        pattern:
          /(?:Tenure(?:\s+of\s+Lease)?|Period(?:\s+of\s+Lease)?)[:\s]+(\d+)\s*(?:Years|Yrs)/i,
        type: 'number',
        required: true,
      },
      {
        fieldKey: 'landAreaAcres',
        pattern:
          /(?:Land Area|Total Area|Area of Land)[:\s]+([0-9.]+)\s*(?:Acres|Acre)/i,
        type: 'number',
        required: false,
      },
      {
        fieldKey: 'surveyNumber',
        pattern:
          /(?:Survey(?:\s+Number|\s+No\.?)|Khasra(?:\s+No\.?)?)[:\s]+([A-Z0-9/,\s-]+?)(?=\s+(?:Khasra|Tenure|Land|Schedule)|\r?\n|$)/i,
        type: 'string',
        required: false,
      },
      {
        fieldKey: 'lessorName',
        pattern:
          /(?:Lessor(?:\s+Name)?|Grantor)[:\s]+([A-Za-z\s.]+?)(?=\r?\n|Lessee|Schedule|$)/i,
        type: 'string',
        required: false,
      },
      {
        fieldKey: 'lesseeName',
        pattern:
          /(?:Lessee(?:\s+Name)?|Grantee)[:\s]+([A-Za-z\s.]+?)(?=\r?\n|Land|Schedule|$)/i,
        type: 'string',
        required: false,
      },
    ],

    [SupportedDocumentCategory.BUILDING_PLAN_APPROVAL]: [
      {
        fieldKey: 'approvalNumber',
        pattern:
          /(?:Approval(?:\s+Number|\s+No\.?)|Sanction(?:\s+No\.?))[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'approvalDate',
        pattern:
          /(?:Approval Date|Sanction Date|Dated)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
      {
        fieldKey: 'totalBuiltUpAreaSqm',
        pattern:
          /(?:Total Built-?up Area|Built-?up Area)[:\s]+([0-9.,]+)\s*(?:Sq\.?m|sqm|sq\s*meters)/i,
        type: 'number',
        required: true,
      },
      {
        fieldKey: 'carpetAreaSqm',
        pattern: /(?:Carpet Area)[:\s]+([0-9.,]+)\s*(?:Sq\.?m|sqm)/i,
        type: 'number',
        required: false,
      },
      {
        fieldKey: 'floorAreaRatio',
        pattern: /(?:Floor Area Ratio|FAR)[:\s]+([0-9.]+)/i,
        type: 'number',
        required: false,
      },
      {
        fieldKey: 'issuingAuthority',
        pattern:
          /(?:Issuing Authority|Sanctioning Authority)[:\s]+([A-Za-z\s.]+?)(?=\r?\n|Applicant|Total|$)/i,
        type: 'string',
        required: false,
      },
    ],

    [SupportedDocumentCategory.LAND_USE_CERTIFICATE]: [
      {
        fieldKey: 'orderNumber',
        pattern:
          /(?:Order(?:\s+Number|\s+No\.?)|CLU(?:\s+No\.?))[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'issueDate',
        pattern:
          /(?:Date of Issue|Order Date|Dated)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
      {
        fieldKey: 'permittedUse',
        pattern: /(?:Permitted Use|Converted To)[:\s]+([A-Za-z\s_-]+)/i,
        type: 'string',
        required: true,
      },
    ],

    [SupportedDocumentCategory.FIRE_SAFETY_CERTIFICATE]: [
      {
        fieldKey: 'nocNumber',
        pattern:
          /(?:NOC(?:\s+Number|\s+No\.?)|Certificate(?:\s+No\.?))[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'issueDate',
        pattern:
          /(?:Date of Issue|Issued On|Dated)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
      {
        fieldKey: 'expiryDate',
        pattern:
          /(?:Valid Up To|Expiry Date|Valid Till)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
    ],

    [SupportedDocumentCategory.SOCIETY_TRUST_REGISTRATION]: [
      {
        fieldKey: 'registrationNumber',
        pattern:
          /(?:Registration(?:\s+Number|\s+No\.?)|Reg\.?\s*No\.?)[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'registrationDate',
        pattern:
          /(?:Date of Registration|Registered On|Dated)[:\s]+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        type: 'date',
        required: true,
      },
      {
        fieldKey: 'trustName',
        pattern:
          /(?:Name of Society|Name of Trust|Trust Name)[:\s]+([A-Za-z\s.]+?)(?=\r?\n|Registration|$)/i,
        type: 'string',
        required: true,
      },
    ],

    [SupportedDocumentCategory.AICTE_APPROVAL_LETTER]: [
      {
        fieldKey: 'approvalLetterNumber',
        pattern: /(?:F\.?\s*No\.?|Application ID)[:\s]+([A-Z0-9/-]+)/i,
        type: 'string',
        required: true,
      },
      {
        fieldKey: 'academicYear',
        pattern: /(?:Academic Year|Session)[:\s]+([0-9]{4}-[0-9]{2,4})/i,
        type: 'string',
        required: true,
      },
    ],

    [SupportedDocumentCategory.UNKNOWN]: [],
  };

  /**
   * Extracts structured fields and spatial evidence from an OCR extraction result.
   */
  async extractFields(
    category: SupportedDocumentCategory,
    ocrResult: OcrExtractionResult,
  ): Promise<DocumentFieldExtractionResult> {
    const rules = this.categoryFieldRules[category] || [];
    const rawText = ocrResult.rawText;
    const tokens = ocrResult.tokens;

    const extractedFields: Record<string, string | number> = {};
    const findings: DocumentExtractionFinding[] = [];
    const missingRequiredFields: string[] = [];
    const confidences: number[] = [];

    for (const rule of rules) {
      const match = rule.pattern.exec(rawText);

      if (match && match[1]) {
        const rawValue = match[1].trim();
        const normalizedValue = this.normalizeValue(rawValue, rule.type);

        if (normalizedValue !== null && normalizedValue !== '') {
          extractedFields[rule.fieldKey] = normalizedValue;

          // Find spatial bounding box evidence from OCR tokens
          const evidenceLocation = this.findEvidenceLocation(
            rawValue,
            tokens,
            ocrResult,
          );

          // Find token confidence or fallback to composite OCR confidence
          const tokenConfidence = this.resolveTokenConfidence(
            rawValue,
            tokens,
            ocrResult.confidenceScore,
          );
          confidences.push(tokenConfidence);

          findings.push({
            fieldKey: rule.fieldKey,
            extractedValue: normalizedValue,
            confidenceScore: tokenConfidence,
            evidenceLocation,
            isAdvisory: true,
          });

          continue;
        }
      }

      // Check required field absence
      if (rule.required) {
        missingRequiredFields.push(rule.fieldKey);
      }
    }

    const extractionConfidence =
      confidences.length > 0
        ? Number(
            (
              confidences.reduce((sum, c) => sum + c, 0) / confidences.length
            ).toFixed(3),
          )
        : ocrResult.confidenceScore;

    return {
      category,
      extractedFields,
      findings,
      missingRequiredFields,
      extractionConfidence,
    };
  }

  /**
   * Normalizes values according to target data type.
   */
  private normalizeValue(
    raw: string,
    type: 'string' | 'date' | 'number',
  ): string | number | null {
    if (!raw || raw.trim().length === 0) return null;

    if (type === 'number') {
      const cleaned = raw.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    if (type === 'date') {
      return this.normalizeDate(raw);
    }

    return raw.trim();
  }

  /**
   * Normalizes dates in various formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) to ISO YYYY-MM-DD.
   */
  normalizeDate(rawDateStr: string): string | null {
    const clean = rawDateStr.trim();

    // Check standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(clean);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Check DD/MM/YY
    const dmyShortMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/.exec(clean);
    if (dmyShortMatch) {
      const day = dmyShortMatch[1].padStart(2, '0');
      const month = dmyShortMatch[2].padStart(2, '0');
      const year = `20${dmyShortMatch[3]}`;
      return `${year}-${month}-${day}`;
    }

    // Parse JavaScript Date fallback
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return clean;
  }

  /**
   * Locates spatial bounding box in OCR tokens for a given extracted value.
   */
  private findEvidenceLocation(
    rawValue: string,
    tokens: OcrToken[],
    ocrResult: OcrExtractionResult,
  ): BoundingBox {
    const targetTerms = rawValue
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (targetTerms.length > 0 && tokens && tokens.length > 0) {
      // Find token that matches the first term of the extracted value
      const matchedToken = tokens.find((tok) =>
        tok.text.toLowerCase().includes(targetTerms[0]),
      );

      if (matchedToken) {
        return {
          pageNumber: matchedToken.pageNumber,
          xMin: matchedToken.boundingBox.xMin,
          yMin: matchedToken.boundingBox.yMin,
          xMax: matchedToken.boundingBox.xMax,
          yMax: matchedToken.boundingBox.yMax,
        };
      }
    }

    // Fallback: default to page 1 coordinates
    const defaultPage = ocrResult.pages?.[0];
    return {
      pageNumber: defaultPage?.pageNumber || 1,
      xMin: 50,
      yMin: 100,
      xMax: 400,
      yMax: 150,
    };
  }

  /**
   * Resolves token confidence or defaults to composite OCR confidence.
   */
  private resolveTokenConfidence(
    rawValue: string,
    tokens: OcrToken[],
    defaultConfidence: number,
  ): number {
    const firstWord = rawValue.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && tokens) {
      const matched = tokens.find((t) =>
        t.text.toLowerCase().includes(firstWord),
      );
      if (matched) {
        return matched.confidence;
      }
    }
    return defaultConfidence;
  }
}
