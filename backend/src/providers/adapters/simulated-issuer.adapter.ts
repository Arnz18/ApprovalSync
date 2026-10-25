/**
 * ApprovalSync — Simulated Issuer Adapter
 * Milestone: DOC-05
 *
 * Provides a deterministic, explainable simulated issuer verification adapter
 * using clearly labelled synthetic fixtures for hackathon evaluation and testing.
 *
 * Conforms to ADR-003, ADR-004, and Threat Model TB-6:
 * - Every response is visibly marked as simulated (isSimulated: true, isMock: true).
 * - Never claims official government authenticity or CCA root trust.
 * - Handles matching, mismatched, expired, pending, unavailable, and unsupported scenarios.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IVerificationProvider,
  NormalizedVerificationRequest,
  NormalizedVerificationResponse,
  ProviderCapability,
  ProviderVerificationOutcome,
  mapOutcomeToVerificationStatus,
  FieldComparisonResult,
} from '../interfaces';
import {
  findSyntheticRecordByDocumentNumber,
  findSyntheticRecordByLandIdentifiers,
  getSyntheticRecordByScenario,
  SyntheticIssuerRecord,
} from '../fixtures';

export const SIMULATED_ISSUER_PROVIDER_ID = 'SIMULATED_ISSUER_ADAPTER';

const SUPPORTED_DOCUMENT_TYPES = [
  'LAND_TITLE_DEED',
  'LAND_USE_CERTIFICATE',
  'BUILDING_PLAN_APPROVAL',
  'FIRE_SAFETY_CERTIFICATE',
  'OCCUPANCY_CERTIFICATE',
  'SOCIETY_TRUST_REGISTRATION',
  'AFFIDAVIT_COMPLIANCE',
];

const STANDARD_SIMULATION_DISCLAIMER =
  'This is a simulated verification response generated from synthetic fixtures for prototype demonstration. It does NOT represent genuine issuer verification or statutory authenticity.';

@Injectable()
export class SimulatedIssuerAdapter implements IVerificationProvider {
  private readonly logger = new Logger(SimulatedIssuerAdapter.name);

  public readonly providerId = SIMULATED_ISSUER_PROVIDER_ID;
  public readonly providerName =
    'Simulated DigiLocker & State Registry Sandbox';
  public readonly isSimulated = true;
  public readonly isLiveProviderConfigured = true;

  public readonly supportedDocumentTypes = SUPPORTED_DOCUMENT_TYPES;
  public readonly capabilities = [
    ProviderCapability.LAND_RECORD_SEARCH,
    ProviderCapability.REGISTRATION_LOOKUP,
    ProviderCapability.SIGNATURE_VERIFICATION,
    ProviderCapability.ACCREDITATION_VERIFY,
  ];

  supports(documentType: string): boolean {
    if (!documentType) return false;
    return this.supportedDocumentTypes.includes(documentType.toUpperCase());
  }

  async verify(
    request: NormalizedVerificationRequest,
  ): Promise<NormalizedVerificationResponse> {
    this.logger.debug(
      `Executing simulated verification for documentId='${request.documentId}', type='${request.documentType}'`,
    );

    // 1. Explicit check for unsupported document type
    if (!this.supports(request.documentType)) {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.NOT_SUPPORTED,
        summary: `Document type '${request.documentType}' is not supported by the simulated issuer verification adapter.`,
        matchedFields: [],
        discrepantFields: [],
        limitations: [
          `Unsupported document category: ${request.documentType}`,
          'Supported categories: ' + this.supportedDocumentTypes.join(', '),
        ],
      });
    }

    // 2. Explicit simulation scenario override (for test suites and deterministic evaluator demo)
    if (request.simulateScenario) {
      return this.handleExplicitScenario(request);
    }

    // 3. Check for insufficient identifying information
    const hasIdentifier = Boolean(
      request.documentNumber || request.khasraNumber || request.surveyNumber,
    );

    if (!hasIdentifier) {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
        summary:
          'Insufficient identifying information provided to perform issuer record lookup. Document registration number or land survey/khasra number is required.',
        matchedFields: [],
        discrepantFields: [],
        limitations: [
          'No document registration number, deed number, or land survey number was extracted or supplied.',
          'Physical manual scrutiny required to identify registration details.',
        ],
      });
    }

    // 4. Fixture lookup by document number or land identifiers
    let record: SyntheticIssuerRecord | undefined;

    if (request.documentNumber) {
      record = findSyntheticRecordByDocumentNumber(request.documentNumber);
    }

    if (!record && request.khasraNumber) {
      record = findSyntheticRecordByLandIdentifiers(
        request.khasraNumber,
        request.district,
      );
    }

    // 5. If no synthetic record matches: inconclusive manual review
    if (!record) {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
        summary: `No matching record found in simulated registry for identifier '${request.documentNumber || request.khasraNumber}'. Manual physical verification required.`,
        matchedFields: [],
        discrepantFields: [
          {
            field: 'documentNumber',
            expectedValue: request.documentNumber || request.khasraNumber,
            actualValue: 'NOT_FOUND_IN_SANDBOX',
            status: 'UNAVAILABLE',
            notes: 'Identifier not present in simulated registry database.',
          },
        ],
        limitations: [
          'Record not found in synthetic demo sandbox.',
          'Does not imply document is invalid; official government portal was not queried.',
        ],
      });
    }

    // 6. Evaluate record found in synthetic registry
    return this.evaluateMatchedRecord(request, record);
  }

  private handleExplicitScenario(
    request: NormalizedVerificationRequest,
  ): NormalizedVerificationResponse {
    const scenario = request.simulateScenario;
    const fixture = scenario
      ? getSyntheticRecordByScenario(scenario)
      : undefined;

    switch (scenario) {
      case 'UNAVAILABLE':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
          summary:
            'External simulated registry service is currently unavailable (simulated 503 HTTP timeout).',
          matchedFields: [],
          discrepantFields: [],
          sourceReference: fixture?.sourceReference,
          limitations: [
            'Simulated sandbox endpoint timed out after 5000ms threshold.',
            'Advisory flag: retry or proceed with offline manual scrutiny.',
          ],
        });

      case 'UNSUPPORTED':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.NOT_SUPPORTED,
          summary: `Document type '${request.documentType}' is not supported by this verification adapter.`,
          matchedFields: [],
          discrepantFields: [],
          limitations: ['Explicit UNSUPPORTED simulation scenario triggered.'],
        });

      case 'MANUAL_REVIEW':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.MANUAL_REVIEW_REQUIRED,
          summary:
            'Simulated issuer verification returned inconclusive records requiring human scrutiny.',
          matchedFields: [],
          discrepantFields: [],
          limitations: [
            'Simulated scenario: partial record match requires officer verification.',
          ],
        });

      case 'EXPIRED':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.EXPIRED,
          summary:
            fixture?.discrepancyDescription ||
            'Document record exists in simulated registry but has expired.',
          sourceReference: fixture?.sourceReference,
          matchedFields: [
            {
              field: 'documentNumber',
              expectedValue: request.documentNumber || fixture?.documentNumber,
              actualValue: fixture?.documentNumber,
              status: 'MATCH',
            },
          ],
          discrepantFields: [
            {
              field: 'expiryDate',
              expectedValue: 'Active / Valid',
              actualValue: fixture?.expiryDate || '2024-03-31',
              status: 'MISMATCH',
              notes: 'Certificate has lapsed in simulated issuer records.',
            },
          ],
          limitations: ['Simulated certificate expiry detected in registry.'],
        });

      case 'PENDING':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.PENDING,
          summary:
            fixture?.discrepancyDescription ||
            'Simulated application record found, but final approval is currently pending.',
          sourceReference: fixture?.sourceReference,
          matchedFields: [
            {
              field: 'documentNumber',
              expectedValue: request.documentNumber || fixture?.documentNumber,
              actualValue: fixture?.documentNumber,
              status: 'MATCH',
            },
          ],
          discrepantFields: [
            {
              field: 'issuanceStatus',
              expectedValue: 'ACTIVE',
              actualValue: 'PENDING',
              status: 'MISMATCH',
              notes: 'Sanction order pending commissioner clearance.',
            },
          ],
          limitations: ['Simulated pending issuance status in registry.'],
        });

      case 'MISMATCH':
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.MISMATCH_DETECTED,
          summary:
            fixture?.discrepancyDescription ||
            'Discrepancy detected between document data and simulated registry records.',
          sourceReference: fixture?.sourceReference,
          matchedFields: [
            {
              field: 'documentNumber',
              expectedValue: request.documentNumber || fixture?.documentNumber,
              actualValue: fixture?.documentNumber,
              status: 'MATCH',
            },
          ],
          discrepantFields: [
            {
              field: 'institutionName',
              expectedValue:
                request.institutionName || 'Demo Institute of Technology',
              actualValue:
                fixture?.institutionName || 'Unrelated Commercial Builder Ltd',
              status: 'MISMATCH',
              notes: 'Owner name mismatch in registry record.',
            },
            {
              field: 'areaAcres',
              expectedValue: 5.0,
              actualValue: fixture?.areaAcres || 1.2,
              status: 'MISMATCH',
              notes:
                'Registered area does not match claimed institutional campus size.',
            },
          ],
          limitations: [
            'Simulated discrepancy detected: requires officer scrutiny under ADR-004.',
            'Discrepancy is advisory evidence, not proof of forgery.',
          ],
        });

      case 'MATCH':
      default:
        return this.buildResponse({
          documentId: request.documentId,
          outcome: ProviderVerificationOutcome.VERIFIED,
          summary:
            'Document record matches simulated state land records registry exactly.',
          sourceReference:
            fixture?.sourceReference || 'TXN-MH-PUN-2024-88412-SIMULATED',
          matchedFields: [
            {
              field: 'documentNumber',
              expectedValue: request.documentNumber || fixture?.documentNumber,
              actualValue: fixture?.documentNumber || 'MAH-PUN-2024-REG-09821',
              status: 'MATCH',
            },
            {
              field: 'institutionName',
              expectedValue:
                request.institutionName || 'Demo Institute of Technology',
              actualValue:
                fixture?.institutionName || 'Demo Institute of Technology',
              status: 'MATCH',
            },
            {
              field: 'state',
              expectedValue: request.state || 'Maharashtra',
              actualValue: fixture?.state || 'Maharashtra',
              status: 'MATCH',
            },
            {
              field: 'district',
              expectedValue: request.district || 'Pune',
              actualValue: fixture?.district || 'Pune',
              status: 'MATCH',
            },
          ],
          discrepantFields: [],
          limitations: [
            'Verified against synthetic local test double, not live government API.',
            'Advisory finding only.',
          ],
        });
    }
  }

  private evaluateMatchedRecord(
    request: NormalizedVerificationRequest,
    record: SyntheticIssuerRecord,
  ): NormalizedVerificationResponse {
    // Check scenario of the fixture itself
    if (record.scenario === 'UNAVAILABLE') {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.SOURCE_UNAVAILABLE,
        summary:
          'Simulated registry service returned gateway unavailable for this record.',
        matchedFields: [],
        discrepantFields: [],
        sourceReference: record.sourceReference,
        limitations: ['Simulated 503 gateway unavailable.'],
      });
    }

    if (record.issuanceStatus === 'EXPIRED') {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.EXPIRED,
        summary:
          record.discrepancyDescription ||
          `Document '${record.documentNumber}' has expired in registry records (expiry: ${record.expiryDate}).`,
        sourceReference: record.sourceReference,
        matchedFields: [
          {
            field: 'documentNumber',
            expectedValue: request.documentNumber,
            actualValue: record.documentNumber,
            status: 'MATCH',
          },
        ],
        discrepantFields: [
          {
            field: 'expiryDate',
            expectedValue: 'Active',
            actualValue: record.expiryDate,
            status: 'MISMATCH',
            notes: 'Certificate has expired.',
          },
        ],
        limitations: ['Expired status detected in synthetic registry.'],
      });
    }

    if (record.issuanceStatus === 'PENDING') {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.PENDING,
        summary:
          record.discrepancyDescription ||
          `Application record '${record.documentNumber}' is currently pending final issuance.`,
        sourceReference: record.sourceReference,
        matchedFields: [
          {
            field: 'documentNumber',
            expectedValue: request.documentNumber,
            actualValue: record.documentNumber,
            status: 'MATCH',
          },
        ],
        discrepantFields: [
          {
            field: 'issuanceStatus',
            expectedValue: 'ACTIVE',
            actualValue: 'PENDING',
            status: 'MISMATCH',
            notes: 'Issuance pending.',
          },
        ],
        limitations: ['Pending issuance status in synthetic registry.'],
      });
    }

    // Check for mismatch in institution name or land area
    const matchedFields: FieldComparisonResult[] = [
      {
        field: 'documentNumber',
        expectedValue: request.documentNumber,
        actualValue: record.documentNumber,
        status: 'MATCH',
      },
    ];
    const discrepantFields: FieldComparisonResult[] = [];

    if (request.institutionName && record.institutionName) {
      const match =
        request.institutionName.trim().toLowerCase() ===
        record.institutionName.trim().toLowerCase();
      if (match) {
        matchedFields.push({
          field: 'institutionName',
          expectedValue: request.institutionName,
          actualValue: record.institutionName,
          status: 'MATCH',
        });
      } else {
        discrepantFields.push({
          field: 'institutionName',
          expectedValue: request.institutionName,
          actualValue: record.institutionName,
          status: 'MISMATCH',
          notes: 'Owner name in registry differs from application institution.',
        });
      }
    }

    if (discrepantFields.length > 0) {
      return this.buildResponse({
        documentId: request.documentId,
        outcome: ProviderVerificationOutcome.MISMATCH_DETECTED,
        summary:
          record.discrepancyDescription ||
          `Registry record found, but discrepancies detected in ${discrepantFields.map((f) => f.field).join(', ')}.`,
        sourceReference: record.sourceReference,
        matchedFields,
        discrepantFields,
        limitations: [
          'Simulated record mismatch: requires officer review under ADR-004.',
          'Mismatches are review flags, not proof of misconduct.',
        ],
      });
    }

    return this.buildResponse({
      documentId: request.documentId,
      outcome: ProviderVerificationOutcome.VERIFIED,
      summary: `Document record verified against simulated ${record.issuerName}.`,
      sourceReference: record.sourceReference,
      matchedFields,
      discrepantFields: [],
      limitations: [
        'Simulated verification double for hackathon evaluation.',
        'Synthetic test certificate and fixture record used.',
      ],
    });
  }

  private buildResponse(params: {
    documentId: string;
    outcome: ProviderVerificationOutcome;
    summary: string;
    matchedFields: FieldComparisonResult[];
    discrepantFields: FieldComparisonResult[];
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
      isSimulated: true,
      verifiedAt: new Date().toISOString(),
      sourceReference: params.sourceReference,
      comparisonSummary: params.summary,
      matchedFields: params.matchedFields,
      discrepantFields: params.discrepantFields,
      limitations: [STANDARD_SIMULATION_DISCLAIMER, ...params.limitations],
      evidence: params.evidence,
      providerMetadata: {
        isMock: true,
        provider: this.providerId,
        verificationScope: 'SYNTHETIC_TEST_FIXTURE_ONLY',
        disclaimer: STANDARD_SIMULATION_DISCLAIMER,
      },
      isAdvisory: true,
    };
  }
}
