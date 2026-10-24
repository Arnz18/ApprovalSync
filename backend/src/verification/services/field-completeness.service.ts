/**
 * ApprovalSync — Field Completeness Service
 * Milestone: DOC-03
 *
 * Validates presence, formatting, confidence thresholds, and spatial evidence
 * of statutory fields extracted by DOC-02 across supported document categories.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
  DocumentExtractionFinding,
} from '../../shared/contracts';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome, ValidationCategory } from '../enums';
import { FieldRequirement, ValidationFinding } from '../interfaces';

@Injectable()
export class FieldCompletenessService {
  private readonly logger = new Logger(FieldCompletenessService.name);

  // Authoritative field requirements per document category
  private readonly categoryFieldRequirements: Record<
    string,
    FieldRequirement[]
  > = {
    LAND_TITLE_DEED: [
      {
        fieldKey: 'deedNumber',
        label: 'Deed / Instrument Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4',
      },
      {
        fieldKey: 'registrationDate',
        label: 'Date of Registration',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4',
      },
      {
        fieldKey: 'leaseTenureYears',
        label: 'Lease Tenure (Years)',
        type: 'number',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.1',
      },
      {
        fieldKey: 'landAreaAcres',
        label: 'Total Land Area (Acres)',
        type: 'number',
        required: false,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.1',
      },
      {
        fieldKey: 'surveyNumber',
        label: 'Survey / Khasra Number',
        type: 'string',
        required: false,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.1',
      },
      {
        fieldKey: 'lesseeName',
        label: 'Lessee / Transferee Name',
        type: 'string',
        required: false,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.1',
      },
    ],

    BUILDING_PLAN_APPROVAL: [
      {
        fieldKey: 'approvalNumber',
        label: 'Building Sanction / Approval Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.3',
      },
      {
        fieldKey: 'approvalDate',
        label: 'Building Sanction Date',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.3',
      },
      {
        fieldKey: 'totalBuiltUpAreaSqm',
        label: 'Total Built-up Area (Sq. Meters)',
        type: 'number',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.3',
      },
      {
        fieldKey: 'issuingAuthority',
        label: 'Sanctioning / Municipal Authority',
        type: 'string',
        required: false,
      },
    ],

    LAND_USE_CERTIFICATE: [
      {
        fieldKey: 'orderNumber',
        label: 'Land Conversion Order / CLU Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.2',
      },
      {
        fieldKey: 'issueDate',
        label: 'Order Date of Issue',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.2',
      },
      {
        fieldKey: 'permittedUse',
        label: 'Permitted Institutional / Educational Use',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.2',
      },
    ],

    FIRE_SAFETY_CERTIFICATE: [
      {
        fieldKey: 'nocNumber',
        label: 'Fire NOC / Certificate Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.5.1',
      },
      {
        fieldKey: 'issueDate',
        label: 'NOC Date of Issue',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.5.1',
      },
      {
        fieldKey: 'expiryDate',
        label: 'NOC Validity / Expiry Date',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.5.1',
      },
    ],

    SOCIETY_TRUST_REGISTRATION: [
      {
        fieldKey: 'registrationNumber',
        label: 'Society / Trust Registration Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.2',
      },
      {
        fieldKey: 'registrationDate',
        label: 'Date of Registration',
        type: 'date',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.2',
      },
      {
        fieldKey: 'trustName',
        label: 'Name of Sponsoring Trust / Society',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 1 Clause 1.2',
      },
    ],

    AICTE_APPROVAL_LETTER: [
      {
        fieldKey: 'approvalLetterNumber',
        label: 'AICTE Approval / File Number',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 2 Clause 2.1',
      },
      {
        fieldKey: 'academicYear',
        label: 'Approved Academic Year',
        type: 'string',
        required: true,
        sourceClause: 'APH 2024-27 Chapter 2 Clause 2.1',
      },
    ],
  };

  /**
   * Retrieves field requirements for a document category.
   */
  getFieldRequirements(documentType: string): FieldRequirement[] {
    return this.categoryFieldRequirements[documentType] || [];
  }

  /**
   * Evaluates field completeness across all documents of an application.
   */
  evaluateFields(documents: Document[]): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    for (const doc of documents) {
      const requirements = this.getFieldRequirements(doc.documentType);
      if (requirements.length === 0) {
        continue;
      }

      // Handle OCR failure: never report fields as missing from the document
      if (doc.processingStatus === DocumentProcessingStatus.FAILED_OCR) {
        findings.push({
          ruleId: `DOC-FIELD-OCR-FAILED-${doc.id}`,
          category: ValidationCategory.FIELD_COMPLETENESS,
          outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Field extraction unavailable because OCR processing failed for '${doc.fileName}'. Does not prove fields are missing from original document.`,
          documentId: doc.id,
          documentType: doc.documentType,
          isAdvisory: true,
          metadata: { processingStatus: doc.processingStatus },
        });
        continue;
      }

      // Handle pending OCR
      if (
        doc.processingStatus === DocumentProcessingStatus.UPLOADED ||
        doc.processingStatus === DocumentProcessingStatus.PROCESSING_OCR
      ) {
        findings.push({
          ruleId: `DOC-FIELD-PENDING-OCR-${doc.id}`,
          category: ValidationCategory.FIELD_COMPLETENESS,
          outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Document '${doc.fileName}' is pending OCR processing; structured fields cannot yet be evaluated.`,
          documentId: doc.id,
          documentType: doc.documentType,
          isAdvisory: true,
        });
        continue;
      }

      // Extract metadata findings and field dictionary from DOC-02 analysisReport
      const analysisReport = doc.metadata?.analysisReport as
        | {
            extractedFields?: Record<string, string | number>;
            findings?: DocumentExtractionFinding[];
            ocrConfidence?: number;
          }
        | undefined;

      const extractedFields = analysisReport?.extractedFields || {};
      const extractionFindings = analysisReport?.findings || [];
      const findingsByKey = new Map<string, DocumentExtractionFinding>();

      for (const ef of extractionFindings) {
        findingsByKey.set(ef.fieldKey, ef);
      }

      // Evaluate each statutory requirement
      for (const req of requirements) {
        const val = extractedFields[req.fieldKey];
        const finding = findingsByKey.get(req.fieldKey);

        if (val !== undefined && val !== null && val !== '') {
          // Check for malformed values
          const isMalformed = this.isFieldMalformed(val, req.type);
          if (isMalformed) {
            findings.push({
              ruleId: `DOC-FIELD-MALFORMED-${doc.documentType}-${req.fieldKey}`,
              category: ValidationCategory.FIELD_COMPLETENESS,
              outcome: ValidationOutcome.MALFORMED,
              severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
              message: `Field '${req.label}' has malformed value '${val}' in '${doc.fileName}'. Expected valid ${req.type}.`,
              documentId: doc.id,
              documentType: doc.documentType,
              fieldKey: req.fieldKey,
              observedValue: String(val),
              evidenceLocation: finding?.evidenceLocation,
              confidenceScore: finding?.confidenceScore,
              isAdvisory: true,
            });
            continue;
          }

          // Check confidence score (< 0.85 indicates uncertainty)
          const conf =
            finding?.confidenceScore ?? analysisReport?.ocrConfidence ?? 0.9;
          if (conf < 0.85) {
            findings.push({
              ruleId: `DOC-FIELD-LOW-CONFIDENCE-${doc.documentType}-${req.fieldKey}`,
              category: ValidationCategory.FIELD_COMPLETENESS,
              outcome: ValidationOutcome.LOW_CONFIDENCE,
              severity: ComplianceSeverity.ADVISORY_FLAG,
              message: `Field '${req.label}' extracted with low confidence (${(conf * 100).toFixed(1)}%) in '${doc.fileName}'. Manual officer verification required.`,
              documentId: doc.id,
              documentType: doc.documentType,
              fieldKey: req.fieldKey,
              observedValue: String(val),
              evidenceLocation: finding?.evidenceLocation,
              confidenceScore: conf,
              isAdvisory: true,
            });
            continue;
          }

          // Field present, valid, and high confidence
          findings.push({
            ruleId: `DOC-FIELD-VALID-${doc.documentType}-${req.fieldKey}`,
            category: ValidationCategory.FIELD_COMPLETENESS,
            outcome: ValidationOutcome.VALID,
            severity: ComplianceSeverity.COMPLIANT,
            message: `Required field '${req.label}' successfully extracted and verified in '${doc.fileName}'.`,
            documentId: doc.id,
            documentType: doc.documentType,
            fieldKey: req.fieldKey,
            observedValue: String(val),
            evidenceLocation: finding?.evidenceLocation,
            confidenceScore: conf,
            isAdvisory: true,
          });
        } else {
          // Field missing from extraction
          if (req.required) {
            findings.push({
              ruleId: `DOC-FIELD-MISSING-${doc.documentType}-${req.fieldKey}`,
              category: ValidationCategory.FIELD_COMPLETENESS,
              outcome: ValidationOutcome.DEFICIENT,
              severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
              message: `Mandatory field '${req.label}' could not be identified or extracted from '${doc.fileName}'.`,
              documentId: doc.id,
              documentType: doc.documentType,
              fieldKey: req.fieldKey,
              expectedValue: req.label,
              observedValue: 'MISSING',
              isAdvisory: true,
              metadata: { sourceClause: req.sourceClause },
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Checks whether an extracted value is malformed according to expected type.
   */
  private isFieldMalformed(
    value: string | number,
    type: 'string' | 'date' | 'number',
  ): boolean {
    if (type === 'number') {
      const num = Number(value);
      return isNaN(num) || num < 0;
    }

    if (type === 'date') {
      const strVal = String(value).trim();
      // Test ISO YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
      const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(strVal);
      const dmyMatch = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(strVal);
      if (!isoMatch && !dmyMatch) {
        return true;
      }
      const parsed = Date.parse(strVal);
      return isNaN(parsed);
    }

    if (type === 'string') {
      return String(value).trim().length === 0;
    }

    return false;
  }
}
