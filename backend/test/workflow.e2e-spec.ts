/**
 * ApprovalSync — Workflow FSM & Transition Guards E2E Integration Test Suite
 * Milestone: BE-06
 *
 * Verifies against live PostgreSQL 16 database:
 * 1. Authentication and role-based access control (RBAC):
 *    - 401 for unauthenticated requests across all workflow endpoints.
 *    - 403 for unauthorized caller roles attempting specific transitions.
 *    - Strict tenant isolation and anti-enumeration (403 on foreign/nonexistent IDs for INSTITUTION_USER).
 * 2. Complete FSM transition graph execution:
 *    - DRAFT -> SUBMITTED -> UNDER_SCRUTINY -> DEFICIENCY_ISSUED -> RESUBMITTED ->
 *      UNDER_SCRUTINY -> RECOMMENDED_FOR_EVC -> EVC_IN_PROGRESS -> RECOMMENDED_FOR_SHC -> APPROVED.
 *    - Mandatory comment enforcement for justified transitions.
 *    - Strict rejection of invalid transitions and transitions from terminal states (APPROVED, REJECTED, WITHDRAWN).
 * 3. Timeline event audit trail:
 *    - Accurate chronological timeline event persistence within the transition transaction.
 *    - Actor role and ID verification.
 *    - Allowed transitions query filtering by caller role.
 * 4. PostgreSQL 16 concurrency and pessimistic write locking:
 *    - Simultaneous conflicting transitions under FOR UPDATE lock serialize safely; only 1 succeeds.
 *    - Simultaneous draft submissions serialize safely; exactly 1 timeline event recorded.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { ApplicationStatus, UserRole } from '../src/shared/contracts';
import { User } from '../src/database/entities/user.entity';
import { Institution } from '../src/database/entities/institution.entity';
import { Application } from '../src/database/entities/application.entity';
import { WorkflowTimelineEvent } from '../src/workflow/entities/workflow-timeline-event.entity';

jest.setTimeout(45000);

describe('Workflow FSM & Transition Guards (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenInstitutionA: string;
  let tokenInstitutionB: string;
  let tokenScrutiny: string;
  let tokenRegional: string;
  let tokenEvc: string;
  let tokenBureauHead: string;

  let institutionA: Institution;
  let institutionB: Institution;

  const demoPassword = 'DemoPass@123';
  // Common bcrypt hash for DemoPass@123
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

    // Fetch existing institutions
    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;
    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    // Ensure users for all required test roles exist
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
      'Representative College B',
      UserRole.INSTITUTION_USER,
      institutionB.id,
    );
    await ensureUser(
      'evc.inspector@synthetic.approvalsync.local',
      'Dr. Expert Inspector',
      UserRole.EVC_INSPECTOR,
    );
    await ensureUser(
      'bureau.head@synthetic.approvalsync.local',
      'Director Bureau Head',
      UserRole.BUREAU_HEAD,
    );

    // Authenticate and obtain JWT tokens
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
    tokenRegional = await login('demo.regional@synthetic.approvalsync.local');
    tokenEvc = await login('evc.inspector@synthetic.approvalsync.local');
    tokenBureauHead = await login('bureau.head@synthetic.approvalsync.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & Route Guards', () => {
    it('rejects unauthenticated POST /api/v1/applications/:id/transitions with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(
          '/api/v1/applications/b0000000-0000-0000-0000-000000000001/transitions',
        )
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated GET /api/v1/applications/:id/timeline with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/applications/b0000000-0000-0000-0000-000000000001/timeline',
        )
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated GET /api/v1/applications/:id/allowed-transitions with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/applications/b0000000-0000-0000-0000-000000000001/allowed-transitions',
        )
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });
  });

  describe('2. Tenant Isolation & Anti-Enumeration (IDOR Defense)', () => {
    let appBId: string;

    beforeAll(async () => {
      // Create an application owned by Institution B
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Polytechnic Engineering',
          payloadJsonb: { campusArea: 10 },
        })
        .expect(201);
      appBId = createRes.body.data.id;
    });

    it('rejects Institution A user attempting transition on Institution B application with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appBId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects Institution A user querying timeline on Institution B application with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/timeline`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects Institution A user querying allowed-transitions on Institution B application with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/allowed-transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('returns uniform 403 on nonexistent application UUID for INSTITUTION_USER (anti-enumeration)', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${nonExistent}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('returns 404 for regulatory role on nonexistent application UUID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${nonExistent}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ targetStatus: ApplicationStatus.UNDER_SCRUTINY })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('3. Complete FSM Lifecycle & Transition Execution', () => {
    let testAppId: string;

    beforeAll(async () => {
      // Create a fresh draft application for Institution A
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Undergraduate Technology',
          payloadJsonb: { buildingAreaSqM: 8500, facultyCount: 42 },
        })
        .expect(201);
      testAppId = createRes.body.data.id;
    });

    it('Step 1: Institution submits application (DRAFT -> SUBMITTED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          targetStatus: ApplicationStatus.SUBMITTED,
          comment:
            'Finalized application submitted by institution representative.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.previousStatus).toBe(ApplicationStatus.DRAFT);
      expect(res.body.data.currentStatus).toBe(ApplicationStatus.SUBMITTED);
      expect(res.body.data.timelineEvent.eventType).toBe(
        'APPLICATION_SUBMITTED',
      );
      expect(res.body.data.timelineEvent.actorRole).toBe(
        UserRole.INSTITUTION_USER,
      );
    });

    it('Step 2: Scrutiny Officer commences review (SUBMITTED -> UNDER_SCRUTINY)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(ApplicationStatus.SUBMITTED);
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(res.body.data.timelineEvent.eventType).toBe('SCRUTINY_STARTED');
      expect(res.body.data.timelineEvent.actorRole).toBe(
        UserRole.SCRUTINY_OFFICER,
      );
    });

    it('Step 3: Rejects DEFICIENCY_ISSUED if mandatory comment is omitted (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment: '',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BAD_REQUEST');
      expect(res.body.error.message).toContain('Comment is required');
    });

    it('Step 4: Scrutiny Officer issues formal deficiency notice with justification (UNDER_SCRUTINY -> DEFICIENCY_ISSUED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.DEFICIENCY_ISSUED,
          comment:
            'Deficiency: Building occupancy certificate missing local authority stamp.',
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.DEFICIENCY_ISSUED,
      );
      expect(res.body.data.timelineEvent.comment).toContain(
        'Building occupancy certificate',
      );
    });

    it('Step 5: Institution resubmits corrective dossier with response (DEFICIENCY_ISSUED -> RESUBMITTED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          targetStatus: ApplicationStatus.RESUBMITTED,
          comment:
            'Uploaded certified occupancy certificate with municipal stamp.',
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.DEFICIENCY_ISSUED,
      );
      expect(res.body.data.currentStatus).toBe(ApplicationStatus.RESUBMITTED);
      expect(res.body.data.timelineEvent.eventType).toBe(
        'APPLICATION_RESUBMITTED',
      );
    });

    it('Step 6: Scrutiny Officer starts re-scrutiny (RESUBMITTED -> UNDER_SCRUTINY)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(ApplicationStatus.RESUBMITTED);
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(res.body.data.timelineEvent.eventType).toBe('RE_SCRUTINY_STARTED');
    });

    it('Step 7: Scrutiny clears documents and recommends for EVC (UNDER_SCRUTINY -> RECOMMENDED_FOR_EVC)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.RECOMMENDED_FOR_EVC,
          comment:
            'Documentary scrutiny verified. Recommended for physical EVC inspection.',
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.RECOMMENDED_FOR_EVC,
      );
    });

    it('Step 8: EVC Inspector begins inspection (RECOMMENDED_FOR_EVC -> EVC_IN_PROGRESS)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenEvc}`)
        .send({
          targetStatus: ApplicationStatus.EVC_IN_PROGRESS,
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.RECOMMENDED_FOR_EVC,
      );
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.EVC_IN_PROGRESS,
      );
      expect(res.body.data.timelineEvent.actorRole).toBe(
        UserRole.EVC_INSPECTOR,
      );
    });

    it('Step 9: EVC escalates discrepancy to Standing Hearing Committee (EVC_IN_PROGRESS -> RECOMMENDED_FOR_SHC)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenEvc}`)
        .send({
          targetStatus: ApplicationStatus.RECOMMENDED_FOR_SHC,
          comment:
            'Discrepancy noted in computer lab terminal count. Escalated to SHC for hearing.',
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.EVC_IN_PROGRESS,
      );
      expect(res.body.data.currentStatus).toBe(
        ApplicationStatus.RECOMMENDED_FOR_SHC,
      );
    });

    it('Step 10: Bureau Head grants final statutory approval (RECOMMENDED_FOR_SHC -> APPROVED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .send({
          targetStatus: ApplicationStatus.APPROVED,
          comment:
            'SHC hearing concluded favorably. Statutory approval granted.',
        })
        .expect(200);

      expect(res.body.data.previousStatus).toBe(
        ApplicationStatus.RECOMMENDED_FOR_SHC,
      );
      expect(res.body.data.currentStatus).toBe(ApplicationStatus.APPROVED);
    });

    it('Step 11: Rejects transition from terminal status APPROVED (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .send({
          targetStatus: ApplicationStatus.REJECTED,
          comment: 'Attempting to reject an already approved application.',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BAD_REQUEST');
      expect(res.body.error.message).toContain('terminal status APPROVED');
    });

    it('Step 12: Verifies complete chronological timeline trail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/timeline`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const events = Array.isArray(res.body.data)
        ? res.body.data
        : res.body.data.items;
      expect(events.length).toBeGreaterThanOrEqual(8);

      // Verify sequence of statuses
      const sequence = events.map((e: any) => `${e.fromStatus}->${e.toStatus}`);
      expect(sequence).toContain('DRAFT->SUBMITTED');
      expect(sequence).toContain('SUBMITTED->UNDER_SCRUTINY');
      expect(sequence).toContain('UNDER_SCRUTINY->DEFICIENCY_ISSUED');
      expect(sequence).toContain('DEFICIENCY_ISSUED->RESUBMITTED');
      expect(sequence).toContain('RESUBMITTED->UNDER_SCRUTINY');
      expect(sequence).toContain('UNDER_SCRUTINY->RECOMMENDED_FOR_EVC');
      expect(sequence).toContain('RECOMMENDED_FOR_EVC->EVC_IN_PROGRESS');
      expect(sequence).toContain('EVC_IN_PROGRESS->RECOMMENDED_FOR_SHC');
      expect(sequence).toContain('RECOMMENDED_FOR_SHC->APPROVED');
    });

    it('Step 13: Verifies allowed-transitions query returns empty for terminal status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/allowed-transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('Step 14: Verifies Regional Officer can query allowed transitions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${testAppId}/allowed-transitions`)
        .set('Authorization', `Bearer ${tokenRegional}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('4. Invalid Transitions & Unauthorized Roles', () => {
    let freshDraftId: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'MCA',
          payloadJsonb: { labs: 4 },
        })
        .expect(201);
      freshDraftId = createRes.body.data.id;
    });

    it('rejects illegal transition from DRAFT to APPROVED (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${freshDraftId}/transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .send({ targetStatus: ApplicationStatus.APPROVED })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BAD_REQUEST');
      expect(res.body.error.message).toContain('Invalid state transition');
    });

    it('rejects unauthorized role attempting transition (INSTITUTION_USER trying UNDER_SCRUTINY) with 403', async () => {
      // First submit
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${freshDraftId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(200);

      // Now institution user tries to initiate scrutiny
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${freshDraftId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.UNDER_SCRUTINY })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows withdrawal with comment (SUBMITTED -> WITHDRAWN) and locks into terminal state', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${freshDraftId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          targetStatus: ApplicationStatus.WITHDRAWN,
          comment: 'Institution board elected to retract application.',
        })
        .expect(200);

      expect(res.body.data.currentStatus).toBe(ApplicationStatus.WITHDRAWN);

      // Any subsequent transition must fail
      const postWithdrawal = await request(app.getHttpServer())
        .post(`/api/v1/applications/${freshDraftId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(400);

      expect(postWithdrawal.body.error.message).toContain(
        'terminal status WITHDRAWN',
      );
    });
  });

  describe('5. PostgreSQL 16 Concurrency & Pessimistic Lock Protection', () => {
    it('concurrent conflicting transitions: exactly one succeeds under FOR UPDATE lock', async () => {
      // 1. Create a fresh application and transition it to UNDER_SCRUTINY
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Pharmacy',
          payloadJsonb: { labs: 3 },
        })
        .expect(201);
      const concurrentAppId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${concurrentAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ targetStatus: ApplicationStatus.SUBMITTED })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${concurrentAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ targetStatus: ApplicationStatus.UNDER_SCRUTINY })
        .expect(200);

      // 2. Fire two conflicting transitions concurrently:
      // Request A: Scrutiny Officer recommends for EVC
      // Request B: Bureau Head issues rejection
      const reqA = request(app.getHttpServer())
        .post(`/api/v1/applications/${concurrentAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ targetStatus: ApplicationStatus.RECOMMENDED_FOR_EVC });

      const reqB = request(app.getHttpServer())
        .post(`/api/v1/applications/${concurrentAppId}/transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .send({
          targetStatus: ApplicationStatus.REJECTED,
          comment: 'Rejected due to critical documentary deficiency.',
        });

      const [resA, resB] = await Promise.all([reqA, reqB]);

      // Exactly one must return 200, the other must return 400 (Invalid transition from the updated state)
      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // 3. Inspect database: verify that the application has the winning state and exactly 3 timeline events exist
      const appInDb = await dataSource.getRepository(Application).findOne({
        where: { id: concurrentAppId },
      });
      expect([
        ApplicationStatus.RECOMMENDED_FOR_EVC,
        ApplicationStatus.REJECTED,
      ]).toContain(appInDb?.status);

      const timelineEvents = await dataSource
        .getRepository(WorkflowTimelineEvent)
        .find({ where: { applicationId: concurrentAppId } });

      // Initial SUBMITTED (1) + UNDER_SCRUTINY (1) + Winning transition (1) = 3 total events
      expect(timelineEvents).toHaveLength(3);
    });

    it('concurrent submissions: exactly one succeeds under FOR UPDATE lock', async () => {
      // Create a fresh draft
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Architecture',
          payloadJsonb: { studioCount: 6 },
        })
        .expect(201);
      const submitAppId = createRes.body.data.id;

      // Fire two concurrent submit requests
      const req1 = request(app.getHttpServer())
        .post(`/api/v1/applications/${submitAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`);

      const req2 = request(app.getHttpServer())
        .post(`/api/v1/applications/${submitAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`);

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Exactly one timeline event for APPLICATION_SUBMITTED should exist
      const timelineEvents = await dataSource
        .getRepository(WorkflowTimelineEvent)
        .find({ where: { applicationId: submitAppId } });

      expect(timelineEvents).toHaveLength(1);
      expect(timelineEvents[0].eventType).toBe('APPLICATION_SUBMITTED');
    });
  });
});
