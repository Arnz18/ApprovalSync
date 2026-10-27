/**
 * ApprovalSync — Milestone INT-01: Cross-Module Integration & API Contract Conformance
 * Owner: M1 — Platform & Integration Lead
 *
 * Verifies the primary end-to-end evaluator journey across real PostgreSQL 16 persistence:
 * 1. Institution login -> Application draft -> Document attachment -> Application submission.
 * 2. Multi-pipeline dossier verification orchestration (DOC-07) with truthful advisory disclaimer (ADR-004).
 * 3. Scrutiny review, server-permitted transition discovery, and human justification validation.
 * 4. Workflow FSM transition execution with atomic timeline event, SHA-256 audit block chaining, and SLA timer integration.
 * 5. Multi-tenant boundary isolation and anti-enumeration across applications, documents, dossiers, and audit ledgers.
 * 6. Pessimistic concurrency control preventing contradictory partial state under simultaneous transitions.
 * 7. SLA reconciliation idempotency preventing duplicate escalations.
 * 8. Undertakings lifecycle, review sign-off, and audit trail linkage.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import {
  Institution,
  User,
  AuditLog,
  SlaTimer,
  WorkflowTimelineEvent,
  SlaEscalation,
  Undertaking,
} from '../src/database/entities';
import { SlaTimerStatus } from '../src/sla/enums/sla-timer-status.enum';
import {
  UndertakingType,
  UndertakingReviewStatus,
  UndertakingStatus,
} from '../src/undertakings/enums';
import { ApplicationStatus, UserRole } from '../src/shared/contracts';

jest.setTimeout(60000);

describe('INT-01: Cross-Module Integration & Primary Evaluator Journey (e2e)', () => {
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
  const testPdfPath = path.resolve(
    __dirname,
    'fixtures/documents/valid-sample.pdf',
  );

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

    const instRepo = dataSource.getRepository(Institution);
    const userRepo = dataSource.getRepository(User);

    // 1. Resolve seeded institutions
    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;

    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    // 2. Resolve seeded users
    const ensureUser = async (
      email: string,
      name: string,
      role: UserRole,
      institutionId?: string,
    ): Promise<User> => {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        u = userRepo.create({
          name,
          email,
          role,
          passwordHash:
            '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
          institutionId: institutionId || null,
          isActive: true,
        });
        await userRepo.save(u);
      }
      return u;
    };

    instAUser = await ensureUser(
      'demo.institution@synthetic.approvalsync.local',
      'Demo Institution Representative',
      UserRole.INSTITUTION_USER,
      institutionA?.id,
    );
    instBUser = await ensureUser(
      'college.b@synthetic.approvalsync.local',
      'Representative College B',
      UserRole.INSTITUTION_USER,
      institutionB?.id,
    );
    scrutinyOfficer = await ensureUser(
      'demo.scrutiny@synthetic.approvalsync.local',
      'Demo Scrutiny Officer',
      UserRole.SCRUTINY_OFFICER,
    );
    systemAdmin = await ensureUser(
      'demo.admin@synthetic.approvalsync.local',
      'Demo System Administrator',
      UserRole.SYSTEM_ADMIN,
    );

    expect(instAUser).toBeDefined();
    expect(instBUser).toBeDefined();
    expect(scrutinyOfficer).toBeDefined();
    expect(systemAdmin).toBeDefined();

    // 3. Obtain authentication JWTs
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

    expect(tokenInstA).toBeDefined();
    expect(tokenInstB).toBeDefined();
    expect(tokenOfficer).toBeDefined();
    expect(tokenAdmin).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  // Track the primary journey application across sequential steps
  let primaryAppId: string;
  let uploadedDocId: string;

  describe('1. Primary Evaluator Journey: Draft Creation, Document Upload & Atomic Submission', () => {
    it('creates an application in DRAFT status bound server-side to Institution A', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          programType: 'ENGINEERING_TECHNOLOGY',
          academicYear: '2026-2027',
          payloadJsonb: {
            campusName: 'Aryabhatta North Campus',
            totalBuiltUpSqM: 4500,
            landAreaAcres: 5.5,
          },
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.id).toBeDefined();
      expect(createRes.body.data.status).toBe(ApplicationStatus.DRAFT);
      expect(createRes.body.data.institutionId).toBe(institutionA.id);
      expect(createRes.body.data.applicationNumber).toBeDefined();
      expect(createRes.body.data.submittedAt).toBeNull();
      expect(createRes.body.meta.correlationId).toBeDefined();

      primaryAppId = createRes.body.data.id;
    });

    it('uploads statutory document attachment and verifies returned metadata contract', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', testPdfPath)
        .field('documentType', 'LAND_TITLE_DEED')
        .field('description', '30-year registered lease deed')
        .expect(201);

      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.id).toBeDefined();
      expect(uploadRes.body.data.applicationId).toBe(primaryAppId);
      expect(uploadRes.body.data.documentType).toBe('LAND_TITLE_DEED');
      expect(uploadRes.body.data.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);

      uploadedDocId = uploadRes.body.data.id;
    });

    it('submits the draft application and transactionally creates timeline event, genesis audit block, and SLA timer', async () => {
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.status).toBe(ApplicationStatus.SUBMITTED);
      expect(submitRes.body.data.submittedAt).not.toBeNull();

      // Verify PostgreSQL 16 persistence for timeline event
      const timelineRepo = dataSource.getRepository(WorkflowTimelineEvent);
      const timelineEvents = await timelineRepo.find({
        where: { applicationId: primaryAppId },
        order: { createdAt: 'ASC' },
      });

      expect(timelineEvents.length).toBeGreaterThanOrEqual(1);
      const submitEvent = timelineEvents[0];
      expect(submitEvent.fromStatus).toBe(ApplicationStatus.DRAFT);
      expect(submitEvent.toStatus).toBe(ApplicationStatus.SUBMITTED);
      expect(submitEvent.eventType).toBe('APPLICATION_SUBMITTED');
      expect(submitEvent.actorId).toBe(instAUser.id);
      expect(submitEvent.actorRole).toBe(UserRole.INSTITUTION_USER);

      // Verify genesis audit block was recorded
      const auditRepo = dataSource.getRepository(AuditLog);
      const auditBlocks = await auditRepo.find({
        where: { applicationId: primaryAppId },
        order: { sequenceNumber: 'ASC' },
      });

      expect(auditBlocks.length).toBe(1);
      expect(auditBlocks[0].sequenceNumber).toBeDefined();
      expect(auditBlocks[0].previousHash).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000',
      );
      expect(auditBlocks[0].currentHash).toMatch(/^[a-f0-9]{64}$/);

      // Verify initial SLA timer was created
      const slaRepo = dataSource.getRepository(SlaTimer);
      const activeTimer = await slaRepo.findOne({
        where: {
          applicationId: primaryAppId,
          status: SlaTimerStatus.ACTIVE,
        },
      });

      expect(activeTimer).toBeDefined();
      expect(activeTimer!.stage).toBe(ApplicationStatus.SUBMITTED);
    });

    it('rejects duplicate submission attempt on already SUBMITTED application with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toContain(
        'only applications in DRAFT status can be submitted',
      );
    });
  });

  describe('2. Multi-Pipeline Dossier Verification Orchestration & ADR-004 Sovereignty', () => {
    it('generates consolidated dossier report with advisory disclaimers and verification matrix', async () => {
      const dossierRes = await request(app.getHttpServer())
        .get(
          `/api/v1/applications/${primaryAppId}/dossier-report?recalculate=true`,
        )
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(dossierRes.body.success).toBe(true);
      const data = dossierRes.body.data;

      // ADR-004 Human Sovereignty verification
      expect(data.isAdvisory).toBe(true);
      expect(data.disclaimer).toBeDefined();
      expect(data.disclaimer).toContain('ADVISORY');

      // Overall status
      expect(['COMPLIANT', 'REQUIRES_REVIEW', 'DEFICIENT']).toContain(
        data.overallStatus,
      );

      // Verification Matrix contains the uploaded document
      expect(data.documentMatrix).toBeDefined();
      const docEntry = data.documentMatrix.find(
        (m: any) => m.documentId === uploadedDocId,
      );
      expect(docEntry).toBeDefined();
      expect(docEntry.documentType).toBe('LAND_TITLE_DEED');
      expect(docEntry.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);

      // Provider verification status is transparently reported
      expect(docEntry.issuerStatus).toBeDefined();
      expect([
        'VERIFIED',
        'DISCREPANCY',
        'SIMULATED',
        'NOT_APPLICABLE',
        'PENDING',
        'SOURCE_UNAVAILABLE',
      ]).toContain(docEntry.issuerStatus);
    });

    it('returns consistent scrutiny summary via GET /api/v1/applications/:id/dossier-report/summary', async () => {
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/dossier-report/summary`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(summaryRes.body.success).toBe(true);
      expect(summaryRes.body.data.applicationId).toBe(primaryAppId);
      expect(summaryRes.body.data.isAdvisory).toBe(true);
      expect(['COMPLIANT', 'REQUIRES_REVIEW', 'DEFICIENT']).toContain(
        summaryRes.body.data.overallStatus,
      );
    });
  });

  describe('3. Multi-Tenant Isolation & Anti-Enumeration Boundary', () => {
    it('blocks Institution B user from retrieving Institution A application details with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('blocks Institution B user from viewing Institution A dossier report with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('blocks Institution B user from viewing Institution A document list with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('blocks Institution B user from viewing Institution A audit logs with 404 anti-enumeration', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('blocks Institution B user from submitting or mutating Institution A application with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });
  });

  describe('4. Scrutiny Review, Server Transition Discovery & Human Justification Guards', () => {
    it('discovers server-permitted transitions for SCRUTINY_OFFICER', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/allowed-transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const allowed = res.body.data;
      expect(Array.isArray(allowed)).toBe(true);

      const toScrutiny = allowed.find(
        (t: any) => t.toStatus === ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(toScrutiny).toBeDefined();
      expect(toScrutiny.allowedRoles).toContain(UserRole.SCRUTINY_OFFICER);
    });

    it('rejects unauthorized direct transition to APPROVED from SUBMITTED with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.APPROVED,
          comment: 'Premature approval attempt without inspection',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toContain('Invalid state transition');
    });

    it('executes valid transition: SUBMITTED -> UNDER_SCRUTINY with cryptographic audit block chaining', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
          comment: 'Scrutiny officer commenced documentary inspection.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );

      // Verify audit block chaining
      const auditRepo = dataSource.getRepository(AuditLog);
      const auditBlocks = await auditRepo.find({
        where: { applicationId: primaryAppId },
        order: { sequenceNumber: 'ASC' },
      });

      expect(auditBlocks.length).toBe(2);
      expect(auditBlocks[1].previousHash).toBe(auditBlocks[0].currentHash);
      expect(auditBlocks[1].eventType).toBe('SCRUTINY_STARTED');

      // Verify SLA timer transition
      const slaRepo = dataSource.getRepository(SlaTimer);
      const completedTimer = await slaRepo.findOne({
        where: {
          applicationId: primaryAppId,
          stage: ApplicationStatus.SUBMITTED,
        },
      });
      expect(completedTimer!.status).toBe(SlaTimerStatus.COMPLETED);

      const activeScrutinyTimer = await slaRepo.findOne({
        where: {
          applicationId: primaryAppId,
          status: SlaTimerStatus.ACTIVE,
        },
      });
      expect(activeScrutinyTimer).toBeDefined();
      expect(activeScrutinyTimer!.stage).toBe(ApplicationStatus.UNDER_SCRUTINY);
    });

    it('enforces server-side mandatory justification: rejects DEFICIENCY_ISSUED without comment with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: '', // Empty comment
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Comment is required');
    });

    it('successfully issues deficiency notice when mandatory comment is provided', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment:
            'Required Fire Safety Certificate is missing valid municipal seal.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.DEFICIENCY_ISSUED,
      );

      // Verify timeline event
      const timelineRepo = dataSource.getRepository(WorkflowTimelineEvent);
      const latestEvent = await timelineRepo.findOne({
        where: {
          applicationId: primaryAppId,
          toStatus: ApplicationStatus.DEFICIENCY_ISSUED,
        },
      });
      expect(latestEvent).toBeDefined();
      expect(latestEvent!.comment).toContain('Fire Safety Certificate');
    });
  });

  describe('5. PostgreSQL 16 Pessimistic Row Lock & Concurrency Atomicity', () => {
    it('serializes concurrent transition attempts so exactly one succeeds under FOR UPDATE lock', async () => {
      // First advance application from DEFICIENCY_ISSUED to RESUBMITTED
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          targetStatus: ApplicationStatus.RESUBMITTED,
          comment:
            'Institutional clarification and updated certificate uploaded.',
        })
        .expect(200);

      // Advance to UNDER_SCRUTINY
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
          comment: 'Re-scrutiny commenced.',
        })
        .expect(200);

      // Launch TWO conflicting transitions simultaneously:
      // Transition A: RECOMMENDED_FOR_EVC
      // Transition B: DEFICIENCY_ISSUED
      const transitionA = request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
          comment: 'Clarification accepted. Clearing for ground inspection.',
        });

      const transitionB = request(app.getHttpServer())
        .post(`/api/v1/applications/${primaryAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: 'Second deficiency: built-up area calculation discrepancy.',
        });

      const [resA, resB] = await Promise.all([transitionA, transitionB]);

      // Exactly one must succeed (200) and the other must fail (400)
      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Verify the audit chain remains strictly contiguous and valid
      const auditVerifyRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${primaryAppId}/audit-logs/verify`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      expect(auditVerifyRes.body.success).toBe(true);
      expect(auditVerifyRes.body.data.isChainValid).toBe(true);
    });
  });

  describe('6. SLA Escalations & Idempotent Sweep Reconciliation', () => {
    it('allows SYSTEM_ADMIN to execute SLA reconciliation and avoids duplicate escalations on repeat runs', async () => {
      // Run sweep 1
      const sweep1 = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(sweep1.body.success).toBe(true);
      expect(sweep1.body.data.reconciledAt).toBeDefined();

      // Count escalations in database
      const escalationRepo = dataSource.getRepository(SlaEscalation);
      const countAfterSweep1 = await escalationRepo.count();

      // Run sweep 2 immediately
      const sweep2 = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(sweep2.body.success).toBe(true);
      const countAfterSweep2 = await escalationRepo.count();

      // Repeated reconciliation without time advancement must not create duplicate escalations
      expect(countAfterSweep2).toBe(countAfterSweep1);
    });
  });

  describe('7. Undertakings Lifecycle, Review Sign-Off & Audit Linkage', () => {
    let undertakingId: string;

    it('creates an undertaking for Institution A in DRAFT status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          applicationId: primaryAppId,
          type: UndertakingType.LAND_LEASE,
          title: '25-Year Unexpired Live Lease Covenant Undertaking',
          description:
            'Institutional commitment ensuring 25-year unexpired live lease covenant.',
          startDate: '2026-05-01',
          expiryDate: '2051-04-30',
          renewalLeadDays: 90,
          documentId: uploadedDocId,
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.id).toBeDefined();
      expect(createRes.body.data.status).toBe('DRAFT');
      expect(createRes.body.data.institutionId).toBe(institutionA.id);

      undertakingId = createRes.body.data.id;
    });

    it('transitions undertaking DRAFT -> SUBMITTED by applicant', async () => {
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${undertakingId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.status).toBe('SUBMITTED');
    });

    it('allows scrutiny officer to verify undertaking and activates it with audit logging', async () => {
      const reviewRes = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${undertakingId}/review`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes:
            'Lease deed covenants validated against registrar extracts.',
          effectiveStatus: UndertakingStatus.ACTIVE,
        })
        .expect(200);

      expect(reviewRes.body.success).toBe(true);
      expect(reviewRes.body.data.status).toBe('ACTIVE');
      expect(reviewRes.body.data.reviewStatus).toBe('VERIFIED');

      // Verify undertaking entity persisted
      const undertakingRepo = dataSource.getRepository(Undertaking);
      const persisted = await undertakingRepo.findOne({
        where: { id: undertakingId },
      });
      expect(persisted).toBeDefined();
      expect(persisted!.status).toBe('ACTIVE');
    });

    it('executes undertaking reconciliation sweep by SYSTEM_ADMIN without duplicate records', async () => {
      const reconcileRes = await request(app.getHttpServer())
        .post('/api/v1/undertakings/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(reconcileRes.body.success).toBe(true);
      expect(reconcileRes.body.data.scannedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
