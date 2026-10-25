/**
 * ApprovalSync — Authorized State Land Registry Adapter Seam
 * Milestone: DOC-05
 *
 * Implements IVerificationProvider integration seam for official State Land Record systems
 * (e.g. Mahabhulekh, AnyRoR, Dharani, UP-Bhulekh).
 *
 * Safety & Security Guarantees:
 * - Read-only configuration from ConfigService; zero secrets committed.
 * - Outbound SSRF defense restricting destinations to approved state revenue portals.
 * - Enforces safe timeouts (5000ms max) and response payload size caps (1MB).
 * - Redacts secrets and credentials from logs.
 * - Truthful reporting when unconfigured: returns SOURCE_UNAVAILABLE rather than mock fallback.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVerificationProvider,
  NormalizedVerificationRequest,
  NormalizedVerificationResponse,
  ProviderCapability,
  ProviderVerificationOutcome,
  mapOutcomeToVerificationStatus,
} from '../interfaces';

export const AUTHORIZED_LAND_REGISTRY_PROVIDER_ID =
  'AUTHORIZED_LAND_REGISTRY_ADAPTER';

const ALLOWED_LAND_REGISTRY_HOST_SUFFIXES = [
  'mahabhulekh.maharashtra.gov.in',
  'landrecords.gov.in',
  'upbhulekh.gov.in',
  'dharani.telangana.gov.in',
  'anyror.gujarat.gov.in',
  'localhost',
  '127.0.0.1',
];

const MAX_RESPONSE_BYTES = 1024 * 1024; // 1MB

@Injectable()
export class AuthorizedLandRegistryAdapter implements IVerificationProvider {
  private readonly logger = new Logger(AuthorizedLandRegistryAdapter.name);

  public readonly providerId = AUTHORIZED_LAND_REGISTRY_PROVIDER_ID;
  public readonly providerName =
    'Authorized State Land Record Registry Gateway';
  public readonly isSimulated = false;

  private readonly baseUrl?: string;
  private readonly apiKey?: string;

  public readonly isLiveProviderConfigured: boolean;

  public readonly supportedDocumentTypes = [
    'LAND_TITLE_DEED',
    'LAND_USE_CERTIFICATE',
  ];

  public readonly capabilities = [
    ProviderCapability.LAND_RECORD_SEARCH,
    ProviderCapability.REGISTRATION_LOOKUP,
  ];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('LAND_REGISTRY_BASE_URL');
    this.apiKey = this.configService.get<string>('LAND_REGISTRY_API_KEY');

    this.isLiveProviderConfigured = Boolean(this.baseUrl && this.apiKey);
  }

  supports(documentType: string): boolean {
    if (!documentType) return false;
    return this.supportedDocumentTypes.includes(documentType.toUpperCase());
  }

  async verify(
    request: NormalizedVerificationRequest,
  ): Promise<NormalizedVerificationResponse> {
    // 1. Check supported document types
    if (!this.supports(request.documentType)) {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.NOT_SUPPORTED,
        summary: `Document type '${request.documentType}' is not a land record; not supported by State Land Registry adapter.`,
        limitations: [
          `Category '${request.documentType}' is outside land registry jurisdiction.`,
          'Supported categories: ' + this.supportedDocumentTypes.join(', '),
        ],
      });
    }

    // 2. Truthful unconfigured reporting
    if (!this.isLiveProviderConfigured) {
      this.logger.warn(
        `Authorized Land Registry provider invoked for docId='${request.documentId}' but live credentials are unconfigured.`,
      );

      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary:
          'Authorized State Land Registry Gateway is unconfigured: missing LAND_REGISTRY_BASE_URL or LAND_REGISTRY_API_KEY. Official state revenue department API credentials required.',
        limitations: [
          'State revenue department API credentials are not configured in this prototype.',
          'Live connection disabled to prevent unauthorized portal access or scraping.',
          'Requires formal MoU/onboarding with respective State Revenue Departments.',
          'Advisory: proceed with offline physical manual scrutiny or evaluate using the simulated adapter.',
        ],
      });
    }

    // 3. Outbound SSRF & Endpoint Validation
    const validatedUrl = this.validateOutboundEndpoint(this.baseUrl!);
    if (!validatedUrl) {
      this.logger.error(
        'Outbound SSRF guard blocked invalid or untrusted Land Registry endpoint URL.',
      );
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary:
          'Security violation: Configured Land Registry endpoint URL failed SSRF validation.',
        limitations: [
          'Outbound HTTP request was blocked because the endpoint URL does not resolve to an approved government host.',
        ],
      });
    }

    // 4. Execute outbound call
    return this.executeLiveCall(request, validatedUrl);
  }

  public validateOutboundEndpoint(urlStr: string): URL | null {
    try {
      const parsed = new URL(urlStr);

      const isLocal =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol !== 'https:' && !isLocal) {
        this.logger.warn(
          `Rejected insecure non-HTTPS endpoint: ${parsed.protocol}`,
        );
        return null;
      }

      const isAllowedHost = ALLOWED_LAND_REGISTRY_HOST_SUFFIXES.some(
        (suffix) =>
          parsed.hostname === suffix || parsed.hostname.endsWith('.' + suffix),
      );

      if (!isAllowedHost) {
        this.logger.warn(
          `SSRF Defense: Host '${parsed.hostname}' is not in the approved Land Registry allowlist.`,
        );
        return null;
      }

      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname.startsWith('169.254.') ||
        hostname.includes('metadata.google') ||
        hostname === 'instance-data'
      ) {
        this.logger.error(
          `SSRF Defense: Cloud metadata access attempt blocked: ${hostname}`,
        );
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  public sanitizeForLogs(value: string): string {
    return value.replace(
      /\b(?:apiKey|api_key|key)=[^&\s]+/gi,
      'apiKey=[REDACTED]',
    );
  }

  private async executeLiveCall(
    request: NormalizedVerificationRequest,
    url: URL,
  ): Promise<NormalizedVerificationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const targetUrl = new URL('/api/v1/land/verify', url);
      const payload = {
        khasraNumber: request.khasraNumber,
        surveyNumber: request.surveyNumber,
        district: request.district,
        state: request.state,
      };

      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary:
            'Remote provider response exceeded maximum safe payload size.',
          limitations: ['Oversized remote response rejected for security.'],
        });
      }

      if (!response.ok) {
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary: `Remote Land Registry returned HTTP ${response.status}.`,
          limitations: ['Registry service unavailable.'],
        });
      }

      const responseText = await response.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText);
      } catch {
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
          summary: 'Remote Land Registry response was not valid JSON.',
          limitations: ['Malformed JSON received.'],
        });
      }

      const isVerified = data.verified === true;
      const outcome = isVerified
        ? ProviderVerificationOutcome.VERIFIED
        : ProviderVerificationOutcome.MISMATCH_DETECTED;

      return this.buildResponse({
        documentId: request.documentId,
        outcome,
        summary:
          (data.summary as string) || 'State land record lookup completed.',
        sourceReference: data.reference as string | undefined,
        limitations: [
          'External authorized provider response.',
          'All verification findings remain advisory decision-support under ADR-004.',
        ],
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = (err as Error).name === 'AbortError';

      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary: isTimeout
          ? 'Land registry gateway request timed out after 5000ms.'
          : 'Network transport failure connecting to state land registry.',
        limitations: [
          'External provider timeout/failure.',
          'Case routed for manual review without blocking application flow.',
        ],
      });
    }
  }

  private buildResponse(params: {
    documentId: string;
    outcome: ProviderVerificationOutcome;
    summary: string;
    sourceReference?: string;
    limitations: string[];
  }): NormalizedVerificationResponse {
    const status = mapOutcomeToVerificationStatus(params.outcome);

    return {
      documentId: params.documentId,
      status,
      outcome: params.outcome,
      sourceId: this.providerId,
      sourceName: this.providerName,
      isSimulated: false,
      verifiedAt: new Date().toISOString(),
      sourceReference: params.sourceReference,
      comparisonSummary: params.summary,
      matchedFields: [],
      discrepantFields: [],
      limitations: params.limitations,
      isAdvisory: true,
    };
  }
}
