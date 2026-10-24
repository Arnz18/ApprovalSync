/**
 * ApprovalSync — Document Duplicate Detection Service
 * Milestone: DOC-04
 *
 * Implements exact duplicate detection using cryptographic SHA-256 checksums
 * across application dossiers, with strict tenant isolation and advisory findings.
 *
 * Scopes evaluated:
 * 1. Intra-application duplicates (same file uploaded multiple times in an application).
 * 2. Inter-application duplicates within the same institution (reused certificates).
 * 3. Cross-institution collisions (identical file uploaded across different tenants).
 *    Strictly redacts foreign tenant metadata when accessed by institutional applicants.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import * as crypto from 'crypto';
import { Document } from '../../database/entities/document.entity';
import { Application } from '../../database/entities/application.entity';
import { UserRole, ComplianceSeverity } from '../../shared/contracts';
import { AuthUserPrincipal } from '../../auth/interfaces/auth-user.interface';
import {
  STORAGE_ADAPTER_TOKEN,
  IStorageAdapter,
} from '../../documents/interfaces/storage-adapter.interface';
import { ValidationCategory, ValidationOutcome } from '../enums';
import { ValidationFinding, DuplicateDetectionResult } from '../interfaces';
import { NearDuplicateDetectionService } from './near-duplicate-detection.service';

@Injectable()
export class DocumentDuplicateDetectionService {
  private readonly logger = new Logger(DocumentDuplicateDetectionService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    private readonly nearDuplicateService: NearDuplicateDetectionService,
  ) {}

  /**
   * Evaluates exact and near-duplicates for all documents belonging to an application.
   *
   * @param application Current application entity
   * @param documents Uploaded documents for the application
   * @param currentUser Authenticated user principal (for tenant-safe disclosure)
   * @param verifyStorage Optional flag to recompute SHA-256 from storage bytes
   */
  async evaluateDuplicates(
    application: Application,
    documents: Document[],
    currentUser: AuthUserPrincipal,
    verifyStorage: boolean = false,
  ): Promise<DuplicateDetectionResult> {
    const findings: ValidationFinding[] = [];
    let exactDuplicatesCount = 0;

    const isInstitutionUser = currentUser.role === UserRole.INSTITUTION_USER;

    // 1. Group intra-application documents by SHA-256 hash
    const intraAppHashMap = new Map<string, Document[]>();

    for (const doc of documents) {
      // Check or recompute checksum
      let hash = doc.fileHashSha256;

      if (!hash || verifyStorage) {
        try {
          const buffer = await this.storageAdapter.getBuffer(doc.storagePath);
          const computedHash = crypto
            .createHash('sha256')
            .update(buffer)
            .digest('hex');

          if (!hash) {
            hash = computedHash;
            doc.fileHashSha256 = computedHash;
            await this.documentRepository.save(doc);
          } else if (hash !== computedHash) {
            this.logger.warn(
              `SHA-256 checksum mismatch for doc ${doc.id}: db=${hash}, storage=${computedHash}`,
            );
            findings.push({
              ruleId: 'DOC-DUP-CHECKSUM-MISMATCH',
              category: ValidationCategory.DUPLICATE_DETECTION,
              outcome: ValidationOutcome.ANOMALY_DETECTED,
              severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
              message: `Document file checksum mismatch: stored hash (${hash.substring(0, 12)}...) differs from recomputed storage hash (${computedHash.substring(0, 12)}...).`,
              documentId: doc.id,
              documentType: doc.documentType,
              expectedValue: hash,
              observedValue: computedHash,
              isAdvisory: true,
              metadata: {
                fileName: doc.fileName,
                storagePath: doc.storagePath,
              },
            });
          }
        } catch (storageErr) {
          this.logger.error(
            `Unable to read storage file for doc ${doc.id}: ${(storageErr as Error).message}`,
          );
          findings.push({
            ruleId: 'DOC-DUP-STORAGE-UNAVAILABLE',
            category: ValidationCategory.DUPLICATE_DETECTION,
            outcome: ValidationOutcome.SOURCE_UNAVAILABLE,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            message: `Document binary could not be accessed from storage to verify cryptographic checksum.`,
            documentId: doc.id,
            documentType: doc.documentType,
            isAdvisory: true,
            metadata: {
              error: (storageErr as Error).message,
            },
          });
          continue;
        }
      }

      if (hash) {
        const existing = intraAppHashMap.get(hash) || [];
        existing.push(doc);
        intraAppHashMap.set(hash, existing);
      }
    }

    // 2. Evaluate Intra-Application Duplicates
    const intraDuplicateDocIds = new Set<string>();

    for (const [hash, group] of intraAppHashMap.entries()) {
      if (group.length > 1) {
        exactDuplicatesCount += group.length;
        for (const doc of group) {
          intraDuplicateDocIds.add(doc.id);
          const siblings = group.filter((d) => d.id !== doc.id);
          const siblingNames = siblings.map((d) => d.fileName).join(', ');
          const siblingIds = siblings.map((d) => d.id);

          findings.push({
            ruleId: 'DOC-DUP-EXACT-INTRA-APP',
            category: ValidationCategory.DUPLICATE_DETECTION,
            outcome: ValidationOutcome.EXACT_DUPLICATE,
            severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
            message: `Exact cryptographic duplicate detected within the same application: document '${doc.fileName}' shares identical SHA-256 checksum (${hash.substring(0, 16)}...) with ${siblings.length} other attachment(s): ${siblingNames}.`,
            documentId: doc.id,
            documentType: doc.documentType,
            expectedValue: 'Unique file byte stream',
            observedValue: `Duplicate hash: ${hash}`,
            confidenceScore: 1.0,
            isAdvisory: true,
            metadata: {
              scope: 'INTRA_APPLICATION',
              fileHashSha256: hash,
              duplicateDocumentIds: siblingIds,
              duplicateFileNames: siblings.map((d) => d.fileName),
            },
          });
        }
      }
    }

    // 3. Query External Database for Inter-Application & Cross-Institution Duplicates
    const docHashes = Array.from(intraAppHashMap.keys());

    if (docHashes.length > 0) {
      // Find any documents in the database matching these hashes from other applications
      const externalMatches = await this.documentRepository.find({
        where: {
          fileHashSha256: In(docHashes),
          applicationId: Not(application.id),
        },
        relations: ['application', 'application.institution'],
      });

      for (const doc of documents) {
        if (!doc.fileHashSha256) continue;

        const matches = externalMatches.filter(
          (m) => m.fileHashSha256 === doc.fileHashSha256,
        );

        for (const match of matches) {
          exactDuplicatesCount++;
          const matchApp = match.application;
          const matchInst = matchApp?.institution;

          const isSameInstitution =
            matchApp && matchApp.institutionId === application.institutionId;

          if (isSameInstitution) {
            // Inter-application within SAME institution (e.g. perpetual deed reused)
            findings.push({
              ruleId: 'DOC-DUP-EXACT-SAME-INSTITUTION',
              category: ValidationCategory.DUPLICATE_DETECTION,
              outcome: ValidationOutcome.EXACT_DUPLICATE,
              severity: ComplianceSeverity.ADVISORY_FLAG,
              message: `Identical document byte stream previously submitted in application ${matchApp.applicationNumber} (${match.fileName}) by your institution. Reusing registered land deeds or trust registrations across cycles may be legitimate; flagged for reviewer verification.`,
              documentId: doc.id,
              documentType: doc.documentType,
              expectedValue: 'Independent submission',
              observedValue: `Prior submission in application ${matchApp.applicationNumber}`,
              confidenceScore: 1.0,
              isAdvisory: true,
              metadata: {
                scope: 'SAME_INSTITUTION',
                fileHashSha256: doc.fileHashSha256,
                matchedApplicationId: matchApp.id,
                matchedApplicationNumber: matchApp.applicationNumber,
                matchedDocumentId: match.id,
                matchedFileName: match.fileName,
              },
            });
          } else {
            // Cross-institution collision!
            // TENANT PRIVACY GUARD: Redact foreign tenant details for INSTITUTION_USER
            if (isInstitutionUser) {
              findings.push({
                ruleId: 'DOC-DUP-EXACT-CROSS-INSTITUTION',
                category: ValidationCategory.DUPLICATE_DETECTION,
                outcome: ValidationOutcome.EXACT_DUPLICATE,
                severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
                message: `Cryptographic checksum collision detected: document '${doc.fileName}' byte stream matches an attachment registered under a separate institutional entity. Flagged for supervisory scrutiny.`,
                documentId: doc.id,
                documentType: doc.documentType,
                expectedValue: 'Unique institutional submission',
                observedValue: 'Collision with external institutional record',
                confidenceScore: 1.0,
                isAdvisory: true,
                metadata: {
                  scope: 'CROSS_INSTITUTION',
                  fileHashSha256: doc.fileHashSha256,
                  isCrossTenant: true,
                  redacted: true,
                },
              });
            } else {
              // Officer / Auditor view: Unredacted supervisory details
              const institutionName = matchInst?.name || 'Unknown Institution';
              findings.push({
                ruleId: 'DOC-DUP-EXACT-CROSS-INSTITUTION',
                category: ValidationCategory.DUPLICATE_DETECTION,
                outcome: ValidationOutcome.EXACT_DUPLICATE,
                severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
                message: `Cross-institution collision: document '${doc.fileName}' has identical SHA-256 hash to document '${match.fileName}' submitted by institution '${institutionName}' in application ${matchApp?.applicationNumber || match.applicationId}.`,
                documentId: doc.id,
                documentType: doc.documentType,
                expectedValue: 'Unique institutional submission',
                observedValue: `Duplicate of ${match.id} (${institutionName})`,
                confidenceScore: 1.0,
                isAdvisory: true,
                metadata: {
                  scope: 'CROSS_INSTITUTION',
                  fileHashSha256: doc.fileHashSha256,
                  isCrossTenant: true,
                  matchedInstitutionId: matchApp?.institutionId,
                  matchedInstitutionName: institutionName,
                  matchedApplicationId: matchApp?.id,
                  matchedApplicationNumber: matchApp?.applicationNumber,
                  matchedDocumentId: match.id,
                  matchedFileName: match.fileName,
                },
              });
            }
          }
        }
      }
    }

    // 4. Record COMPLIANT finding for uniquely submitted documents
    for (const doc of documents) {
      const hasIntra = intraDuplicateDocIds.has(doc.id);
      const hasExternal = findings.some(
        (f) =>
          f.documentId === doc.id &&
          (f.ruleId === 'DOC-DUP-EXACT-SAME-INSTITUTION' ||
            f.ruleId === 'DOC-DUP-EXACT-CROSS-INSTITUTION'),
      );

      if (!hasIntra && !hasExternal && doc.fileHashSha256) {
        findings.push({
          ruleId: 'DOC-DUP-EXACT-UNIQUE',
          category: ValidationCategory.DUPLICATE_DETECTION,
          outcome: ValidationOutcome.VALID,
          severity: ComplianceSeverity.COMPLIANT,
          message: `Document '${doc.fileName}' has a unique cryptographic SHA-256 checksum (${doc.fileHashSha256.substring(0, 16)}...).`,
          documentId: doc.id,
          documentType: doc.documentType,
          confidenceScore: 1.0,
          isAdvisory: true,
          metadata: {
            fileHashSha256: doc.fileHashSha256,
          },
        });
      }
    }

    // 5. Evaluate Near-Duplicates among application documents
    const nearResult =
      this.nearDuplicateService.evaluateApplicationNearDuplicates(documents);

    findings.push(...nearResult.findings);

    return {
      applicationId: application.id,
      totalDocumentsEvaluated: documents.length,
      exactDuplicatesCount,
      nearDuplicatesCount: nearResult.nearDuplicates.length,
      findings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
