/**
 * ApprovalSync — Cryptographic Audit Ledger Service
 * Milestone: BE-07
 *
 * Implements tamper-evident audit ledger management, sequential SHA-256 block chaining,
 * RFC 6962 Merkle tree computation, proof generation, and chain verification.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Application } from '../database/entities/application.entity';
import { AuditCheckpoint } from './entities/audit-checkpoint.entity';
import {
  AppendAuditEntryCommand,
  AuditVerificationResult,
  UserRole,
  PaginationMeta,
} from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { AuditLogQueryDto, VerifyProofDto } from './dto';
import {
  computeLeafHash,
  computeCurrentHash,
  GENESIS_PREVIOUS_HASH,
} from './crypto/canonical-json';
import {
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  MerkleInclusionProof,
} from './crypto/merkle-tree';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(AuditCheckpoint)
    private readonly checkpointRepository: Repository<AuditCheckpoint>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Appends an audit entry within an existing active database transaction.
   * Derives sequential hash linkage deterministically under caller's row lock.
   */
  async appendInTransaction(
    manager: EntityManager,
    command: AppendAuditEntryCommand,
  ): Promise<AuditLog> {
    // 1. Fetch latest audit log for this application to determine previousHash
    const latestLog = await manager.findOne(AuditLog, {
      where: { applicationId: command.applicationId },
      order: { sequenceNumber: 'DESC' },
    });

    const previousHash = latestLog
      ? latestLog.currentHash
      : GENESIS_PREVIOUS_HASH;

    // 2. Compute canonical leaf hash of payload snapshot
    const leafHash = computeLeafHash(command.payloadSnapshot);

    // 3. Current entry timestamp (stored as UTC ISO-8601 string in hash preimage)
    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();

    // 4. Compute chained current hash: SHA-256(previousHash + leafHash + timestampIso)
    const currentHash = computeCurrentHash(
      previousHash,
      leafHash,
      timestampIso,
    );

    // 5. Persist audit log entry
    const entry = manager.create(AuditLog, {
      applicationId: command.applicationId,
      actorId: command.actorId,
      actorRole: command.actorRole,
      eventType: command.eventType,
      payloadSnapshot: command.payloadSnapshot,
      previousHash,
      leafHash,
      currentHash,
      timestamp,
    });

    const saved = await manager.save(AuditLog, entry);

    this.logger.debug(
      `Appended audit entry seq=${saved.sequenceNumber} app=${command.applicationId} event=${command.eventType} hash=${currentHash.substring(0, 12)}...`,
    );

    return saved;
  }

  /**
   * Appends an audit entry in a standalone serialized transaction with pessimistic locking.
   */
  async appendEntry(command: AppendAuditEntryCommand): Promise<AuditLog> {
    return this.dataSource.transaction(async (manager) => {
      // Row lock on Application guarantees strict sequential serialization of audit blocks
      const app = await manager.findOne(Application, {
        where: { id: command.applicationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!app) {
        throw new NotFoundException(
          `Application with ID ${command.applicationId} not found`,
        );
      }

      return this.appendInTransaction(manager, command);
    });
  }

  /**
   * Retrieves paginated audit logs for an application with strict institutional tenant scoping.
   */
  async getAuditLogsForApplication(
    applicationId: string,
    currentUser: AuthUserPrincipal,
    queryDto: AuditLogQueryDto,
  ): Promise<{ items: AuditLog[]; pagination: PaginationMeta }> {
    await this.assertApplicationAccess(applicationId, currentUser);

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;
    const sortOrder = (queryDto.sortOrder || 'ASC').toUpperCase() as
      'ASC' | 'DESC';

    const [items, total] = await this.auditLogRepository.findAndCount({
      where: { applicationId },
      order: { sequenceNumber: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Verifies the cryptographic integrity of an application's audit chain from genesis to head.
   * Recomputes all leaf hashes and sequential chain current hashes.
   * Returns verification result with RFC 6962 Merkle root hash.
   */
  async verifyApplicationChain(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<AuditVerificationResult> {
    await this.assertApplicationAccess(applicationId, currentUser);

    const logs = await this.auditLogRepository.find({
      where: { applicationId },
      order: { sequenceNumber: 'ASC' },
    });

    const verifiedAt = new Date().toISOString();

    if (logs.length === 0) {
      return {
        applicationId,
        isChainValid: true,
        totalBlocksVerified: 0,
        verifiedAt,
      };
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Verify previousHash linkage
      const expectedPrev =
        i === 0 ? GENESIS_PREVIOUS_HASH : logs[i - 1].currentHash;

      if (log.previousHash !== expectedPrev) {
        this.logger.warn(
          `Audit chain broken at seq=${log.sequenceNumber}: expected previousHash=${expectedPrev}, found=${log.previousHash}`,
        );
        return {
          applicationId,
          isChainValid: false,
          totalBlocksVerified: i,
          brokenBlockSequence: Number(log.sequenceNumber),
          verifiedAt,
        };
      }

      // 2. Recompute leafHash from stored canonical payload
      const expectedLeafHash = computeLeafHash(log.payloadSnapshot);
      if (log.leafHash !== expectedLeafHash) {
        this.logger.warn(
          `Audit block payload altered at seq=${log.sequenceNumber}: expected leafHash=${expectedLeafHash}, found=${log.leafHash}`,
        );
        return {
          applicationId,
          isChainValid: false,
          totalBlocksVerified: i,
          brokenBlockSequence: Number(log.sequenceNumber),
          verifiedAt,
        };
      }

      // 3. Recompute currentHash
      const timestampIso = new Date(log.timestamp).toISOString();
      const expectedCurrentHash = computeCurrentHash(
        log.previousHash,
        log.leafHash,
        timestampIso,
      );

      if (log.currentHash !== expectedCurrentHash) {
        this.logger.warn(
          `Audit block hash altered at seq=${log.sequenceNumber}: expected currentHash=${expectedCurrentHash}, found=${log.currentHash}`,
        );
        return {
          applicationId,
          isChainValid: false,
          totalBlocksVerified: i,
          brokenBlockSequence: Number(log.sequenceNumber),
          verifiedAt,
        };
      }
    }

    // 4. Compute RFC 6962 Merkle root over all block currentHashes
    const blockHashes = logs.map((b) => b.currentHash);
    const merkleRootHash = computeMerkleRoot(blockHashes);

    return {
      applicationId,
      isChainValid: true,
      totalBlocksVerified: logs.length,
      verifiedAt,
      merkleRootHash,
    };
  }

  /**
   * Generates or fetches the latest cryptographic checkpoint for an application's audit chain.
   */
  async getLatestCheckpoint(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<AuditCheckpoint> {
    await this.assertApplicationAccess(applicationId, currentUser);

    const verification = await this.verifyApplicationChain(
      applicationId,
      currentUser,
    );

    if (!verification.isChainValid) {
      throw new BadRequestException(
        `Audit chain integrity verification failed at sequence ${verification.brokenBlockSequence}. Cannot generate checkpoint for a tampered chain.`,
      );
    }

    if (verification.totalBlocksVerified === 0) {
      throw new NotFoundException(
        'No audit records found to checkpoint for this application.',
      );
    }

    // Fetch latest persisted checkpoint
    let checkpoint = await this.checkpointRepository.findOne({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });

    const logs = await this.auditLogRepository.find({
      where: { applicationId },
      order: { sequenceNumber: 'ASC' },
    });
    const latestLog = logs[logs.length - 1];

    // If checkpoint is absent or behind current chain head, record fresh checkpoint
    if (
      !checkpoint ||
      checkpoint.sequenceNumber !== latestLog.sequenceNumber.toString() ||
      checkpoint.chainHeadHash !== latestLog.currentHash
    ) {
      checkpoint = this.checkpointRepository.create({
        applicationId,
        sequenceNumber: latestLog.sequenceNumber.toString(),
        chainHeadHash: latestLog.currentHash,
        merkleRootHash: verification.merkleRootHash || '',
        totalBlocks: verification.totalBlocksVerified,
        algorithm: 'RFC6962_SHA256',
        createdAt: new Date(),
      });
      checkpoint = await this.checkpointRepository.save(checkpoint);
    }

    return checkpoint;
  }

  /**
   * Generates an RFC 6962 Merkle Inclusion Proof for a specific block sequence number.
   */
  async getMerkleProof(
    applicationId: string,
    sequenceNumber: number | string,
    currentUser: AuthUserPrincipal,
  ): Promise<
    MerkleInclusionProof & { applicationId: string; sequenceNumber: string }
  > {
    await this.assertApplicationAccess(applicationId, currentUser);

    const logs = await this.auditLogRepository.find({
      where: { applicationId },
      order: { sequenceNumber: 'ASC' },
    });

    const targetSeqStr = sequenceNumber.toString();
    const leafIndex = logs.findIndex(
      (log) => log.sequenceNumber.toString() === targetSeqStr,
    );

    if (leafIndex === -1) {
      throw new NotFoundException(
        `Audit log entry with sequence number ${targetSeqStr} not found for application ${applicationId}`,
      );
    }

    const blockHashes = logs.map((b) => b.currentHash);
    const proof = generateMerkleProof(blockHashes, leafIndex);

    return {
      applicationId,
      sequenceNumber: targetSeqStr,
      ...proof,
    };
  }

  /**
   * Standalone verification of a supplied Merkle Inclusion Proof.
   */
  verifyStandaloneProof(dto: VerifyProofDto): {
    isValid: boolean;
    leafHash: string;
    expectedRoot: string;
  } {
    const isValid = verifyMerkleProof({
      leafIndex: 0,
      totalLeaves: 0,
      leafHash: dto.leafHash,
      proofPath: dto.proofPath,
      expectedRoot: dto.expectedRoot,
    });

    return {
      isValid,
      leafHash: dto.leafHash,
      expectedRoot: dto.expectedRoot,
    };
  }

  /**
   * Validates access to application with tenant isolation and anti-enumeration protection.
   */
  private async assertApplicationAccess(
    applicationId: string,
    currentUser: AuthUserPrincipal,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    // Return 404 uniformly if nonexistent or cross-tenant for institution users to prevent ID enumeration
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (
        !currentUser.institutionId ||
        application.institutionId !== currentUser.institutionId
      ) {
        throw new NotFoundException('Application not found.');
      }
    }

    return application;
  }
}
