/**
 * ApprovalSync — Compliance Orchestration Service
 * Milestone: DOC-06
 *
 * Coordinates compliance evidence assessment, infrastructure review assist,
 * versioned regulatory rule resolution, institutional tenant isolation,
 * and assessment findings persistence in application metadata.
 *
 * Enforces ADR-004 Human Sovereignty: all outputs are advisory decision support.
 */

import {
  Injectable,
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
import { RulesService } from '../../rules/rules.service';
import { ApplicableRulesResolutionProjection } from '../../rules/dto';
import { ComplianceEvidenceEvaluatorService } from './compliance-evidence-evaluator.service';
import { InfrastructureReviewAssistService } from './infrastructure-review-assist.service';
import { EvaluateComplianceDto, ComplianceAssessmentResultDto } from '../dto';
import { ComplianceSummary } from '../interfaces';

const COMPLIANCE_DISCLAIMER =
  'This compliance assessment and infrastructure review is an automated decision-support aid based on submitted documentary evidence and AI extraction heuristics. It is strictly ADVISORY under AICTE prototype governance (ADR-004) and does NOT constitute statutory approval, accreditation grant, or deficiency waiver. Official determinations require human scrutiny and on-site Expert Visit Committee (EVC) verification.';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly rulesService: RulesService,
    private readonly evaluatorService: ComplianceEvidenceEvaluatorService,
    private readonly infraAssistService: InfrastructureReviewAssistService,
  ) {}

  /**
   * Evaluates application compliance against applicable versioned rules and infrastructure heuristics.
   */
  public async evaluateCompliance(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    dto?: EvaluateComplianceDto,
  ): Promise<ComplianceAssessmentResultDto> {
    this.logger.log(
      `Evaluating compliance for application='${applicationId}' by actor='${currentUser.email}' (role=${currentUser.role})`,
    );

    // 1. Find and authorize application with tenancy checks
    const { application, documents } = await this.findAndAuthorizeApplication(
      applicationId,
      currentUser,
    );

    // 2. Resolve applicable versioned regulatory rules & checklist from BE-05 RulesService
    const evaluationDateStr =
      dto?.evaluationDate || new Date().toISOString().split('T')[0];

    let resolution: ApplicableRulesResolutionProjection | null = null;
    try {
      resolution = await this.rulesService.resolveApplicableRules({
        category: application.programType,
        evaluationDate: evaluationDateStr,
      });
    } catch (err: any) {
      this.logger.warn(
        `Applicable rule version resolution could not be determined for category='${application.programType}': ${err.message}`,
      );
      resolution = null;
    }

    // 3. Execute rule & checklist evidence evaluation
    const ruleFindings = this.evaluatorService.evaluateRulesAndChecklists(
      application,
      documents,
      resolution,
      evaluationDateStr,
    );

    // 4. Execute physical infrastructure evidence review assist
    const infraResult = this.infraAssistService.reviewInfrastructureEvidence(
      application,
      documents,
    );

    // 5. Combine and deduplicate findings
    const allFindings = [...ruleFindings, ...infraResult.findings];

    // 6. Compute summary metrics
    const criticalDeficienciesCount = allFindings.filter(
      (f) => f.severity === 'CRITICAL_DEFICIENCY',
    ).length;
    const advisoryFlagsCount = allFindings.filter(
      (f) => f.severity === 'ADVISORY_FLAG',
    ).length;
    const compliantCount = allFindings.filter(
      (f) => f.severity === 'COMPLIANT',
    ).length;
    const inspectionRecommendedCount = allFindings.filter(
      (f) => f.requiresPhysicalInspection,
    ).length;

    const totalRulesEvaluated =
      (resolution?.rules?.length || 0) +
      (resolution?.checklists?.[0]?.items?.length || 0);

    const summary: ComplianceSummary = {
      totalRulesEvaluated: Math.max(totalRulesEvaluated, allFindings.length),
      criticalDeficienciesCount,
      advisoryFlagsCount,
      compliantCount,
      inspectionRecommendedCount,
      hasCriticalDeficiency: criticalDeficienciesCount > 0,
      requiresPhysicalInspection:
        inspectionRecommendedCount > 0 ||
        infraResult.summary.evcInspectionRecommended,
    };

    // 7. Persist evaluation snapshot in application payloadJsonb (preserving existing data)
    application.payloadJsonb = {
      ...(application.payloadJsonb || {}),
      complianceAssessment: {
        evaluatedAt: new Date().toISOString(),
        ruleSetCode: resolution?.ruleSet?.code,
        ruleVersionNumber: resolution?.ruleVersion?.versionNumber,
        checklistCode: resolution?.checklists?.[0]?.code,
        summary: {
          criticalDeficienciesCount: summary.criticalDeficienciesCount,
          advisoryFlagsCount: summary.advisoryFlagsCount,
          compliantCount: summary.compliantCount,
          hasCriticalDeficiency: summary.hasCriticalDeficiency,
          requiresPhysicalInspection: summary.requiresPhysicalInspection,
        },
        findingsCount: allFindings.length,
      },
    };
    await this.applicationRepository.save(application);

    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      institutionId: application.institutionId,
      programType: application.programType,
      academicYear: application.academicYear,
      evaluatedAt: new Date().toISOString(),
      isAdvisory: true,
      ruleSetCode: resolution?.ruleSet?.code,
      ruleSetName: resolution?.ruleSet?.name,
      ruleVersionNumber: resolution?.ruleVersion?.versionNumber,
      ruleVersionId: resolution?.ruleVersion?.id,
      checklistCode: resolution?.checklists?.[0]?.code,
      summary,
      findings: allFindings,
      infrastructureReview: infraResult.summary,
      disclaimer: COMPLIANCE_DISCLAIMER,
    };
  }

  /**
   * Retrieves the compliance assessment for an application (evaluates if not yet run).
   */
  public async getApplicationCompliance(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<ComplianceAssessmentResultDto> {
    return this.evaluateCompliance(applicationId, currentUser);
  }

  /**
   * Locates application and verifies caller tenancy.
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

    // Tenancy isolation guard
    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot evaluate or view applications belonging to another institution.',
        });
      }
    }

    return {
      application,
      institution: application.institution,
      documents: application.documents || [],
    };
  }
}
