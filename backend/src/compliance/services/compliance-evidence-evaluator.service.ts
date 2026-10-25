/**
 * ApprovalSync — Compliance Evidence Evaluator Service
 * Milestone: DOC-06
 *
 * Evaluates document extraction evidence and intake declarations against
 * versioned regulatory rules and checklist items from BE-05.
 *
 * Enforces ADR-004 Human Sovereignty: all generated findings are strictly advisory.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Application } from '../../database/entities/application.entity';
import { Document } from '../../database/entities/document.entity';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { RuleType } from '../../rules/enums';
import {
  ApplicableRulesResolutionProjection,
  ChecklistItemProjection,
  RegulatoryRuleProjection,
} from '../../rules/dto';
import { ComplianceFinding, EvidenceReference } from '../interfaces';

@Injectable()
export class ComplianceEvidenceEvaluatorService {
  private readonly logger = new Logger(ComplianceEvidenceEvaluatorService.name);

  /**
   * Evaluates application evidence against resolved versioned regulatory rules and checklist.
   */
  public evaluateRulesAndChecklists(
    application: Application,
    documents: Document[],
    resolution?: ApplicableRulesResolutionProjection | null,
    evaluationDateStr?: string,
  ): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];
    const evaluationDate = evaluationDateStr
      ? new Date(evaluationDateStr)
      : new Date();

    this.logger.debug(
      `Evaluating compliance evidence for application='${application.applicationNumber}', documents=${documents.length}`,
    );

    // 1. Evaluate Checklist Items if a checklist template is resolved
    if (resolution?.checklists && resolution.checklists.length > 0) {
      for (const template of resolution.checklists) {
        if (!template.items) continue;
        for (const item of template.items) {
          const itemFinding = this.evaluateChecklistItem(
            application,
            documents,
            item,
            template.code,
            resolution,
          );
          if (itemFinding) {
            findings.push(itemFinding);
          }
        }
      }
    }

    // 2. Evaluate Specific Regulatory Rules if rules exist in the resolved version
    if (resolution?.rules && resolution.rules.length > 0) {
      for (const rule of resolution.rules) {
        const ruleFindings = this.evaluateRegulatoryRule(
          application,
          documents,
          rule,
          resolution,
        );
        findings.push(...ruleFindings);
      }
    } else {
      // Unconfigured or no published rule version found
      findings.push({
        id: uuidv4(),
        findingCode: 'WARN_NO_PUBLISHED_RULES',
        title: 'No Published Regulatory Rule Version Applicable',
        description: `No active published regulatory rule version was resolved for category '${application.programType}' at evaluation date. Compliance evaluated using prototype fallback heuristics.`,
        severity: ComplianceSeverity.UNVERIFIED_POLICY,
        isAdvisory: true,
        category: 'DOCUMENTARY',
        evidence: [],
        requiresPhysicalInspection: false,
        recommendedAction:
          'System administrator or scrutiny officer should confirm applicable handbook policy version.',
        limitations: [
          'Evaluated without published statutory rule set version from BE-05.',
        ],
      });
    }

    // 3. Document Expiry Checks on uploaded documents (e.g. Fire Safety NOC)
    const expiryFindings = this.evaluateDocumentExpiries(
      documents,
      evaluationDate,
      resolution,
    );
    findings.push(...expiryFindings);

    return findings;
  }

  /**
   * Evaluates an individual checklist item against attached documents.
   */
  private evaluateChecklistItem(
    application: Application,
    documents: Document[],
    item: ChecklistItemProjection,
    templateCode: string,
    resolution: ApplicableRulesResolutionProjection,
  ): ComplianceFinding | null {
    if (!item.evidenceDocumentType) {
      return null;
    }

    const matchingDoc = documents.find(
      (doc) =>
        doc.documentType?.toUpperCase() ===
        item.evidenceDocumentType?.toUpperCase(),
    );

    // Case A: Missing mandatory document entirely
    if (!matchingDoc) {
      if (!item.required) return null;

      return {
        id: uuidv4(),
        findingCode: 'DEF_MANDATORY_DOCUMENT_MISSING',
        title: `Missing Required Document: ${item.evidenceDocumentType}`,
        description: `Mandatory checklist item "${item.description}" (${item.itemCode}) lacks required document attachment of type '${item.evidenceDocumentType}'.`,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        isAdvisory: true,
        category: 'DOCUMENTARY',
        checklistTemplateCode: templateCode,
        checklistItemCode: item.itemCode,
        ruleCode:
          (item as any).ruleCode ||
          resolution.rules?.find((r) => r.id === item.ruleId)?.ruleCode ||
          undefined,
        ruleVersionId: resolution.ruleVersion?.id,
        ruleVersionNumber: resolution.ruleVersion?.versionNumber,
        sourceClassification: resolution.ruleVersion?.sourceClassification,
        evidence: [
          {
            documentType: item.evidenceDocumentType,
            notes: 'Document attachment not found in application docket.',
          },
        ],
        requiresPhysicalInspection: false,
        recommendedAction: `Upload mandatory ${item.evidenceDocumentType} document complying with AICTE checklist requirements.`,
        limitations: [
          'Completeness verified against active regulatory checklist template.',
        ],
      };
    }

    // Case B: Document exists but processing is not complete
    if (
      matchingDoc.processingStatus === DocumentProcessingStatus.UPLOADED ||
      matchingDoc.processingStatus === DocumentProcessingStatus.PROCESSING_OCR
    ) {
      return {
        id: uuidv4(),
        findingCode: 'FLAG_EVIDENCE_UNPROCESSED',
        title: `Evidence Processing Pending: ${matchingDoc.fileName}`,
        description: `Document attachment '${matchingDoc.fileName}' (${matchingDoc.documentType}) has been uploaded but OCR extraction is currently in status '${matchingDoc.processingStatus}'.`,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        isAdvisory: true,
        category: 'DOCUMENTARY',
        checklistTemplateCode: templateCode,
        checklistItemCode: item.itemCode,
        evidence: [
          {
            documentId: matchingDoc.id,
            documentType: matchingDoc.documentType,
            fileName: matchingDoc.fileName,
            notes: `Processing status: ${matchingDoc.processingStatus}`,
          },
        ],
        requiresPhysicalInspection: false,
        recommendedAction:
          'Wait for document OCR processing job to finish or re-trigger document processing before finalizing scrutiny.',
        limitations: [
          'Document content cannot be verified until OCR text and fields are extracted.',
        ],
      };
    }

    // Case C: Document processing failed or flagged for manual review
    if (
      matchingDoc.processingStatus === DocumentProcessingStatus.FAILED_OCR ||
      matchingDoc.processingStatus ===
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED
    ) {
      return {
        id: uuidv4(),
        findingCode: 'FLAG_EVIDENCE_UNREADABLE',
        title: `Evidence Quality Warning: ${matchingDoc.fileName}`,
        description: `Document attachment '${matchingDoc.fileName}' encountered OCR extraction difficulties (status='${matchingDoc.processingStatus}'). Automated validation cannot confidently parse required text.`,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        isAdvisory: true,
        category: 'DOCUMENTARY',
        checklistTemplateCode: templateCode,
        checklistItemCode: item.itemCode,
        evidence: [
          {
            documentId: matchingDoc.id,
            documentType: matchingDoc.documentType,
            fileName: matchingDoc.fileName,
            notes: `Processing status: ${matchingDoc.processingStatus}`,
          },
        ],
        requiresPhysicalInspection: false,
        recommendedAction:
          'Scrutiny officer must manually inspect document scan quality and legibility.',
        limitations: [
          'OCR confidence was insufficient for automated extraction.',
        ],
      };
    }

    return null;
  }

  /**
   * Evaluates an individual versioned regulatory rule against application metrics and extracted fields.
   */
  private evaluateRegulatoryRule(
    application: Application,
    documents: Document[],
    rule: RegulatoryRuleProjection,
    resolution: ApplicableRulesResolutionProjection,
  ): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];
    const payload = (application.payloadJsonb || {}) as Record<string, any>;
    const params = (rule.parametersJsonb || {}) as Record<string, any>;

    switch (rule.ruleType) {
      case RuleType.INFRASTRUCTURE_LAND: {
        const minAcres = Number(params.minLandAcres || 7.5);

        // Find land title deed
        const landDoc = documents.find(
          (d) => d.documentType === 'LAND_TITLE_DEED',
        );
        const analysisReport = (landDoc?.metadata?.analysisReport || {}) as any;
        const extractedFields = analysisReport.extractedFields || {};

        const extractedAcres = extractedFields.landAreaAcres
          ? Number(extractedFields.landAreaAcres)
          : null;
        const declaredAcres = payload.landAreaAcres
          ? Number(payload.landAreaAcres)
          : null;

        const effectiveAcres =
          extractedAcres !== null && !isNaN(extractedAcres)
            ? extractedAcres
            : declaredAcres;

        const evidenceRef: EvidenceReference = {
          documentId: landDoc?.id,
          documentType: 'LAND_TITLE_DEED',
          fileName: landDoc?.fileName,
          fieldKey: 'landAreaAcres',
          extractedValue: extractedAcres,
          declaredValue: declaredAcres,
        };

        if (effectiveAcres === null || isNaN(effectiveAcres)) {
          findings.push({
            id: uuidv4(),
            findingCode: 'FLAG_LAND_AREA_UNDECLARED',
            title: `Land Area Metric Missing: ${rule.title}`,
            description: `Unable to verify ${rule.ruleCode}: neither extracted land deed area nor application intake land area declaration was provided.`,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'Applicant must declare land parcel acreage and attach registered title deed.',
            limitations: [
              'No numeric acreage data available for automated comparison.',
            ],
          });
        } else if (effectiveAcres < minAcres) {
          findings.push({
            id: uuidv4(),
            findingCode: 'DEF_LAND_AREA_INSUFFICIENT',
            title: `Deficiency: Land Area Below Regulatory Norm (${effectiveAcres} < ${minAcres} Acres)`,
            description: `Campus land area of ${effectiveAcres} acres falls short of the mandatory minimum requirement of ${minAcres} acres under ${rule.ruleCode} (${rule.sourceClause || 'APH Norms'}).`,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'Scrutiny officer must flag land area deficiency for clarification or hearing.',
            limitations: [
              'Comparison based on OCR extracted land area and declared metrics.',
            ],
          });
        } else {
          // Compliant
          findings.push({
            id: uuidv4(),
            findingCode: 'COMPL_LAND_NORM_SATISFIED',
            title: `Compliant: Land Area Satisfies Norms (${effectiveAcres} >= ${minAcres} Acres)`,
            description: `Campus land area of ${effectiveAcres} acres meets the minimum requirement of ${minAcres} acres under ${rule.ruleCode}.`,
            severity: ComplianceSeverity.COMPLIANT,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: false,
            recommendedAction: 'No action required; land acreage compliant.',
            limitations: [
              'Subject to physical boundary verification during Expert Visit Committee (EVC) inspection.',
            ],
          });
        }
        break;
      }

      case RuleType.INFRASTRUCTURE_BUILTUP: {
        const minBuiltUpSqm = Number(params.minBuiltUpAreaSqMeters || 4000);

        const planDoc = documents.find(
          (d) => d.documentType === 'BUILDING_PLAN_APPROVAL',
        );
        const analysisReport = (planDoc?.metadata?.analysisReport || {}) as any;
        const extractedFields = analysisReport.extractedFields || {};

        const extractedSqm = extractedFields.totalBuiltUpAreaSqm
          ? Number(extractedFields.totalBuiltUpAreaSqm)
          : null;
        const declaredSqm = payload.builtUpAreaSqMeters
          ? Number(payload.builtUpAreaSqMeters)
          : null;

        const effectiveSqm =
          extractedSqm !== null && !isNaN(extractedSqm)
            ? extractedSqm
            : declaredSqm;

        const evidenceRef: EvidenceReference = {
          documentId: planDoc?.id,
          documentType: 'BUILDING_PLAN_APPROVAL',
          fileName: planDoc?.fileName,
          fieldKey: 'totalBuiltUpAreaSqm',
          extractedValue: extractedSqm,
          declaredValue: declaredSqm,
        };

        if (effectiveSqm === null || isNaN(effectiveSqm)) {
          findings.push({
            id: uuidv4(),
            findingCode: 'FLAG_BUILTUP_UNDECLARED',
            title: `Built-up Area Metric Missing: ${rule.title}`,
            description: `Unable to verify ${rule.ruleCode}: neither sanctioned built-up area nor application intake declaration was supplied.`,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'Applicant must provide approved building plan showing sanctioned built-up area.',
            limitations: [
              'No numeric built-up area data available for automated comparison.',
            ],
          });
        } else if (effectiveSqm < minBuiltUpSqm) {
          findings.push({
            id: uuidv4(),
            findingCode: 'DEF_BUILTUP_DEFICIT',
            title: `Deficiency: Built-up Area Deficit (${effectiveSqm} < ${minBuiltUpSqm} Sq.m)`,
            description: `Campus built-up instructional and administrative area of ${effectiveSqm} sq.m fails to satisfy the minimum threshold of ${minBuiltUpSqm} sq.m under ${rule.ruleCode} (${rule.sourceClause || 'APH Norms'}).`,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'Scrutiny officer must flag built-up deficiency and review building sanction schedules.',
            limitations: [
              'Calculated against sanctioned plan figures and declared intake metrics.',
            ],
          });
        } else {
          // Compliant
          findings.push({
            id: uuidv4(),
            findingCode: 'COMPL_BUILTUP_NORM_SATISFIED',
            title: `Compliant: Built-up Area Satisfies Norms (${effectiveSqm} >= ${minBuiltUpSqm} Sq.m)`,
            description: `Campus built-up area of ${effectiveSqm} sq.m satisfies the minimum requirement of ${minBuiltUpSqm} sq.m under ${rule.ruleCode}.`,
            severity: ComplianceSeverity.COMPLIANT,
            isAdvisory: true,
            category: 'INFRASTRUCTURE',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: false,
            recommendedAction: 'No action required; built-up area compliant.',
            limitations: ['Subject to physical carpet area inspection by EVC.'],
          });
        }
        break;
      }

      case RuleType.FACULTY_RATIO: {
        const maxRatio = Number(params.maxStudentFacultyRatio || 20);
        const facultyCount = Number(payload.facultyCount || 0);
        const studentIntake = Number(
          payload.declaredIntake || payload.studentCount || 0,
        );

        const ratio = facultyCount > 0 ? studentIntake / facultyCount : null;

        const evidenceRef: EvidenceReference = {
          declaredValue: ratio !== null ? Number(ratio.toFixed(2)) : null,
          notes: `Declared Intake: ${studentIntake}, Faculty Count: ${facultyCount}`,
        };

        if (!studentIntake || !facultyCount || ratio === null) {
          findings.push({
            id: uuidv4(),
            findingCode: 'FLAG_FACULTY_DATA_INCOMPLETE',
            title: `Faculty Metric Incomplete: ${rule.title}`,
            description: `Cannot evaluate ${rule.ruleCode}: either declared intake (${studentIntake}) or faculty headcount (${facultyCount}) is unstated.`,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            isAdvisory: true,
            category: 'CADRE_RATIO',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: false,
            recommendedAction:
              'Verify faculty roster upload and declared student intake in application profile.',
            limitations: ['Roster declarations require manual verification.'],
          });
        } else if (ratio > maxRatio) {
          findings.push({
            id: uuidv4(),
            findingCode: 'DEF_FACULTY_RATIO_EXCEEDED',
            title: `Deficiency: Student-to-Faculty Ratio Exceeded (${ratio.toFixed(1)}:1 > ${maxRatio}:1)`,
            description: `Declared student-to-faculty ratio of ${ratio.toFixed(1)}:1 exceeds the statutory maximum ceiling of ${maxRatio}:1 under ${rule.ruleCode}.`,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            isAdvisory: true,
            category: 'CADRE_RATIO',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: false,
            recommendedAction:
              'Institution must recruit additional qualified full-time faculty to satisfy cadre norms.',
            limitations: [
              'Based entirely on self-declared intake and faculty counts.',
            ],
          });
        } else {
          findings.push({
            id: uuidv4(),
            findingCode: 'COMPL_FACULTY_RATIO_SATISFIED',
            title: `Compliant: Student-to-Faculty Ratio Satisfied (${ratio.toFixed(1)}:1 <= ${maxRatio}:1)`,
            description: `Student-to-faculty ratio of ${ratio.toFixed(1)}:1 is within the maximum limit of ${maxRatio}:1 under ${rule.ruleCode}.`,
            severity: ComplianceSeverity.COMPLIANT,
            isAdvisory: true,
            category: 'CADRE_RATIO',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: false,
            recommendedAction: 'No action required; faculty ratio compliant.',
            limitations: ['Based on self-declared roster.'],
          });
        }
        break;
      }

      case RuleType.BARRIER_FREE_ENVIRONMENT: {
        const barrierDoc = documents.find(
          (d) =>
            d.documentType === 'AFFIDAVIT_COMPLIANCE' ||
            d.documentType === 'BUILDING_PLAN_APPROVAL',
        );

        const hasBarrierFreeDeclaration = Boolean(
          payload.barrierFreeFacilities ||
          payload.hasRampsAndLifts ||
          barrierDoc,
        );

        const evidenceRef: EvidenceReference = {
          documentId: barrierDoc?.id,
          documentType: barrierDoc?.documentType,
          fileName: barrierDoc?.fileName,
          notes: hasBarrierFreeDeclaration
            ? 'Barrier-free environment claimed in application.'
            : 'No barrier-free architect certification detected.',
        };

        if (!hasBarrierFreeDeclaration) {
          findings.push({
            id: uuidv4(),
            findingCode: 'FLAG_BARRIER_FREE_UNCONFIRMED',
            title: `Advisory: Barrier-Free Accessibility Unconfirmed`,
            description: `Campus barrier-free facilities (ramps, elevators for multi-story blocks, accessible toilets) are not substantiated by architect certificate under ${rule.ruleCode}.`,
            severity: ComplianceSeverity.ADVISORY_FLAG,
            isAdvisory: true,
            category: 'SAFETY_ACCESSIBILITY',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'EVC inspection committee must inspect physical accessibility ramps, lifts, and toilets.',
            limitations: [
              'Document AI cannot verify physical accessibility existence without on-site visual survey.',
            ],
          });
        } else {
          findings.push({
            id: uuidv4(),
            findingCode: 'COMPL_BARRIER_FREE_DECLARED',
            title: `Compliant: Barrier-Free Facilities Declared`,
            description: `Barrier-free facilities declared in application documents under ${rule.ruleCode}. Physical verification recommended during EVC visit.`,
            severity: ComplianceSeverity.COMPLIANT,
            isAdvisory: true,
            category: 'SAFETY_ACCESSIBILITY',
            ruleCode: rule.ruleCode,
            ruleVersionId: resolution.ruleVersion?.id,
            ruleVersionNumber: resolution.ruleVersion?.versionNumber,
            sourceClause: rule.sourceClause || undefined,
            sourceClassification: rule.sourceClassification || undefined,
            evidence: [evidenceRef],
            requiresPhysicalInspection: true,
            recommendedAction:
              'EVC inspector should confirm operational status of ramps and lifts during visit.',
            limitations: [
              '2D scan cannot certify mechanical lift operations or slope gradient compliance.',
            ],
          });
        }
        break;
      }

      default:
        // Generic rule fallback
        break;
    }

    return findings;
  }

  /**
   * Evaluates document expiries (e.g. Fire Safety NOC) against the evaluation date.
   */
  private evaluateDocumentExpiries(
    documents: Document[],
    evaluationDate: Date,
    resolution?: ApplicableRulesResolutionProjection | null,
  ): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    const fireDoc = documents.find(
      (d) => d.documentType === 'FIRE_SAFETY_CERTIFICATE',
    );
    if (fireDoc) {
      const analysisReport = (fireDoc.metadata?.analysisReport || {}) as any;
      const extractedFields = analysisReport.extractedFields || {};

      if (extractedFields.expiryDate) {
        const expiryDate = new Date(extractedFields.expiryDate);
        if (!isNaN(expiryDate.getTime())) {
          if (expiryDate < evaluationDate) {
            findings.push({
              id: uuidv4(),
              findingCode: 'FLAG_FIRE_NOC_EXPIRED',
              title: `Critical Deficiency: Fire Safety NOC Expired on ${expiryDate.toISOString().split('T')[0]}`,
              description: `The Fire Safety Certificate NOC (${extractedFields.nocNumber || 'N/A'}) expired on ${expiryDate.toISOString().split('T')[0]}, which precedes the evaluation date ${evaluationDate.toISOString().split('T')[0]}.`,
              severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
              isAdvisory: true,
              category: 'SAFETY_ACCESSIBILITY',
              ruleVersionId: resolution?.ruleVersion?.id,
              ruleVersionNumber: resolution?.ruleVersion?.versionNumber,
              evidence: [
                {
                  documentId: fireDoc.id,
                  documentType: 'FIRE_SAFETY_CERTIFICATE',
                  fileName: fireDoc.fileName,
                  fieldKey: 'expiryDate',
                  extractedValue: extractedFields.expiryDate,
                },
              ],
              requiresPhysicalInspection: false,
              recommendedAction:
                'Applicant must obtain and upload a valid, unexpired Fire Safety Certificate renewal from the municipal fire authority.',
              limitations: [
                'Expiry evaluated against document AI parsed expiration date.',
              ],
            });
          } else {
            findings.push({
              id: uuidv4(),
              findingCode: 'COMPL_FIRE_NOC_VALID',
              title: `Compliant: Fire Safety NOC Valid Until ${expiryDate.toISOString().split('T')[0]}`,
              description: `Fire Safety NOC (${extractedFields.nocNumber || 'N/A'}) is unexpired and valid through ${expiryDate.toISOString().split('T')[0]}.`,
              severity: ComplianceSeverity.COMPLIANT,
              isAdvisory: true,
              category: 'SAFETY_ACCESSIBILITY',
              evidence: [
                {
                  documentId: fireDoc.id,
                  documentType: 'FIRE_SAFETY_CERTIFICATE',
                  fileName: fireDoc.fileName,
                  fieldKey: 'expiryDate',
                  extractedValue: extractedFields.expiryDate,
                },
              ],
              requiresPhysicalInspection: true,
              recommendedAction:
                'Verify operational condition of fire-fighting equipment during EVC visit.',
              limitations: [
                'Certificate validity does not substitute for on-site physical fire equipment readiness.',
              ],
            });
          }
        }
      }
    }

    return findings;
  }
}
