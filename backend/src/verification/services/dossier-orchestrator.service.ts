/**
 * ApprovalSync — Dossier Orchestrator Service
 * Milestone: DOC-07
 *
 * Coordinates execution and aggregation across all M3 verification pipelines:
 * 1. Document completeness, field completeness, expiry, cross-record consistency (DOC-03)
 * 2. Cryptographic SHA-256 duplicate detection & structural integrity / tamper anomalies (DOC-04)
 * 3. External & simulated issuer verification adapters (DOC-05)
 * 4. Regulatory compliance checklist evaluation & physical infrastructure review assist (DOC-06)
 *
 * Enforces ADR-004 Human Sovereignty: all outputs are strictly advisory decision support.
 * Enforces strict institutional tenant isolation.
 */

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { UserRole } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { OverallValidationStatus } from '../enums';
import {
  DossierFindingCategory,
  DossierReportFinding,
  DocumentVerificationMatrixItem,
  IssuerVerificationSummary,
  InfrastructureReviewSummaryMetrics,
  RegulatoryComplianceSummary,
  DossierReportSummary,
  DossierVerificationResult,
  IDateProvider,
  DATE_PROVIDER_TOKEN,
} from '../interfaces';
import { DossierQueryDto, DossierSummaryDto } from '../dto';
import { ValidationOrchestratorService } from './validation-orchestrator.service';
import { ComplianceService } from '../../compliance/services/compliance.service';
import { IssuerVerificationService } from '../../providers/services/issuer-verification.service';

export const DOSSIER_REPORT_DISCLAIMER =
  'This dossier verification report is an automated decision-support aggregation combining document completeness, OCR extraction, cryptographic duplicate detection, structural integrity checks, external/simulated issuer verification, and regulatory compliance heuristics. In accordance with ApprovalSync Human Sovereignty Governance (ADR-004), all findings, flags, and overall dispositions are strictly ADVISORY. This system does NOT make automatic approval or rejection decisions. Final statutory determinations remain exclusively with authorized human scrutiny officers, Regional Officers, and the Expert Visit Committee (EVC).';

const ELIGIBLE_ISSUER_VERIFICATION_TYPES = [
  'LAND_TITLE_DEED',
  'LAND_USE_CERTIFICATE',
  'BUILDING_PLAN_APPROVAL',
  'FIRE_SAFETY_CERTIFICATE',
  'OCCUPANCY_CERTIFICATE',
  'SOCIETY_TRUST_REGISTRATION',
  'AFFIDAVIT_COMPLIANCE',
];

@Injectable()
export class DossierOrchestratorService {
  private readonly logger = new Logger(DossierOrchestratorService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly validationOrchestrator: ValidationOrchestratorService,
    private readonly complianceService: ComplianceService,
    private readonly issuerVerificationService: IssuerVerificationService,
    @Inject(DATE_PROVIDER_TOKEN)
    private readonly dateProvider: IDateProvider,
  ) {}

  /**
   * Authorizes the user to access the application enforcing institutional tenant boundaries.
   */
  public async findAndAuthorizeApplication(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<{
    application: Application;
    institution: Institution;
    documents: Document[];
  }> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['institution', 'documents'],
    });

    if (!application) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Application with ID '${applicationId}' was not found.`,
      });
    }

    // Institutional tenant isolation guard
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot access applications from another institution.',
        });
      }
    }

    const institution =
      application.institution ||
      (await this.institutionRepository.findOne({
        where: { id: application.institutionId },
      }));

    if (!institution) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Institution for application '${applicationId}' was not found.`,
      });
    }

    const documents =
      application.documents ||
      (await this.documentRepository.find({
        where: { applicationId: application.id },
      }));

    return { application, institution, documents };
  }

  /**
   * Evaluates the complete consolidated dossier report across all M3 pipelines.
   */
  public async evaluateDossier(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    options?: DossierQueryDto,
  ): Promise<DossierVerificationResult> {
    const { application, institution, documents } =
      await this.findAndAuthorizeApplication(applicationId, currentUser);

    this.logger.log(
      `Starting consolidated dossier verification for application='${application.applicationNumber}' by actor='${currentUser.email}' (${documents.length} attachments)`,
    );

    const evaluatedAt = (
      options?.asOfDate
        ? new Date(options.asOfDate)
        : this.dateProvider.getNow()
    ).toISOString();

    // 1. Execute Document & Integrity Validation (DOC-03 & DOC-04)
    const validationResult =
      await this.validationOrchestrator.validateApplicationDocuments(
        applicationId,
        currentUser,
        {
          asOfDate: options?.asOfDate,
          recalculate: true,
        },
      );

    // 2. Execute Regulatory Compliance & Infrastructure Review (DOC-06)
    const complianceResult = await this.complianceService.evaluateCompliance(
      applicationId,
      currentUser,
      {
        evaluationDate: options?.asOfDate
          ? options.asOfDate.split('T')[0]
          : undefined,
      },
    );

    // 3. Process / Gather Issuer Verifications (DOC-05)
    const issuerVerificationMap = new Map<string, any>();
    for (const doc of documents) {
      let issuerVer = doc.metadata?.issuerVerification;

      if (
        !issuerVer &&
        ELIGIBLE_ISSUER_VERIFICATION_TYPES.includes(
          doc.documentType?.toUpperCase(),
        )
      ) {
        try {
          issuerVer = await this.issuerVerificationService.verifyDocumentIssuer(
            doc.id,
            currentUser,
          );
        } catch (err: any) {
          this.logger.warn(
            `Issuer verification attempt for docId='${doc.id}' failed or unavailable: ${err.message}`,
          );
          issuerVer = {
            status: 'SOURCE_UNAVAILABLE',
            outcome: 'SOURCE_UNAVAILABLE',
            isSimulated: true,
            comparisonSummary:
              'Verification source temporarily unavailable or unconfigured',
          };
        }
      }

      if (issuerVer) {
        issuerVerificationMap.set(doc.id, issuerVer);
      }
    }

    // 4. Construct Unified Evidence-Linked Findings
    const findings: DossierReportFinding[] = [];

    // Map validation findings (DOC-03 & DOC-04)
    for (const vf of validationResult.findings) {
      let category: DossierFindingCategory = 'DOCUMENT_COMPLETENESS';
      const ruleUpper = (vf.ruleId || '').toUpperCase();

      if (ruleUpper.includes('DUP') || ruleUpper.includes('NEAR')) {
        category = 'DUPLICATE_DETECTION';
      } else if (
        ruleUpper.includes('INTEGRITY') ||
        ruleUpper.includes('TAMPER') ||
        ruleUpper.includes('HEADER') ||
        ruleUpper.includes('ACTIVE') ||
        ruleUpper.includes('TOOL') ||
        ruleUpper.includes('TIMELINE')
      ) {
        category = 'DOCUMENT_INTEGRITY';
      } else if (ruleUpper.includes('EXPIR') || ruleUpper.includes('DATE')) {
        category = 'EXPIRY_VALIDITY';
      } else if (ruleUpper.includes('CONSIST') || ruleUpper.includes('CROSS')) {
        category = 'CROSS_RECORD_CONSISTENCY';
      } else if (ruleUpper.includes('FIELD')) {
        category = 'FIELD_COMPLETENESS';
      } else {
        category = 'DOCUMENT_COMPLETENESS';
      }

      findings.push({
        id: `FIND-${vf.ruleId}-${vf.documentId || 'APP'}`,
        category,
        ruleCode: vf.ruleId,
        ruleDescription: vf.message,
        severity:
          vf.severity === 'CRITICAL_DEFICIENCY'
            ? 'CRITICAL_DEFICIENCY'
            : vf.severity === 'ADVISORY_FLAG'
              ? 'ADVISORY_FLAG'
              : 'COMPLIANT',
        outcome: vf.outcome,
        documentId: vf.documentId,
        documentType: vf.documentType,
        fieldKey: vf.fieldKey,
        expectedValue: vf.expectedValue,
        actualValue: vf.observedValue,
        message: vf.message,
        boundingLocation: vf.evidenceLocation,
        requiresPhysicalInspection: false,
        isAdvisory: true,
        evidence: (vf.metadata as Record<string, unknown>) || {
          category: vf.category,
        },
      });
    }

    // Map compliance findings (DOC-06)
    for (const cf of complianceResult.findings) {
      const ruleCodeStr = cf.ruleCode || cf.findingCode || 'COMPLIANCE-RULE';
      const isInfra =
        ruleCodeStr.includes('INFRA') ||
        ruleCodeStr.includes('AREA') ||
        ruleCodeStr.includes('LAND') ||
        cf.category === 'INFRASTRUCTURE' ||
        Boolean(cf.requiresPhysicalInspection);

      const firstEvidence = cf.evidence?.[0];

      findings.push({
        id: cf.id || `FIND-COMP-${ruleCodeStr}`,
        category: isInfra ? 'INFRASTRUCTURE_REVIEW' : 'REGULATORY_COMPLIANCE',
        ruleCode: ruleCodeStr,
        ruleDescription: cf.title || cf.description || ruleCodeStr,
        severity: cf.severity,
        outcome: cf.severity === 'COMPLIANT' ? 'COMPLIANT' : 'DEFICIENT',
        documentId: firstEvidence?.documentId,
        documentType: firstEvidence?.documentType,
        fieldKey: firstEvidence?.fieldKey,
        expectedValue: undefined,
        actualValue:
          firstEvidence?.extractedValue ??
          firstEvidence?.declaredValue ??
          undefined,
        message: cf.description || cf.title || '',
        boundingLocation: undefined,
        requiresPhysicalInspection: Boolean(cf.requiresPhysicalInspection),
        isAdvisory: true,
        evidence: cf.evidence,
      });
    }

    // Map issuer verification findings (DOC-05)
    for (const doc of documents) {
      const issuerVer = issuerVerificationMap.get(doc.id);
      if (!issuerVer) continue;

      if (
        issuerVer.outcome === 'DISCREPANCY' ||
        issuerVer.outcome === 'MISMATCH' ||
        issuerVer.outcome === 'INVALID_SIGNATURE' ||
        issuerVer.outcome === 'EXPIRED'
      ) {
        findings.push({
          id: `FIND-ISSUER-DISCREPANCY-${doc.id}`,
          category: 'ISSUER_VERIFICATION',
          ruleCode: 'ISSUER-VERIFICATION-DISCREPANCY',
          ruleDescription: 'Issuer statutory record verification mismatch',
          severity: 'CRITICAL_DEFICIENCY',
          outcome: issuerVer.outcome,
          documentId: doc.id,
          documentType: doc.documentType,
          message: `Issuer verification for ${doc.documentType} indicated mismatch: ${
            issuerVer.comparisonSummary ||
            'Field discrepancy with statutory registry'
          }`,
          requiresPhysicalInspection: true,
          isAdvisory: true,
          evidence: {
            sourceName: issuerVer.sourceName,
            isSimulated: issuerVer.isSimulated,
            discrepantFields: issuerVer.discrepantFields,
          },
        });
      } else if (
        issuerVer.outcome === 'SOURCE_UNAVAILABLE' ||
        issuerVer.outcome === 'PENDING'
      ) {
        findings.push({
          id: `FIND-ISSUER-UNAVAILABLE-${doc.id}`,
          category: 'ISSUER_VERIFICATION',
          ruleCode: 'ISSUER-VERIFICATION-SOURCE-UNAVAILABLE',
          ruleDescription: 'Issuer statutory verification source unavailable',
          severity: 'ADVISORY_FLAG',
          outcome: issuerVer.outcome,
          documentId: doc.id,
          documentType: doc.documentType,
          message: `External issuer verification could not be confirmed for ${doc.documentType} (Source unavailable or unconfigured). Officer review required.`,
          requiresPhysicalInspection: false,
          isAdvisory: true,
          evidence: {
            sourceName: issuerVer.sourceName,
            isSimulated: issuerVer.isSimulated,
          },
        });
      } else if (issuerVer.outcome === 'VERIFIED') {
        findings.push({
          id: `FIND-ISSUER-VERIFIED-${doc.id}`,
          category: 'ISSUER_VERIFICATION',
          ruleCode: 'ISSUER-VERIFICATION-CONFIRMED',
          ruleDescription: 'Issuer statutory record verification confirmed',
          severity: 'COMPLIANT',
          outcome: 'VERIFIED',
          documentId: doc.id,
          documentType: doc.documentType,
          message: `Issuer verification confirmed matching record for ${doc.documentType} (${
            issuerVer.isSimulated
              ? 'Simulated Sandbox Double'
              : issuerVer.sourceName
          })`,
          requiresPhysicalInspection: false,
          isAdvisory: true,
          evidence: {
            sourceName: issuerVer.sourceName,
            isSimulated: issuerVer.isSimulated,
            matchedFields: issuerVer.matchedFields,
          },
        });
      }
    }

    // 5. Build Document Verification Matrix
    const documentMatrix: DocumentVerificationMatrixItem[] = [];
    for (const doc of documents) {
      const issuerVer = issuerVerificationMap.get(doc.id);
      const docFindings = findings.filter((f) => f.documentId === doc.id);

      const integrityAnomalyFindings = docFindings.filter(
        (f) =>
          f.category === 'DOCUMENT_INTEGRITY' &&
          (f.severity === 'CRITICAL_DEFICIENCY' ||
            f.severity === 'ADVISORY_FLAG'),
      );

      const duplicateFindings = docFindings.filter(
        (f) =>
          f.category === 'DUPLICATE_DETECTION' &&
          (f.severity === 'CRITICAL_DEFICIENCY' ||
            f.severity === 'ADVISORY_FLAG'),
      );

      let integrityStatus: 'VALID' | 'ANOMALIES_DETECTED' | 'UNCHECKED' =
        'VALID';
      if (integrityAnomalyFindings.length > 0) {
        integrityStatus = 'ANOMALIES_DETECTED';
      }

      let duplicateStatus: 'UNIQUE' | 'EXACT_DUPLICATE' | 'NEAR_DUPLICATE' =
        'UNIQUE';
      const duplicateMatchIds: string[] = [];
      if (duplicateFindings.length > 0) {
        const isExact = duplicateFindings.some((df) =>
          df.ruleCode.includes('EXACT'),
        );
        duplicateStatus = isExact ? 'EXACT_DUPLICATE' : 'NEAR_DUPLICATE';
      }

      let issuerStatus:
        | 'VERIFIED'
        | 'DISCREPANCY'
        | 'SIMULATED'
        | 'NOT_APPLICABLE'
        | 'PENDING'
        | 'SOURCE_UNAVAILABLE' = 'NOT_APPLICABLE';

      if (issuerVer) {
        if (
          issuerVer.outcome === 'DISCREPANCY' ||
          issuerVer.outcome === 'MISMATCH'
        ) {
          issuerStatus = 'DISCREPANCY';
        } else if (issuerVer.outcome === 'VERIFIED') {
          issuerStatus = issuerVer.isSimulated ? 'SIMULATED' : 'VERIFIED';
        } else if (issuerVer.outcome === 'SOURCE_UNAVAILABLE') {
          issuerStatus = 'SOURCE_UNAVAILABLE';
        } else if (issuerVer.outcome === 'PENDING') {
          issuerStatus = 'PENDING';
        }
      }

      const analysisReport = (doc.metadata?.analysisReport || {}) as {
        ocrConfidence?: number;
        extractedFields?: Record<string, string | number>;
      };
      const rawConfidence =
        (doc.metadata?.ocrConfidence as number) ??
        analysisReport.ocrConfidence ??
        0;
      const ocrConfidence =
        typeof rawConfidence === 'number'
          ? Number(rawConfidence.toFixed(2))
          : 0;
      const extractedFields = analysisReport.extractedFields || {};

      documentMatrix.push({
        documentId: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSizeBytes: doc.fileSizeBytes,
        mimeType: doc.mimeType,
        sha256Checksum: doc.fileHashSha256,
        processingStatus: doc.processingStatus,
        ocrConfidence,
        extractedFieldCount: Object.keys(extractedFields).length,
        extractedFields,
        integrityStatus,
        integrityAnomalyCodes: integrityAnomalyFindings.map((f) => f.ruleCode),
        duplicateStatus,
        duplicateMatchIds,
        issuerStatus,
        issuerProviderId: issuerVer?.sourceId || issuerVer?.sourceName,
        isSimulated: issuerVer?.isSimulated ?? true,
        findingsCount: docFindings.length,
      });
    }

    // 6. Compute Consolidated Summary Metrics
    const criticalDeficienciesCount = findings.filter(
      (f) => f.severity === 'CRITICAL_DEFICIENCY',
    ).length;
    const advisoryFlagsCount = findings.filter(
      (f) => f.severity === 'ADVISORY_FLAG',
    ).length;
    const compliantCount = findings.filter(
      (f) => f.severity === 'COMPLIANT',
    ).length;

    const duplicateMatchCount = findings.filter(
      (f) => f.category === 'DUPLICATE_DETECTION',
    ).length;
    const integrityAnomalyCount = findings.filter(
      (f) => f.category === 'DOCUMENT_INTEGRITY' && f.severity !== 'COMPLIANT',
    ).length;

    let verifiedCount = 0;
    let discrepancyCount = 0;
    let simulatedCount = 0;
    let pendingCount = 0;

    for (const [, ver] of issuerVerificationMap.entries()) {
      if (ver.outcome === 'VERIFIED') {
        verifiedCount++;
        if (ver.isSimulated) simulatedCount++;
      } else if (ver.outcome === 'DISCREPANCY' || ver.outcome === 'MISMATCH') {
        discrepancyCount++;
      } else if (
        ver.outcome === 'PENDING' ||
        ver.outcome === 'SOURCE_UNAVAILABLE'
      ) {
        pendingCount++;
      }
    }

    const issuerVerificationSummary: IssuerVerificationSummary = {
      totalEligible: issuerVerificationMap.size,
      verifiedCount,
      discrepancyCount,
      simulatedCount,
      pendingCount,
    };

    const infraSummary = complianceResult.infrastructureReview || ({} as any);
    const infraMetrics: InfrastructureReviewSummaryMetrics = {
      landCompliant: Boolean(infraSummary.landCompliant),
      builtUpAreaCompliant: Boolean(infraSummary.builtUpAreaCompliant),
      barrierFreeDeclared: Boolean(infraSummary.barrierFreeDeclared),
      fireSafetyValid: Boolean(infraSummary.fireSafetyValid),
      evcInspectionRecommended: Boolean(infraSummary.evcInspectionRecommended),
      inspectionTriggerReasons: infraSummary.inspectionTriggerReasons || [],
      heuristicLimitations: infraSummary.heuristicLimitations || [],
    };

    const requiresPhysicalInspection =
      criticalDeficienciesCount > 0 ||
      infraMetrics.evcInspectionRecommended ||
      complianceResult.summary?.requiresPhysicalInspection === true ||
      findings.some((f) => f.requiresPhysicalInspection);

    const summary: DossierReportSummary = {
      totalDocuments: documents.length,
      totalRulesEvaluated:
        validationResult.summary.totalRulesEvaluated +
        complianceResult.summary.totalRulesEvaluated +
        issuerVerificationMap.size,
      criticalDeficienciesCount,
      advisoryFlagsCount,
      compliantCount,
      hasCriticalDeficiency: criticalDeficienciesCount > 0,
      duplicateMatchCount,
      integrityAnomalyCount,
      issuerVerificationSummary,
      infrastructureReviewSummary: infraMetrics,
      requiresPhysicalInspection,
    };

    // 7. Determine Overall Disposition Status
    let overallStatus: OverallValidationStatus =
      OverallValidationStatus.COMPLIANT;
    if (criticalDeficienciesCount > 0) {
      overallStatus = OverallValidationStatus.DEFICIENT;
    } else if (
      advisoryFlagsCount > 0 ||
      duplicateMatchCount > 0 ||
      integrityAnomalyCount > 0 ||
      discrepancyCount > 0 ||
      requiresPhysicalInspection
    ) {
      overallStatus = OverallValidationStatus.REQUIRES_REVIEW;
    }

    const regulatoryCompliance: RegulatoryComplianceSummary = {
      ruleSetCode: complianceResult.ruleSetCode,
      ruleSetName: complianceResult.ruleSetName,
      ruleVersionNumber: complianceResult.ruleVersionNumber,
      ruleVersionId: complianceResult.ruleVersionId,
      checklistCode: complianceResult.checklistCode,
    };

    const result: DossierVerificationResult = {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      institutionId: application.institutionId,
      institutionName: institution.name,
      programType: application.programType,
      academicYear: application.academicYear,
      overallStatus,
      evaluatedAt,
      isAdvisory: true,
      summary,
      documentMatrix,
      findings,
      regulatoryCompliance,
      infrastructureReview: complianceResult.infrastructureReview,
      disclaimer: DOSSIER_REPORT_DISCLAIMER,
    };

    // 8. Persist Snapshot to application.payloadJsonb (preserving existing keys)
    try {
      application.payloadJsonb = {
        ...(application.payloadJsonb || {}),
        dossierReport: {
          evaluatedAt: result.evaluatedAt,
          overallStatus: result.overallStatus,
          summary: result.summary,
          findingsCount: result.findings.length,
          documentMatrixCount: result.documentMatrix.length,
          cachedResult: result,
        },
      };
      await this.applicationRepository.save(application);
      this.logger.log(
        `Persisted dossier report snapshot to application payloadJsonb for '${application.applicationNumber}'`,
      );
    } catch (saveErr: any) {
      this.logger.warn(
        `Failed to persist dossier report snapshot to application payloadJsonb: ${saveErr.message}`,
      );
    }

    return result;
  }

  /**
   * Retrieves the dossier verification report for an application (from cache or evaluation).
   */
  public async getDossierReport(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    options?: DossierQueryDto,
  ): Promise<DossierVerificationResult> {
    if (options?.recalculate) {
      return this.evaluateDossier(applicationId, currentUser, options);
    }

    const { application } = await this.findAndAuthorizeApplication(
      applicationId,
      currentUser,
    );

    const cached = (application.payloadJsonb as any)?.dossierReport
      ?.cachedResult as DossierVerificationResult | undefined;

    if (cached) {
      this.logger.log(
        `Returning cached dossier verification report for application='${application.applicationNumber}' (evaluatedAt=${cached.evaluatedAt})`,
      );
      return cached;
    }

    return this.evaluateDossier(applicationId, currentUser, options);
  }

  /**
   * Retrieves a lightweight summary of the dossier verification for scrutiny queue views.
   */
  public async getDossierSummary(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    options?: DossierQueryDto,
  ): Promise<DossierSummaryDto> {
    const report = await this.getDossierReport(
      applicationId,
      currentUser,
      options,
    );

    return {
      applicationId: report.applicationId,
      applicationNumber: report.applicationNumber,
      institutionId: report.institutionId,
      institutionName: report.institutionName,
      programType: report.programType,
      academicYear: report.academicYear,
      overallStatus: report.overallStatus,
      evaluatedAt: report.evaluatedAt,
      isAdvisory: true,
      summary: report.summary,
    };
  }
}
