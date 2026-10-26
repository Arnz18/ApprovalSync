/**
 * ApprovalSync — Durable SLA Timers & Escalation Engine E2E Tests
 * Milestone: BE-08
 *
 * Exercises SLA timer creation upon application submission, stage transition lifecycle,
 * authorized pause/resume with deadline extensions, deterministic clock calculations,
 * warning and breach escalation triggers, database-authoritative reconciliation sweeps,
 * unique idempotency key enforcement, tenant isolation, and RBAC against live PostgreSQL 16.
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
import { SlaTimer } from '../src/database/entities/sla-timer.entity';
import { SlaEscalation } from '../src/sla/entities/sla-escalation.entity';
import { SlaTimerStatus } from '../src/sla/enums/sla-timer-status.enum';
import { SlaEscalationLevel } from '../src/sla/enums/sla-escalation-level.enum';
import { SlaClockService } from '../src/sla/clock/sla-clock.service';
import { UserRole, ApplicationStatus, SlaTier } from '../src/shared/contracts';
import { ILLUSTRATIVE_DISCLAIMER } from '../src/sla/policies/sla-policies.config';

describe('Durable SLA Timers & Escalation Engine (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let clock: SlaClockService;

  let tokenInstitutionA: string;
  let tokenInstitutionB: string;
  let tokenScrutiny: string;
  let tokenAuditor: string;
  let tokenAdmin: string;
  let tokenBureauHead: string;

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
    clock = app.get(SlaClockService);

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
    await ensureUser(
      'sysadmin@synthetic.approvalsync.local',
      'System Admin User',
      UserRole.SYSTEM_ADMIN,
    );
    await ensureUser(
      'bureau.head@synthetic.approvalsync.local',
      'Bureau Head Director',
      UserRole.BUREAU_HEAD,
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
    tokenAdmin = await login('sysadmin@synthetic.approvalsync.local');
    tokenBureauHead = await login('bureau.head@synthetic.approvalsync.local');
  });

  afterAll(async () => {
    if (clock) {
      clock.reset();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Unauthenticated & Authorization Guards', () => {
    const dummyId = '00000000-0000-0000-0000-000000000001';

    it('rejects unauthenticated GET /api/v1/applications/:id/sla-timers with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${dummyId}/sla-timers`)
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated GET /api/v1/applications/:id/sla-timers/active with 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${dummyId}/sla-timers/active`)
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated POST /api/v1/applications/:id/sla-timers/pause with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${dummyId}/sla-timers/pause`)
        .send({ reason: 'Waiting for state nod' })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated POST /api/v1/applications/:id/sla-timers/resume with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${dummyId}/sla-timers/resume`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated GET /api/v1/sla/escalations with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sla/escalations')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated POST /api/v1/sla/reconcile with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Configured SLA Policies Listing', () => {
    it('returns all configured SLA policies with illustrative demo disclaimers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sla/policies')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);

      for (const policy of res.body.data) {
        expect(policy.disclaimer).toBe(ILLUSTRATIVE_DISCLAIMER);
        expect(policy.classification).toBe('ILLUSTRATIVE_DEMO');
        expect(policy.id).toBeDefined();
        expect(policy.stage).toBeDefined();
        expect(policy.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('3. Tenant Isolation & Anti-Enumeration (IDOR Defense)', () => {
    let appBId: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Engineering & Technology',
          payloadJsonb: { testField: 'SLA-B' },
        })
        .expect(201);
      appBId = createRes.body.data.id;
    });

    it('returns 404 when Institution A user requests SLA timers of Institution B application', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/sla-timers`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('returns 404 when Institution A user requests active SLA timer of Institution B application', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}/sla-timers/active`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 on nonexistent application UUID for INSTITUTION_USER', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${fakeId}/sla-timers`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('4. Full SLA Timer Lifecycle: Intake, Pause, Resume, Transitions, and Terminal Stop', () => {
    let appAId: string;

    beforeAll(async () => {
      const fixedStartTime = new Date('2026-10-10T10:00:00.000Z');
      clock.setTime(fixedStartTime);

      // Create draft application for Institution A
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Engineering & Technology',
          payloadJsonb: { campusArea: 5 },
        })
        .expect(201);
      appAId = createRes.body.data.id;
    });

    it('creates an ACTIVE SLA timer on SUBMITTED transition via submit draft endpoint', async () => {
      // Submit draft application
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(submitRes.body.data.status).toBe(ApplicationStatus.SUBMITTED);

      // Verify active SLA timer created
      const activeRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/sla-timers/active`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(activeRes.body.success).toBe(true);
      expect(activeRes.body.data).toBeDefined();
      const timer = activeRes.body.data;
      expect(timer.stage).toBe(ApplicationStatus.SUBMITTED);
      expect(timer.status).toBe(SlaTimerStatus.ACTIVE);
      expect(timer.tier).toBe(SlaTier.TIER_1_RO_ALERT);
      expect(timer.isWarningSent).toBe(false);
      expect(timer.isBreached).toBe(false);
      expect(timer.totalPausedMs).toBe(0);

      // Verify deadlines: 7 days target, 5.25 days warning
      const target = new Date(timer.targetDeadline);
      const warning = new Date(timer.warningDeadline);
      const start = new Date(timer.startedAt);
      expect(target.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
      expect(warning.getTime() - start.getTime()).toBe(
        5.25 * 24 * 60 * 60 * 1000,
      );
    });

    it('rejects timer pause attempt by INSTITUTION_USER with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/pause`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({ reason: 'Waiting for state revenue survey report' })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects pause without mandatory justification reason (<5 chars) with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/pause`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ reason: 'abc' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });

    it('rejects pause on SUBMITTED stage timer because SLA_SUBMITTED_TO_SCRUTINY policy has canPause=false', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/pause`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ reason: 'Awaiting revenue department clarification' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('does not permit pausing');
    });

    it('transitions application to UNDER_SCRUTINY: completes previous timer and starts new pausable timer', async () => {
      const transRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          targetStatus: ApplicationStatus.UNDER_SCRUTINY,
          comment: 'Starting scrutiny evaluation of documents',
        })
        .expect(200);

      expect(transRes.body.data.currentStatus).toBe(
        ApplicationStatus.UNDER_SCRUTINY,
      );

      // Verify timers in database
      const timersRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/sla-timers`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(200);

      expect(timersRes.body.data.data).toHaveLength(2);
      const completedTimer = timersRes.body.data.data.find(
        (t: any) => t.stage === ApplicationStatus.SUBMITTED,
      );
      const newActiveTimer = timersRes.body.data.data.find(
        (t: any) => t.stage === ApplicationStatus.UNDER_SCRUTINY,
      );

      expect(completedTimer.status).toBe(SlaTimerStatus.COMPLETED);
      expect(completedTimer.completedAt).toBeDefined();

      expect(newActiveTimer.status).toBe(SlaTimerStatus.ACTIVE);
      expect(newActiveTimer.policyId).toBe('SLA_UNDER_SCRUTINY_EVALUATION');
    });

    it('pauses the active UNDER_SCRUTINY timer with valid reason by Scrutiny Officer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/pause`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ reason: 'Pending state land revenue NOC verification' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SlaTimerStatus.PAUSED);
      expect(res.body.data.pauseReason).toBe(
        'Pending state land revenue NOC verification',
      );
      expect(res.body.data.pausedAt).toBeDefined();
    });

    it('rejects subsequent pause on already paused timer with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/pause`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({ reason: 'Attempting second pause' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already paused');
    });

    it('resumes the paused timer and shifts targetDeadline forward by elapsed pause duration', async () => {
      const timerBefore = (
        await request(app.getHttpServer())
          .get(`/api/v1/applications/${appAId}/sla-timers/active`)
          .set('Authorization', `Bearer ${tokenScrutiny}`)
      ).body.data;

      const originalTarget = new Date(timerBefore.targetDeadline).getTime();

      // Advance clock by 3 days while timer is paused
      clock.advanceMs(3 * 24 * 60 * 60 * 1000);

      const resumeRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/sla-timers/resume`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(200);

      expect(resumeRes.body.success).toBe(true);
      expect(resumeRes.body.data.status).toBe(SlaTimerStatus.ACTIVE);
      expect(resumeRes.body.data.pausedAt).toBeNull();
      expect(resumeRes.body.data.totalPausedMs).toBe(3 * 24 * 60 * 60 * 1000);

      const newTarget = new Date(resumeRes.body.data.targetDeadline).getTime();
      expect(newTarget - originalTarget).toBe(3 * 24 * 60 * 60 * 1000);
    });

    it('stops and marks active timer CANCELLED when reaching terminal status REJECTED', async () => {
      // Transition from UNDER_SCRUTINY directly to REJECTED by Bureau Head
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appAId}/transitions`)
        .set('Authorization', `Bearer ${tokenBureauHead}`)
        .send({
          targetStatus: ApplicationStatus.REJECTED,
          comment:
            'Irremediable documentary violations identified during scrutiny',
        })
        .expect(200);

      // Active timer query should now return null
      const activeRes = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}/sla-timers/active`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(200);

      expect(activeRes.body.data).toBeNull();

      // The last timer for UNDER_SCRUTINY should have status CANCELLED
      const allTimers = (
        await request(app.getHttpServer())
          .get(`/api/v1/applications/${appAId}/sla-timers`)
          .set('Authorization', `Bearer ${tokenScrutiny}`)
      ).body.data.data;

      const scrutinyTimer = allTimers.find(
        (t: any) => t.stage === ApplicationStatus.UNDER_SCRUTINY,
      );
      expect(scrutinyTimer.status).toBe(SlaTimerStatus.CANCELLED);
      expect(scrutinyTimer.cancelledAt).toBeDefined();
    });
  });

  describe('5. Escalation Engine, Warning Thresholds, Breaches, and Idempotent Reconciliation', () => {
    let testAppId: string;
    let timerRecord: SlaTimer;

    beforeAll(async () => {
      const testTime = new Date('2026-11-01T08:00:00.000Z');
      clock.setTime(testTime);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Engineering & Technology',
          payloadJsonb: { escalationTest: true },
        })
        .expect(201);
      testAppId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${testAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      const timerRepo = dataSource.getRepository(SlaTimer);
      timerRecord = (await timerRepo.findOne({
        where: { applicationId: testAppId, status: SlaTimerStatus.ACTIVE },
      }))!;
      expect(timerRecord).toBeDefined();
    });

    it('rejects non-SYSTEM_ADMIN from triggering POST /api/v1/sla/reconcile with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('emits WARNING escalation when clock advances past warning deadline (5.25 days)', async () => {
      // Advance clock by 6 days (past warning deadline of 5.25 days, but before target 7 days)
      clock.advanceMs(6 * 24 * 60 * 60 * 1000);

      const reconcileRes = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(reconcileRes.body.success).toBe(true);
      expect(reconcileRes.body.data.warningsEmitted).toBeGreaterThanOrEqual(1);

      // Verify escalation record in DB
      const escRepo = dataSource.getRepository(SlaEscalation);
      const escalation = await escRepo.findOne({
        where: {
          timerId: timerRecord.id,
          escalationLevel: SlaEscalationLevel.WARNING,
        },
      });
      expect(escalation).toBeDefined();
      expect(escalation?.idempotencyKey).toBe(
        `sla-esc:${timerRecord.id}:${timerRecord.tier}:WARNING`,
      );
      expect(escalation?.targetRole).toBe(UserRole.REGIONAL_OFFICER);
    });

    it('reconciliation is strictly idempotent: subsequent run emits 0 duplicate warnings', async () => {
      const reconcileRes = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(reconcileRes.body.success).toBe(true);
      expect(reconcileRes.body.data.warningsEmitted).toBe(0);

      const escRepo = dataSource.getRepository(SlaEscalation);
      const count = await escRepo.count({
        where: {
          timerId: timerRecord.id,
          escalationLevel: SlaEscalationLevel.WARNING,
        },
      });
      expect(count).toBe(1);
    });

    it('emits BREACH escalation when clock advances past target deadline (7 days)', async () => {
      // Advance clock by another 2 days (total 8 days, past target deadline of 7 days)
      clock.advanceMs(2 * 24 * 60 * 60 * 1000);

      const reconcileRes = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(reconcileRes.body.success).toBe(true);
      expect(reconcileRes.body.data.breachesEmitted).toBeGreaterThanOrEqual(1);

      // Verify timer is updated to BREACHED
      const timerRepo = dataSource.getRepository(SlaTimer);
      const updatedTimer = await timerRepo.findOne({
        where: { id: timerRecord.id },
      });
      expect(updatedTimer?.status).toBe(SlaTimerStatus.BREACHED);
      expect(updatedTimer?.isBreached).toBe(true);
      expect(updatedTimer?.escalatedAt).toBeDefined();

      // Verify breach escalation in DB
      const escRepo = dataSource.getRepository(SlaEscalation);
      const breachEsc = await escRepo.findOne({
        where: {
          timerId: timerRecord.id,
          escalationLevel: SlaEscalationLevel.BREACH,
        },
      });
      expect(breachEsc).toBeDefined();
      expect(breachEsc?.idempotencyKey).toBe(
        `sla-esc:${timerRecord.id}:${timerRecord.tier}:BREACH`,
      );
      expect(breachEsc?.targetRole).toBe(UserRole.BUREAU_HEAD);
    });

    it('subsequent run after breach emits 0 duplicate breaches', async () => {
      const reconcileRes = await request(app.getHttpServer())
        .post('/api/v1/sla/reconcile')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(reconcileRes.body.success).toBe(true);
      expect(reconcileRes.body.data.breachesEmitted).toBe(0);
    });

    it('allows AUDITOR to view escalation logs via GET /api/v1/sla/escalations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sla/escalations')
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);

      const levels = res.body.data.data.map((e: any) => e.escalationLevel);
      expect(levels).toContain(SlaEscalationLevel.WARNING);
      expect(levels).toContain(SlaEscalationLevel.BREACH);
    });

    it('rejects INSTITUTION_USER from viewing escalation logs with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sla/escalations')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });
  });
});
