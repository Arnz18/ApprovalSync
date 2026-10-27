/**
 * ApprovalSync — Milestone INT-02: Security, Privacy & Authorization Review
 * Owner: M1 — Platform & Integration Lead
 *
 * Automated Security & Authorization Regression Suite verifying:
 * 1. SEC-AUTH: Authentication enforcement, token signature/expiry validation, dev header rejection.
 * 2. SEC-TENANT: Strict multi-tenant data isolation and anti-enumeration across resources.
 * 3. SEC-RBAC: Server-side role enforcement, privilege escalation denial, invalid state transitions.
 * 4. SEC-DOC: File binary signature inspection, executable rejection, path traversal sanitization, unauthorized download denial.
 * 5. SEC-INJECT: Client-injected server-managed keys & prototype pollution stripping from payloadJsonb.
 * 6. SEC-HEADERS: Global defensive HTTP security headers and absence of X-Powered-By leaks.
 * 7. SEC-AUDIT: Cryptographic audit chain verification and PostgreSQL row-level immutability triggers.
 * 8. SEC-ADVISORY: Truthful advisory flag preservation and human authority boundary.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import {
  Institution,
  User,
  Application,
  Document,
  AuditLog,
} from '../src/database/entities';
import { ApplicationStatus, UserRole } from '../src/shared/contracts';

jest.setTimeout(60000);

describe('INT-02: Security, Privacy & Authorization Review (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let institutionA: Institution;
  let institutionB: Institution;
  let instAUser: User;
  let instBUser: User;
  let scrutinyOfficer: User;
  let systemAdmin: User;

  let tokenInstA: string;
  let tokenInstB: string;
  let tokenOfficer: string;
  let tokenAdmin: string;

  const demoPassword = 'DemoPass@123';
  const fixturesDir = path.resolve(__dirname, 'fixtures/documents');
  const validPdfPath = path.join(fixturesDir, 'valid-sample.pdf');
  const exePath = path.join(fixturesDir, 'executable.exe');
  const zipPath = path.join(fixturesDir, 'archive.zip');
  const spoofedHtmlPath = path.join(fixturesDir, 'spoofed-html.pdf');

  // Shared test resources
  let appAId: string;
  let appBId: string;
  let docAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Replicate bootstrap configuration including security middleware
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // Defensive HTTP Security Headers middleware matching main.ts
    app.use(
      (
        _req: unknown,
        res: {
          setHeader: (name: string, value: string) => void;
          removeHeader?: (name: string) => void;
        },
        next: () => void,
      ) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '0');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; frame-ancestors 'none'",
        );
        if (typeof res.removeHeader === 'function') {
          res.removeHeader('X-Powered-By');
        }
        next();
      },
    );

    await app.init();
    dataSource = app.get(DataSource);

    const instRepo = dataSource.getRepository(Institution);
    const userRepo = dataSource.getRepository(User);

    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;

    instAUser = (await userRepo.findOne({
      where: { email: 'demo.institution@synthetic.approvalsync.local' },
    }))!;
    instBUser = (await userRepo.findOne({
      where: { email: 'college.b@synthetic.approvalsync.local' },
    }))!;
    scrutinyOfficer = (await userRepo.findOne({
      where: { email: 'demo.scrutiny@synthetic.approvalsync.local' },
    }))!;
    systemAdmin = (await userRepo.findOne({
      where: { email: 'demo.admin@synthetic.approvalsync.local' },
    }))!;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: demoPassword })
        .expect(200);
      return res.body.data.accessToken;
    };

    tokenInstA = await login(instAUser.email);
    tokenInstB = await login(instBUser.email);
    tokenOfficer = await login(scrutinyOfficer.email);
    tokenAdmin = await login(systemAdmin.email);

    // Setup initial applications for tenant isolation tests
    const appResA = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenInstA}`)
      .send({
        academicYear: '2026-2027',
        programType: 'ENGINEERING_AND_TECHNOLOGY',
        payloadJsonb: { institutionName: institutionA.name, facultyCount: 40 },
      })
      .expect(201);
    appAId = appResA.body.data.id;

    const appResB = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${tokenInstB}`)
      .send({
        academicYear: '2026-2027',
        programType: 'PHARMACY',
        payloadJsonb: { institutionName: institutionB.name, facultyCount: 25 },
      })
      .expect(201);
    appBId = appResB.body.data.id;

    // Attach a document to App A for document authorization tests
    const docRes = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appAId}/documents`)
      .set('Authorization', `Bearer ${tokenInstA}`)
      .field('documentType', 'LAND_TITLE_DEED')
      .field('description', 'Tenant A deed')
      .attach('file', validPdfPath)
      .expect(201);
    docAId = docRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. SEC-AUTH: Authentication & Session Security
  // =========================================================================
  describe('1. SEC-AUTH: Authentication and Session Security', () => {
    it('rejects unauthenticated requests with 401 across protected resources', async () => {
      const endpoints = [
        { method: 'get', url: '/api/v1/applications' },
        { method: 'get', url: `/api/v1/applications/${appAId}` },
        { method: 'get', url: `/api/v1/applications/${appAId}/documents` },
        { method: 'get', url: `/api/v1/documents/${docAId}` },
        { method: 'get', url: `/api/v1/documents/${docAId}/download` },
        { method: 'get', url: `/api/v1/applications/${appAId}/audit-logs` },
        { method: 'get', url: `/api/v1/applications/${appAId}/sla-timers` },
        { method: 'get', url: '/api/v1/undertakings' },
      ];

      for (const ep of endpoints) {
        const res = await (request(app.getHttpServer()) as any)
          [ep.method](ep.url)
          .expect(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBeDefined();
        // Ensure no internal stack traces or database info leaked
        expect(res.body.error.stack).toBeUndefined();
      }
    });

    it('rejects malformed token strings with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', 'Bearer not-a-valid-jwt-token')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects tampered JWT signature with 401', async () => {
      // Craft a token with wrong secret
      const forgedToken = jwt.sign(
        {
          sub: instAUser.id,
          email: instAUser.email,
          role: UserRole.SYSTEM_ADMIN,
        },
        'malicious-attacker-forged-secret-key-32-chars-long',
        { expiresIn: '1h' },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects expired JWT token with 401', async () => {
      const jwtSecret =
        process.env.JWT_SECRET ||
        'dev_synthetic_jwt_signing_secret_min_32_characters_for_local_demo_only';

      const expiredToken = jwt.sign(
        {
          sub: instAUser.id,
          email: instAUser.email,
          role: UserRole.INSTITUTION_USER,
          institutionId: institutionA.id,
        },
        jwtSecret,
        {
          expiresIn: '-10s',
          issuer: 'approvalsync-auth-service',
          audience: 'approvalsync-api',
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects direct developer header bypass when ALLOW_DEV_HEADER_AUTH is not permitted', async () => {
      // Sending developer headers without valid Bearer token
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('X-Dev-User-Id', instAUser.id)
        .set('X-Dev-User-Role', 'INVALID_ROLE')
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. SEC-TENANT: Tenant Isolation & Anti-Enumeration
  // =========================================================================
  describe('2. SEC-TENANT: Multi-Tenant Data Isolation and Anti-Enumeration', () => {
    it('prevents Tenant A from reading Tenant B application (IDOR defense)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/cannot access application/i);
    });

    it('prevents Tenant A from updating Tenant B application', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${appBId}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ academicYear: '2027-2028' })
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant A from submitting Tenant B application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant A from listing documents for Tenant B application', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant A from uploading documents to Tenant B application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', validPdfPath)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from downloading Tenant A document attachment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docAId}/download`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from accessing metadata of Tenant A document', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docAId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from deleting Tenant A document attachment', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/documents/${docAId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from viewing Tenant A audit ledger', async () => {
      // AuditService returns 404 uniformly for cross-tenant / missing to prevent enumeration
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from verifying Tenant A audit chain', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/audit-logs/verify`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents Tenant B from viewing Tenant A SLA timers', async () => {
      // SlaService returns 404 uniformly for cross-tenant to prevent enumeration
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/sla-timers`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });

    it('returns uniform 403 or 404 anti-enumeration responses on random non-existent UUIDs', async () => {
      const randomUuid = '00000000-0000-4000-8000-000000000000';
      const resApp = await request(app.getHttpServer())
        .get(`/api/v1/applications/${randomUuid}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(403);
      expect(resApp.body.success).toBe(false);

      const resAudit = await request(app.getHttpServer())
        .get(`/api/v1/applications/${randomUuid}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(404);
      expect(resAudit.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. SEC-RBAC: Role Enforcement & Privilege Escalation Prevention
  // =========================================================================
  describe('3. SEC-RBAC: Role-Based Access Control and State Invariants', () => {
    it('prevents INSTITUTION_USER from executing regulatory workflow transitions', async () => {
      // First submit App A legitimately to transition it to SUBMITTED
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      // Now attempt self-promotion from SUBMITTED to UNDER_SCRUTINY as an institution user
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
          comment: 'Attempted self-promotion to scrutiny',
        })
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not authorized/i);
    });

    it('prevents SCRUTINY_OFFICER from uploading application documents', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', validPdfPath)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects illegal FSM state transitions (e.g. SUBMITTED -> APPROVED bypass)', async () => {
      // Scrutiny officer attempting to jump directly to APPROVED on a SUBMITTED application
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.APPROVED,
          comment: 'Illegal jump transition',
        })
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid state transition/i);
    });

    it('enforces mandatory human justification comment for regulatory transitions', async () => {
      // Scrutiny officer legitimately starts scrutiny
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        })
        .expect(200);

      // Scrutiny officer attempts issuing deficiency without a comment (requiresComment: true)
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: '', // Missing mandatory comment
        })
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/comment is required/i);
    });
  });

  // =========================================================================
  // 4. SEC-DOC: Document Upload Security, Binary Inspection & Path Traversal
  // =========================================================================
  describe('4. SEC-DOC: File Upload Security & Magic Byte Validation', () => {
    it('rejects Windows PE executable files (.exe / MZ magic bytes)', async () => {
      // Test rejection by file extension (.exe)
      const resExt = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', exePath)
        .expect(400);
      expect(resExt.body.success).toBe(false);
      expect(resExt.body.error.code).toBe('ERR_INVALID_FILE_TYPE');

      // Test rejection by magic bytes when disguised as PDF
      const resMagic = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', exePath, 'forged-executable.pdf')
        .expect(400);
      expect(resMagic.body.success).toBe(false);
      expect(resMagic.body.error.code).toBe('ERR_MALICIOUS_FILE_TYPE');
    });

    it('rejects archive files (.zip / PK magic bytes)', async () => {
      // Test rejection by file extension (.zip)
      const resExt = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', zipPath)
        .expect(400);
      expect(resExt.body.success).toBe(false);
      expect(resExt.body.error.code).toBe('ERR_INVALID_FILE_TYPE');

      // Test rejection by magic bytes when disguised as PDF
      const resMagic = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', zipPath, 'forged-archive.pdf')
        .expect(400);
      expect(resMagic.body.success).toBe(false);
      expect(resMagic.body.error.code).toBe('ERR_MALICIOUS_FILE_TYPE');
    });

    it('rejects MIME-spoofed HTML file masked as PDF', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', spoofedHtmlPath)
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_FILE_SIGNATURE');
    });

    it('rejects zero-byte empty uploads', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'LAND_TITLE_DEED')
        .attach('file', Buffer.alloc(0), 'empty.pdf')
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_EMPTY_FILE');
    });

    it('sanitizes dangerous path traversal sequences in filenames', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .field('documentType', 'BUILDING_PLAN')
        .attach('file', validPdfPath, '../../../../etc/passwd.pdf')
        .expect(201);

      expect(res.body.success).toBe(true);
      // Sanitized fileName must not contain path traversal dots or slashes
      expect(res.body.data.fileName).not.toContain('..');
      expect(res.body.data.fileName).not.toContain('/');
      expect(res.body.data.fileName).not.toContain('\\');
    });
  });

  // =========================================================================
  // 5. SEC-INJECT: Payload Sanitization & Server-Managed Key Injection (SEC-01)
  // =========================================================================
  describe('5. SEC-INJECT: Server-Managed Key & Prototype Pollution Stripping', () => {
    it('strips client-injected dossierReport, documentValidation, and status from draft creation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'MANAGEMENT',
          payloadJsonb: {
            validField: 'legitimate data',
            facultyCount: 15,
            status: 'APPROVED', // Injected status
            dossierReport: { status: 'CLEARED', forged: true }, // Injected verification cache
            documentValidation: { status: 'PASSED', forged: true },
            complianceAssessment: { ruleSetCode: 'FORGED_RULES' },
            __proto__: { isAdmin: true },
          },
        })
        .expect(201);

      const createdApp = res.body.data;
      expect(createdApp.status).toBe(ApplicationStatus.DRAFT); // Server sets status, not payload
      expect(createdApp.payloadJsonb.validField).toBe('legitimate data');
      expect(createdApp.payloadJsonb.facultyCount).toBe(15);
      expect(createdApp.payloadJsonb.status).toBeUndefined();
      expect(createdApp.payloadJsonb.dossierReport).toBeUndefined();
      expect(createdApp.payloadJsonb.documentValidation).toBeUndefined();
      expect(createdApp.payloadJsonb.complianceAssessment).toBeUndefined();
    });

    it('strips client-injected server-managed keys from draft update (PATCH)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${appBId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({
          payloadJsonb: {
            additionalNote: 'Updated safely',
            dossierReport: { status: 'CLEARED', summary: 'Hacked' },
            slaTimers: { deadline: 'infinite' },
            audit: { bypassed: true },
          },
        })
        .expect(200);

      const updatedPayload = res.body.data.payloadJsonb;
      expect(updatedPayload.additionalNote).toBe('Updated safely');
      expect(updatedPayload.dossierReport).toBeUndefined();
      expect(updatedPayload.slaTimers).toBeUndefined();
      expect(updatedPayload.audit).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. SEC-HEADERS: Global Defensive HTTP Security Headers (SEC-03)
  // =========================================================================
  describe('6. SEC-HEADERS: Information Disclosure & Defensive HTTP Headers', () => {
    it('sets protective security headers and strips X-Powered-By on API responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
      expect(res.headers['content-security-policy']).toBe(
        "default-src 'none'; frame-ancestors 'none'",
      );
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. SEC-AUDIT: Cryptographic Audit Integrity & Immutability Triggers
  // =========================================================================
  describe('7. SEC-AUDIT: Cryptographic Audit Chain & Immutability', () => {
    it('verifies that an uncorrupted audit chain returns isChainValid: true', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/audit-logs/verify`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isChainValid).toBe(true);
      expect(res.body.data.totalBlocksVerified).toBeGreaterThan(0);
      expect(res.body.data.merkleRootHash).toBeDefined();
    });

    it('enforces database trigger immutability: rejects direct UPDATE or DELETE on audit_logs', async () => {
      const auditRepo = dataSource.getRepository(AuditLog);
      const logEntry = await auditRepo.findOne({
        where: { applicationId: appAId },
      });

      expect(logEntry).toBeDefined();

      // Attempt direct row update on immutable audit table
      await expect(
        dataSource.query(
          `UPDATE audit_logs SET current_hash = 'tampered_hash_value' WHERE sequence_number = ${logEntry!.sequenceNumber}`,
        ),
      ).rejects.toThrow(/immutable and cannot be updated or deleted/i);

      // Attempt direct row delete on immutable audit table
      await expect(
        dataSource.query(
          `DELETE FROM audit_logs WHERE sequence_number = ${logEntry!.sequenceNumber}`,
        ),
      ).rejects.toThrow(/immutable and cannot be updated or deleted/i);
    });
  });

  // =========================================================================
  // 8. SEC-ADVISORY: AI & Automated Verification Advisory Authority
  // =========================================================================
  describe('8. SEC-ADVISORY: Truthful Advisory Flag & Human Authority Boundary', () => {
    it('preserves isAdvisory: true and simulation indicators during automated dossier and issuer verification', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/dossier-report`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isAdvisory).toBe(true);
      expect(res.body.data.disclaimer).toMatch(/advisory/i);

      // Verify simulated provider adapter truthfully declares isSimulated: true
      const issuerRes = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docAId}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(issuerRes.body.success).toBe(true);
      expect(issuerRes.body.data.isSimulated).toBe(true);
      expect(issuerRes.body.data.sourceId).toBe('SIMULATED_ISSUER_ADAPTER');
      expect(issuerRes.body.data.limitations).toBeDefined();
    });

    it('confirms automated verification alone does not transition application to terminal APPROVED', async () => {
      const appRepo = dataSource.getRepository(Application);
      const app = await appRepo.findOne({ where: { id: appAId } });

      // After automated verification, statutory status remains with human reviewer workflow
      expect(app!.status).not.toBe(ApplicationStatus.APPROVED);
      expect(app!.status).not.toBe(ApplicationStatus.REJECTED);
    });
  });
});
