/**
 * ApprovalSync — Cryptographic Audit Ledger & Proof Verification E2E Tests
 * Milestone: BE-07
 *
 * Exercises audit log retrieval, sequential SHA-256 block hash chaining,
 * RFC 6962 Merkle tree proofs, checkpoint snapshots, mutation defense triggers,
 * tamper detection, and tenant isolation against live PostgreSQL 16.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { User } from '../src/database/entities/user.entity';
import { Institution } from '../src/database/entities/institution.entity';
import { UserRole, ApplicationStatus } from '../src/shared/contracts';
import { GENESIS_PREVIOUS_HASH } from '../src/audit/crypto/canonical-json';

describe('Cryptographic Audit Ledger & Proof Verification (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenInstitutionA: string;
  let tokenInstitutionB: string;
  let tokenScrutiny: string;
  let tokenAuditor: string;

  let institutionA: Institution;
  let institutionB: Institution;

  const demoPassword = 'DemoPass@123';
  const demoHash =
    '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    await app.init();

    dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(User);
    const instRepo = dataSource.getRepository(Institution);

    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;
    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    // Ensure users for testing roles exist
    const ensureUser = async (
      email: string,
      name: string,
      role: UserRole,
      institutionId?: string,
    ): Promise<void> => {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        u = userRepo.create({
          name,
          email,
          role,
          passwordHash: demoHash,
          institutionId: institutionId || null,
          isActive: true,
        });
        await userRepo.save(u);
      }
    };

    await ensureUser(
      'college.b@synthetic.approvalsync.local',
      'College B Rep',
      UserRole.INSTITUTION_USER,
      institutionB.id,
    );
    await ensureUser(
      'audit.cvc@synthetic.approvalsync.local',
      'CVC Oversight Auditor',
      UserRole.AUDITOR,
    );

    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: demoPassword })
        .expect(200);
      return res.body.data.accessToken;
    };

    tokenInstitutionA = await login(
      'demo.institution@synthetic.approvalsync.local',
    );
    tokenInstitutionB = await login('college.b@synthetic.approvalsync.local');
    tokenScrutiny = await login('demo.scrutiny@synthetic.approvalsync.local');
    tokenAuditor = await login('audit.cvc@synthetic.approvalsync.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Unauthenticated & Authorization Guards', () => {
    const dummyAppId = '00000000-0000-0000-0000-000000000001';

    it('rejects unauthenticated GET /api/v1/applications/:id/audit-logs with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${dummyAppId}/audit-logs`)
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated GET /api/v1/applications/:id/audit-logs/verify with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${dummyAppId}/audit-logs/verify`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated GET /api/v1/applications/:id/audit-logs/checkpoint with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${dummyAppId}/audit-logs/checkpoint`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated POST /api/v1/audit/verify-proof with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/audit/verify-proof')
        .send({
          leafHash: 'a'.repeat(64),
          expectedRoot: 'b'.repeat(64),
          proofPath: [],
        })
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Tenant Isolation & Anti-Enumeration', () => {
    let appBId: string;

    beforeAll(async () => {
      // Create draft application for Institution B
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Pharmacy',
          payloadJsonb: { campusAreaSqM: 4000 },
        })
        .expect(201);
      appBId = createRes.body.data.id;
    });

    it('denies Institution A representative access to Institution B audit logs with 404 (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('denies Institution A representative verifying Institution B chain with 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/audit-logs/verify`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('allows AUDITOR to view Institution B audit logs across tenants', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('3. Transactional Audit Log Writing & Hash Chaining', () => {
    let testAppId: string;

    beforeAll(async () => {
      // Create application for Institution A
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Architecture',
          payloadJsonb: { studiosCount: 8, libraryVolumes: 15000 },
        })
        .expect(201);
      testAppId = createRes.body.data.id;
    });

    it('records genesis audit log atomically on application submission', async () => {
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(submitRes.body.data.status).toBe(ApplicationStatus.SUBMITTED);

      // Verify audit logs
      const auditRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      const logs = auditRes.body.data;
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const genesisLog = logs[0];
      expect(genesisLog.previousHash).toBe(GENESIS_PREVIOUS_HASH);
      expect(genesisLog.eventType).toBe('APPLICATION_SUBMITTED');
      expect(genesisLog.leafHash).toHaveLength(64);
      expect(genesisLog.currentHash).toHaveLength(64);
    });

    it('records subsequent audit blocks with correct cryptographic linkage through workflow transitions', async () => {
      // Transition 1: Scrutiny Officer begins scrutiny
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ targetStatus: ApplicationStatus.UNDER_SCRUTINY })
        .expect(200);

      // Transition 2: Scrutiny Officer issues deficiency
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: 'Upload updated structural stability certificate.',
        })
        .expect(200);

      // Retrieve full audit log chain
      const auditRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/audit-logs?sortOrder=ASC`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      const logs = auditRes.body.data;
      expect(logs.length).toBeGreaterThanOrEqual(3);

      // Verify sequential hash chaining: Block[i].previousHash == Block[i-1].currentHash
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].previousHash).toBe(logs[i - 1].currentHash);
        expect(Number(logs[i].sequenceNumber)).toBeGreaterThan(
          Number(logs[i - 1].sequenceNumber),
        );
      }
    });

    it('verifies complete intact audit chain via /verify endpoint', async () => {
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/audit-logs/verify`)
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.isChainValid).toBe(true);
      expect(verifyRes.body.data.totalBlocksVerified).toBeGreaterThanOrEqual(3);
      expect(verifyRes.body.data.brokenBlockSequence).toBeUndefined();
      expect(verifyRes.body.data.merkleRootHash).toBeDefined();
      expect(verifyRes.body.data.merkleRootHash).toHaveLength(64);
    });
  });

  describe('4. Checkpoints & Merkle Inclusion Proofs', () => {
    let auditAppId: string;
    let targetSeq: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Management',
          payloadJsonb: { seminarHalls: 2 },
        })
        .expect(201);
      auditAppId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${auditAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${auditAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ targetStatus: ApplicationStatus.UNDER_SCRUTINY })
        .expect(200);

      const logsRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${auditAppId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);
      targetSeq = logsRes.body.data[0].sequenceNumber;
    });

    it('generates a valid cryptographic checkpoint via /checkpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${auditAppId}/audit-logs/checkpoint`)
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(auditAppId);
      expect(res.body.data.merkleRootHash).toHaveLength(64);
      expect(res.body.data.chainHeadHash).toHaveLength(64);
      expect(res.body.data.totalBlocks).toBeGreaterThanOrEqual(2);
      expect(res.body.data.algorithm).toBe('RFC6962_SHA256');
    });

    it('generates an RFC 6962 inclusion proof for target audit block and verifies it', async () => {
      const proofRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${auditAppId}/audit-logs/${targetSeq}/proof`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(proofRes.body.success).toBe(true);
      const proof = proofRes.body.data;
      expect(proof.sequenceNumber).toBe(targetSeq);
      expect(proof.leafHash).toHaveLength(64);
      expect(proof.expectedRoot).toHaveLength(64);

      // Verify the proof using the standalone verification endpoint
      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/audit/verify-proof')
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .send({
          leafHash: proof.leafHash,
          expectedRoot: proof.expectedRoot,
          proofPath: proof.proofPath,
        })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.isValid).toBe(true);
    });

    it('rejects verification if proof leaf hash is altered', async () => {
      const proofRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${auditAppId}/audit-logs/${targetSeq}/proof`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      const proof = proofRes.body.data;

      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/audit/verify-proof')
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .send({
          leafHash: '0'.repeat(64), // Altered leaf hash!
          expectedRoot: proof.expectedRoot,
          proofPath: proof.proofPath,
        })
        .expect(200);

      expect(verifyRes.body.data.isValid).toBe(false);
    });
  });

  describe('5. Database Append-Only Mutation Defenses & Tamper Detection', () => {
    let appTamperId: string;
    let savedSeq: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Design',
          payloadJsonb: { workshopAreaSqM: 1200 },
        })
        .expect(201);
      appTamperId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appTamperId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      const logsRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appTamperId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);
      savedSeq = logsRes.body.data[0].sequenceNumber;
    });

    it('database trigger trg_audit_logs_no_mutation blocks UPDATE on audit_logs', async () => {
      await expect(
        dataSource.query(
          `UPDATE audit_logs SET event_type = 'TAMPERED_EVENT' WHERE sequence_number = $1`,
          [savedSeq],
        ),
      ).rejects.toThrow(
        /Audit log entries are immutable and cannot be updated or deleted/,
      );
    });

    it('database trigger trg_audit_logs_no_mutation blocks DELETE on audit_logs', async () => {
      await expect(
        dataSource.query(`DELETE FROM audit_logs WHERE sequence_number = $1`, [
          savedSeq,
        ]),
      ).rejects.toThrow(
        /Audit log entries are immutable and cannot be updated or deleted/,
      );
    });

    it('database trigger trg_audit_checkpoints_no_mutation blocks UPDATE on audit_checkpoints', async () => {
      // First ensure checkpoint exists
      const cpRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appTamperId}/audit-logs/checkpoint`)
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .expect(200);

      const cpId = cpRes.body.data.id;

      await expect(
        dataSource.query(
          `UPDATE audit_checkpoints SET algorithm = 'TAMPERED' WHERE id = $1`,
          [cpId],
        ),
      ).rejects.toThrow(
        /Audit checkpoints are immutable and cannot be updated or deleted/,
      );
    });

    it('detects tampering and reports broken block sequence if row payload is altered', async () => {
      // Controlled simulation: temporarily disable trigger within an isolated block to simulate
      // a database superuser who modified payload data without recomputing the cryptographic chain
      await dataSource.query(
        `ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_no_mutation;`,
      );

      try {
        await dataSource.query(
          `UPDATE audit_logs SET payload_snapshot = '{"tampered":true}'::jsonb WHERE sequence_number = $1`,
          [savedSeq],
        );

        // Verification endpoint must detect the mismatch immediately
        const verifyRes = await request(app.getHttpServer())
          .get(`/api/v1/applications/${appTamperId}/audit-logs/verify`)
          .set('Authorization', `Bearer ${tokenAuditor}`)
          .expect(200);

        expect(verifyRes.body.data.isChainValid).toBe(false);
        expect(verifyRes.body.data.brokenBlockSequence).toBe(Number(savedSeq));
      } finally {
        // Restore trigger immediately
        await dataSource.query(
          `ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_no_mutation;`,
        );
      }
    });
  });
});
