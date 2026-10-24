/**
 * ApprovalSync — Cross-Record Consistency Service
 * Milestone: DOC-03
 *
 * Compares extracted document fields against authoritative application records
 * (institution profile, application payload JSONB, academic year) and cross-document
 * references using explainable fuzzy matching and safe normalization.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
  DocumentExtractionFinding,
} from '../../shared/contracts';
import { Application } from '../../database/entities/application.entity';
import { Institution } from '../../database/entities/institution.entity';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome, ValidationCategory } from '../enums';
import { ValidationFinding } from '../interfaces';

export interface StringSimilarityResult {
  score: number; // 0.0 to 1.0
  isExact: boolean;
  tokenOverlap: number;
  levenshteinScore: number;
}

const LEGAL_STOPWORDS = new Set([
  'trust',
  'society',
  'foundation',
  'association',
  'pvt',
  'ltd',
  'private',
  'limited',
  'educational',
  'education',
  'charitable',
  'institute',
  'institution',
  'college',
  'of',
  'and',
  '&',
  'the',
  'demo',
  'synthetic',
  'campus',
]);

@Injectable()
export class CrossRecordConsistencyService {
  private readonly logger = new Logger(CrossRecordConsistencyService.name);

  /**
   * Normalizes strings by lowercasing, stripping punctuation, extra spaces,
   * and optionally removing common legal entity stopwords.
   */
  normalizeText(input: string, stripStopwords: boolean = false): string {
    if (!input) return '';
    let normalized = input
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (stripStopwords) {
      normalized = normalized
        .split(' ')
        .filter((tok) => !LEGAL_STOPWORDS.has(tok))
        .join(' ');
    }

    return normalized;
  }

  /**
   * Computes explainable string similarity combining Levenshtein distance
   * and token-based Jaccard overlap.
   */
  computeSimilarity(str1: string, str2: string): StringSimilarityResult {
    const norm1 = this.normalizeText(str1, true);
    const norm2 = this.normalizeText(str2, true);

    if (norm1 === norm2 && norm1.length > 0) {
      return {
        score: 1.0,
        isExact: true,
        tokenOverlap: 1.0,
        levenshteinScore: 1.0,
      };
    }

    if (!norm1 || !norm2) {
      return {
        score: 0.0,
        isExact: false,
        tokenOverlap: 0.0,
        levenshteinScore: 0.0,
      };
    }

    // 1. Token Jaccard overlap and Containment (Overlap coefficient)
    const tokens1 = new Set(norm1.split(' ').filter(Boolean));
    const tokens2 = new Set(norm2.split(' ').filter(Boolean));

    let intersectionCount = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) {
        intersectionCount++;
      }
    }
    const unionCount = new Set([...tokens1, ...tokens2]).size;
    const jaccardOverlap =
      unionCount > 0 ? intersectionCount / unionCount : 0.0;
    const minTokens = Math.min(tokens1.size, tokens2.size);
    const containmentOverlap =
      minTokens > 0 ? intersectionCount / minTokens : 0.0;

    // 2. Normalized Levenshtein similarity
    const levDist = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const levenshteinScore = maxLen > 0 ? 1.0 - levDist / maxLen : 0.0;

    // 3. Combined score
    // When one name is completely contained within the other (e.g. "Apex Institute of Technology"
    // inside "Apex Institute of Technology & Engineering"), containmentOverlap === 1.0.
    let rawScore =
      0.4 * levenshteinScore + 0.3 * jaccardOverlap + 0.3 * containmentOverlap;
    if (containmentOverlap === 1.0 && minTokens >= 2) {
      rawScore = Math.max(rawScore, 0.88);
    } else if (norm1.includes(norm2) || norm2.includes(norm1)) {
      rawScore = Math.max(rawScore, 0.85);
    }

    const score = Math.min(1.0, Math.round(rawScore * 100) / 100);

    return {
      score,
      isExact: norm1 === norm2,
      tokenOverlap: jaccardOverlap,
      levenshteinScore,
    };
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Evaluates cross-record consistency between application records, institution profile,
   * and extracted document fields.
   */
  evaluateConsistency(
    application: Application,
    institution: Institution,
    documents: Document[],
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    this.logger.debug(
      `Evaluating cross-record consistency for application ${application.applicationNumber}`,
    );

    // Build index of extracted fields and findings per document type
    const docFieldsByType = new Map<
      string,
      {
        docId: string;
        doc: Document;
        fields: Record<string, string | number>;
        findings: Map<string, DocumentExtractionFinding>;
      }
    >();

    for (const doc of documents) {
      if (
        doc.processingStatus === DocumentProcessingStatus.OCR_EXTRACTED ||
        doc.processingStatus === DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED
      ) {
        const report = doc.metadata?.analysisReport as
          | {
              extractedFields?: Record<string, string | number>;
              findings?: DocumentExtractionFinding[];
            }
          | undefined;

        const fMap = new Map<string, DocumentExtractionFinding>();
        for (const f of report?.findings || []) {
          fMap.set(f.fieldKey, f);
        }

        docFieldsByType.set(doc.documentType, {
          docId: doc.id,
          doc,
          fields: report?.extractedFields || {},
          findings: fMap,
        });
      }
    }

    // 1. Compare Institution Name against Title Deed Lessee Name
    this.compareInstitutionNameToDeed(
      application,
      institution,
      docFieldsByType.get('LAND_TITLE_DEED'),
      findings,
    );

    // 2. Compare Sponsoring Trust Name against Society/Trust Registration
    this.compareTrustRegistrationName(
      application,
      institution,
      docFieldsByType.get('SOCIETY_TRUST_REGISTRATION'),
      findings,
    );

    // 3. Compare Registration Number against Society/Trust Registration
    this.compareRegistrationNumber(
      institution,
      docFieldsByType.get('SOCIETY_TRUST_REGISTRATION'),
      findings,
    );

    // 4. Compare Land Survey Number against Application Payload
    this.compareSurveyNumber(
      application,
      docFieldsByType.get('LAND_TITLE_DEED'),
      findings,
    );

    // 5. Compare Land Area against Application Payload
    this.compareLandArea(
      application,
      docFieldsByType.get('LAND_TITLE_DEED'),
      findings,
    );

    // 6. Compare Built-Up Area against Application Payload
    this.compareBuiltUpArea(
      application,
      docFieldsByType.get('BUILDING_PLAN_APPROVAL'),
      findings,
    );

    // 7. Compare Academic Year against AICTE Approval Letter
    this.compareAcademicYear(
      application,
      docFieldsByType.get('AICTE_APPROVAL_LETTER'),
      findings,
    );

    // 8. Cross-Document Consistency: Deed Lessee vs Trust Name
    this.compareDeedToTrustRegistration(
      docFieldsByType.get('LAND_TITLE_DEED'),
      docFieldsByType.get('SOCIETY_TRUST_REGISTRATION'),
      findings,
    );

    return findings;
  }

  /**
   * Compares Institution / Applicant Name against Deed Lessee.
   */
  private compareInstitutionNameToDeed(
    application: Application,
    institution: Institution,
    deedEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    const expectedName =
      (application.payloadJsonb?.institutionName as string) || institution.name;

    if (!deedEntry) {
      findings.push({
        ruleId: 'DOC-XREC-NAME-DEED-UNAVAILABLE',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message:
          'Land title deed extraction is unavailable for institution name cross-verification.',
        expectedValue: expectedName,
        isAdvisory: true,
      });
      return;
    }

    const lesseeName = deedEntry.fields.lesseeName as string | undefined;
    if (!lesseeName) {
      findings.push({
        ruleId: 'DOC-XREC-LESSEE-NAME-NOT-EXTRACTED',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message:
          'Lessee / Grantee name was not extracted from land deed for cross-record verification.',
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        expectedValue: expectedName,
        isAdvisory: true,
      });
      return;
    }

    const finding = deedEntry.findings.get('lesseeName');
    const sim = this.computeSimilarity(expectedName, lesseeName);

    if (sim.score >= 0.85) {
      findings.push({
        ruleId: 'DOC-XREC-NAME-DEED-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Land deed lessee name '${lesseeName}' matches institution record '${expectedName}' (similarity: ${(sim.score * 100).toFixed(1)}%).`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'lesseeName',
        expectedValue: expectedName,
        observedValue: lesseeName,
        evidenceLocation: finding?.evidenceLocation,
        confidenceScore: finding?.confidenceScore,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else if (sim.score >= 0.6) {
      findings.push({
        ruleId: 'DOC-XREC-NAME-DEED-INCONCLUSIVE',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.INCONCLUSIVE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Partial name match between land deed lessee '${lesseeName}' and institution record '${expectedName}' (similarity: ${(sim.score * 100).toFixed(1)}%). Scrutiny officer verification advised.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'lesseeName',
        expectedValue: expectedName,
        observedValue: lesseeName,
        evidenceLocation: finding?.evidenceLocation,
        confidenceScore: finding?.confidenceScore,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-NAME-DEED-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Discrepancy: land deed lessee '${lesseeName}' does not match institution record '${expectedName}' (similarity: ${(sim.score * 100).toFixed(1)}%).`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'lesseeName',
        expectedValue: expectedName,
        observedValue: lesseeName,
        evidenceLocation: finding?.evidenceLocation,
        confidenceScore: finding?.confidenceScore,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    }
  }

  /**
   * Compares Sponsoring Trust Name against Trust Registration certificate.
   */
  private compareTrustRegistrationName(
    application: Application,
    institution: Institution,
    trustEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    const expectedName =
      (application.payloadJsonb?.trustName as string) ||
      (application.payloadJsonb?.institutionName as string) ||
      institution.name;

    if (!trustEntry) {
      findings.push({
        ruleId: 'DOC-XREC-TRUST-NAME-UNAVAILABLE',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message:
          'Trust registration certificate extraction is unavailable for trust name cross-verification.',
        expectedValue: expectedName,
        isAdvisory: true,
      });
      return;
    }

    const extractedTrustName = trustEntry.fields.trustName as
      string | undefined;
    if (!extractedTrustName) {
      findings.push({
        ruleId: 'DOC-XREC-TRUST-NAME-NOT-EXTRACTED',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message:
          'Trust / Society name was not extracted from registration certificate.',
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        expectedValue: expectedName,
        isAdvisory: true,
      });
      return;
    }

    const finding = trustEntry.findings.get('trustName');
    const sim = this.computeSimilarity(expectedName, extractedTrustName);

    if (sim.score >= 0.85) {
      findings.push({
        ruleId: 'DOC-XREC-TRUST-NAME-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Trust name '${extractedTrustName}' matches registered profile '${expectedName}' (similarity: ${(sim.score * 100).toFixed(1)}%).`,
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fieldKey: 'trustName',
        expectedValue: expectedName,
        observedValue: extractedTrustName,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else if (sim.score >= 0.6) {
      findings.push({
        ruleId: 'DOC-XREC-TRUST-NAME-INCONCLUSIVE',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.INCONCLUSIVE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Partial trust name match between '${extractedTrustName}' and profile '${expectedName}' (similarity: ${(sim.score * 100).toFixed(1)}%). Review advised.`,
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fieldKey: 'trustName',
        expectedValue: expectedName,
        observedValue: extractedTrustName,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-TRUST-NAME-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Discrepancy: Extracted trust name '${extractedTrustName}' differs from profile record '${expectedName}'.`,
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fieldKey: 'trustName',
        expectedValue: expectedName,
        observedValue: extractedTrustName,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    }
  }

  /**
   * Compares Registration Number.
   */
  private compareRegistrationNumber(
    institution: Institution,
    trustEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    if (!trustEntry) return;

    const extractedReg = trustEntry.fields.registrationNumber as
      string | undefined;
    if (!extractedReg) return;

    const expectedReg = institution.registrationNumber;
    const cleanExtracted = extractedReg
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    const cleanExpected = expectedReg
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();

    const finding = trustEntry.findings.get('registrationNumber');

    if (
      cleanExtracted === cleanExpected ||
      cleanExpected.includes(cleanExtracted)
    ) {
      findings.push({
        ruleId: 'DOC-XREC-REG-NUMBER-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Registration number '${extractedReg}' matches institution record '${expectedReg}'.`,
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fieldKey: 'registrationNumber',
        expectedValue: expectedReg,
        observedValue: extractedReg,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-REG-NUMBER-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Registration number mismatch: Document extracted '${extractedReg}' vs institution profile '${expectedReg}'.`,
        documentId: trustEntry.docId,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fieldKey: 'registrationNumber',
        expectedValue: expectedReg,
        observedValue: extractedReg,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    }
  }

  /**
   * Compares Survey / Khasra Number.
   */
  private compareSurveyNumber(
    application: Application,
    deedEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    const expectedSurvey =
      (application.payloadJsonb?.surveyNumber as string) ||
      (application.payloadJsonb?.khasraNumber as string);

    if (!expectedSurvey) {
      findings.push({
        ruleId: 'DOC-XREC-SURVEY-NOT-DECLARED',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.NOT_APPLICABLE,
        severity: ComplianceSeverity.COMPLIANT,
        message:
          'No survey number declared in application payload for cross-comparison.',
        isAdvisory: true,
      });
      return;
    }

    if (!deedEntry) return;

    const extractedSurvey = deedEntry.fields.surveyNumber as string | undefined;
    if (!extractedSurvey) {
      findings.push({
        ruleId: 'DOC-XREC-SURVEY-NOT-EXTRACTED',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Survey/Khasra number '${expectedSurvey}' declared in application was not identified in land title deed.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        expectedValue: expectedSurvey,
        isAdvisory: true,
      });
      return;
    }

    const finding = deedEntry.findings.get('surveyNumber');

    // Token-based inclusion check: e.g. "Survey No. 42/1" vs "42/1"
    const normExtracted = extractedSurvey
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const normExpected = expectedSurvey.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      normExtracted.includes(normExpected) ||
      normExpected.includes(normExtracted)
    ) {
      findings.push({
        ruleId: 'DOC-XREC-SURVEY-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Land survey identifier '${extractedSurvey}' matches application declaration '${expectedSurvey}'.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'surveyNumber',
        expectedValue: expectedSurvey,
        observedValue: extractedSurvey,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-SURVEY-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Survey number mismatch: Deed specifies '${extractedSurvey}', while application declared '${expectedSurvey}'.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'surveyNumber',
        expectedValue: expectedSurvey,
        observedValue: extractedSurvey,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    }
  }

  /**
   * Compares Land Area.
   */
  private compareLandArea(
    application: Application,
    deedEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    const declaredLand = application.payloadJsonb?.landAreaAcres as
      number | undefined;
    if (declaredLand === undefined || declaredLand === null) return;

    if (!deedEntry) return;

    const extractedLand = deedEntry.fields.landAreaAcres as number | undefined;
    if (extractedLand === undefined || extractedLand === null) return;

    const finding = deedEntry.findings.get('landAreaAcres');
    const diff = Math.abs(extractedLand - declaredLand);
    const tolerance = 0.05 * declaredLand; // 5% tolerance margin

    if (extractedLand >= declaredLand || diff <= tolerance) {
      findings.push({
        ruleId: 'DOC-XREC-LAND-AREA-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Extracted land area (${extractedLand} acres) satisfies application declared requirement (${declaredLand} acres).`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'landAreaAcres',
        expectedValue: declaredLand,
        observedValue: extractedLand,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-LAND-AREA-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Land area shortfall: Deed specifies ${extractedLand} acres, which is less than declared ${declaredLand} acres.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        fieldKey: 'landAreaAcres',
        expectedValue: `>= ${declaredLand} acres`,
        observedValue: `${extractedLand} acres`,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    }
  }

  /**
   * Compares Built-up Area.
   */
  private compareBuiltUpArea(
    application: Application,
    planEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    const declaredArea = application.payloadJsonb?.builtUpAreaSqMeters as
      number | undefined;
    if (declaredArea === undefined || declaredArea === null) return;

    if (!planEntry) return;

    const extractedArea = planEntry.fields.totalBuiltUpAreaSqm as
      number | undefined;
    if (extractedArea === undefined || extractedArea === null) return;

    const finding = planEntry.findings.get('totalBuiltUpAreaSqm');
    const diff = Math.abs(extractedArea - declaredArea);
    const tolerance = 0.05 * declaredArea;

    if (extractedArea >= declaredArea || diff <= tolerance) {
      findings.push({
        ruleId: 'DOC-XREC-BUILTUP-AREA-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Approved built-up area (${extractedArea} sq.m) satisfies application requirement (${declaredArea} sq.m).`,
        documentId: planEntry.docId,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fieldKey: 'totalBuiltUpAreaSqm',
        expectedValue: declaredArea,
        observedValue: extractedArea,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-BUILTUP-AREA-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Built-up area discrepancy: Approved plan shows ${extractedArea} sq.m, below application claim of ${declaredArea} sq.m.`,
        documentId: planEntry.docId,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fieldKey: 'totalBuiltUpAreaSqm',
        expectedValue: `>= ${declaredArea} sq.m`,
        observedValue: `${extractedArea} sq.m`,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    }
  }

  /**
   * Compares Academic Year on prior approval letters.
   */
  private compareAcademicYear(
    application: Application,
    letterEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    if (!letterEntry) return;

    const extractedYear = letterEntry.fields.academicYear as string | undefined;
    if (!extractedYear) return;

    const expectedYear = application.academicYear;
    const finding = letterEntry.findings.get('academicYear');

    // In EoA applications, letter is typically for current or immediately preceding year
    if (
      extractedYear === expectedYear ||
      extractedYear.includes(expectedYear.split('-')[0])
    ) {
      findings.push({
        ruleId: 'DOC-XREC-ACADEMIC-YEAR-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Academic year on approval letter (${extractedYear}) matches application academic year (${expectedYear}).`,
        documentId: letterEntry.docId,
        documentType: 'AICTE_APPROVAL_LETTER',
        fieldKey: 'academicYear',
        expectedValue: expectedYear,
        observedValue: extractedYear,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    } else {
      findings.push({
        ruleId: 'DOC-XREC-ACADEMIC-YEAR-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.INCONCLUSIVE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Academic year on previous approval letter (${extractedYear}) differs from application year (${expectedYear}). Verify sequence.`,
        documentId: letterEntry.docId,
        documentType: 'AICTE_APPROVAL_LETTER',
        fieldKey: 'academicYear',
        expectedValue: expectedYear,
        observedValue: extractedYear,
        evidenceLocation: finding?.evidenceLocation,
        isAdvisory: true,
      });
    }
  }

  /**
   * Cross-Document Consistency: Deed Lessee vs Trust Name.
   */
  private compareDeedToTrustRegistration(
    deedEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    trustEntry:
      | {
          docId: string;
          doc: Document;
          fields: Record<string, string | number>;
          findings: Map<string, DocumentExtractionFinding>;
        }
      | undefined,
    findings: ValidationFinding[],
  ): void {
    if (!deedEntry || !trustEntry) return;

    const lessee = deedEntry.fields.lesseeName as string | undefined;
    const trust = trustEntry.fields.trustName as string | undefined;

    if (!lessee || !trust) return;

    const sim = this.computeSimilarity(lessee, trust);

    if (sim.score >= 0.85) {
      findings.push({
        ruleId: 'DOC-XDOC-DEED-TRUST-MATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MATCH,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Cross-document alignment: Deed lessee '${lessee}' matches trust registration name '${trust}'.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        expectedValue: trust,
        observedValue: lessee,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else if (sim.score >= 0.6) {
      findings.push({
        ruleId: 'DOC-XDOC-DEED-TRUST-INCONCLUSIVE',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.INCONCLUSIVE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Partial cross-document alignment between deed lessee '${lessee}' and trust name '${trust}'. Verification advised.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        expectedValue: trust,
        observedValue: lessee,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    } else {
      findings.push({
        ruleId: 'DOC-XDOC-DEED-TRUST-MISMATCH',
        category: ValidationCategory.CROSS_RECORD_CONSISTENCY,
        outcome: ValidationOutcome.MISMATCH,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Cross-document discrepancy: Deed lessee '${lessee}' differs from sponsoring trust '${trust}'. Verify lease transfer undertaking.`,
        documentId: deedEntry.docId,
        documentType: 'LAND_TITLE_DEED',
        expectedValue: trust,
        observedValue: lessee,
        isAdvisory: true,
        metadata: { similarityScore: sim.score },
      });
    }
  }
}
