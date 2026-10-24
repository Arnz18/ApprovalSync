/**
 * ApprovalSync — Document Completeness Service
 * Milestone: DOC-03
 *
 * Evaluates mandatory document requirements per application category,
 * detects missing submissions, duplicate uploads, OCR processing failures,
 * and classification discrepancies.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome, ValidationCategory } from '../enums';
import { CategoryDocumentRule, ValidationFinding } from '../interfaces';

@Injectable()
export class DocumentCompletenessService {
  private readonly logger = new Logger(DocumentCompletenessService.name);

  // Authoritative mandatory document rules per application category
  private readonly categoryRules: Record<string, CategoryDocumentRule> = {
    ENGINEERING_TECHNOLOGY: {
      applicationCategory: 'ENGINEERING_TECHNOLOGY',
      displayName: 'Undergraduate Engineering & Technology',
      requiredDocuments: [
        {
          documentType: 'LAND_TITLE_DEED',
          isMandatory: true,
          description:
            'Registered Sale Deed or 30-Year Continuous Government Lease Deed in name of Trust/Society',
          sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4',
        },
        {
          documentType: 'LAND_USE_CERTIFICATE',
          isMandatory: true,
          description:
            'Certificate of Land Use / Conversion Order from Competent Revenue Authority',
          sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.2',
        },
        {
          documentType: 'BUILDING_PLAN_APPROVAL',
          isMandatory: true,
          description:
            'Approved Building Plan by Competent Municipal or Town Planning Authority',
          sourceClause: 'APH 2024-27 Chapter 1 Clause 1.4.3',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description:
            'Fire Safety Certificate / NOC from State Fire Service Authority',
          sourceClause: 'APH 2024-27 Chapter 1 Clause 1.5.1',
        },
        {
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          isMandatory: true,
          description:
            'Registration Certificate of Sponsoring Society/Trust/Section 8 Company',
          sourceClause: 'APH 2024-27 Chapter 1 Clause 1.2',
        },
      ],
    },

    POLYTECHNIC_DIPLOMA: {
      applicationCategory: 'POLYTECHNIC_DIPLOMA',
      displayName: 'Diploma in Engineering / Polytechnic',
      requiredDocuments: [
        {
          documentType: 'LAND_TITLE_DEED',
          isMandatory: true,
          description: 'Registered Land Deed for Polytechnic Campus',
          sourceClause: 'Demo Poly Rulebook Clause 1.1',
        },
        {
          documentType: 'BUILDING_PLAN_APPROVAL',
          isMandatory: true,
          description: 'Approved Building Plan for Polytechnic Campus',
          sourceClause: 'Demo Poly Rulebook Clause 1.2',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description: 'Valid Fire Safety NOC from State Fire Service',
          sourceClause: 'Demo Poly Rulebook Clause 1.3',
        },
        {
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          isMandatory: true,
          description: 'Registration Certificate of Sponsoring Trust/Society',
          sourceClause: 'Demo Poly Rulebook Clause 1.4',
        },
      ],
    },

    MANAGEMENT: {
      applicationCategory: 'MANAGEMENT',
      displayName: 'Postgraduate Management (MBA / PGDM)',
      requiredDocuments: [
        {
          documentType: 'LAND_TITLE_DEED',
          isMandatory: true,
          description:
            'Registered Title / Lease Deed for Educational Institution',
          sourceClause: 'APH 2024-27 Management Norms',
        },
        {
          documentType: 'BUILDING_PLAN_APPROVAL',
          isMandatory: true,
          description: 'Approved Building Plan by Competent Local Authority',
          sourceClause: 'APH 2024-27 Management Norms',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description: 'Fire Safety Certificate from Fire Department',
          sourceClause: 'APH 2024-27 Management Norms',
        },
        {
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          isMandatory: true,
          description: 'Trust or Society Registration Certificate',
          sourceClause: 'APH 2024-27 Management Norms',
        },
      ],
    },

    PHARMACY: {
      applicationCategory: 'PHARMACY',
      displayName: 'Pharmacy (B.Pharm / M.Pharm)',
      requiredDocuments: [
        {
          documentType: 'LAND_TITLE_DEED',
          isMandatory: true,
          description: 'Registered Title Deed for Pharmacy Institution',
          sourceClause: 'APH 2024-27 Pharmacy Norms',
        },
        {
          documentType: 'LAND_USE_CERTIFICATE',
          isMandatory: true,
          description: 'Land Use Certificate for Educational Purposes',
          sourceClause: 'APH 2024-27 Pharmacy Norms',
        },
        {
          documentType: 'BUILDING_PLAN_APPROVAL',
          isMandatory: true,
          description: 'Sanctioned Building Plan with Laboratory Provisions',
          sourceClause: 'APH 2024-27 Pharmacy Norms',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description:
            'Valid Fire Safety NOC for Chemical/Flammable Laboratories',
          sourceClause: 'APH 2024-27 Pharmacy Norms',
        },
        {
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          isMandatory: true,
          description: 'Trust or Society Registration Certificate',
          sourceClause: 'APH 2024-27 Pharmacy Norms',
        },
      ],
    },

    EXTENSION_OF_APPROVAL: {
      applicationCategory: 'EXTENSION_OF_APPROVAL',
      displayName: 'Extension of Approval (EoA) / Existing Institution',
      requiredDocuments: [
        {
          documentType: 'AICTE_APPROVAL_LETTER',
          isMandatory: true,
          description: 'Previous Academic Year AICTE Approval Letter',
          sourceClause: 'APH 2024-27 Chapter 2 Clause 2.1',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description: 'Current Valid Fire Safety Certificate / NOC',
          sourceClause: 'APH 2024-27 Chapter 2 Clause 2.3',
        },
      ],
    },

    GENERAL_TECHNICAL_INSTITUTION: {
      applicationCategory: 'GENERAL_TECHNICAL_INSTITUTION',
      displayName: 'General Technical Institution (Standard Baseline)',
      requiredDocuments: [
        {
          documentType: 'LAND_TITLE_DEED',
          isMandatory: true,
          description:
            'Registered Title Deed or 30-Year Continuous Government Lease Deed',
          sourceClause: 'APH 2024-27 Standard Baseline',
        },
        {
          documentType: 'LAND_USE_CERTIFICATE',
          isMandatory: true,
          description: 'Certificate of Land Use / Conversion Order',
          sourceClause: 'APH 2024-27 Standard Baseline',
        },
        {
          documentType: 'BUILDING_PLAN_APPROVAL',
          isMandatory: true,
          description: 'Sanctioned Building Plan by Competent Authority',
          sourceClause: 'APH 2024-27 Standard Baseline',
        },
        {
          documentType: 'FIRE_SAFETY_CERTIFICATE',
          isMandatory: true,
          description: 'Fire Safety NOC from State Fire Service',
          sourceClause: 'APH 2024-27 Standard Baseline',
        },
        {
          documentType: 'SOCIETY_TRUST_REGISTRATION',
          isMandatory: true,
          description: 'Registration Certificate of Sponsoring Trust/Society',
          sourceClause: 'APH 2024-27 Standard Baseline',
        },
      ],
    },
  };

  /**
   * Resolves the canonical category key from application programType.
   */
  resolveCategory(programType?: string): string {
    if (!programType) {
      return 'GENERAL_TECHNICAL_INSTITUTION';
    }

    const normalized = programType.toUpperCase().trim();

    if (
      normalized.includes('ENGINEERING') ||
      normalized.includes('TECHNOLOGY') ||
      normalized.includes('B.TECH') ||
      normalized.includes('BE')
    ) {
      if (
        normalized.includes('DIPLOMA') ||
        normalized.includes('POLYTECHNIC')
      ) {
        return 'POLYTECHNIC_DIPLOMA';
      }
      return 'ENGINEERING_TECHNOLOGY';
    }

    if (normalized.includes('POLYTECHNIC') || normalized.includes('DIPLOMA')) {
      return 'POLYTECHNIC_DIPLOMA';
    }

    if (
      normalized.includes('MANAGEMENT') ||
      normalized.includes('MBA') ||
      normalized.includes('PGDM')
    ) {
      return 'MANAGEMENT';
    }

    if (normalized.includes('PHARMACY') || normalized.includes('PHARM')) {
      return 'PHARMACY';
    }

    if (
      normalized.includes('EXTENSION') ||
      normalized.includes('EOA') ||
      normalized.includes('EXISTING')
    ) {
      return 'EXTENSION_OF_APPROVAL';
    }

    return 'GENERAL_TECHNICAL_INSTITUTION';
  }

  /**
   * Retrieves category document rule definition.
   */
  getCategoryRule(category: string): CategoryDocumentRule {
    return (
      this.categoryRules[category] ||
      this.categoryRules.GENERAL_TECHNICAL_INSTITUTION
    );
  }

  /**
   * Evaluates document completeness for an application.
   */
  evaluateCompleteness(
    application: Application,
    documents: Document[],
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const categoryKey = this.resolveCategory(application.programType);
    const rule = this.getCategoryRule(categoryKey);

    this.logger.debug(
      `Evaluating document completeness for application ${application.applicationNumber} under category '${categoryKey}' (${documents.length} attachments)`,
    );

    // Group documents by documentType and check for hash collisions
    const docsByType = new Map<string, Document[]>();
    const seenHashes = new Map<string, string[]>();

    for (const doc of documents) {
      const list = docsByType.get(doc.documentType) || [];
      list.push(doc);
      docsByType.set(doc.documentType, list);

      if (doc.fileHashSha256) {
        const hashList = seenHashes.get(doc.fileHashSha256) || [];
        hashList.push(doc.fileName);
        seenHashes.set(doc.fileHashSha256, hashList);
      }
    }

    // Flag exact duplicate file submissions (identical SHA-256)
    for (const [hash, fileNames] of seenHashes.entries()) {
      if (fileNames.length > 1) {
        findings.push({
          ruleId: 'DOC-COMP-DUPLICATE-HASH',
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.INCONCLUSIVE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Identical file hash (${hash.substring(0, 12)}...) detected in multiple uploads: ${fileNames.join(', ')}. Review duplicate submissions.`,
          isAdvisory: true,
          metadata: { hash, fileNames },
        });
      }
    }

    // Evaluate each required document specification
    for (const req of rule.requiredDocuments) {
      const uploadedDocs = docsByType.get(req.documentType) || [];

      if (uploadedDocs.length === 0) {
        if (req.isMandatory) {
          findings.push({
            ruleId: `DOC-COMP-MISSING-${req.documentType}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.DEFICIENT,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            message: `Mandatory document '${req.documentType}' is missing for category '${rule.displayName}'. ${req.description}.`,
            documentType: req.documentType,
            expectedValue: req.documentType,
            observedValue: 'NOT_UPLOADED',
            isAdvisory: true,
            metadata: {
              sourceClause: req.sourceClause,
              isMandatory: req.isMandatory,
            },
          });
        }
        continue;
      }

      // Check duplicate uploads for the same document type
      if (uploadedDocs.length > 1) {
        findings.push({
          ruleId: `DOC-COMP-DUPLICATE-TYPE-${req.documentType}`,
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.INCONCLUSIVE,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Multiple submissions (${uploadedDocs.length}) uploaded for document type '${req.documentType}'. Scrutiny officer must designate the authoritative submission.`,
          documentType: req.documentType,
          isAdvisory: true,
          metadata: {
            uploadedFiles: uploadedDocs.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              createdAt: d.createdAt,
            })),
          },
        });
      }

      // Evaluate the processing state and classification of each uploaded document
      let hasValidSatisfyingDoc = false;

      for (const doc of uploadedDocs) {
        if (doc.processingStatus === DocumentProcessingStatus.FAILED_OCR) {
          findings.push({
            ruleId: `DOC-COMP-OCR-FAILED-${doc.id}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            message: `OCR processing failed for document '${doc.fileName}' (${doc.documentType}). Manual review required.`,
            documentId: doc.id,
            documentType: doc.documentType,
            isAdvisory: true,
            metadata: {
              processingStatus: doc.processingStatus,
              fileName: doc.fileName,
            },
          });
          continue;
        }

        if (
          doc.processingStatus === DocumentProcessingStatus.UPLOADED ||
          doc.processingStatus === DocumentProcessingStatus.PROCESSING_OCR
        ) {
          findings.push({
            ruleId: `DOC-COMP-OCR-PENDING-${doc.id}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            message: `Document '${doc.fileName}' (${doc.documentType}) has not completed OCR extraction.`,
            documentId: doc.id,
            documentType: doc.documentType,
            isAdvisory: true,
            metadata: {
              processingStatus: doc.processingStatus,
              fileName: doc.fileName,
            },
          });
          continue;
        }

        // Check if document was classified as UNKNOWN or category mismatch
        const ocrClass = doc.metadata?.ocrClassification as string | undefined;
        if (ocrClass === 'UNKNOWN') {
          findings.push({
            ruleId: `DOC-COMP-UNRECOGNIZED-${doc.id}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.INCONCLUSIVE,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            message: `Uploaded file '${doc.fileName}' could not be verified as a recognized AICTE document schema. Manual scrutiny required.`,
            documentId: doc.id,
            documentType: doc.documentType,
            isAdvisory: true,
          });
        } else if (ocrClass && ocrClass !== doc.documentType) {
          findings.push({
            ruleId: `DOC-COMP-CATEGORY-MISMATCH-${doc.id}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.INCONCLUSIVE,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            message: `Declared document type '${doc.documentType}' differs from AI-classified type '${ocrClass}'.`,
            documentId: doc.id,
            documentType: doc.documentType,
            expectedValue: doc.documentType,
            observedValue: ocrClass,
            isAdvisory: true,
          });
        }

        // The document successfully satisfies the requirement if it is processed
        if (
          doc.processingStatus === DocumentProcessingStatus.OCR_EXTRACTED ||
          doc.processingStatus ===
            DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED
        ) {
          hasValidSatisfyingDoc = true;
          findings.push({
            ruleId: `DOC-COMP-SATISFIED-${doc.documentType}`,
            category: ValidationCategory.DOCUMENT_COMPLETENESS,
            outcome: ValidationOutcome.VALID,
            severity: ComplianceSeverity.COMPLIANT,
            message: `Mandatory document requirement '${req.documentType}' is satisfied by '${doc.fileName}'.`,
            documentId: doc.id,
            documentType: doc.documentType,
            expectedValue: req.documentType,
            observedValue: doc.documentType,
            isAdvisory: true,
            metadata: {
              sourceClause: req.sourceClause,
              processingStatus: doc.processingStatus,
            },
          });
        }
      }

      // If document was uploaded but failed processing and none satisfied
      if (!hasValidSatisfyingDoc && uploadedDocs.length > 0) {
        findings.push({
          ruleId: `DOC-COMP-UNSATISFIED-${req.documentType}`,
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.DEFICIENT,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Mandatory requirement '${req.documentType}' has submissions, but none have completed valid extraction. Manual review required.`,
          documentType: req.documentType,
          isAdvisory: true,
        });
      }
    }

    // Identify unsupported or unrequired document categories
    const recognizedTypes = new Set(
      rule.requiredDocuments.map((r) => r.documentType),
    );
    for (const doc of documents) {
      if (!recognizedTypes.has(doc.documentType)) {
        findings.push({
          ruleId: `DOC-COMP-ADDITIONAL-DOC-${doc.id}`,
          category: ValidationCategory.DOCUMENT_COMPLETENESS,
          outcome: ValidationOutcome.NOT_APPLICABLE,
          severity: ComplianceSeverity.COMPLIANT,
          message: `Uploaded document '${doc.fileName}' (${doc.documentType}) is an optional or supplementary submission for category '${rule.displayName}'.`,
          documentId: doc.id,
          documentType: doc.documentType,
          isAdvisory: true,
        });
      }
    }

    return findings;
  }
}
