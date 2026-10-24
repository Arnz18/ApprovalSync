/**
 * ApprovalSync — Document Expiry and Date Validation Service
 * Milestone: DOC-03
 *
 * Validates document validity periods, expiry deadlines, upcoming expirations,
 * impossible calendar dates, and lease tenure calculations with an injectable clock.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ComplianceSeverity,
  DocumentProcessingStatus,
} from '../../shared/contracts';
import { Document } from '../../database/entities/document.entity';
import { ValidationOutcome, ValidationCategory } from '../enums';
import {
  ValidationFinding,
  IDateProvider,
  DATE_PROVIDER_TOKEN,
} from '../interfaces';

export interface ParsedDateResult {
  isValid: boolean;
  date?: Date;
  rawString: string;
  normalizedIso?: string;
  error?: string;
}

const EXPIRY_APPROACHING_THRESHOLD_DAYS = 60; // 60 days warning threshold
const LEASE_EXPIRY_THRESHOLD_DAYS = 180; // 6 months warning for land lease
const MINIMUM_STATUTORY_LEASE_YEARS = 30; // AICTE APH 2024-27 Clause 1.4.1

@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    @Inject(DATE_PROVIDER_TOKEN)
    private readonly dateProvider: IDateProvider,
  ) {}

  /**
   * Parses and validates a raw date string against Gregorian calendar rules.
   * Disallows impossible dates (e.g. 2026-02-30, 2026-04-31, month 13).
   */
  parseAndValidateDate(raw: string | number | undefined): ParsedDateResult {
    if (!raw) {
      return { isValid: false, rawString: '', error: 'Missing date value' };
    }

    const rawString = String(raw).trim();
    let year: number, month: number, day: number;

    // 1. Try ISO YYYY-MM-DD
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(rawString);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      // 2. Try DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(rawString);
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10);
        month = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
        if (year < 100) {
          year += year >= 50 ? 1900 : 2000;
        }
      } else {
        return {
          isValid: false,
          rawString,
          error: `Unrecognized date format: '${rawString}'. Expected YYYY-MM-DD or DD/MM/YYYY.`,
        };
      }
    }

    // Validate month range (1 - 12)
    if (month < 1 || month > 12) {
      return {
        isValid: false,
        rawString,
        error: `Invalid month '${month}' in date '${rawString}'. Must be between 1 and 12.`,
      };
    }

    // Days per month validation (including leap years)
    const daysInMonth = [
      31,
      this.isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    const maxDays = daysInMonth[month - 1];
    if (day < 1 || day > maxDays) {
      return {
        isValid: false,
        rawString,
        error: `Impossible calendar day '${day}' for month '${month}' (max ${maxDays}) in date '${rawString}'.`,
      };
    }

    // Construct UTC Date
    const constructedDate = new Date(
      Date.UTC(year, month - 1, day, 0, 0, 0, 0),
    );
    const normalizedIso = constructedDate.toISOString().split('T')[0];

    return {
      isValid: true,
      date: constructedDate,
      rawString,
      normalizedIso,
    };
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Evaluates date validity and expiry status for all application documents.
   */
  evaluateExpiry(
    documents: Document[],
    overrideNow?: Date,
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const now = overrideNow || this.dateProvider.getNow();

    this.logger.debug(
      `Evaluating document expiry against reference time: ${now.toISOString()}`,
    );

    for (const doc of documents) {
      if (
        doc.processingStatus === DocumentProcessingStatus.FAILED_OCR ||
        doc.processingStatus === DocumentProcessingStatus.UPLOADED ||
        doc.processingStatus === DocumentProcessingStatus.PROCESSING_OCR
      ) {
        continue; // Handled by completeness service
      }

      const analysisReport = doc.metadata?.analysisReport as
        { extractedFields?: Record<string, string | number> } | undefined;
      const extractedFields = analysisReport?.extractedFields || {};

      switch (doc.documentType) {
        case 'FIRE_SAFETY_CERTIFICATE': {
          this.evaluateFireSafetyExpiry(doc, extractedFields, now, findings);
          break;
        }

        case 'LAND_TITLE_DEED': {
          this.evaluateLandDeedExpiry(doc, extractedFields, now, findings);
          break;
        }

        case 'BUILDING_PLAN_APPROVAL': {
          this.evaluateBuildingPlanDates(doc, extractedFields, now, findings);
          break;
        }

        case 'LAND_USE_CERTIFICATE':
        case 'SOCIETY_TRUST_REGISTRATION':
        case 'AICTE_APPROVAL_LETTER': {
          this.evaluateGenericHistoricalDates(
            doc,
            extractedFields,
            now,
            findings,
          );
          break;
        }

        default: {
          break;
        }
      }
    }

    return findings;
  }

  /**
   * Evaluates Fire Safety Certificate expiry date.
   */
  private evaluateFireSafetyExpiry(
    doc: Document,
    fields: Record<string, string | number>,
    now: Date,
    findings: ValidationFinding[],
  ): void {
    const rawExpiry = fields.expiryDate;
    const rawIssue = fields.issueDate;

    // Validate issue date if present
    if (rawIssue) {
      const issueResult = this.parseAndValidateDate(rawIssue);
      if (!issueResult.isValid) {
        findings.push({
          ruleId: 'DOC-EXP-FIRE-NOC-INVALID-ISSUE-DATE',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.MALFORMED,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Fire Safety NOC issue date '${rawIssue}' is invalid: ${issueResult.error}`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'issueDate',
          observedValue: String(rawIssue),
          isAdvisory: true,
        });
      } else if (
        issueResult.date &&
        issueResult.date.getTime() > now.getTime()
      ) {
        findings.push({
          ruleId: 'DOC-EXP-FIRE-NOC-FUTURE-ISSUE-DATE',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.MALFORMED,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Fire Safety NOC issue date (${issueResult.normalizedIso}) is in the future relative to evaluation clock.`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'issueDate',
          observedValue: issueResult.normalizedIso,
          isAdvisory: true,
        });
      }
    }

    if (!rawExpiry) {
      // Missing field is handled by field completeness service
      return;
    }

    const expiryResult = this.parseAndValidateDate(rawExpiry);
    if (!expiryResult.isValid) {
      findings.push({
        ruleId: 'DOC-EXP-FIRE-NOC-INVALID-EXPIRY-DATE',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Fire Safety NOC expiry date '${rawExpiry}' is malformed or impossible: ${expiryResult.error}`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'expiryDate',
        observedValue: String(rawExpiry),
        isAdvisory: true,
      });
      return;
    }

    const expiryDate = expiryResult.date!;
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      // Expired!
      findings.push({
        ruleId: 'DOC-EXP-FIRE-NOC-EXPIRED',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.EXPIRED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Fire Safety NOC expired on ${expiryResult.normalizedIso} (${Math.abs(diffDays)} days ago). Current valid renewal certificate required.`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'expiryDate',
        expectedValue: `After ${now.toISOString().split('T')[0]}`,
        observedValue: expiryResult.normalizedIso,
        isAdvisory: true,
        metadata: {
          daysExpired: Math.abs(diffDays),
          rawText: expiryResult.rawString,
        },
      });
    } else if (diffDays <= EXPIRY_APPROACHING_THRESHOLD_DAYS) {
      // Expiring soon!
      findings.push({
        ruleId: 'DOC-EXP-FIRE-NOC-EXPIRING-SOON',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.EXPIRING_SOON,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Fire Safety NOC is approaching expiration on ${expiryResult.normalizedIso} (expires in ${diffDays} days). Institution advised to initiate renewal.`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'expiryDate',
        observedValue: expiryResult.normalizedIso,
        isAdvisory: true,
        metadata: {
          daysRemaining: diffDays,
          rawText: expiryResult.rawString,
        },
      });
    } else {
      // Valid!
      findings.push({
        ruleId: 'DOC-EXP-FIRE-NOC-VALID',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.VALID,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Fire Safety NOC is valid through ${expiryResult.normalizedIso} (${diffDays} days remaining).`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'expiryDate',
        observedValue: expiryResult.normalizedIso,
        isAdvisory: true,
        metadata: {
          daysRemaining: diffDays,
          rawText: expiryResult.rawString,
        },
      });
    }
  }

  /**
   * Evaluates Land Title / Lease Deed validity and tenure.
   */
  private evaluateLandDeedExpiry(
    doc: Document,
    fields: Record<string, string | number>,
    now: Date,
    findings: ValidationFinding[],
  ): void {
    const rawRegDate = fields.registrationDate;
    const rawTenure = fields.leaseTenureYears;

    if (!rawRegDate) {
      return;
    }

    const regResult = this.parseAndValidateDate(rawRegDate);
    if (!regResult.isValid) {
      findings.push({
        ruleId: 'DOC-EXP-LAND-DEED-INVALID-DATE',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Land deed registration date '${rawRegDate}' is invalid: ${regResult.error}`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'registrationDate',
        observedValue: String(rawRegDate),
        isAdvisory: true,
      });
      return;
    }

    const regDate = regResult.date!;

    // Registration date in the future is impossible
    if (regDate.getTime() > now.getTime()) {
      findings.push({
        ruleId: 'DOC-EXP-LAND-DEED-FUTURE-DATE',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Land deed registration date (${regResult.normalizedIso}) is in the future.`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'registrationDate',
        observedValue: regResult.normalizedIso,
        isAdvisory: true,
      });
      return;
    }

    // If tenure is specified, evaluate statutory 30-year requirement & expiry date
    if (rawTenure !== undefined && rawTenure !== null) {
      const tenureYears = Number(rawTenure);

      if (tenureYears < MINIMUM_STATUTORY_LEASE_YEARS) {
        findings.push({
          ruleId: 'DOC-EXP-LEASE-TENURE-INSUFFICIENT',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.DEFICIENT,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Lease tenure of ${tenureYears} years is below the statutory requirement of at least ${MINIMUM_STATUTORY_LEASE_YEARS} continuous years (APH Clause 1.4.1).`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'leaseTenureYears',
          expectedValue: `>= ${MINIMUM_STATUTORY_LEASE_YEARS} years`,
          observedValue: `${tenureYears} years`,
          isAdvisory: true,
        });
      }

      // Calculate lease end date: regDate + tenureYears
      const leaseEndDate = new Date(regDate.getTime());
      leaseEndDate.setUTCFullYear(leaseEndDate.getUTCFullYear() + tenureYears);
      const leaseEndIso = leaseEndDate.toISOString().split('T')[0];

      const diffMs = leaseEndDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs < 0) {
        findings.push({
          ruleId: 'DOC-EXP-LEASE-TENURE-EXPIRED',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.EXPIRED,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Land lease tenure of ${tenureYears} years expired on ${leaseEndIso}. A valid extended lease deed is required.`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'leaseTenureYears',
          expectedValue: `After ${now.toISOString().split('T')[0]}`,
          observedValue: leaseEndIso,
          isAdvisory: true,
          metadata: { daysExpired: Math.abs(diffDays) },
        });
      } else if (diffDays <= LEASE_EXPIRY_THRESHOLD_DAYS) {
        findings.push({
          ruleId: 'DOC-EXP-LEASE-TENURE-EXPIRING-SOON',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.EXPIRING_SOON,
          severity: ComplianceSeverity.ADVISORY_FLAG,
          message: `Land lease tenure expires within 6 months on ${leaseEndIso} (${diffDays} days remaining).`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'leaseTenureYears',
          observedValue: leaseEndIso,
          isAdvisory: true,
          metadata: { daysRemaining: diffDays },
        });
      } else {
        findings.push({
          ruleId: 'DOC-EXP-LEASE-TENURE-VALID',
          category: ValidationCategory.EXPIRY_AND_VALIDITY,
          outcome: ValidationOutcome.VALID,
          severity: ComplianceSeverity.COMPLIANT,
          message: `Land lease is active and valid through ${leaseEndIso} (${Math.floor(diffDays / 365)} years remaining).`,
          documentId: doc.id,
          documentType: doc.documentType,
          fieldKey: 'leaseTenureYears',
          observedValue: leaseEndIso,
          isAdvisory: true,
          metadata: { daysRemaining: diffDays },
        });
      }
    } else {
      // Registered title sale deed without lease tenure (perpetual title)
      findings.push({
        ruleId: 'DOC-EXP-TITLE-DEED-PERPETUAL',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.NOT_APPLICABLE,
        severity: ComplianceSeverity.COMPLIANT,
        message: `Registered sale deed is perpetual and not subject to recurring expiry. Registered on ${regResult.normalizedIso}.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
      });
    }
  }

  /**
   * Validates Building Plan Approval sanction date.
   */
  private evaluateBuildingPlanDates(
    doc: Document,
    fields: Record<string, string | number>,
    now: Date,
    findings: ValidationFinding[],
  ): void {
    const rawDate = fields.approvalDate;
    if (!rawDate) return;

    const parseResult = this.parseAndValidateDate(rawDate);
    if (!parseResult.isValid) {
      findings.push({
        ruleId: 'DOC-EXP-BUILDING-PLAN-INVALID-DATE',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Building Plan approval date '${rawDate}' is invalid: ${parseResult.error}`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'approvalDate',
        observedValue: String(rawDate),
        isAdvisory: true,
      });
      return;
    }

    if (parseResult.date && parseResult.date.getTime() > now.getTime()) {
      findings.push({
        ruleId: 'DOC-EXP-BUILDING-PLAN-FUTURE-DATE',
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Building Plan approval date (${parseResult.normalizedIso}) is in the future.`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: 'approvalDate',
        observedValue: parseResult.normalizedIso,
        isAdvisory: true,
      });
      return;
    }

    findings.push({
      ruleId: 'DOC-EXP-BUILDING-PLAN-SANCTIONED',
      category: ValidationCategory.EXPIRY_AND_VALIDITY,
      outcome: ValidationOutcome.VALID,
      severity: ComplianceSeverity.COMPLIANT,
      message: `Building Plan sanctioned on ${parseResult.normalizedIso}. Permanent approval record.`,
      documentId: doc.id,
      documentType: doc.documentType,
      fieldKey: 'approvalDate',
      observedValue: parseResult.normalizedIso,
      isAdvisory: true,
    });
  }

  /**
   * Evaluates generic historical dates on permanent certificates.
   */
  private evaluateGenericHistoricalDates(
    doc: Document,
    fields: Record<string, string | number>,
    now: Date,
    findings: ValidationFinding[],
  ): void {
    const dateKey =
      doc.documentType === 'SOCIETY_TRUST_REGISTRATION'
        ? 'registrationDate'
        : 'issueDate';

    const rawDate = fields[dateKey];
    if (!rawDate) return;

    const parseResult = this.parseAndValidateDate(rawDate);
    if (!parseResult.isValid) {
      findings.push({
        ruleId: `DOC-EXP-${doc.documentType}-INVALID-DATE`,
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `${doc.documentType} date '${rawDate}' is invalid: ${parseResult.error}`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: dateKey,
        observedValue: String(rawDate),
        isAdvisory: true,
      });
      return;
    }

    if (parseResult.date && parseResult.date.getTime() > now.getTime()) {
      findings.push({
        ruleId: `DOC-EXP-${doc.documentType}-FUTURE-DATE`,
        category: ValidationCategory.EXPIRY_AND_VALIDITY,
        outcome: ValidationOutcome.MALFORMED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `${doc.documentType} date (${parseResult.normalizedIso}) is in the future.`,
        documentId: doc.id,
        documentType: doc.documentType,
        fieldKey: dateKey,
        observedValue: parseResult.normalizedIso,
        isAdvisory: true,
      });
      return;
    }

    findings.push({
      ruleId: `DOC-EXP-${doc.documentType}-PERMANENT-RECORD`,
      category: ValidationCategory.EXPIRY_AND_VALIDITY,
      outcome: ValidationOutcome.NOT_APPLICABLE,
      severity: ComplianceSeverity.COMPLIANT,
      message: `${doc.documentType} registered/issued on ${parseResult.normalizedIso}. Not subject to recurring expiry.`,
      documentId: doc.id,
      documentType: doc.documentType,
      fieldKey: dateKey,
      observedValue: parseResult.normalizedIso,
      isAdvisory: true,
    });
  }
}
