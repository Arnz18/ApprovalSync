/**
 * ApprovalSync — Issuer Verification Adapters E2E Integration Tests
 * Milestone: DOC-05
 *
 * Validates provider discovery, deterministic simulated verification outcomes,
 * explicit provider selection without mock fallback, tenant isolation, and result
 * persistence against real PostgreSQL 16.
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
import { Institution } from '../src/database/entities/institution.entity';
import { User } from '../src/database/entities/user.entity';
import { Application } from '../src/database/entities/application.entity';
import { Document } from '../src/database/entities/document.entity';
import {
  ApplicationStatus,
  DocumentProcessingStatus,
  VerificationStatus,
  UserRole,
} from '../src/shared/contracts';
import { ProviderVerificationOutcome } from '../src/providers/interfaces';
jest.setTimeout(45000);

describe('Issuer Verification Adapters & Source Status (e2e)', () => {
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

  let appA: Application;
  let appB: Application;

  let docA: Document;
  let docB: Document;

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
    const instRepo = dataSource.getRepository(Institution);
    const userRepo = dataSource.getRepository(User);
    const applicationRepo = dataSource.getRepository(Application);
    const docRepo = dataSource.getRepository(Document);

    // Fetch existing seeded institutions
    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;

    institutionAUser = (await userRepo.findOne({
      where: { email: 'demo.institution@synthetic.approvalsync.local' },
    }))!;
    scrutinyOfficerUser = (await userRepo.findOne({
      where: { email: 'demo.scrutiny@synthetic.approvalsync.local' },
    }))!;

    // Obtain JWT tokens via login
    const loginRespA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: institutionAUser.email,
        password: demoPassword,
      });
    tokenInstA = loginRespA.body.data.accessToken;

    const loginRespOfficer = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: scrutinyOfficerUser.email,
        password: demoPassword,
      });
    tokenOfficer = loginRespOfficer.body.data.accessToken;

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

    const loginRespB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: institutionBUser.email,
        password: demoPassword,
      });
    tokenInstB = loginRespB.body.data.accessToken;

    // Provision distinct applications for Institution A and Institution B
    appA = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionA.id,
        applicationNumber: `APP-E2E-DOC05-A-${Date.now()}`,
        status: ApplicationStatus.DRAFT,
        academicYear: '2026-2027',
        programType: 'ENGINEERING_TECHNOLOGY',
        payloadJsonb: {
          institutionName: institutionA.name,
          state: institutionA.state,
          district: institutionA.district,
        },
      }),
    );

    appB = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionB.id,
        applicationNumber: `APP-E2E-DOC05-B-${Date.now()}`,
        status: ApplicationStatus.DRAFT,
        academicYear: '2026-2027',
        programType: 'ENGINEERING_TECHNOLOGY',
        payloadJsonb: {
          institutionName: institutionB.name,
          state: institutionB.state,
          district: institutionB.district,
        },
      }),
    );

    // Create test document attachments
    docA = await docRepo.save(
      docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land-deed-inst-a.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        storagePath: `documents/${appA.id}/land-deed.pdf`,
        fileHashSha256: 'a'.repeat(64),
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'MAH-PUN-2024-REG-09821',
              khasraNumber: '42/1A',
              landAreaAcres: 5.0,
            },
          },
        },
      }),
    );

    docB = await docRepo.save(
      docRepo.create({
        applicationId: appB.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land-deed-inst-b.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        storagePath: `documents/${appB.id}/land-deed.pdf`,
        fileHashSha256: 'b'.repeat(64),
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      }),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const docRepo = dataSource.getRepository(Document);
      const appRepo = dataSource.getRepository(Application);

      if (docA?.id) await docRepo.delete(docA.id);
      if (docB?.id) await docRepo.delete(docB.id);
      if (appA?.id) await appRepo.delete(appA.id);
      if (appB?.id) await appRepo.delete(appB.id);
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/providers (Provider Discovery)', () => {
    it('should list all registered verification providers with capabilities and simulation flags', async () => {
      const resp = await request(app.getHttpServer())
        .get('/api/v1/providers')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(resp.body.success).toBe(true);
      expect(resp.body.data).toBeInstanceOf(Array);
      expect(resp.body.data.length).toBeGreaterThanOrEqual(3);

      const simProvider = resp.body.data.find(
        (p: any) => p.providerId === 'SIMULATED_ISSUER_ADAPTER',
      );
      expect(simProvider).toBeDefined();
      expect(simProvider.isSimulated).toBe(true);
      expect(simProvider.isLiveProviderConfigured).toBe(true);
      expect(simProvider.capabilities).toContain('LAND_RECORD_SEARCH');
      expect(simProvider.disclaimer).toContain('Simulated');

      const digiLockerProvider = resp.body.data.find(
        (p: any) => p.providerId === 'AUTHORIZED_DIGILOCKER_ADAPTER',
      );
      expect(digiLockerProvider).toBeDefined();
      expect(digiLockerProvider.isSimulated).toBe(false);
      expect(digiLockerProvider.isLiveProviderConfigured).toBe(false); // Unconfigured in prototype
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/providers').expect(401);
    });
  });

  describe('POST /api/v1/documents/:id/verify-issuer (Deterministic Verification)', () => {
    it('should verify matching document against simulated registry (outcome: VERIFIED)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ simulateScenario: 'MATCH' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.documentId).toBe(docA.id);
      expect(data.status).toBe(VerificationStatus.VERIFIED_MOCK);
      expect(data.outcome).toBe(ProviderVerificationOutcome.VERIFIED);
      expect(data.isSimulated).toBe(true);
      expect(data.sourceReference).toBeDefined();
      expect(data.providerMetadata?.isMock).toBe(true);
      expect(data.isAdvisory).toBe(true);
    });

    it('should detect mismatch when MISMATCH scenario is requested (outcome: MISMATCH_DETECTED)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ simulateScenario: 'MISMATCH' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.status).toBe(VerificationStatus.UNTRUSTED_ISSUER);
      expect(data.outcome).toBe(ProviderVerificationOutcome.MISMATCH_DETECTED);
      expect(data.discrepantFields.length).toBeGreaterThan(0);
      expect(data.isSimulated).toBe(true);
      expect(data.isAdvisory).toBe(true);
    });

    it('should detect expired document when EXPIRED scenario is requested (outcome: EXPIRED)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ simulateScenario: 'EXPIRED' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(data.outcome).toBe(ProviderVerificationOutcome.EXPIRED);
      expect(
        data.discrepantFields.some((f: any) => f.field === 'expiryDate'),
      ).toBe(true);
    });

    it('should detect pending clearance when PENDING scenario is requested (outcome: PENDING)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ simulateScenario: 'PENDING' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.status).toBe(VerificationStatus.MANUAL_REVIEW_REQUIRED);
      expect(data.outcome).toBe(ProviderVerificationOutcome.PENDING);
    });

    it('should handle simulated gateway timeout (outcome: SOURCE_UNAVAILABLE)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ simulateScenario: 'UNAVAILABLE' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(data.outcome).toBe(ProviderVerificationOutcome.SOURCE_UNAVAILABLE);
    });

    it('should return honest SOURCE_UNAVAILABLE when caller explicitly requests unconfigured real provider (No Silent Mock Fallback)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ providerId: 'AUTHORIZED_DIGILOCKER_ADAPTER' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      const data = resp.body.data;
      expect(data.status).toBe(VerificationStatus.SOURCE_UNAVAILABLE);
      expect(data.outcome).toBe(ProviderVerificationOutcome.SOURCE_UNAVAILABLE);
      expect(data.sourceId).toBe('AUTHORIZED_DIGILOCKER_ADAPTER');
      expect(data.isSimulated).toBe(false); // Truthfully declares non-simulated provider attempted
      expect(data.comparisonSummary).toContain('unconfigured');
    });

    it('should reject non-existent provider ID with 404', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ providerId: 'NON_EXISTENT_PROVIDER_XYZ' })
        .expect(404);

      expect(resp.body.success).toBe(false);
      expect(resp.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('Tenant Isolation & Cross-Institutional Access Rules', () => {
    it('should reject verification attempt of another institution document by INSTITUTION_USER with 403', async () => {
      if (!tokenInstB) return;

      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({ simulateScenario: 'MATCH' })
        .expect(403);

      expect(resp.body.success).toBe(false);
      expect(resp.body.error.code).toBe('ERR_FORBIDDEN');
      expect(resp.body.error.message).toContain('tenancy mismatch');
    });

    it('should allow SCRUTINY_OFFICER to verify documents belonging to any institution', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docA.id}/verify-issuer`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({ simulateScenario: 'MATCH' })
        .expect(200);

      expect(resp.body.success).toBe(true);
      expect(resp.body.data.documentId).toBe(docA.id);
    });
  });

  describe('GET /api/v1/documents/:id/issuer-verification (Result Retrieval)', () => {
    it('should retrieve persisted verification findings', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docA.id}/issuer-verification`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(resp.body.success).toBe(true);
      expect(resp.body.data.documentId).toBe(docA.id);
      expect(resp.body.data.status).toBeDefined();
      expect(resp.body.data.outcome).toBeDefined();
      expect(resp.body.data.isAdvisory).toBe(true);
    });

    it('should return 404 for document that has not yet undergone issuer verification', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docB.id}/issuer-verification`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(404);

      expect(resp.body.success).toBe(false);
      expect(resp.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });
});
