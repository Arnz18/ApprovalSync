/**
 * ApprovalSync — Compliance Evidence & Infrastructure Review Assist E2E Integration Tests
 * Milestone: DOC-06
 *
 * Validates automated compliance evidence evaluation against versioned regulatory rules (BE-05),
 * explainable infrastructure review heuristics, tenancy isolation, advisory guarantees (ADR-004),
 * and finding traceability against real PostgreSQL 16.
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

describe('Compliance Evidence & Infrastructure Review Assist (e2e)', () => {
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
    // appA: Undergraduate Engineering with land and building declarations
    appA = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionA.id,
        applicationNumber: `APP-E2E-DOC06-A-${Date.now()}`,
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

    // appB: Belongs to Institution B
    appB = await applicationRepo.save(
      applicationRepo.create({
        institutionId: institutionB.id,
        applicationNumber: `APP-E2E-DOC06-B-${Date.now()}`,
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

    // Attach documents with extracted metadata to appA
    docLandDeedA = await docRepo.save(
      docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land-deed-inst-a.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        storagePath: `documents/${appA.id}/land-deed.pdf`,
        fileHashSha256: 'c'.repeat(64),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              deedNumber: 'MAH-PUN-2024-REG-8819',
              khasraNumber: '108/2B',
              landAreaAcres: 8.5,
              registrationDate: '2022-01-15',
              cluOrderNumber: 'CLU-EDU-2023-4410',
            },
            confidenceScores: {
              landAreaAcres: 0.95,
              deedNumber: 0.98,
            },
          },
        },
      }),
    );

    docBuildingPlanA = await docRepo.save(
      docRepo.create({
        applicationId: appA.id,
        documentType: 'BUILDING_PLAN_SANCTION',
        fileName: 'sanctioned-building-plan.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 4096,
        storagePath: `documents/${appA.id}/building-plan.pdf`,
        fileHashSha256: 'd'.repeat(64),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              sanctionOrderNumber: 'PMC-BP-2024-771',
              totalBuiltUpAreaSqMeters: 6200,
              carpetAreaSqMeters: 5100,
              barrierFreeAccessible: true,
              fireNocValidUntil: '2027-12-31',
            },
            confidenceScores: {
              totalBuiltUpAreaSqMeters: 0.92,
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

  describe('Security, Tenancy Isolation, and Authentication', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/applications/${appA.id}/compliance-assist/evaluate`,
      );
      expect(res.status).toBe(401);
    });

    it('rejects cross-tenant evaluation attempts from a different institution user with 403 Forbidden', async () => {
      // User B attempts to evaluate Application A (owned by Institution A)
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows Institution User to evaluate their own application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.applicationId).toBe(appA.id);
    });

    it('allows SCRUTINY_OFFICER to evaluate applications across any institution', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.applicationId).toBe(appB.id);
    });
  });

  describe('Compliance Evidence Assessment & Advisory Behavior (ADR-004)', () => {
    it('evaluates compliance against versioned rules and preserves strictly advisory status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({
          evaluationDate: '2026-10-01',
        });

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Invariants
      expect(data.isAdvisory).toBe(true);
      expect(data.disclaimer).toContain('strictly ADVISORY');
      expect(data.disclaimer).toContain('ADR-004');
      expect(data.ruleSetCode).toBe('RULESET-ENGG-UG');
      expect(data.ruleVersionNumber).toBeDefined();

      // Summary
      expect(data.summary).toBeDefined();
      expect(data.summary.totalRulesEvaluated).toBeGreaterThan(0);
      expect(typeof data.summary.criticalDeficienciesCount).toBe('number');
      expect(typeof data.summary.advisoryFlagsCount).toBe('number');
      expect(typeof data.summary.compliantCount).toBe('number');
      expect(typeof data.summary.hasCriticalDeficiency).toBe('boolean');

      // Findings array traceability
      expect(Array.isArray(data.findings)).toBe(true);
      expect(data.findings.length).toBeGreaterThan(0);

      // Verify each finding structure and traceability
      for (const finding of data.findings) {
        expect(finding.id).toBeDefined();
        expect(finding.findingCode).toBeDefined();
        expect(finding.severity).toBeDefined();
        expect(finding.title).toBeDefined();
        expect(finding.description).toBeDefined();
        expect(finding.isAdvisory).toBe(true);
        expect(Array.isArray(finding.evidence)).toBe(true);
        expect(Array.isArray(finding.limitations)).toBe(true);
      }

      // Verify documentary evidence traceability
      const evidenceDocIds = data.findings.flatMap((f: any) =>
        f.evidence.map((e: any) => e.documentId),
      );
      expect(
        evidenceDocIds.includes(docLandDeedA.id) ||
          evidenceDocIds.includes(docBuildingPlanA.id),
      ).toBe(true);
    });

    it('evaluates infrastructure evidence heuristics with explainable limitations', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({});

      expect(res.status).toBe(200);
      const infraReview = res.body.data.infrastructureReview;

      expect(infraReview).toBeDefined();
      expect(typeof infraReview.landCompliant).toBe('boolean');
      expect(typeof infraReview.builtUpAreaCompliant).toBe('boolean');
      expect(typeof infraReview.evcInspectionRecommended).toBe('boolean');
      expect(Array.isArray(infraReview.heuristicLimitations)).toBe(true);
      expect(infraReview.heuristicLimitations.length).toBeGreaterThan(0);

      // Verify limitation disclaimer is grounded and honest
      const limitationsText = infraReview.heuristicLimitations.join(' ');
      expect(limitationsText).toContain('physical');
    });

    it('retrieves compliance assessment via GET endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/compliance-assist`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.applicationId).toBe(appA.id);
      expect(res.body.data.isAdvisory).toBe(true);
      expect(res.body.data.summary).toBeDefined();
    });

    it('returns 404 for non-existent application UUID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${nonExistentId}/compliance-assist`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('persists evaluation snapshot deterministically in application payloadJsonb', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/compliance-assist/evaluate`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .send({});

      // Direct database verification
      const appRepo = dataSource.getRepository(Application);
      const savedApp = await appRepo.findOne({ where: { id: appA.id } });

      const assessmentPayload = (savedApp?.payloadJsonb as any)
        ?.complianceAssessment;
      expect(assessmentPayload).toBeDefined();
      expect(assessmentPayload?.ruleSetCode).toBe('RULESET-ENGG-UG');
      expect(assessmentPayload?.summary).toBeDefined();
    });
  });
});
