/**
 * ApprovalSync — Document Validation Engine E2E Integration Tests
 * Milestone: DOC-03
 *
 * Validates document completeness rules, required statutory field extraction,
 * document expiry validation with injected clock dates, fuzzy cross-record consistency,
 * evidence links, tenant isolation, and reporting endpoints against real PostgreSQL 16.
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
  ComplianceSeverity,
} from '../src/shared/contracts';
import {
  OverallValidationStatus,
  ValidationOutcome,
  ValidationCategory,
} from '../src/verification/enums';

describe('Document Validation Engine (e2e)', () => {
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

    // Create fresh draft applications with realistic declared payload
    appA = applicationRepo.create({
      applicationNumber: `APP-DOC03-A-${Date.now()}`,
      institutionId: institutionA.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering',
      payloadJsonb: {
        institutionName: institutionA.name,
        trustName: 'Apex Educational Trust',
        surveyNumber: 'Plot 42/1',
        landAreaAcres: 10.0,
        builtUpAreaSqMeters: 4500,
      },
    });
    await applicationRepo.save(appA);

    appB = applicationRepo.create({
      applicationNumber: `APP-DOC03-B-${Date.now()}`,
      institutionId: institutionB.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'Undergraduate Engineering',
      payloadJsonb: {
        institutionName: institutionB.name,
      },
    });
    await applicationRepo.save(appB);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Tenant Isolation and Authorization', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/applications/${appA.id}/validate-documents`,
      );
      expect(res.status).toBe(401);
    });

    it('should block institution user B from validating application A with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/validate-documents`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('tenancy mismatch');
    });

    it('should allow scrutiny officer to validate any institution application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/validate-documents`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applicationId).toBe(appA.id);
    });

    it('should return 404 for non-existent application UUID', async () => {
      const fakeUuid = 'a0000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${fakeUuid}/validate-documents`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Incomplete Application Validation', () => {
    it('should report critical deficiencies when mandatory documents are missing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/validate-documents`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.overallStatus).toBe(OverallValidationStatus.DEFICIENT);
      expect(data.summary.totalDeficiencies).toBeGreaterThanOrEqual(5);

      const missingFindings = data.findings.filter(
        (f: any) =>
          f.category === ValidationCategory.DOCUMENT_COMPLETENESS &&
          f.outcome === ValidationOutcome.DEFICIENT,
      );
      expect(missingFindings.length).toBe(5);

      // Verify ADR-004 compliance: all findings are strictly advisory
      for (const finding of data.findings) {
        expect(finding.isAdvisory).toBe(true);
      }
    });
  });

  describe('Full Document Suite Completeness, Expiry, and Consistency', () => {
    beforeAll(async () => {
      const docRepo = dataSource.getRepository(Document);

      // Seed comprehensive synthetic documents with DOC-02 extraction analysis reports
      const landDeed = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'registered_land_deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 204800,
        storagePath: `documents/${appA.id}/deed.pdf`,
        fileHashSha256: 'deed-sha256-hash-001',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrClassification: 'LAND_TITLE_DEED',
          analysisReport: {
            extractedFields: {
              deedNumber: 'DEED-2022-PUNE-8921',
              registrationDate: '2022-04-10',
              leaseTenureYears: 35,
              landAreaAcres: 12.5,
              surveyNumber: 'Plot 42/1, Sector 4',
              lesseeName:
                'Apex Institute of Technology & Engineering (DEMO/SYNTHETIC)',
            },
            findings: [
              {
                fieldKey: 'deedNumber',
                extractedValue: 'DEED-2022-PUNE-8921',
                confidenceScore: 0.95,
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.1,
                  xMax: 0.4,
                  yMax: 0.15,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'registrationDate',
                extractedValue: '2022-04-10',
                confidenceScore: 0.93,
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.2,
                  xMax: 0.35,
                  yMax: 0.25,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'leaseTenureYears',
                extractedValue: 35,
                confidenceScore: 0.94,
                evidenceLocation: {
                  pageNumber: 2,
                  xMin: 0.2,
                  yMin: 0.3,
                  xMax: 0.45,
                  yMax: 0.35,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'surveyNumber',
                extractedValue: 'Plot 42/1, Sector 4',
                confidenceScore: 0.91,
                evidenceLocation: {
                  pageNumber: 2,
                  xMin: 0.1,
                  yMin: 0.5,
                  xMax: 0.4,
                  yMax: 0.55,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'landAreaAcres',
                extractedValue: 12.5,
                confidenceScore: 0.92,
                evidenceLocation: {
                  pageNumber: 2,
                  xMin: 0.1,
                  yMin: 0.6,
                  xMax: 0.3,
                  yMax: 0.65,
                },
                isAdvisory: true,
              },
              {
                fieldKey: 'lesseeName',
                extractedValue:
                  'Apex Institute of Technology & Engineering (DEMO/SYNTHETIC)',
                confidenceScore: 0.96,
                evidenceLocation: {
                  pageNumber: 1,
                  xMin: 0.1,
                  yMin: 0.7,
                  xMax: 0.6,
                  yMax: 0.75,
                },
                isAdvisory: true,
              },
            ],
            ocrConfidence: 0.94,
          },
        },
      });
      await docRepo.save(landDeed);

      const cluDoc = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_USE_CERTIFICATE',
        fileName: 'land_use_order.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 153600,
        storagePath: `documents/${appA.id}/clu.pdf`,
        fileHashSha256: 'clu-sha256-hash-002',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrClassification: 'LAND_USE_CERTIFICATE',
          analysisReport: {
            extractedFields: {
              orderNumber: 'CLU/REV/2021/771',
              issueDate: '2021-08-20',
              permittedUse: 'Educational / Higher Technical Institution',
            },
            findings: [],
            ocrConfidence: 0.92,
          },
        },
      });
      await docRepo.save(cluDoc);

      const planDoc = docRepo.create({
        applicationId: appA.id,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'sanctioned_plan.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 409600,
        storagePath: `documents/${appA.id}/plan.pdf`,
        fileHashSha256: 'plan-sha256-hash-003',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrClassification: 'BUILDING_PLAN_APPROVAL',
          analysisReport: {
            extractedFields: {
              approvalNumber: 'PMC/BP/2022/411',
              approvalDate: '2022-11-15',
              totalBuiltUpAreaSqm: 4800, // Satisfies declared 4500
              issuingAuthority: 'Pune Municipal Corporation',
            },
            findings: [],
            ocrConfidence: 0.93,
          },
        },
      });
      await docRepo.save(planDoc);

      const fireDoc = docRepo.create({
        applicationId: appA.id,
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_safety_noc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 180000,
        storagePath: `documents/${appA.id}/fire.pdf`,
        fileHashSha256: 'fire-sha256-hash-004',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrClassification: 'FIRE_SAFETY_CERTIFICATE',
          analysisReport: {
            extractedFields: {
              nocNumber: 'MH/FIRE/PUNE/2026/012',
              issueDate: '2026-01-10',
              expiryDate: '2027-01-09', // Valid through Jan 2027
            },
            findings: [],
            ocrConfidence: 0.95,
          },
        },
      });
      await docRepo.save(fireDoc);

      const trustDoc = docRepo.create({
        applicationId: appA.id,
        documentType: 'SOCIETY_TRUST_REGISTRATION',
        fileName: 'trust_registration.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 220000,
        storagePath: `documents/${appA.id}/trust.pdf`,
        fileHashSha256: 'trust-sha256-hash-005',
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          ocrClassification: 'SOCIETY_TRUST_REGISTRATION',
          analysisReport: {
            extractedFields: {
              registrationNumber: 'DEMO-INST-2026-001',
              registrationDate: '2010-03-25',
              trustName: 'Apex Educational Trust',
            },
            findings: [],
            ocrConfidence: 0.96,
          },
        },
      });
      await docRepo.save(trustDoc);
    });

    it('should validate application with complete documents, valid dates, and consistent records', async () => {
      // Evaluate as of 2026-06-01
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/applications/${appA.id}/validate-documents?asOfDate=2026-06-01T00:00:00.000Z`,
        )
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.overallStatus).toBe(OverallValidationStatus.COMPLIANT);
      expect(data.summary.totalDeficiencies).toBe(0);
      expect(data.summary.totalCompliant).toBeGreaterThan(10);

      // Verify completeness findings
      const satisfiedDeed = data.findings.find(
        (f: any) => f.ruleId === 'DOC-COMP-SATISFIED-LAND_TITLE_DEED',
      );
      expect(satisfiedDeed).toBeDefined();
      expect(satisfiedDeed.outcome).toBe(ValidationOutcome.VALID);

      // Verify cross-record name match
      const nameMatch = data.findings.find(
        (f: any) => f.ruleId === 'DOC-XREC-NAME-DEED-MATCH',
      );
      expect(nameMatch).toBeDefined();
      expect(nameMatch.outcome).toBe(ValidationOutcome.MATCH);

      // Verify survey number match
      const surveyMatch = data.findings.find(
        (f: any) => f.ruleId === 'DOC-XREC-SURVEY-MATCH',
      );
      expect(surveyMatch).toBeDefined();
      expect(surveyMatch.outcome).toBe(ValidationOutcome.MATCH);

      // Verify registration number match
      const regMatch = data.findings.find(
        (f: any) => f.ruleId === 'DOC-XREC-REG-NUMBER-MATCH',
      );
      expect(regMatch).toBeDefined();
      expect(regMatch.outcome).toBe(ValidationOutcome.MATCH);

      // Verify fire NOC valid
      const fireValid = data.findings.find(
        (f: any) => f.ruleId === 'DOC-EXP-FIRE-NOC-VALID',
      );
      expect(fireValid).toBeDefined();
      expect(fireValid.outcome).toBe(ValidationOutcome.VALID);
    });

    it('should identify expired Fire Safety Certificate when evaluated against future clock', async () => {
      // Set clock to 2028-06-01 when Fire NOC (expiry: 2027-01-09) is expired
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/applications/${appA.id}/validate-documents?asOfDate=2028-06-01T00:00:00.000Z&recalculate=true`,
        )
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.overallStatus).toBe(OverallValidationStatus.DEFICIENT);

      const expiredFinding = data.findings.find(
        (f: any) => f.ruleId === 'DOC-EXP-FIRE-NOC-EXPIRED',
      );
      expect(expiredFinding).toBeDefined();
      expect(expiredFinding.outcome).toBe(ValidationOutcome.EXPIRED);
      expect(expiredFinding.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should retrieve cached validation report via GET /api/v1/applications/:id/validation-report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/validation-report`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applicationId).toBe(appA.id);
      expect(res.body.data.findings.length).toBeGreaterThan(0);
      expect(res.body.data.ruleVersion).toBe('1.0.0');
    });

    it('should block tenant B from viewing tenant A validation report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/validation-report`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('tenancy mismatch');
    });
  });
});
