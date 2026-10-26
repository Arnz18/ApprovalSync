/**
 * ApprovalSync — Audit Service Unit Tests
 * Milestone: BE-07
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Application } from '../database/entities/application.entity';
import { AuditCheckpoint } from './entities/audit-checkpoint.entity';
import { ApplicationStatus, UserRole } from '../shared/contracts';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import {
  GENESIS_PREVIOUS_HASH,
  computeLeafHash,
  computeCurrentHash,
} from './crypto/canonical-json';
import { computeMerkleRoot } from './crypto/merkle-tree';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepo: jest.Mocked<Repository<AuditLog>>;
  let applicationRepo: jest.Mocked<Repository<Application>>;

  const appId1 = 'b0000000-0000-0000-0000-000000000001';
  const instId1 = 'a0000000-0000-0000-0000-000000000001';
  const instId2 = 'a0000000-0000-0000-0000-000000000002';

  const institutionUserA: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'college.a@synthetic.approvalsync.local',
    name: 'College A Rep',
    role: UserRole.INSTITUTION_USER,
    institutionId: instId1,
  };

  const auditorUser: AuthUserPrincipal = {
    id: 'u0000000-0000-0000-0000-000000000009',
    email: 'auditor@synthetic.approvalsync.local',
    name: 'External Auditor',
    role: UserRole.AUDITOR,
  };

  const mockApplicationA: Application = {
    id: appId1,
    applicationNumber: 'APP-2026-TEST001',
    institutionId: instId1,
    academicYear: '2026-2027',
    programType: 'Engineering',
    status: ApplicationStatus.SUBMITTED,
    payloadJsonb: {},
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    institution: {} as any,
    documents: [],
    auditLogs: [],
    slaTimers: [],
    timelineEvents: [],
  };

  let mockEntityManager: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn((entityClass, entity) => {
        if (!entity) return Promise.resolve(entityClass);
        return Promise.resolve({
          ...entity,
          sequenceNumber: entity.sequenceNumber || '1',
          timestamp: entity.timestamp || new Date(),
        });
      }),
      create: jest.fn((entityClass, plain) => ({
        ...plain,
        sequenceNumber: '1',
        timestamp: new Date(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((plain) => plain),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditCheckpoint),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn((cp) => Promise.resolve({ ...cp, id: 'cp-uuid-1' })),
            create: jest.fn((plain) => plain),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: any) => cb(mockEntityManager)),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
    applicationRepo = module.get(getRepositoryToken(Application));
  });

  describe('appendInTransaction', () => {
    it('appends genesis block with GENESIS_PREVIOUS_HASH when no previous logs exist', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null); // No previous log

      const result = await service.appendInTransaction(mockEntityManager, {
        applicationId: appId1,
        actorId: institutionUserA.id,
        actorRole: institutionUserA.role,
        eventType: 'APPLICATION_SUBMITTED',
        payloadSnapshot: { feePaid: true },
      });

      expect(result.previousHash).toBe(GENESIS_PREVIOUS_HASH);
      expect(result.leafHash).toHaveLength(64);
      expect(result.currentHash).toHaveLength(64);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('cryptographically binds to the previous log currentHash for subsequent blocks', async () => {
      const existingHash = 'a'.repeat(64);
      mockEntityManager.findOne.mockResolvedValueOnce({
        sequenceNumber: '1',
        currentHash: existingHash,
      });

      const result = await service.appendInTransaction(mockEntityManager, {
        applicationId: appId1,
        actorId: 'scrutiny-user-id',
        actorRole: UserRole.SCRUTINY_OFFICER,
        eventType: 'SCRUTINY_STARTED',
        payloadSnapshot: { stage: 'DOCUMENT_VERIFICATION' },
      });

      expect(result.previousHash).toBe(existingHash);
      expect(result.currentHash).not.toBe(existingHash);
    });
  });

  describe('getAuditLogsForApplication', () => {
    it('retrieves paginated audit logs for authorized institution user', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);
      auditLogRepo.findAndCount.mockResolvedValueOnce([
        [
          {
            sequenceNumber: '1',
            applicationId: appId1,
            actorId: institutionUserA.id,
            actorRole: institutionUserA.role,
            eventType: 'APPLICATION_SUBMITTED',
            payloadSnapshot: {},
            previousHash: GENESIS_PREVIOUS_HASH,
            leafHash: '1'.repeat(64),
            currentHash: '2'.repeat(64),
            timestamp: new Date(),
            application: mockApplicationA,
          },
        ],
        1,
      ]);

      const result = await service.getAuditLogsForApplication(
        appId1,
        institutionUserA,
        { page: 1, limit: 10, sortOrder: 'ASC' },
      );

      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });

    it('enforces tenant isolation and throws NotFoundException for cross-institution user', async () => {
      // Application belongs to instId2, but caller belongs to instId1
      applicationRepo.findOne.mockResolvedValueOnce({
        ...mockApplicationA,
        institutionId: instId2,
      });

      await expect(
        service.getAuditLogsForApplication(appId1, institutionUserA, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows cross-tenant read access for AUDITOR role', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);
      auditLogRepo.findAndCount.mockResolvedValueOnce([[], 0]);

      const result = await service.getAuditLogsForApplication(
        appId1,
        auditorUser,
        {},
      );
      expect(result.items).toEqual([]);
    });
  });

  describe('verifyApplicationChain', () => {
    it('returns isChainValid: true for an empty ledger', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);
      auditLogRepo.find.mockResolvedValueOnce([]);

      const result = await service.verifyApplicationChain(
        appId1,
        institutionUserA,
      );
      expect(result.isChainValid).toBe(true);
      expect(result.totalBlocksVerified).toBe(0);
    });

    it('verifies a valid multi-block cryptographic chain and computes Merkle root', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);

      // Block 1
      const payload1 = { step: 1 };
      const leaf1 = computeLeafHash(payload1);
      const time1 = new Date('2026-10-26T10:00:00.000Z');
      const hash1 = computeCurrentHash(
        GENESIS_PREVIOUS_HASH,
        leaf1,
        time1.toISOString(),
      );

      // Block 2
      const payload2 = { step: 2 };
      const leaf2 = computeLeafHash(payload2);
      const time2 = new Date('2026-10-26T10:05:00.000Z');
      const hash2 = computeCurrentHash(hash1, leaf2, time2.toISOString());

      const blocks: AuditLog[] = [
        {
          sequenceNumber: '1',
          applicationId: appId1,
          actorId: institutionUserA.id,
          actorRole: institutionUserA.role,
          eventType: 'APPLICATION_SUBMITTED',
          payloadSnapshot: payload1,
          previousHash: GENESIS_PREVIOUS_HASH,
          leafHash: leaf1,
          currentHash: hash1,
          timestamp: time1,
          application: mockApplicationA,
        },
        {
          sequenceNumber: '2',
          applicationId: appId1,
          actorId: 'officer-id',
          actorRole: UserRole.SCRUTINY_OFFICER,
          eventType: 'UNDER_SCRUTINY',
          payloadSnapshot: payload2,
          previousHash: hash1,
          leafHash: leaf2,
          currentHash: hash2,
          timestamp: time2,
          application: mockApplicationA,
        },
      ];

      auditLogRepo.find.mockResolvedValueOnce(blocks);

      const result = await service.verifyApplicationChain(
        appId1,
        institutionUserA,
      );
      expect(result.isChainValid).toBe(true);
      expect(result.totalBlocksVerified).toBe(2);
      expect(result.merkleRootHash).toBe(computeMerkleRoot([hash1, hash2]));
    });

    it('detects tampered payload content and flags the broken sequence number', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);

      const payload = { amount: 100 };
      const leaf = computeLeafHash(payload);
      const time = new Date('2026-10-26T10:00:00.000Z');
      const hash = computeCurrentHash(
        GENESIS_PREVIOUS_HASH,
        leaf,
        time.toISOString(),
      );

      // Attacker modified payload to amount: 999 without updating leafHash
      const tamperedBlock: AuditLog = {
        sequenceNumber: '1',
        applicationId: appId1,
        actorId: institutionUserA.id,
        actorRole: institutionUserA.role,
        eventType: 'APPLICATION_SUBMITTED',
        payloadSnapshot: { amount: 999 }, // tampered!
        previousHash: GENESIS_PREVIOUS_HASH,
        leafHash: leaf,
        currentHash: hash,
        timestamp: time,
        application: mockApplicationA,
      };

      auditLogRepo.find.mockResolvedValueOnce([tamperedBlock]);

      const result = await service.verifyApplicationChain(
        appId1,
        institutionUserA,
      );
      expect(result.isChainValid).toBe(false);
      expect(result.brokenBlockSequence).toBe(1);
    });

    it('detects broken previousHash linkage', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);

      const block1: AuditLog = {
        sequenceNumber: '1',
        applicationId: appId1,
        actorId: 'user-1',
        actorRole: UserRole.INSTITUTION_USER,
        eventType: 'SUBMITTED',
        payloadSnapshot: { a: 1 },
        previousHash: GENESIS_PREVIOUS_HASH,
        leafHash: computeLeafHash({ a: 1 }),
        currentHash: computeCurrentHash(
          GENESIS_PREVIOUS_HASH,
          computeLeafHash({ a: 1 }),
          new Date('2026-10-26T10:00:00.000Z').toISOString(),
        ),
        timestamp: new Date('2026-10-26T10:00:00.000Z'),
        application: mockApplicationA,
      };

      const block2BrokenLink: AuditLog = {
        sequenceNumber: '2',
        applicationId: appId1,
        actorId: 'user-2',
        actorRole: UserRole.SCRUTINY_OFFICER,
        eventType: 'SCRUTINY',
        payloadSnapshot: { b: 2 },
        previousHash: 'broken-predecessor-hash'.padEnd(64, '0'), // Broken!
        leafHash: computeLeafHash({ b: 2 }),
        currentHash: 'c'.repeat(64),
        timestamp: new Date('2026-10-26T10:05:00.000Z'),
        application: mockApplicationA,
      };

      auditLogRepo.find.mockResolvedValueOnce([block1, block2BrokenLink]);

      const result = await service.verifyApplicationChain(
        appId1,
        institutionUserA,
      );
      expect(result.isChainValid).toBe(false);
      expect(result.brokenBlockSequence).toBe(2);
      expect(result.totalBlocksVerified).toBe(1);
    });
  });

  describe('getMerkleProof & verifyStandaloneProof', () => {
    it('generates an inclusion proof and validates it successfully', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);

      const h1 = '1'.repeat(64);
      const h2 = '2'.repeat(64);
      const h3 = '3'.repeat(64);

      auditLogRepo.find.mockResolvedValueOnce([
        { sequenceNumber: '1', currentHash: h1 } as any,
        { sequenceNumber: '2', currentHash: h2 } as any,
        { sequenceNumber: '3', currentHash: h3 } as any,
      ]);

      const proof = await service.getMerkleProof(appId1, '2', institutionUserA);

      expect(proof.sequenceNumber).toBe('2');
      expect(proof.totalLeaves).toBe(3);
      expect(proof.proofPath.length).toBeGreaterThan(0);

      // Verify standalone proof
      const verification = service.verifyStandaloneProof({
        leafHash: proof.leafHash,
        expectedRoot: proof.expectedRoot,
        proofPath: proof.proofPath,
      });

      expect(verification.isValid).toBe(true);
    });

    it('throws NotFoundException if target sequence number does not exist', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(mockApplicationA);
      auditLogRepo.find.mockResolvedValueOnce([
        { sequenceNumber: '1', currentHash: '1'.repeat(64) } as any,
      ]);

      await expect(
        service.getMerkleProof(appId1, '999', institutionUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
