/**
 * ApprovalSync — Document Validation Orchestrator Service
 * Milestone: DOC-03
 *
 * Coordinates execution of document completeness, field completeness,
 * expiry date verification, and cross-record consistency checks.
 * Enforces tenant isolation, aggregates advisory findings, and computes overall status.
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { UserRole, ComplianceSeverity } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { ValidationOutcome, OverallValidationStatus } from '../enums';
import {
  ValidationFinding,
  ValidationSummary,
  ApplicationValidationResult,
  IDateProvider,
  DATE_PROVIDER_TOKEN,
} from '../interfaces';
import { ValidationQueryDto } from '../dto/validation-query.dto';
import { DocumentCompletenessService } from './document-completeness.service';
import { FieldCompletenessService } from './field-completeness.service';
import { DocumentExpiryService } from './document-expiry.service';
import { CrossRecordConsistencyService } from './cross-record-consistency.service';

const VALIDATION_RULE_CATALOG_VERSION = '1.0.0';

@Injectable()
export class ValidationOrchestratorService {
  private readonly logger = new Logger(ValidationOrchestratorService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly completenessService: DocumentCompletenessService,
    private readonly fieldService: FieldCompletenessService,
    private readonly expiryService: DocumentExpiryService,
    private readonly consistencyService: CrossRecordConsistencyService,
    @Inject(DATE_PROVIDER_TOKEN)
    private readonly dateProvider: IDateProvider,
  ) {}

  /**
   * Authorizes user access to the application enforcing tenant boundaries.
   */
  async findAndAuthorizeApplication(
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

    // Tenancy enforcement
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
   * Executes the full document validation suite for an application.
   */
  async validateApplicationDocuments(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    options?: ValidationQueryDto,
  ): Promise<ApplicationValidationResult> {
    const { application, institution, documents } =
      await this.findAndAuthorizeApplication(applicationId, currentUser);

    this.logger.log(
      `Starting document validation for application ${application.applicationNumber} (${documents.length} attachments)`,
    );

    // Parse optional as-of reference date
    let referenceDate: Date | undefined;
    if (options?.asOfDate) {
      const parsed = new Date(options.asOfDate);
      if (!isNaN(parsed.getTime())) {
        referenceDate = parsed;
      }
    }

    // 1. Evaluate Document Completeness
    const completenessFindings = this.completenessService.evaluateCompleteness(
      application,
      documents,
    );

    // 2. Evaluate Field Completeness
    const fieldFindings = this.fieldService.evaluateFields(documents);

    // 3. Evaluate Expiry and Date Validity
    const expiryFindings = this.expiryService.evaluateExpiry(
      documents,
      referenceDate,
    );

    // 4. Evaluate Cross-Record Consistency
    const consistencyFindings = this.consistencyService.evaluateConsistency(
      application,
      institution,
      documents,
    );

    // Combine all findings
    const allFindings: ValidationFinding[] = [
      ...completenessFindings,
      ...fieldFindings,
      ...expiryFindings,
      ...consistencyFindings,
    ];

    // Compute metrics
    const summary = this.computeSummary(allFindings);

    // Compute overall disposition
    const overallStatus = this.determineOverallStatus(summary);

    const evaluatedAt = (
      referenceDate || this.dateProvider.getNow()
    ).toISOString();

    const result: ApplicationValidationResult = {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      institutionId: application.institutionId,
      programType: application.programType,
      overallStatus,
      summary,
      findings: allFindings,
      evaluatedAt,
      ruleVersion: VALIDATION_RULE_CATALOG_VERSION,
    };

    // Persist validation snapshot in application payload for audit caching
    try {
      application.payloadJsonb = {
        ...(application.payloadJsonb || {}),
        documentValidation: {
          overallStatus: result.overallStatus,
          summary: result.summary,
          evaluatedAt: result.evaluatedAt,
          findingsCount: result.findings.length,
          cachedResult: result,
        },
      };
      await this.applicationRepository.save(application);
    } catch (saveErr) {
      this.logger.warn(
        `Failed to persist validation snapshot in application payload: ${(saveErr as Error).message}`,
      );
    }

    this.logger.log(
      `Completed document validation for application ${application.applicationNumber}: status=${overallStatus}, totalFindings=${allFindings.length}, deficiencies=${summary.totalDeficiencies}`,
    );

    return result;
  }

  /**
   * Retrieves an existing or newly computed validation report for an application.
   */
  async getValidationReport(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    options?: ValidationQueryDto,
  ): Promise<ApplicationValidationResult> {
    if (options?.recalculate) {
      return this.validateApplicationDocuments(
        applicationId,
        currentUser,
        options,
      );
    }

    const { application } = await this.findAndAuthorizeApplication(
      applicationId,
      currentUser,
    );

    const cached = application.payloadJsonb?.documentValidation as
      { cachedResult?: ApplicationValidationResult } | undefined;

    if (cached?.cachedResult) {
      return cached.cachedResult;
    }

    return this.validateApplicationDocuments(
      applicationId,
      currentUser,
      options,
    );
  }

  /**
   * Aggregates validation metrics from individual findings.
   */
  private computeSummary(findings: ValidationFinding[]): ValidationSummary {
    let totalCompliant = 0;
    let totalDeficiencies = 0;
    let totalAdvisories = 0;
    let totalSourceUnavailable = 0;

    for (const f of findings) {
      if (f.outcome === ValidationOutcome.SOURCE_UNAVAILABLE) {
        totalSourceUnavailable++;
      }

      if (f.severity === ComplianceSeverity.CRITICAL_DEFICIENCY) {
        totalDeficiencies++;
      } else if (f.severity === ComplianceSeverity.ADVISORY_FLAG) {
        totalAdvisories++;
      } else if (f.severity === ComplianceSeverity.COMPLIANT) {
        totalCompliant++;
      }
    }

    return {
      totalRulesEvaluated: findings.length,
      totalCompliant,
      totalDeficiencies,
      totalAdvisories,
      totalSourceUnavailable,
    };
  }

  /**
   * Determines the overall validation disposition.
   */
  private determineOverallStatus(
    summary: ValidationSummary,
  ): OverallValidationStatus {
    if (summary.totalDeficiencies > 0) {
      return OverallValidationStatus.DEFICIENT;
    }

    if (summary.totalAdvisories > 0 || summary.totalSourceUnavailable > 0) {
      return OverallValidationStatus.REQUIRES_REVIEW;
    }

    return OverallValidationStatus.COMPLIANT;
  }
}
