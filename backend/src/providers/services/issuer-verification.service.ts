/**
 * ApprovalSync — Issuer Verification Service
 * Milestone: DOC-05
 *
 * Coordinates issuer verification requests, normalizes document evidence,
 * enforces institutional tenant isolation, and persists verification results in document metadata.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import { UserRole } from '../../shared/contracts';
import {
  STORAGE_ADAPTER_TOKEN,
  IStorageAdapter,
} from '../../documents/interfaces/storage-adapter.interface';
import { ProviderRegistryService } from './provider-registry.service';
import {
  VerifyIssuerDto,
  ProviderDiscoveryDto,
  IssuerVerificationResultDto,
} from '../dto';
import { NormalizedVerificationRequest } from '../interfaces';

@Injectable()
export class IssuerVerificationService {
  private readonly logger = new Logger(IssuerVerificationService.name);

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
  ) {}

  /**
   * Lists all registered verification providers with their capabilities and simulation status.
   */
  public listAvailableProviders(): ProviderDiscoveryDto[] {
    const providers = this.providerRegistry.getAllProviders();

    return providers.map((provider) => ({
      providerId: provider.providerId,
      providerName: provider.providerName,
      isSimulated: provider.isSimulated,
      isLiveProviderConfigured: provider.isLiveProviderConfigured,
      supportedDocumentTypes: provider.supportedDocumentTypes,
      capabilities: provider.capabilities,
      disclaimer: provider.isSimulated
        ? 'Simulated sandbox double for prototype demonstration; outputs are clearly marked as mock data.'
        : 'Authorized external integration seam; requires valid credentials and live government authorization.',
    }));
  }

  /**
   * Executes issuer verification for a document attachment with tenant scoping.
   */
  public async verifyDocumentIssuer(
    documentId: string,
    currentUser: AuthUserPrincipal,
    dto?: VerifyIssuerDto,
  ): Promise<IssuerVerificationResultDto> {
    this.logger.log(
      `Executing issuer verification for documentId='${documentId}' by actor='${currentUser.email}' (role=${currentUser.role})`,
    );

    // 1. Find document and enforce institutional tenancy
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    // 2. Resolve target verification provider (strict: no silent mock substitution if caller requested specific provider)
    const provider = this.providerRegistry.resolveProvider(
      dto?.providerId,
      document.documentType,
    );

    // 3. Extract existing OCR domain attributes if available (from DOC-02 analysis report)
    const analysisReport = (document.metadata?.analysisReport || {}) as {
      extractedFields?: Record<string, string | number>;
    };
    const extracted = analysisReport.extractedFields || {};

    const documentNumber =
      dto?.documentNumber ||
      (extracted.deedNumber as string) ||
      (extracted.registrationNumber as string) ||
      (extracted.certificateNumber as string) ||
      undefined;

    const khasraNumber =
      dto?.khasraNumber ||
      (extracted.khasraNumber as string) ||
      (extracted.surveyNumber as string) ||
      undefined;

    const state =
      dto?.state ||
      (extracted.state as string) ||
      document.application?.institution?.state ||
      undefined;

    const district =
      dto?.district ||
      (extracted.district as string) ||
      document.application?.institution?.district ||
      undefined;

    const institutionName =
      document.application?.institution?.name ||
      (extracted.institutionName as string) ||
      undefined;

    // 4. Construct normalized verification request
    const request: NormalizedVerificationRequest = {
      documentId: document.id,
      applicationId: document.applicationId,
      institutionId:
        document.application?.institutionId || currentUser.institutionId || '',
      documentType: document.documentType,
      documentNumber,
      institutionName,
      state,
      district,
      khasraNumber,
      sha256Checksum: document.fileHashSha256,
      simulateScenario: dto?.simulateScenario,
      metadata: document.metadata,
    };

    // 5. Execute verification through resolved provider
    const response = await provider.verify(request);

    // 6. Format result DTO
    const resultDto: IssuerVerificationResultDto = {
      documentId: document.id,
      applicationId: document.applicationId,
      documentType: document.documentType,
      status: response.status,
      outcome: response.outcome,
      sourceId: response.sourceId,
      sourceName: response.sourceName,
      isSimulated: response.isSimulated,
      verifiedAt: response.verifiedAt,
      sourceReference: response.sourceReference,
      comparisonSummary: response.comparisonSummary,
      matchedFields: response.matchedFields,
      discrepantFields: response.discrepantFields,
      limitations: response.limitations,
      evidence: response.evidence,
      providerMetadata: response.providerMetadata,
      isAdvisory: true,
    };

    // 7. Persist verification result in document metadata
    document.metadata = {
      ...document.metadata,
      issuerVerification: resultDto,
    };

    await this.documentRepository.save(document);

    this.logger.log(
      `Issuer verification completed for docId='${documentId}': status=${resultDto.status}, outcome=${resultDto.outcome}, isSimulated=${resultDto.isSimulated}`,
    );

    return resultDto;
  }

  /**
   * Retrieves previously persisted issuer verification findings for a document.
   */
  public async getDocumentIssuerVerification(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<IssuerVerificationResultDto> {
    const document = await this.findAndAuthorizeDocument(
      documentId,
      currentUser,
    );

    const issuerVerification = document.metadata?.issuerVerification as
      IssuerVerificationResultDto | undefined;

    if (!issuerVerification) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `No issuer verification has been performed for document '${documentId}'. Trigger verification first via POST /api/v1/documents/:id/verify-issuer.`,
      });
    }

    return issuerVerification;
  }

  /**
   * Helper: finds document and enforces tenancy and role authorization.
   */
  private async findAndAuthorizeDocument(
    documentId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['application', 'application.institution'],
    });

    if (!document) {
      throw new NotFoundException({
        code: 'ERR_RESOURCE_NOT_FOUND',
        message: `Document with ID '${documentId}' was not found.`,
      });
    }

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !document.application ||
        document.application.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException({
          code: 'ERR_FORBIDDEN',
          message:
            'Access denied: tenancy mismatch. You cannot verify documents belonging to another institution.',
        });
      }
    }

    return document;
  }
}
