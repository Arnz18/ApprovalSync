/**
 * ApprovalSync — Document Integrity & Tamper Anomaly Service
 * Milestone: DOC-04
 *
 * Implements explainable document integrity and anomaly indicators:
 * 1. PDF structural integrity (header, trailer, EOF).
 * 2. Active content and executable launch scripts inspection (THR-01/THR-02).
 * 3. Metadata timeline inversion and future date detection.
 * 4. Image structural bounds and image editing tool heuristics (Photoshop, GIMP).
 * 5. Digital signature detection with CCA PKI trust seam.
 * 6. OCR extraction pattern and date inversion verification.
 *
 * Strictly adheres to ADR-004: All findings are advisory and never claim proof of forgery.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Document } from '../../database/entities/document.entity';
import { ComplianceSeverity } from '../../shared/contracts';
import {
  STORAGE_ADAPTER_TOKEN,
  IStorageAdapter,
} from '../../documents/interfaces/storage-adapter.interface';
import { ValidationCategory, ValidationOutcome } from '../enums';
import {
  ValidationFinding,
  DocumentIntegrityResult,
  PdfStructureInspection,
  ImageStructureInspection,
  DigitalSignatureInspection,
} from '../interfaces';

const IMAGE_EDITING_TOOLS = [
  { name: 'Adobe Photoshop', pattern: /Adobe\s*Photoshop/i },
  { name: 'GIMP', pattern: /GIMP/i },
  { name: 'Pixelmator', pattern: /Pixelmator/i },
  { name: 'CorelDRAW', pattern: /CorelDRAW/i },
  { name: 'Canva', pattern: /Canva/i },
];

@Injectable()
export class DocumentIntegrityService {
  private readonly logger = new Logger(DocumentIntegrityService.name);

  constructor(
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
  ) {}

  /**
   * Inspects a document for structural integrity, active content, metadata timeline
   * anomalies, and OCR pattern discrepancies.
   */
  async evaluateDocumentIntegrity(
    document: Document,
  ): Promise<DocumentIntegrityResult> {
    const findings: ValidationFinding[] = [];
    let fileBuffer: Buffer | null = null;

    // 1. Load document binary safely from storage
    try {
      fileBuffer = await this.storageAdapter.getBuffer(document.storagePath);
    } catch (storageErr) {
      this.logger.error(
        `Failed to retrieve storage file for document ${document.id}: ${(storageErr as Error).message}`,
      );
      findings.push({
        ruleId: 'DOC-INT-STORAGE-UNAVAILABLE',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Unable to access document binary from storage: ${(storageErr as Error).message}`,
        documentId: document.id,
        documentType: document.documentType,
        isAdvisory: true,
      });

      return {
        documentId: document.id,
        fileName: document.fileName,
        mimeType: document.mimeType,
        overallStatus: 'UNAVAILABLE',
        findings,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // 2. Format-Specific Structural Inspections
    if (document.mimeType === 'application/pdf') {
      const pdfInspection = this.inspectPdfStructure(fileBuffer);
      this.applyPdfFindings(document, pdfInspection, findings);

      const sigInspection = this.inspectDigitalSignatures(fileBuffer);
      this.applySignatureFindings(document, sigInspection, findings);
    } else if (
      document.mimeType === 'image/jpeg' ||
      document.mimeType === 'image/png'
    ) {
      const imgInspection = this.inspectImageStructure(
        fileBuffer,
        document.mimeType,
      );
      this.applyImageFindings(document, imgInspection, findings);
    }

    // 3. OCR and Metadata Extraction Pattern Checks
    this.evaluateExtractionAnomalies(document, findings);

    // 4. Record COMPLIANT finding if all checks passed cleanly
    const hasDeficiency = findings.some(
      (f) => f.severity === ComplianceSeverity.CRITICAL_DEFICIENCY,
    );
    const hasAdvisory = findings.some(
      (f) =>
        f.severity === ComplianceSeverity.ADVISORY_FLAG &&
        f.outcome !== ValidationOutcome.NOT_APPLICABLE,
    );

    if (!hasDeficiency && !hasAdvisory) {
      findings.push({
        ruleId: 'DOC-INT-CLEAN',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.NO_ANOMALY_DETECTED,
        severity: ComplianceSeverity.COMPLIANT,
        message: `No structural, active content, or metadata anomalies detected in document '${document.fileName}'.`,
        documentId: document.id,
        documentType: document.documentType,
        confidenceScore: 1.0,
        isAdvisory: true,
      });
    }

    const overallStatus = hasDeficiency
      ? 'FAIL'
      : hasAdvisory
        ? 'WARNING'
        : 'PASS';

    return {
      documentId: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      overallStatus,
      findings,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates integrity for a list of application documents.
   */
  async evaluateApplicationIntegrity(
    documents: Document[],
  ): Promise<ValidationFinding[]> {
    const allFindings: ValidationFinding[] = [];

    for (const doc of documents) {
      const result = await this.evaluateDocumentIntegrity(doc);
      allFindings.push(...result.findings);
    }

    return allFindings;
  }

  /**
   * Bounded inspection of PDF binary structure, header, trailer, and active content.
   */
  inspectPdfStructure(buffer: Buffer): PdfStructureInspection {
    const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
    const headerStr = headerSlice.toString('latin1');

    // Header check (%PDF-1.x)
    const headerMatch = headerStr.match(/%PDF-(\d+\.\d+)/);
    const hasValidHeader = headerMatch !== null;
    const pdfVersion = headerMatch ? headerMatch[1] : undefined;

    // Trailer check (%%EOF within last 2048 bytes)
    const trailerStart = Math.max(0, buffer.length - 2048);
    const trailerSlice = buffer.subarray(trailerStart);
    const trailerStr = trailerSlice.toString('latin1');
    const hasValidTrailer = trailerStr.includes('%%EOF');

    // Active Content / Executable scripts scan
    // Bounded scan for risky action dictionaries in the entire buffer (up to 15MB)
    const fullStr = buffer.toString('latin1');
    const activeContentDetails: string[] = [];

    if (/\/JavaScript\b|\/JS\b/i.test(fullStr)) {
      activeContentDetails.push(
        'Embedded JavaScript action detected (/JavaScript or /JS)',
      );
    }

    if (/\/Launch\b/i.test(fullStr)) {
      activeContentDetails.push(
        'Operating system launch action detected (/Launch)',
      );
    }

    if (/\/EmbeddedFiles\b/i.test(fullStr)) {
      // Check for executable attachments
      if (/\.(exe|bat|cmd|vbs|sh|js)\b/i.test(fullStr)) {
        activeContentDetails.push(
          'Executable attachment detected in /EmbeddedFiles',
        );
      }
    }

    // Metadata dates extraction (/CreationDate and /ModDate)
    const creationMatch = fullStr.match(
      /\/CreationDate\s*\((?:D:)?([0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[^)]*)\)/,
    );
    const modMatch = fullStr.match(
      /\/ModDate\s*\((?:D:)?([0-9]{4}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[^)]*)\)/,
    );

    let creationDate: string | undefined;
    let modDate: string | undefined;
    let hasTimelineInversion = false;
    let isFutureDate = false;

    const now = new Date();
    const oneYearFuture = new Date(now.getTime() + 365 * 24 * 3600 * 1000);

    if (creationMatch) {
      const parsed = this.parsePdfDate(creationMatch[1]);
      if (parsed) {
        creationDate = parsed.toISOString();
        if (parsed > oneYearFuture) {
          isFutureDate = true;
        }
      }
    }

    if (modMatch) {
      const parsedMod = this.parsePdfDate(modMatch[1]);
      if (parsedMod) {
        modDate = parsedMod.toISOString();
        if (creationDate) {
          const parsedCreated = new Date(creationDate);
          // Flag if modification is earlier than creation by > 60 seconds
          if (parsedMod.getTime() < parsedCreated.getTime() - 60000) {
            hasTimelineInversion = true;
          }
        }
      }
    }

    return {
      hasValidHeader,
      hasValidTrailer,
      pdfVersion,
      hasActiveContent: activeContentDetails.length > 0,
      activeContentDetails,
      creationDate,
      modDate,
      hasTimelineInversion,
      isFutureDate,
    };
  }

  /**
   * Applies findings derived from PDF structural inspection.
   */
  private applyPdfFindings(
    doc: Document,
    inspection: PdfStructureInspection,
    findings: ValidationFinding[],
  ): void {
    if (!inspection.hasValidHeader) {
      findings.push({
        ruleId: 'DOC-INT-PDF-INVALID-HEADER',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `PDF structural anomaly: Missing or malformed '%PDF-' file signature in document '${doc.fileName}'.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
      });
    }

    if (!inspection.hasValidTrailer) {
      findings.push({
        ruleId: 'DOC-INT-PDF-TRUNCATED',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `PDF structural anomaly: Missing '%%EOF' end-of-file trailer in '${doc.fileName}'. Document may be truncated or corrupted.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
      });
    }

    if (inspection.hasActiveContent) {
      findings.push({
        ruleId: 'DOC-INT-PDF-ACTIVE-CONTENT',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Unsupported active content detected in PDF '${doc.fileName}': ${inspection.activeContentDetails.join('; ')}. Regulatory dossiers must consist of static documents.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          details: inspection.activeContentDetails,
        },
      });
    }

    if (inspection.hasTimelineInversion) {
      findings.push({
        ruleId: 'DOC-INT-METADATA-TIMELINE-INVERSION',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `PDF metadata timeline discrepancy: Modification timestamp (${inspection.modDate}) is earlier than creation timestamp (${inspection.creationDate}). May indicate clock desynchronization or metadata alteration; advisory review suggested.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          creationDate: inspection.creationDate,
          modDate: inspection.modDate,
        },
      });
    }

    if (inspection.isFutureDate) {
      findings.push({
        ruleId: 'DOC-INT-METADATA-FUTURE-DATE',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `PDF metadata timestamp anomaly: Creation date (${inspection.creationDate}) is set in the distant future.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          creationDate: inspection.creationDate,
        },
      });
    }
  }

  /**
   * Inspects digital signature presence and reports CCA PKI integration seam status.
   */
  inspectDigitalSignatures(buffer: Buffer): DigitalSignatureInspection {
    const fullStr = buffer.toString('latin1');
    const hasSig = /\/Type\s*\/Sig\b/i.test(fullStr);
    const hasByteRange = /\/ByteRange\b/i.test(fullStr);

    let signatureType: string | undefined;
    if (hasSig) {
      const subFilterMatch = fullStr.match(/\/SubFilter\s*\/([a-zA-Z0-9_.]+)/i);
      if (subFilterMatch) {
        signatureType = subFilterMatch[1];
      }
    }

    return {
      hasSignatureDictionary: hasSig,
      signatureType,
      byteRangePresent: hasByteRange,
      isTrustStoreConfigured: false, // Trust store / CCA PKI not connected in prototype runtime
      statusMessage: hasSig
        ? 'Digital signature dictionary detected (/Type /Sig). Cryptographic certificate verification against national CCA trust store is not configured in this environment; manual digital signature inspection is required.'
        : 'No digital signature dictionary present. Document relies on physical seal, stamp, and human scrutiny.',
    };
  }

  /**
   * Applies findings derived from digital signature inspection.
   */
  private applySignatureFindings(
    doc: Document,
    inspection: DigitalSignatureInspection,
    findings: ValidationFinding[],
  ): void {
    if (inspection.hasSignatureDictionary) {
      findings.push({
        ruleId: 'DOC-INT-DIGITAL-SIGNATURE',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: inspection.statusMessage,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          signatureType: inspection.signatureType,
          byteRangePresent: inspection.byteRangePresent,
          trustStoreConfigured: inspection.isTrustStoreConfigured,
        },
      });
    } else {
      findings.push({
        ruleId: 'DOC-INT-NO-DIGITAL-SIGNATURE',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.NOT_APPLICABLE,
        severity: ComplianceSeverity.COMPLIANT,
        message: inspection.statusMessage,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
      });
    }
  }

  /**
   * Inspects image headers, trailers, bounds, and editing software metadata tags.
   */
  inspectImageStructure(
    buffer: Buffer,
    mimeType: string,
  ): ImageStructureInspection {
    let hasValidMagicBytes = false;
    let hasValidTrailer = false;
    let width: number | undefined;
    let height: number | undefined;
    let editingToolDetected: string | undefined;

    if (mimeType === 'image/jpeg') {
      hasValidMagicBytes =
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;
      // JPEG EOI trailer: 0xFF, 0xD9
      hasValidTrailer =
        buffer.length >= 2 &&
        buffer[buffer.length - 2] === 0xff &&
        buffer[buffer.length - 1] === 0xd9;

      // Extract basic dimensions from SOF0/SOF2 marker
      const dims = this.extractJpegDimensions(buffer);
      width = dims?.width;
      height = dims?.height;
    } else if (mimeType === 'image/png') {
      hasValidMagicBytes =
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;

      // PNG IEND trailer
      const trailer = buffer.subarray(Math.max(0, buffer.length - 12));
      hasValidTrailer = trailer.includes(Buffer.from('IEND'));

      // Extract dimensions from IHDR chunk (offset 16-24)
      if (buffer.length >= 24) {
        width = buffer.readUInt32BE(16);
        height = buffer.readUInt32BE(20);
      }
    }

    // Inspect metadata for editing tools (Photoshop, GIMP, etc.)
    const strContent = buffer.toString('latin1');
    for (const tool of IMAGE_EDITING_TOOLS) {
      if (tool.pattern.test(strContent)) {
        editingToolDetected = tool.name;
        break;
      }
    }

    const dimensionsValid =
      width !== undefined &&
      height !== undefined &&
      width >= 50 &&
      height >= 50;

    return {
      hasValidMagicBytes,
      hasValidTrailer,
      dimensionsValid:
        dimensionsValid || (width === undefined && height === undefined),
      width,
      height,
      editingToolDetected,
    };
  }

  /**
   * Applies findings derived from image structural inspection.
   */
  private applyImageFindings(
    doc: Document,
    inspection: ImageStructureInspection,
    findings: ValidationFinding[],
  ): void {
    if (!inspection.hasValidMagicBytes || !inspection.hasValidTrailer) {
      findings.push({
        ruleId: 'DOC-INT-IMAGE-CORRUPT',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
        message: `Image structural anomaly: file '${doc.fileName}' has invalid or truncated binary markers.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
      });
    }

    if (!inspection.dimensionsValid) {
      findings.push({
        ruleId: 'DOC-INT-IMAGE-MICRO-DIMENSIONS',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Image dimensions (${inspection.width}x${inspection.height}) are suspiciously small for a statutory regulatory document.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          width: inspection.width,
          height: inspection.height,
        },
      });
    }

    if (inspection.editingToolDetected) {
      findings.push({
        ruleId: 'DOC-INT-IMAGE-EDITING-TOOL',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.ANOMALY_DETECTED,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Image metadata indicates editing software ('${inspection.editingToolDetected}') was used to produce or alter '${doc.fileName}'. Flagged for reviewer scrutiny.`,
        documentId: doc.id,
        documentType: doc.documentType,
        isAdvisory: true,
        metadata: {
          editingTool: inspection.editingToolDetected,
        },
      });
    }
  }

  /**
   * Evaluates pattern anomalies from DOC-02 extraction report.
   */
  private evaluateExtractionAnomalies(
    doc: Document,
    findings: ValidationFinding[],
  ): void {
    const report = doc.metadata?.analysisReport as
      | {
          ocrConfidence?: number;
          extractedFields?: Record<string, string | number>;
          classification?: { category?: string };
        }
      | undefined;

    if (!report) return;

    // 1. Low OCR Confidence Warning (< 0.85)
    if (report.ocrConfidence !== undefined && report.ocrConfidence < 0.85) {
      findings.push({
        ruleId: 'DOC-INT-OCR-LOW-CONFIDENCE',
        category: ValidationCategory.DOCUMENT_INTEGRITY,
        outcome: ValidationOutcome.LOW_CONFIDENCE,
        severity: ComplianceSeverity.ADVISORY_FLAG,
        message: `Document extraction confidence (${(report.ocrConfidence * 100).toFixed(1)}%) is below the statutory benchmark of 85%. Manual scrutiny required.`,
        documentId: doc.id,
        documentType: doc.documentType,
        confidenceScore: report.ocrConfidence,
        isAdvisory: true,
      });
    }

    // 2. Extracted Date Inversion (issueDate > expiryDate)
    const fields = report.extractedFields;
    if (fields?.issueDate && fields?.expiryDate) {
      const issue = new Date(String(fields.issueDate));
      const expiry = new Date(String(fields.expiryDate));

      if (
        !isNaN(issue.getTime()) &&
        !isNaN(expiry.getTime()) &&
        issue.getTime() > expiry.getTime()
      ) {
        findings.push({
          ruleId: 'DOC-INT-DATE-ORDER-INVERSION',
          category: ValidationCategory.DOCUMENT_INTEGRITY,
          outcome: ValidationOutcome.ANOMALY_DETECTED,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          message: `Statutory date order inversion in '${doc.fileName}': Extracted issue date (${fields.issueDate}) is after expiry date (${fields.expiryDate}).`,
          documentId: doc.id,
          documentType: doc.documentType,
          expectedValue: 'issueDate <= expiryDate',
          observedValue: `issue=${fields.issueDate}, expiry=${fields.expiryDate}`,
          isAdvisory: true,
        });
      }
    }
  }

  /**
   * Parses PDF date format: D:YYYYMMDDHHmmSS[OHH'mm']
   */
  private parsePdfDate(raw: string): Date | null {
    const clean = raw.replace(/^D:/, '');
    const year = parseInt(clean.substring(0, 4), 10);
    const month = parseInt(clean.substring(4, 6), 10) - 1;
    const day = parseInt(clean.substring(6, 8), 10);
    const hour = parseInt(clean.substring(8, 10), 10) || 0;
    const min = parseInt(clean.substring(10, 12), 10) || 0;
    const sec = parseInt(clean.substring(12, 14), 10) || 0;

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Helper to extract JPEG width and height from SOF markers.
   */
  private extractJpegDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | null {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];

      // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }

      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
    return null;
  }
}
