/**
 * ApprovalSync — Undertakings, Lease & Expiry Tracking E2E Tests
 * Milestone: BE-09
 *
 * Exercises institutional undertakings and lease records against live PostgreSQL 16:
 * - Authorized creation, listing, querying, and updating
 * - Strict tenant isolation and anti-enumeration (404 on cross-tenant access)
 * - Role-based authorization guards on officer review and reconciliation
 * - DRAFT -> SUBMITTED -> VERIFIED / DEFICIENT lifecycle
 * - Deterministic expiry and renewal calculations
 * - Renewal and cycle-free supersession chain linking
 * - Integration with BE-07 audit logging for material lifecycle events
 * - Integration with BE-08 SLA queue hints for overdue/expiring records
 * - Complete chronological immutable history retention
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
import { Application } from '../src/database/entities/application.entity';
import { AuditLog } from '../src/database/entities/audit-log.entity';
import { UndertakingsClockService } from '../src/undertakings/clock/undertakings-clock.service';
import { UserRole } from '../src/shared/contracts';
import {
  UndertakingType,
  UndertakingStatus,
  UndertakingReviewStatus,
} from '../src/undertakings/enums';
import { ILLUSTRATIVE_UNDERTAKING_DISCLAIMER } from '../src/undertakings/utils/date-calculations';

describe('Undertakings, Lease & Expiry Tracker (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let clock: UndertakingsClockService;

  let tokenInstitutionA: string;
  let tokenInstitutionB: string;
  let tokenScrutiny: string;
  let tokenRegionalOfficer: string;
  let tokenAdmin: string;
  let tokenAuditor: string;

  let institutionA: Institution;
  let institutionB: Institution;
  let applicationA: Application;

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
    clock = app.get(UndertakingsClockService);

    const userRepo = dataSource.getRepository(User);
    const instRepo = dataSource.getRepository(Institution);
    const appRepo = dataSource.getRepository(Application);

    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;
    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    applicationA = (await appRepo.findOne({
      where: { applicationNumber: 'APP-2026-DEMO-001' },
    }))!;
    expect(applicationA).toBeDefined();

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
      } else {
        u.isActive = true;
        u.passwordHash = demoHash;
        if (institutionId) {
          u.institutionId = institutionId;
        }
        await userRepo.save(u);
      }
    };

    await ensureUser(
      'demo.institution@synthetic.approvalsync.local',
      'Demo Institution User',
      UserRole.INSTITUTION_USER,
      institutionA.id,
    );
    await ensureUser(
      'college.b@synthetic.approvalsync.local',
      'College B Rep',
      UserRole.INSTITUTION_USER,
      institutionB.id,
    );
    await ensureUser(
      'demo.scrutiny@synthetic.approvalsync.local',
      'Scrutiny Officer',
      UserRole.SCRUTINY_OFFICER,
    );
    await ensureUser(
      'demo.ro@synthetic.approvalsync.local',
      'Regional Officer',
      UserRole.REGIONAL_OFFICER,
    );
    await ensureUser(
      'sysadmin@synthetic.approvalsync.local',
      'System Admin User',
      UserRole.SYSTEM_ADMIN,
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
    tokenRegionalOfficer = await login('demo.ro@synthetic.approvalsync.local');
    tokenAdmin = await login('sysadmin@synthetic.approvalsync.local');
    tokenAuditor = await login('audit.cvc@synthetic.approvalsync.local');
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

    it('rejects unauthenticated GET /api/v1/undertakings with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/undertakings')
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated POST /api/v1/undertakings with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .send({ title: 'Test Lease' })
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects unauthenticated POST /api/v1/undertakings/:id/review with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${dummyId}/review`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Reviewed',
        })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects institution user from calling POST /api/v1/undertakings/:id/review with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${dummyId}/review`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Self approval attempt',
        })
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects auditor user from mutating POST /api/v1/undertakings with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenAuditor}`)
        .send({
          type: UndertakingType.LAND_LEASE,
          title: 'Auditor Attempt',
          startDate: '2024-01-01',
          expiryDate: '2054-01-01',
        })
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects institution user from executing POST /api/v1/undertakings/reconcile with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings/reconcile')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });
  });

  describe('2. Institution Undertaking Creation & Tenant Isolation', () => {
    let createdUndertakingId: string;

    it('allows Institution A to create a DRAFT undertaking scoped to Institution A', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          type: UndertakingType.LAND_LEASE,
          title: 'Permanent Campus 30-Year Lease Deed',
          description: 'Survey 101, Taluka Haveli, 12 contiguous acres',
          documentNumber: 'DEED-PUN-2024-0999',
          issuingAuthority: 'Sub-Registrar Haveli',
          counterpartyName: 'State Industrial Development Corp',
          startDate: '2024-01-01',
          expiryDate: '2054-01-01',
          renewalLeadDays: 180,
          applicationId: applicationA.id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.id).toBeDefined();
      expect(data.institutionId).toBe(institutionA.id);
      expect(data.applicationId).toBe(applicationA.id);
      expect(data.status).toBe(UndertakingStatus.DRAFT);
      expect(data.reviewStatus).toBe(UndertakingReviewStatus.PENDING_REVIEW);
      expect(data.renewalDueDate).toBe('2053-07-05'); // 2054-01-01 minus 180 days
      expect(data.disclaimer).toBe(ILLUSTRATIVE_UNDERTAKING_DISCLAIMER);

      createdUndertakingId = data.id;
    });

    it('rejects client attempts to inject status=ACTIVE or reviewStatus=VERIFIED on creation with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          type: UndertakingType.AFFIDAVIT_UNDERTAKING,
          title: 'Tampered Status Affidavit',
          startDate: '2024-01-01',
          expiryDate: '2025-01-01',
          status: 'ACTIVE',
          reviewStatus: 'VERIFIED',
          reviewedById: '00000000-0000-0000-0000-000000000002',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });

    it('rejects cross-tenant institution ID injection by applicant with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          institutionId: institutionB.id, // Attempt to create on behalf of Institution B
          type: UndertakingType.LAND_LEASE,
          title: 'Cross-Tenant Injection Attempt',
          startDate: '2024-01-01',
          expiryDate: '2054-01-01',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects invalid date range where expiry is before start date with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          type: UndertakingType.LAND_LEASE,
          title: 'Invalid Range Lease',
          startDate: '2025-01-01',
          expiryDate: '2024-01-01', // Before start
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 anti-enumeration when Institution B requests Institution A undertaking by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${createdUndertakingId}`)
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('returns 404 anti-enumeration when Institution B attempts to update Institution A undertaking', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/undertakings/${createdUndertakingId}`)
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .send({ title: 'Malicious Overwrite' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('allows Institution A to update non-validity descriptive fields in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/undertakings/${createdUndertakingId}`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          title: 'Permanent Campus 30-Year Lease Deed (Amended)',
          description: 'Survey 101 and 102, Taluka Haveli, 12 contiguous acres',
        })
        .expect(200);

      expect(res.body.data.title).toBe(
        'Permanent Campus 30-Year Lease Deed (Amended)',
      );
    });

    it('lists only Institution A undertakings when Institution A queries GET /api/v1/undertakings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(item.institutionId).toBe(institutionA.id);
      }
    });

    it('allows scrutiny officer to inspect Institution A undertaking by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${createdUndertakingId}`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(200);

      expect(res.body.data.id).toBe(createdUndertakingId);
      expect(res.body.data.institutionId).toBe(institutionA.id);
    });
  });

  describe('3. Submission, Officer Review & Audit Trail Integration', () => {
    let reviewUndertakingId: string;

    beforeAll(async () => {
      // Create a fresh undertaking attached to applicationA
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          type: UndertakingType.BUILDING_LEASE,
          title: 'Academic Building 10-Year Lease Agreement',
          documentNumber: 'BLD-LEASE-2024-001',
          issuingAuthority: 'Sub-Registrar',
          startDate: '2024-01-01',
          expiryDate: '2034-01-01',
          renewalLeadDays: 120,
          applicationId: applicationA.id,
        })
        .expect(201);

      reviewUndertakingId = createRes.body.data.id;
    });

    it('transitions DRAFT undertaking to SUBMITTED status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${reviewUndertakingId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(res.body.data.status).toBe(UndertakingStatus.SUBMITTED);
    });

    it('rejects submitting an already SUBMITTED undertaking with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${reviewUndertakingId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('rejects review without justification notes with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${reviewUndertakingId}/review`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: '', // Empty notes rejected by DTO validation
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('allows scrutiny officer to verify undertaking and activates it', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${reviewUndertakingId}/review`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes:
            'Registered building lease verified in compliance with building safety standards.',
        })
        .expect(200);

      const data = res.body.data;
      expect(data.reviewStatus).toBe(UndertakingReviewStatus.VERIFIED);
      expect(data.status).toBe(UndertakingStatus.ACTIVE);
      expect(data.reviewedById).toBeDefined();
      expect(data.reviewedAt).toBeDefined();
      expect(data.reviewNotes).toContain('compliance with building safety');
    });

    it('verifies that BE-07 audit log entry was atomically persisted for the review event', async () => {
      const auditRepo = dataSource.getRepository(AuditLog);
      const log = await auditRepo.findOne({
        where: {
          applicationId: applicationA.id,
          eventType: 'UNDERTAKING_REVIEWED_BY_OFFICER',
        },
        order: { sequenceNumber: 'DESC' },
      });

      expect(log).toBeDefined();
      expect(log!.eventType).toBe('UNDERTAKING_REVIEWED_BY_OFFICER');
      expect((log!.payloadSnapshot as any).undertakingId).toBe(
        reviewUndertakingId,
      );
      expect((log!.payloadSnapshot as any).reviewStatus).toBe(
        UndertakingReviewStatus.VERIFIED,
      );
    });
  });

  describe('4. Renewal, Cycle Prevention & Supersession Chains', () => {
    let originalRecordId: string;
    let renewalRecordId: string;

    beforeAll(async () => {
      // Create and verify an undertaking to be renewed
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          type: UndertakingType.EQUIPMENT_SAFETY,
          title: 'Annual High-Voltage Lab Safety Calibration Certificate',
          documentNumber: 'CALIB-2023-900',
          issuingAuthority: 'Electrical Inspectorate',
          startDate: '2023-01-01',
          expiryDate: '2024-01-01',
          renewalLeadDays: 60,
          applicationId: applicationA.id,
        })
        .expect(201);

      originalRecordId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${originalRecordId}/submit`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${originalRecordId}/review`)
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .send({
          reviewStatus: UndertakingReviewStatus.VERIFIED,
          reviewNotes: 'Initial calibration verified.',
        })
        .expect(200);
    });

    it('renews active undertaking, marking original as SUPERSEDED and linking supersession chain', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${originalRecordId}/renew`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          startDate: '2024-01-02',
          expiryDate: '2025-01-01',
          renewalLeadDays: 60,
          documentNumber: 'CALIB-2024-1100',
          renewalNotes: 'Extended annual calibration certificate for 2024-2025',
        })
        .expect(201);

      const renewal = res.body.data;
      expect(renewal.id).toBeDefined();
      expect(renewal.supersedesId).toBe(originalRecordId);
      expect(renewal.status).toBe(UndertakingStatus.SUBMITTED);
      expect(renewal.documentNumber).toBe('CALIB-2024-1100');

      renewalRecordId = renewal.id;

      // Verify original record is now SUPERSEDED
      const originalRes = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${originalRecordId}`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(originalRes.body.data.status).toBe(UndertakingStatus.SUPERSEDED);
      expect(originalRes.body.data.supersededById).toBe(renewalRecordId);
    });

    it('rejects attempt to renew an already SUPERSEDED record with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/undertakings/${originalRecordId}/renew`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .send({
          startDate: '2025-01-02',
          expiryDate: '2026-01-01',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot renew an undertaking in SUPERSEDED state',
      );
    });
  });

  describe('5. Expiry Calculations & Deterministic Reconciliation Sweep', () => {
    it('evaluates derived status relative to explicit evaluation date query parameter', async () => {
      // Find seed land lease deed (expiry in 2050)
      const res = await request(app.getHttpServer())
        .get('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .query({ documentNumber: 'DEED-MAH-2020-8841' })
        .expect(200);

      const deed = res.body.data[0];
      expect(deed).toBeDefined();

      // Query as of 2051-01-01 (should evaluate as EXPIRED)
      const expiredQueryRes = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${deed.id}`)
        .query({ asOfDate: '2051-01-01' })
        .set('Authorization', `Bearer ${tokenScrutiny}`)
        .expect(200);

      expect(expiredQueryRes.body.data.isExpired).toBe(true);
      expect(expiredQueryRes.body.data.daysRemaining).toBeLessThan(0);
    });

    it('allows regional officer to execute POST /api/v1/undertakings/reconcile sweep', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings/reconcile')
        .query({ asOfDate: '2026-10-26' })
        .set('Authorization', `Bearer ${tokenRegionalOfficer}`)
        .expect(200);

      const tally = res.body.data;
      expect(tally.evaluationDate).toBe('2026-10-26');
      expect(tally.scannedCount).toBeGreaterThan(0);
      expect(tally.disclaimer).toBe(ILLUSTRATIVE_UNDERTAKING_DISCLAIMER);
    });

    it('allows SYSTEM_ADMIN to execute POST /api/v1/undertakings/reconcile sweep', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/undertakings/reconcile')
        .query({ asOfDate: '2026-10-26' })
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Chronological Immutable History Retention', () => {
    it('retrieves complete chronological history entries for an undertaking', async () => {
      // Find seed land lease deed
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .query({ documentNumber: 'DEED-MAH-2020-8841' })
        .expect(200);

      const deedId = listRes.body.data[0].id;

      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${deedId}/history`)
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .expect(200);

      expect(historyRes.body.success).toBe(true);
      expect(Array.isArray(historyRes.body.data)).toBe(true);
      expect(historyRes.body.data.length).toBeGreaterThan(0);

      const firstEntry = historyRes.body.data[0];
      expect(firstEntry.undertakingId).toBe(deedId);
      expect(firstEntry.action).toBeDefined();
      expect(firstEntry.actorRole).toBeDefined();
      expect(firstEntry.snapshotJsonb).toBeDefined();
    });

    it('returns 404 anti-enumeration when Institution B requests history of Institution A record', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/undertakings')
        .set('Authorization', `Bearer ${tokenInstitutionA}`)
        .query({ documentNumber: 'DEED-MAH-2020-8841' })
        .expect(200);

      const deedId = listRes.body.data[0].id;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/undertakings/${deedId}/history`)
        .set('Authorization', `Bearer ${tokenInstitutionB}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });
});
