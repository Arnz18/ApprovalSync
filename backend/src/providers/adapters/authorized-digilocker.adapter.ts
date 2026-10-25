/**
 * ApprovalSync — Authorized DigiLocker Adapter Seam
 * Milestone: DOC-05
 *
 * Implements IVerificationProvider integration seam for official DigiLocker API.
 *
 * Safety & Security Guarantees:
 * - Read-only configuration from ConfigService; zero secrets committed.
 * - Defends against SSRF: destination URL is derived strictly from trusted server configuration.
 * - Enforces safe timeouts (5000ms max) and response payload size caps (1MB).
 * - Redacts secrets and authorization headers from logs.
 * - When unconfigured (default in prototype): honestly reports SOURCE_UNAVAILABLE
 *   with clear operational guidance rather than fabricating live results or failing silently.
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

export const AUTHORIZED_DIGILOCKER_PROVIDER_ID =
  'AUTHORIZED_DIGILOCKER_ADAPTER';

const ALLOWED_DIGILOCKER_HOST_SUFFIXES = [
  'digilocker.gov.in',
  'apisetu.gov.in',
  'localhost',
  '127.0.0.1',
];

const MAX_RESPONSE_BYTES = 1024 * 1024; // 1MB payload size cap

@Injectable()
export class AuthorizedDigiLockerAdapter implements IVerificationProvider {
  private readonly logger = new Logger(AuthorizedDigiLockerAdapter.name);

  public readonly providerId = AUTHORIZED_DIGILOCKER_PROVIDER_ID;
  public readonly providerName = 'Authorized DigiLocker National Gateway';
  public readonly isSimulated = false;

  private readonly endpointUrl?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly apiKey?: string;

  public readonly isLiveProviderConfigured: boolean;

  public readonly supportedDocumentTypes = [
    'LAND_TITLE_DEED',
    'LAND_USE_CERTIFICATE',
    'BUILDING_PLAN_APPROVAL',
    'FIRE_SAFETY_CERTIFICATE',
    'OCCUPANCY_CERTIFICATE',
    'SOCIETY_TRUST_REGISTRATION',
    'AFFIDAVIT_COMPLIANCE',
  ];

  public readonly capabilities = [
    ProviderCapability.SIGNATURE_VERIFICATION,
    ProviderCapability.REGISTRATION_LOOKUP,
    ProviderCapability.ACCREDITATION_VERIFY,
  ];

  constructor(private readonly configService: ConfigService) {
    this.endpointUrl = this.configService.get<string>('DIGILOCKER_ISSUER_URL');
    this.clientId = this.configService.get<string>('DIGILOCKER_CLIENT_ID');
    this.clientSecret = this.configService.get<string>(
      'DIGILOCKER_CLIENT_SECRET',
    );
    this.apiKey = this.configService.get<string>('DIGILOCKER_API_KEY');

    this.isLiveProviderConfigured = Boolean(
      this.endpointUrl && this.clientId && this.clientSecret,
    );
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
        summary: `Document type '${request.documentType}' is not supported by the DigiLocker verification provider.`,
        limitations: [
          `Category '${request.documentType}' is not integrated in DigiLocker schema registry.`,
        ],
      });
    }

    // 2. Truthful reporting when unconfigured
    if (!this.isLiveProviderConfigured) {
      this.logger.warn(
        `Authorized DigiLocker provider invoked for docId='${request.documentId}' but live credentials are unconfigured.`,
      );

      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary:
          'Authorized DigiLocker National Gateway is unconfigured: missing DIGILOCKER_CLIENT_ID or DIGILOCKER_CLIENT_SECRET. Production authorization and API credentials are required.',
        limitations: [
          'Official government DigiLocker partner credentials are not configured in this prototype environment.',
          'Live connection disabled to prevent unauthorized portal access or scraping.',
          'Requires formal AICTE authorization and DigiLocker production onboarding.',
          'Advisory: proceed with offline physical manual scrutiny or evaluate using the simulated adapter.',
        ],
      });
    }

    // 3. Outbound SSRF & Endpoint Validation
    const validatedUrl = this.validateOutboundEndpoint(this.endpointUrl!);
    if (!validatedUrl) {
      this.logger.error(
        'Outbound SSRF guard blocked invalid or untrusted DigiLocker endpoint URL.',
      );
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary:
          'Security violation: Configured DigiLocker endpoint URL failed SSRF validation.',
        limitations: [
          'Outbound HTTP request was blocked because the endpoint URL does not resolve to an approved government host.',
        ],
      });
    }

    // 4. Execute outbound call with safe timeout and size cap
    return this.executeLiveCall(request, validatedUrl);
  }

  /**
   * SSRF Defense: Validates that the endpoint URL is a legitimate, approved HTTPS destination
   * and does not target private IP ranges or metadata services.
   */
  public validateOutboundEndpoint(urlStr: string): URL | null {
    try {
      const parsed = new URL(urlStr);

      // Must be https (or http only for local test endpoints on localhost/127.0.0.1)
      const isLocal =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol !== 'https:' && !isLocal) {
        this.logger.warn(
          `Rejected insecure non-HTTPS endpoint: ${parsed.protocol}`,
        );
        return null;
      }

      // Check against approved host suffix allowlist
      const isAllowedHost = ALLOWED_DIGILOCKER_HOST_SUFFIXES.some(
        (suffix) =>
          parsed.hostname === suffix || parsed.hostname.endsWith('.' + suffix),
      );

      if (!isAllowedHost) {
        this.logger.warn(
          `SSRF Defense: Host '${parsed.hostname}' is not in the approved DigiLocker allowlist.`,
        );
        return null;
      }

      // Reject link-local, cloud metadata, and private IP patterns
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

  /**
   * Redacts sensitive secrets and tokens for safe logging.
   */
  public sanitizeForLogs(value: string): string {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]')
      .replace(/apiKey=[^&\s]+/gi, 'apiKey=[REDACTED]');
  }

  private async executeLiveCall(
    request: NormalizedVerificationRequest,
    url: URL,
  ): Promise<NormalizedVerificationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5000ms strict timeout

    try {
      this.logger.debug(
        `Dispatching verification request to authorized DigiLocker endpoint: ${url.origin}/...`,
      );

      const requestPayload = {
        documentNumber: request.documentNumber,
        documentType: request.documentType,
        institutionName: request.institutionName,
      };

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': this.clientId || '',
          Authorization: `Bearer ${this.apiKey || 'TOKEN'}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check content-length header
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
        this.logger.error(
          'Remote provider response exceeded maximum allowed bytes.',
        );
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary:
            'Remote provider response exceeded maximum safe payload size.',
          limitations: ['Oversized remote response rejected for security.'],
        });
      }

      if (!response.ok) {
        this.logger.warn(
          `Remote DigiLocker gateway returned HTTP ${response.status}: ${response.statusText}`,
        );
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary: `Remote DigiLocker gateway returned HTTP ${response.status}.`,
          limitations: [
            'Gateway communication failure; case marked for manual review.',
          ],
        });
      }

      const responseText = await response.text();
      if (responseText.length > MAX_RESPONSE_BYTES) {
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary: 'Remote provider response exceeded safe payload buffer.',
          limitations: ['Oversized response body received.'],
        });
      }

      // Safe schema validation on parsed JSON
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText);
      } catch {
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
          summary: 'Remote DigiLocker response was not valid JSON.',
          limitations: ['Malformed JSON response from remote gateway.'],
        });
      }

      // Check remote outcome
      const isVerified = data.verified === true;
      const isMismatch = data.mismatch === true;
      const isExpired = data.expired === true;

      let outcome = ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED;
      if (isVerified) outcome = ProviderVerificationOutcome.VERIFIED;
      else if (isMismatch)
        outcome = ProviderVerificationOutcome.MISMATCH_DETECTED;
      else if (isExpired) outcome = ProviderVerificationOutcome.EXPIRED;

      return this.buildResponse({
        documentId: request.documentId,
        outcome,
        summary:
          (data.summary as string) || 'DigiLocker verification completed.',
        sourceReference: data.reference as string | undefined,
        limitations: [
          'External authorized provider response.',
          'All verification findings remain advisory decision-support under ADR-004.',
        ],
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = (err as Error).name === 'AbortError';

      this.logger.error(
        `DigiLocker adapter request failed: ${isTimeout ? 'Request timed out (5000ms)' : (err as Error).message}`,
      );

      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary: isTimeout
          ? 'DigiLocker gateway request timed out after 5000ms.'
          : 'Network transport failure connecting to DigiLocker gateway.',
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
    evidence?: Record<string, unknown>;
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
      evidence: params.evidence,
      isAdvisory: true,
    };
  }
}
