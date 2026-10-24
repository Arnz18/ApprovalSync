/**
 * ApprovalSync — Institution Profiles & Application Intake E2E Integration Test Suite
 * Milestone: BE-04
 *
 * Verifies against live PostgreSQL 16 database:
 * 1. Institution profile retrieval and controlled updates (/api/v1/institutions/my-profile).
 * 2. Strict tenant isolation on institution profiles (Institution A cannot view/update Institution B).
 * 3. Uniform rejection (403 Forbidden) on cross-tenant and nonexistent IDs for INSTITUTION_USER.
 * 4. Application intake: creation of draft application (/api/v1/applications) with server-managed ID and number.
 * 5. Strict rejection of client attempts to override status, institutionId, or server-managed properties.
 * 6. Scoped application listings with pagination, status filtering, and search.
 * 7. Tenant isolation on application retrieval and draft editing.
 * 8. Rejection of edits on non-DRAFT applications (SUBMITTED cannot be mutated).
 * 9. Atomic application submission (/api/v1/applications/:id/submit) transitioning DRAFT -> SUBMITTED.
 * 10. Document attachment metadata retrieval with tenant scoping.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { ApplicationStatus, UserRole } from '../src/shared/contracts';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import { Institution } from '../src/database/entities/institution.entity';
import { Application } from '../src/database/entities/application.entity';

jest.setTimeout(45000);

describe('Institution Profiles & Application Intake (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let institutionA: Institution;
  let institutionB: Institution;
  let institutionAUser: User;
  let institutionBUser: User;
  let scrutinyOfficerUser: User;

  let tokenInstA: string;
  let tokenInstB: string;
  let tokenOfficer: string;

  const demoPassword = 'DemoPass@123';

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

    // Fetch existing seeded institutions
    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;

    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    // Fetch seeded users
    institutionAUser = (await userRepo.findOne({
      where: { email: 'demo.institution@synthetic.approvalsync.local' },
    }))!;
    scrutinyOfficerUser = (await userRepo.findOne({
      where: { email: 'demo.scrutiny@synthetic.approvalsync.local' },
    }))!;

    expect(institutionAUser).toBeDefined();
    expect(scrutinyOfficerUser).toBeDefined();

    // Ensure a second institution user exists for Institution B to test cross-tenant IDOR
    let userB = await userRepo.findOne({
      where: { email: 'institution.b.rep@synthetic.approvalsync.local' },
    });
    if (!userB) {
      userB = userRepo.create({
        name: 'Institution B Representative',
        email: 'institution.b.rep@synthetic.approvalsync.local',
        role: UserRole.INSTITUTION_USER,
        passwordHash:
          '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
        institutionId: institutionB.id,
        isActive: true,
      });
      await userRepo.save(userB);
    }
    institutionBUser = userB;

    // Login each principal to acquire verified JWTs
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: institutionAUser.email, password: demoPassword });
    expect(loginA.status).toBe(200);
    tokenInstA = loginA.body.data.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: institutionBUser.email, password: demoPassword });
    expect(loginB.status).toBe(200);
    tokenInstB = loginB.body.data.accessToken;

    const loginOfficer = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: scrutinyOfficerUser.email, password: demoPassword });
    expect(loginOfficer.status).toBe(200);
    tokenOfficer = loginOfficer.body.data.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Unauthenticated Access & Global Guard Protection', () => {
    it('rejects GET /api/v1/institutions/my-profile without token with 401', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/institutions/my-profile',
      );
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects GET /api/v1/applications without token with 401', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/applications',
      );
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects POST /api/v1/applications without token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .send({
          academicYear: '2026-2027',
          programType: 'Engineering',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Institution Profiles & Tenancy Isolation', () => {
    it('retrieves own institution profile via GET /api/v1/institutions/my-profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/institutions/my-profile')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(institutionA.id);
      expect(res.body.data.registrationNumber).toBe('DEMO-INST-2026-001');
      expect(res.body.data.name).toContain('Apex Institute');
    });

    it('updates editable fields via PATCH /api/v1/institutions/my-profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/institutions/my-profile')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          pincode: '411002',
          address: 'Plot 42, Knowledge Park, Phase II, Pune',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pincode).toBe('411002');
      expect(res.body.data.address).toContain('Phase II');
      // Registration number and ID must remain immutable
      expect(res.body.data.id).toBe(institutionA.id);
      expect(res.body.data.registrationNumber).toBe('DEMO-INST-2026-001');
    });

    it('rejects attempt to update protected fields (registrationNumber, id) with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/institutions/my-profile')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          registrationNumber: 'HACKED-REG-NUM',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });

    it('rejects Institution A attempting to update Institution B profile via PATCH /institutions/:id with 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${institutionB.id}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ address: 'Malicious Address' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows Institution A user to view Institution A by ID (/institutions/:id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${institutionA.id}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(institutionA.id);
    });

    it('rejects Institution A user attempting to view Institution B by ID with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${institutionB.id}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects Institution A user querying a nonexistent institution UUID with 403 (anti-enumeration)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${fakeUuid}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows Scrutiny Officer to view any institution by ID', async () => {
      const resA = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${institutionA.id}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.id).toBe(institutionA.id);

      const resB = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${institutionB.id}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.id).toBe(institutionB.id);
    });

    it('returns 404 for Scrutiny Officer on nonexistent institution UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${fakeUuid}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('rejects Scrutiny Officer attempting to update an institution profile with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${institutionA.id}`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({ address: 'Hacked Address' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Application Intake (POST /api/v1/applications)', () => {
    it('rejects Scrutiny Officer attempting to create an application with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid payload violating DTO validation (missing programType, invalid academicYear)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          academicYear: '2026/27', // invalid format
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });

    it('rejects body containing forbidden non-whitelisted keys (status, institutionId)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
          status: 'APPROVED',
          institutionId: institutionB.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });

    it('creates a draft application bound to caller institution with server-generated number and status DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Undergraduate Engineering',
          payloadJsonb: {
            facultyCount: 50,
            landAreaAcres: 14.2,
            builtUpAreaSqMeters: 9000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.DRAFT);
      expect(res.body.data.institutionId).toBe(institutionA.id);
      expect(res.body.data.applicationNumber).toMatch(/^APP-2026-[A-F0-9]{8}$/);
      expect(res.body.data.submittedAt).toBeNull();
      expect(res.body.data.payloadJsonb.facultyCount).toBe(50);
    });

    it('sanitizes reserved keys inside payloadJsonb when creating application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          academicYear: '2026-2027',
          programType: 'Computer Applications',
          payloadJsonb: {
            facultyCount: 42,
            status: 'APPROVED',
            institutionId: institutionB.id,
            id: 'hacked-id',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.DRAFT);
      expect(res.body.data.institutionId).toBe(institutionA.id);
      expect(res.body.data.payloadJsonb.facultyCount).toBe(42);
      expect(res.body.data.payloadJsonb.status).toBeUndefined();
      expect(res.body.data.payloadJsonb.institutionId).toBeUndefined();
      expect(res.body.data.payloadJsonb.id).toBeUndefined();
    });
  });

  describe('4. Application Queries & Tenant Isolation (GET /api/v1/applications)', () => {
    it('scopes application list strictly to caller institution for INSTITUTION_USER', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.meta.pagination).toBeDefined();
      expect(resA.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify every returned application belongs strictly to Institution A
      for (const app of resA.body.data) {
        expect(app.institutionId).toBe(institutionA.id);
      }
    });

    it('prevents Institution A from overriding tenant filter via query param (?institutionId=...) ', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications?institutionId=${institutionB.id}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      // Must still return only Institution A records
      for (const app of res.body.data) {
        expect(app.institutionId).toBe(institutionA.id);
      }
    });

    it('allows Scrutiny Officer to query applications across institutions and filter by institutionId', async () => {
      const resAll = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(resAll.status).toBe(200);
      expect(resAll.body.data.length).toBeGreaterThanOrEqual(2);

      const resFilteredB = await request(app.getHttpServer())
        .get(`/api/v1/applications?institutionId=${institutionB.id}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(resFilteredB.status).toBe(200);
      for (const app of resFilteredB.body.data) {
        expect(app.institutionId).toBe(institutionB.id);
      }
    });

    it('supports status filtering (?status=DRAFT)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications?status=DRAFT')
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      for (const app of res.body.data) {
        expect(app.status).toBe(ApplicationStatus.DRAFT);
      }
    });

    it('rejects unsupported sortBy query parameter with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications?sortBy=maliciousColumn')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unsupported sortOrder query parameter with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications?sortOrder=SIDEWAYS')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid page query parameter (< 1) with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications?page=0')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects limit exceeding 100 with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/applications?limit=150')
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Application Details & IDOR Defense (GET /api/v1/applications/:id)', () => {
    let appAId: string;
    let appBId: string;

    beforeAll(async () => {
      const appRepo = dataSource.getRepository(Application);
      const appA = (await appRepo.findOne({
        where: { institutionId: institutionA.id },
      }))!;
      const appB = (await appRepo.findOne({
        where: { institutionId: institutionB.id },
      }))!;
      appAId = appA.id;
      appBId = appB.id;
    });

    it('allows Institution A user to view Institution A application', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(appAId);
      expect(res.body.data.institutionId).toBe(institutionA.id);
    });

    it('rejects Institution A user attempting to view Institution B application with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects Institution A user querying nonexistent application UUID with 403 Forbidden (anti-enumeration)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${fakeUuid}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows Scrutiny Officer to view application regardless of institution', async () => {
      const resA = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appAId}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);
      expect(resA.status).toBe(200);

      const resB = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appBId}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);
      expect(resB.status).toBe(200);
    });

    it('returns 404 for Scrutiny Officer on nonexistent application UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000999';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${fakeUuid}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('6. Application Draft Updates (PATCH /api/v1/applications/:id)', () => {
    let draftAppId: string;
    let submittedAppId: string;

    beforeAll(async () => {
      const appRepo = dataSource.getRepository(Application);
      // Create a fresh draft application for testing updates and submissions
      const newDraft = appRepo.create({
        applicationNumber: `APP-2026-MUTATE-${Date.now()}`,
        institutionId: institutionA.id,
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Undergraduate Engineering',
        payloadJsonb: { facultyCount: 40 },
        submittedAt: null,
      });
      await appRepo.save(newDraft);
      draftAppId = newDraft.id;

      // Seeded submitted application
      const submitted = (await appRepo.findOne({
        where: {
          institutionId: institutionB.id,
          status: ApplicationStatus.SUBMITTED,
        },
      }))!;
      submittedAppId = submitted.id;
    });

    it('rejects cross-tenant modification with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${draftAppId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({ programType: 'Hacked Program' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('updates editable fields when application is in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${draftAppId}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          programType: 'Mechanical and Automation Engineering',
          payloadJsonb: { facultyCount: 45, newBuildingSqM: 3500 },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.programType).toBe(
        'Mechanical and Automation Engineering',
      );
      expect(res.body.data.payloadJsonb.facultyCount).toBe(45);
      expect(res.body.data.payloadJsonb.newBuildingSqM).toBe(3500);
    });

    it('rejects update on an application that is not in DRAFT status (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${submittedAppId}`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({ programType: 'Illegal Modification' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'only applications in DRAFT status',
      );
    });
  });

  describe('7. Atomic Application Submission (POST /api/v1/applications/:id/submit)', () => {
    let submittableAppId: string;

    beforeAll(async () => {
      const appRepo = dataSource.getRepository(Application);
      const app = appRepo.create({
        applicationNumber: `APP-2026-SUBMIT-${Date.now()}`,
        institutionId: institutionA.id,
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Applied Sciences',
        payloadJsonb: { facultyCount: 30 },
        submittedAt: null,
      });
      await appRepo.save(app);
      submittableAppId = app.id;
    });

    it('rejects cross-tenant submission attempt with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${submittableAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('submits draft application transitioning status to SUBMITTED and recording submittedAt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${submittableAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.SUBMITTED);
      expect(res.body.data.submittedAt).not.toBeNull();
    });

    it('rejects re-submission of already submitted application with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${submittableAppId}/submit`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'only applications in DRAFT status',
      );
    });

    it('rejects further draft edits on the newly submitted application with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${submittableAppId}`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ programType: 'Post-Submission Tampering' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'only applications in DRAFT status',
      );
    });

    it('handles concurrent submission requests atomically with pessimistic write lock', async () => {
      const appRepo = dataSource.getRepository(Application);
      const concurrentApp = appRepo.create({
        applicationNumber: `APP-2026-CONCUR-${Date.now()}`,
        institutionId: institutionA.id,
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Architecture and Planning',
        payloadJsonb: { facultyCount: 22 },
        submittedAt: null,
      });
      await appRepo.save(concurrentApp);

      // Fire two concurrent submission requests against live PostgreSQL
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/applications/${concurrentApp.id}/submit`)
          .set('Authorization', `Bearer ${tokenInstA}`),
        request(app.getHttpServer())
          .post(`/api/v1/applications/${concurrentApp.id}/submit`)
          .set('Authorization', `Bearer ${tokenInstA}`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const successfulRes = res1.status === 200 ? res1 : res2;
      const failedRes = res1.status === 400 ? res1 : res2;

      expect(successfulRes.body.success).toBe(true);
      expect(successfulRes.body.data.status).toBe(ApplicationStatus.SUBMITTED);
      expect(failedRes.body.success).toBe(false);
      expect(failedRes.body.error.message).toContain(
        'only applications in DRAFT status',
      );

      // Verify the persisted state in database
      const persisted = await appRepo.findOne({
        where: { id: concurrentApp.id },
      });
      expect(persisted!.status).toBe(ApplicationStatus.SUBMITTED);
      expect(persisted!.submittedAt).not.toBeNull();
    });
  });

  describe('8. Document Metadata Boundary (GET /api/v1/applications/:id/documents)', () => {
    let seededAppBId: string;

    beforeAll(async () => {
      const appRepo = dataSource.getRepository(Application);
      const app = (await appRepo.findOne({
        where: { applicationNumber: 'APP-2026-DEMO-002' },
      }))!;
      seededAppBId = app.id;
    });

    it('rejects Institution A user attempting to view documents of Institution B application with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${seededAppBId}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Scrutiny Officer to view document metadata linked to application', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${seededAppBId}/documents`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const doc = res.body.data[0];
      expect(doc.fileName).toBe('demo_land_title_deed.pdf');
      expect(doc.documentType).toBe('LAND_DOCUMENT');
      expect(doc.processingStatus).toBe('UPLOADED');
      expect(typeof doc.fileSizeBytes).toBe('number');
      expect(doc.sha256Checksum).toBeDefined();
      expect(doc.uploadedAt).toBeDefined();

      // Ensure internal storage paths and server secrets are never leaked
      expect(doc.storagePath).toBeUndefined();
    });
  });
});
