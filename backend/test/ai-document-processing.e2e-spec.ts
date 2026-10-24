/**
 * ApprovalSync — Document AI Pipeline E2E Integration Tests
 * Milestone: DOC-02
 *
 * Validates document OCR extraction, category classification, structured field
 * extraction, spatial evidence bounding boxes, advisory-only anomaly indicators,
 * tenant isolation, and failure recovery against real PostgreSQL 16.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
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

describe('Document AI & Evidence Extraction (e2e)', () => {
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

  let landDeedDocId: string;
  let buildingPlanDocId: string;

  const demoPassword = 'DemoPass@123';
  const fixturesDir = path.resolve(__dirname, 'fixtures', 'documents');

  const landTitleBuffer = fs.readFileSync(
    path.join(fixturesDir, 'land-title-deed.pdf'),
  );
  const buildingPlanBuffer = fs.readFileSync(
    path.join(fixturesDir, 'building-plan.pdf'),
  );
  const unknownCategoryBuffer = fs.readFileSync(
    path.join(fixturesDir, 'unknown-category.pdf'),
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
    const applicationRepo = dataSource.getRepository(Application);

    // Fetch existing seeded institutions
    institutionA = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-001' },
    }))!;
    institutionB = (await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    }))!;

    expect(institutionA).toBeDefined();
    expect(institutionB).toBeDefined();

    institutionAUser = (await userRepo.findOne({
      where: { email: 'demo.institution@synthetic.approvalsync.local' },
    }))!;
    scrutinyOfficerUser = (await userRepo.findOne({
      where: { email: 'demo.scrutiny@synthetic.approvalsync.local' },
    }))!;

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

    // Create fresh draft applications
    appA = applicationRepo.create({
      applicationNumber: `APP-DOC02-A-${Date.now()}`,
      institutionId: institutionA.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'ENGINEERING_TECHNOLOGY',
      payloadJsonb: { institutionName: institutionA.name },
    });
    await applicationRepo.save(appA);

    appB = applicationRepo.create({
      applicationNumber: `APP-DOC02-B-${Date.now()}`,
      institutionId: institutionB.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'ENGINEERING_TECHNOLOGY',
      payloadJsonb: { institutionName: institutionB.name },
    });
    await applicationRepo.save(appB);

    // Upload baseline test documents to appA
    const uploadDeedRes = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appA.id}/documents`)
      .set('Authorization', `Bearer ${tokenInstA}`)
      .attach('file', landTitleBuffer, 'registered_deed.pdf')
      .field('documentType', 'LAND_TITLE_DEED');
    expect(uploadDeedRes.status).toBe(201);
    landDeedDocId = uploadDeedRes.body.data.id;

    const uploadBpaRes = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appA.id}/documents`)
      .set('Authorization', `Bearer ${tokenInstA}`)
      .attach('file', buildingPlanBuffer, 'sanctioned_bpa.pdf')
      .field('documentType', 'BUILDING_PLAN_APPROVAL');
    expect(uploadBpaRes.status).toBe(201);
    buildingPlanDocId = uploadBpaRes.body.data.id;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      const docRepo = dataSource.getRepository(Document);
      const appRepo = dataSource.getRepository(Application);

      if (appA) {
        await docRepo.delete({ applicationId: appA.id });
        await appRepo.delete({ id: appA.id });
      }
      if (appB) {
        await docRepo.delete({ applicationId: appB.id });
        await appRepo.delete({ id: appB.id });
      }
    }

    // Clean up test storage directory
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (fs.existsSync(storageDir)) {
      try {
        fs.rmSync(storageDir, { recursive: true, force: true });
      } catch {
        // Ignore file lock errors during teardown
      }
    }

    await app.close();
  });

  describe('1. Document OCR & Structured Field Extraction', () => {
    it('should successfully extract land title deed fields and spatial bounding boxes', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${landDeedDocId}/process`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ forceReprocess: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;
      expect(report.documentId).toBe(landDeedDocId);
      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.OCR_EXTRACTED,
      );
      expect(report.ocrConfidence).toBeGreaterThanOrEqual(0.85);

      // Verify extracted structured fields
      expect(report.extractedFields.deedNumber).toBe('DEED/2024/7891');
      expect(report.extractedFields.registrationDate).toBe('2022-04-15');
      expect(report.extractedFields.leaseTenureYears).toBe(30);
      expect(report.extractedFields.landAreaAcres).toBe(5.25);

      // Verify spatial evidence findings
      expect(report.findings.length).toBeGreaterThanOrEqual(4);
      for (const finding of report.findings) {
        expect(finding.isAdvisory).toBe(true);
        expect(finding.confidenceScore).toBeGreaterThanOrEqual(0.85);
        expect(finding.evidenceLocation).toBeDefined();
        expect(finding.evidenceLocation.pageNumber).toBe(1);
        expect(finding.evidenceLocation.xMax).toBeGreaterThan(
          finding.evidenceLocation.xMin,
        );
      }

      // Verify classification metadata
      expect(report.classification.category).toBe('LAND_TITLE_DEED');
      expect(report.classification.isRecognized).toBe(true);
      expect(report.anomalyFlags).toHaveLength(0);
    });

    it('should extract building plan approval metrics (built-up area, carpet area, FAR)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${buildingPlanDocId}/process`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ forceReprocess: true });

      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.documentId).toBe(buildingPlanDocId);
      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.OCR_EXTRACTED,
      );
      expect(report.extractedFields.approvalNumber).toBe('BPA-MC-2023-456');
      expect(report.extractedFields.approvalDate).toBe('2023-01-20');
      expect(report.extractedFields.totalBuiltUpAreaSqm).toBe(5420.75);
      expect(report.extractedFields.carpetAreaSqm).toBe(4800.0);
      expect(report.extractedFields.floorAreaRatio).toBe(1.75);
    });
  });

  describe('2. Negative Conditions, Anomaly Indicators & Failure Recovery', () => {
    it('should transition to MANUAL_REVIEW_REQUIRED and attach LOW_OCR_CONFIDENCE when confidence < 0.85', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${landDeedDocId}/process`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ forceReprocess: true, simulateLowConfidence: true });

      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
      );
      expect(report.ocrConfidence).toBeLessThan(0.85);
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'LOW_OCR_CONFIDENCE',
          isAdvisory: true,
        }),
      );
    });

    it('should transition to FAILED_OCR on engine timeout without crashing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${landDeedDocId}/process`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({ forceReprocess: true, simulateTimeout: true });

      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.processingStatus).toBe(DocumentProcessingStatus.FAILED_OCR);
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'FAILED_OCR',
          description: expect.stringContaining('timeout'),
          isAdvisory: true,
        }),
      );
    });

    it('should flag UNRECOGNIZED_DOCUMENT_TYPE for unclassified content', async () => {
      // Upload unclassified content
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', unknownCategoryBuffer, 'recipe_notes.pdf')
        .field('documentType', 'LAND_TITLE_DEED');
      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.id;

      const processRes = await request(app.getHttpServer())
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(processRes.status).toBe(200);
      const report = processRes.body.data;
      expect(report.processingStatus).toBe(
        DocumentProcessingStatus.MANUAL_REVIEW_REQUIRED,
      );
      expect(report.anomalyFlags).toContainEqual(
        expect.objectContaining({
          code: 'UNRECOGNIZED_DOCUMENT_TYPE',
          isAdvisory: true,
        }),
      );
    });
  });

  describe('3. Multi-Tenant Access Control & Scrutiny Roles', () => {
    it('should reject unauthenticated process request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/documents/${landDeedDocId}/process`,
      );
      expect(res.status).toBe(401);
    });

    it('should reject cross-tenant processing: Institution B user cannot process Institution A document (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${landDeedDocId}/process`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should reject cross-tenant analysis retrieval: Institution B user cannot view Institution A analysis (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${landDeedDocId}/analysis`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should allow Scrutiny Officer to process and view analysis across institutions', async () => {
      const processRes = await request(app.getHttpServer())
        .post(`/api/v1/documents/${landDeedDocId}/process`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({ forceReprocess: true });
      expect(processRes.status).toBe(200);

      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/documents/${landDeedDocId}/analysis`)
        .set('Authorization', `Bearer ${tokenOfficer}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.documentId).toBe(landDeedDocId);
    });
  });

  describe('4. Analysis Retrieval & Direct Text Classification', () => {
    it('should return cached analysis report via GET /api/v1/documents/:id/analysis', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${landDeedDocId}/analysis`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentId).toBe(landDeedDocId);
      expect(res.body.data.extractedFields.deedNumber).toBe('DEED/2024/7891');
    });

    it('should support direct classification via POST /api/v1/ai/classify', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/classify')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          text: 'MUNICIPAL CORPORATION SANCTIONED BUILDING PLAN APPROVAL Floor Area Ratio FAR Built-up Area',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category).toBe('BUILDING_PLAN_APPROVAL');
      expect(res.body.data.isRecognized).toBe(true);
    });
  });
});
