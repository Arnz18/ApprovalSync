/**
 * ApprovalSync — Dossier Verification Orchestration and Report E2E Tests
 * Milestone: DOC-07
 *
 * Validates the consolidated multi-pipeline verification report:
 * - Document completeness, field completeness, expiry, consistency (DOC-03)
 * - Exact and near-duplicate detection & structural integrity (DOC-04)
 * - External / simulated issuer verification (DOC-05)
 * - Regulatory compliance & infrastructure review assist (DOC-06)
 * - Institutional tenancy isolation & RBAC guards
 * - ADR-004 Human Sovereignty (isAdvisory: true, statutory disclaimer)
 * - Database persistence in application payloadJsonb
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
  UserRole,
} from '../src/shared/contracts';

jest.setTimeout(45000);

describe('Dossier Verification Report API (e2e)', () => {
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

  let docLandDeedA: Document;
  let docBuildingPlanA: Document;

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

    // Provision test applications
    appA = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionA.id,
        applicationNumber: `APP-E2E-DOC07-A-${Date.now()}`,
        status: ApplicationStatus.DRAFT,
        academicYear: '2026-2027',
        programType: 'Undergraduate Engineering',
        payloadJsonb: {
          institutionName: institutionA.name,
          state: institutionA.state,
          district: institutionA.district,
          landAreaAcres: 8.5,
          builtUpAreaSqMeters: 6200,
          approvedIntake: 240,
          proposedFacultyCount: 16,
          barrierFreeDeclared: true,
        },
      }),
    );

    appB = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionB.id,
        applicationNumber: `APP-E2E-DOC07-B-${Date.now()}`,
        status: ApplicationStatus.DRAFT,
        academicYear: '2026-2027',
        programType: 'Undergraduate Engineering',
        payloadJsonb: {
          institutionName: institutionB.name,
          state: institutionB.state,
          district: institutionB.district,
          landAreaAcres: 7.5,
          builtUpAreaSqMeters: 5500,
          approvedIntake: 180,
          proposedFacultyCount: 12,
        },
      }),
    );

    // Attach documents to appA
    docLandDeedA = await docRepo.save(
      docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land-deed-inst-a.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        storagePath: `documents/${appA.id}/land-deed.pdf`,
        fileHashSha256: 'a'.repeat(64),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrConfidence: 0.96,
          analysisReport: {
            ocrConfidence: 0.96,
            extractedFields: {
              deedNumber: 'MH-PUN-2022-8871',
              landAreaAcres: 8.5,
              institutionName: institutionA.name,
            },
          },
          issuerVerification: {
            status: 'VERIFIED',
            outcome: 'VERIFIED',
            sourceId: 'SIMULATED_ISSUER_ADAPTER',
            sourceName: 'Simulated DigiLocker & State Registry Sandbox',
            isSimulated: true,
            verifiedAt: new Date().toISOString(),
            matchedFields: ['deedNumber', 'landAreaAcres'],
            discrepantFields: [],
            comparisonSummary: 'All registry records match submitted deed',
          },
        },
      }),
    );

    docBuildingPlanA = await docRepo.save(
      docRepo.create({
        applicationId: appA.id,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanctioned-building-plan.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 4096,
        storagePath: `documents/${appA.id}/building-plan.pdf`,
        fileHashSha256: 'b'.repeat(64),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrConfidence: 0.93,
          analysisReport: {
            ocrConfidence: 0.93,
            extractedFields: {
              sanctionOrderNumber: 'PMC-BP-2024-771',
              totalBuiltUpAreaSqMeters: 6200,
              carpetAreaSqMeters: 5100,
              barrierFreeAccessible: true,
              fireNocValidUntil: '2027-12-31',
            },
          },
        },
      }),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Security and Tenancy Isolation', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/dossier-report`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('rejects cross-institutional evaluation by institution user with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects cross-institutional retrieval by institution user with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appB.id}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('returns 404 for non-existent application UUID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${nonExistent}/dossier-report`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('Dossier Verification Evaluation & Scrutiny Flow', () => {
    it('allows institution user to evaluate their own application dossier', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dossier = res.body.data;
      expect(dossier.applicationId).toBe(appA.id);
      expect(dossier.institutionId).toBe(institutionA.id);
      expect(dossier.isAdvisory).toBe(true);
      expect(dossier.disclaimer).toContain('ADR-004');
      expect(dossier.overallStatus).toBeDefined();

      // Summary metrics
      expect(dossier.summary).toBeDefined();
      expect(dossier.summary.totalDocuments).toBeGreaterThanOrEqual(2);
      expect(dossier.summary.totalRulesEvaluated).toBeGreaterThan(0);
      expect(dossier.summary.issuerVerificationSummary).toBeDefined();
      expect(dossier.summary.infrastructureReviewSummary).toBeDefined();

      // Document verification matrix
      expect(dossier.documentMatrix).toBeDefined();
      expect(dossier.documentMatrix.length).toBeGreaterThanOrEqual(2);

      const landMatrixItem = dossier.documentMatrix.find(
        (m: any) => m.documentId === docLandDeedA.id,
      );
      expect(landMatrixItem).toBeDefined();
      expect(landMatrixItem.documentType).toBe('LAND_TITLE_DEED');
      expect(landMatrixItem.issuerStatus).toBe('SIMULATED');
      expect(landMatrixItem.ocrConfidence).toBeGreaterThan(0.9);
      expect(landMatrixItem.integrityStatus).toBe('VALID');
      expect(landMatrixItem.duplicateStatus).toBe('UNIQUE');

      const buildingMatrixItem = dossier.documentMatrix.find(
        (m: any) => m.documentId === docBuildingPlanA.id,
      );
      expect(buildingMatrixItem).toBeDefined();
      expect(buildingMatrixItem.documentType).toBe('BUILDING_PLAN_APPROVAL');
    });

    it('allows Institution B representative to evaluate their own application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(appB.id);
      expect(res.body.data.institutionId).toBe(institutionB.id);
    });

    it('allows scrutiny officer to evaluate cross-institutional application via evaluate route', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/dossier-report/evaluate`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(appB.id);
      expect(res.body.data.isAdvisory).toBe(true);
    });

    it('retrieves cached dossier report via GET /dossier-report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/dossier-report`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(appA.id);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.documentMatrix).toBeDefined();
    });

    it('retrieves lightweight dossier summary via GET /dossier-report/summary for scrutiny queue', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/dossier-report/summary`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const summaryData = res.body.data;
      expect(summaryData.applicationId).toBe(appA.id);
      expect(summaryData.applicationNumber).toBeDefined();
      expect(summaryData.overallStatus).toBeDefined();
      expect(summaryData.isAdvisory).toBe(true);
      expect(summaryData.summary).toBeDefined();
      expect(summaryData.summary.totalDocuments).toBeGreaterThanOrEqual(2);
      expect(summaryData.findings).toBeUndefined();
      expect(summaryData.documentMatrix).toBeUndefined();
    });

    it('forces re-evaluation when recalculate=true query parameter is supplied', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/dossier-report?recalculate=true`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(appA.id);
      expect(res.body.data.evaluatedAt).toBeDefined();
    });

    it('persists dossier snapshot in application payloadJsonb for audit traceability', async () => {
      const appRepo = dataSource.getRepository(Application);
      const appRecord = await appRepo.findOne({ where: { id: appA.id } });

      const dossierPayload = (appRecord?.payloadJsonb as any)?.dossierReport;
      expect(dossierPayload).toBeDefined();
      expect(dossierPayload.overallStatus).toBeDefined();
      expect(dossierPayload.summary).toBeDefined();
      expect(dossierPayload.cachedResult).toBeDefined();
      expect(dossierPayload.cachedResult.applicationId).toBe(appA.id);
    });
  });
});
