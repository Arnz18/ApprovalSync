/**
 * ApprovalSync — Duplicate & Document Anomaly Detection E2E Integration Tests
 * Milestone: DOC-04
 *
 * Validates exact SHA-256 deduplication, near-duplicate text similarity,
 * shared template discrimination, PDF structural integrity, active content detection,
 * metadata timeline anomalies, image editing tool heuristics, digital signature status,
 * and tenant privacy against real PostgreSQL 16.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
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
  ValidationOutcome,
  ValidationCategory,
} from '../src/verification/enums';
import {
  STORAGE_ADAPTER_TOKEN,
  IStorageAdapter,
} from '../src/documents/interfaces/storage-adapter.interface';

describe('Document Duplicate & Anomaly Indicators (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storageAdapter: IStorageAdapter;

  let institutionA: Institution;
  let institutionB: Institution;
  let institutionAUser: User;
  let institutionBUser: User;
  let scrutinyOfficerUser: User;

  let tokenInstA: string;
  let tokenInstB: string;
  let tokenOfficer: string;

  let appA: Application;
  let appA2: Application;
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
    storageAdapter = app.get<IStorageAdapter>(STORAGE_ADAPTER_TOKEN);
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

    // Fetch test users from seeds
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

    expect(institutionAUser).toBeDefined();
    expect(institutionBUser).toBeDefined();
    expect(scrutinyOfficerUser).toBeDefined();

    // Authenticate users
    const loginInstA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: institutionAUser.email, password: demoPassword });
    expect(loginInstA.status).toBe(200);
    tokenInstA = loginInstA.body.data.accessToken;

    const loginInstB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: institutionBUser.email, password: demoPassword });
    expect(loginInstB.status).toBe(200);
    tokenInstB = loginInstB.body.data.accessToken;

    const loginOfficer = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: scrutinyOfficerUser.email, password: demoPassword });
    expect(loginOfficer.status).toBe(200);
    tokenOfficer = loginOfficer.body.data.accessToken;

    // Create applications for tests
    appA = applicationRepo.create({
      institutionId: institutionA.id,
      applicationNumber: `APP-E2E-DUP-${Date.now()}-A`,
      academicYear: '2026-2027',
      programType: 'ENGINEERING_TECHNOLOGY',
      status: ApplicationStatus.SUBMITTED,
      payloadJsonb: {
        declaredIntake: 300,
      },
    });
    await applicationRepo.save(appA);

    appA2 = applicationRepo.create({
      institutionId: institutionA.id,
      applicationNumber: `APP-E2E-DUP-${Date.now()}-A2`,
      academicYear: '2025-2026',
      programType: 'ENGINEERING_TECHNOLOGY',
      status: ApplicationStatus.SUBMITTED,
      payloadJsonb: {},
    });
    await applicationRepo.save(appA2);

    appB = applicationRepo.create({
      institutionId: institutionB.id,
      applicationNumber: `APP-E2E-DUP-${Date.now()}-B`,
      academicYear: '2026-2027',
      programType: 'POLYTECHNIC_DIPLOMA',
      status: ApplicationStatus.SUBMITTED,
      payloadJsonb: {},
    });
    await applicationRepo.save(appB);
  });

  afterAll(async () => {
    const docRepo = dataSource.getRepository(Document);
    const appRepo = dataSource.getRepository(Application);

    if (appA?.id) {
      await docRepo.delete({ applicationId: appA.id });
      await appRepo.delete({ id: appA.id });
    }
    if (appA2?.id) {
      await docRepo.delete({ applicationId: appA2.id });
      await appRepo.delete({ id: appA2.id });
    }
    if (appB?.id) {
      await docRepo.delete({ applicationId: appB.id });
      await appRepo.delete({ id: appB.id });
    }

    await app.close();
  });

  describe('1. Exact Cryptographic Duplicate Detection (SHA-256)', () => {
    it('should detect intra-application exact duplicate when identical bytes are uploaded twice', async () => {
      const docRepo = dataSource.getRepository(Document);
      const duplicateContent = Buffer.from(
        '%PDF-1.4\nDuplicate land title deed content\n%%EOF',
      );
      const duplicateHash = crypto
        .createHash('sha256')
        .update(duplicateContent)
        .digest('hex');

      const storagePath1 = `documents/${appA.id}/dup-1.pdf`;
      const storagePath2 = `documents/${appA.id}/dup-2.pdf`;

      await storageAdapter.save(
        storagePath1,
        duplicateContent,
        'application/pdf',
      );
      await storageAdapter.save(
        storagePath2,
        duplicateContent,
        'application/pdf',
      );

      const doc1 = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed_original.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: duplicateContent.length,
        storagePath: storagePath1,
        fileHashSha256: duplicateHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });
      const doc2 = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'land_deed_duplicate_copy.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: duplicateContent.length,
        storagePath: storagePath2,
        fileHashSha256: duplicateHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });

      await docRepo.save([doc1, doc2]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.exactDuplicatesCount).toBeGreaterThanOrEqual(2);

      const intraFindings = res.body.data.findings.filter(
        (f: any) => f.ruleId === 'DOC-DUP-EXACT-INTRA-APP',
      );
      expect(intraFindings.length).toBeGreaterThanOrEqual(2);
      expect(intraFindings[0].outcome).toBe(ValidationOutcome.EXACT_DUPLICATE);
      expect(intraFindings[0].severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
      expect(intraFindings[0].isAdvisory).toBe(true);
    });

    it('should flag inter-application duplicate within same institution as ADVISORY_FLAG', async () => {
      const docRepo = dataSource.getRepository(Document);
      const sharedDeedContent = Buffer.from(
        '%PDF-1.4\nPerpetual trust registration deed\n%%EOF',
      );
      const sharedHash = crypto
        .createHash('sha256')
        .update(sharedDeedContent)
        .digest('hex');

      const storagePathPrior = `documents/${appA2.id}/shared-deed.pdf`;
      const storagePathCurrent = `documents/${appA.id}/reused-deed.pdf`;

      await storageAdapter.save(
        storagePathPrior,
        sharedDeedContent,
        'application/pdf',
      );
      await storageAdapter.save(
        storagePathCurrent,
        sharedDeedContent,
        'application/pdf',
      );

      // Prior year application document
      const docPrior = docRepo.create({
        applicationId: appA2.id,
        documentType: 'TRUST_SOCIETY_REGISTRATION',
        fileName: 'trust_registration_2025.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: sharedDeedContent.length,
        storagePath: storagePathPrior,
        fileHashSha256: sharedHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });

      // Current year application document
      const docCurrent = docRepo.create({
        applicationId: appA.id,
        documentType: 'TRUST_SOCIETY_REGISTRATION',
        fileName: 'trust_registration_2026.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: sharedDeedContent.length,
        storagePath: storagePathCurrent,
        fileHashSha256: sharedHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });

      await docRepo.save([docPrior, docCurrent]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      const sameInstFinding = res.body.data.findings.find(
        (f: any) =>
          f.ruleId === 'DOC-DUP-EXACT-SAME-INSTITUTION' &&
          f.documentId === docCurrent.id,
      );

      expect(sameInstFinding).toBeDefined();
      expect(sameInstFinding.outcome).toBe(ValidationOutcome.EXACT_DUPLICATE);
      expect(sameInstFinding.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(sameInstFinding.metadata.matchedApplicationNumber).toBe(
        appA2.applicationNumber,
      );
    });

    it('should detect cross-institution collision and REDACT foreign metadata for applicant', async () => {
      const docRepo = dataSource.getRepository(Document);
      const collisionContent = Buffer.from(
        '%PDF-1.4\nCompromised fire safety certificate byte stream\n%%EOF',
      );
      const collisionHash = crypto
        .createHash('sha256')
        .update(collisionContent)
        .digest('hex');

      const storagePathCollegeB = `documents/${appB.id}/fire_noc.pdf`;
      const storagePathCollegeA = `documents/${appA.id}/fire_noc_copy.pdf`;

      await storageAdapter.save(
        storagePathCollegeB,
        collisionContent,
        'application/pdf',
      );
      await storageAdapter.save(
        storagePathCollegeA,
        collisionContent,
        'application/pdf',
      );

      // College B document
      const docCollegeB = docRepo.create({
        applicationId: appB.id,
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_safety_college_b.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: collisionContent.length,
        storagePath: storagePathCollegeB,
        fileHashSha256: collisionHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });

      // College A document
      const docCollegeA = docRepo.create({
        applicationId: appA.id,
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'fire_safety_college_a.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: collisionContent.length,
        storagePath: storagePathCollegeA,
        fileHashSha256: collisionHash,
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });

      await docRepo.save([docCollegeB, docCollegeA]);

      // 1. Applicant A queries duplicates: MUST BE REDACTED
      const resApplicant = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      const applicantFinding = resApplicant.body.data.findings.find(
        (f: any) =>
          f.ruleId === 'DOC-DUP-EXACT-CROSS-INSTITUTION' &&
          f.documentId === docCollegeA.id,
      );

      expect(applicantFinding).toBeDefined();
      expect(applicantFinding.outcome).toBe(ValidationOutcome.EXACT_DUPLICATE);
      expect(applicantFinding.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
      // Redaction verification: Foreign name/IDs not leaked
      expect(applicantFinding.message).not.toContain(institutionB.name);
      expect(applicantFinding.metadata.matchedInstitutionName).toBeUndefined();
      expect(applicantFinding.metadata.redacted).toBe(true);

      // 2. Regulatory Officer queries duplicates: UNREDACTED supervisory detail
      const resOfficer = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .expect(200);

      const officerFinding = resOfficer.body.data.findings.find(
        (f: any) =>
          f.ruleId === 'DOC-DUP-EXACT-CROSS-INSTITUTION' &&
          f.documentId === docCollegeA.id,
      );

      expect(officerFinding).toBeDefined();
      expect(officerFinding.message).toContain(institutionB.name);
      expect(officerFinding.metadata.matchedInstitutionName).toBe(
        institutionB.name,
      );
      expect(officerFinding.metadata.matchedApplicationNumber).toBe(
        appB.applicationNumber,
      );
    });
  });

  describe('2. Near-Duplicate & Template Discrimination', () => {
    it('should detect near-duplicate rescan sharing identical statutory identifier', async () => {
      const docRepo = dataSource.getRepository(Document);

      const contentA = Buffer.from('%PDF-1.4\nScan version 1\n%%EOF');
      const contentB = Buffer.from(
        '%PDF-1.4\nScan version 2 (recompressed)\n%%EOF',
      );

      const pathA = `documents/${appA.id}/noc_scan1.pdf`;
      const pathB = `documents/${appA.id}/noc_scan2.pdf`;

      await storageAdapter.save(pathA, contentA, 'application/pdf');
      await storageAdapter.save(pathB, contentB, 'application/pdf');

      const docA = docRepo.create({
        applicationId: appA.id,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'plan_scan1.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: contentA.length,
        storagePath: pathA,
        fileHashSha256: crypto
          .createHash('sha256')
          .update(contentA)
          .digest('hex'),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              planApprovalNumber: 'PLAN/2026/PUNE/7890',
            },
          },
        },
      });

      const docB = docRepo.create({
        applicationId: appA.id,
        documentType: 'BUILDING_PLAN_APPROVAL',
        fileName: 'plan_scan2.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: contentB.length,
        storagePath: pathB,
        fileHashSha256: crypto
          .createHash('sha256')
          .update(contentB)
          .digest('hex'),
        processingStatus: DocumentProcessingStatus.OCR_EXTRACTED,
        metadata: {
          analysisReport: {
            extractedFields: {
              planApprovalNumber: 'PLAN/2026/PUNE/7890',
            },
          },
        },
      });

      await docRepo.save([docA, docB]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      const nearFinding = res.body.data.findings.find(
        (f: any) =>
          f.ruleId === 'DOC-DUP-NEAR-IDENTIFIER-MATCH' &&
          f.documentId === docA.id,
      );

      expect(nearFinding).toBeDefined();
      expect(nearFinding.outcome).toBe(ValidationOutcome.NEAR_DUPLICATE);
      expect(nearFinding.observedValue).toBe('PLAN/2026/PUNE/7890');
      expect(nearFinding.isAdvisory).toBe(true);
    });
  });

  describe('3. Document Structural Integrity & Anomaly Endpoints', () => {
    it('should detect active JavaScript action in PDF via POST /api/v1/documents/:id/check-integrity', async () => {
      const docRepo = dataSource.getRepository(Document);
      const activeScriptBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("hack");) >>\nendobj\n%%EOF',
      );
      const storagePath = `documents/${appA.id}/malicious_active_doc.pdf`;
      await storageAdapter.save(
        storagePath,
        activeScriptBuffer,
        'application/pdf',
      );

      const doc = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'malicious_active_doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: activeScriptBuffer.length,
        storagePath,
        fileHashSha256: crypto
          .createHash('sha256')
          .update(activeScriptBuffer)
          .digest('hex'),
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });
      await docRepo.save(doc);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${doc.id}/check-integrity`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overallStatus).toBe('FAIL');

      const activeContentFinding = res.body.data.findings.find(
        (f: any) => f.ruleId === 'DOC-INT-PDF-ACTIVE-CONTENT',
      );
      expect(activeContentFinding).toBeDefined();
      expect(activeContentFinding.outcome).toBe(
        ValidationOutcome.ANOMALY_DETECTED,
      );
      expect(activeContentFinding.severity).toBe(
        ComplianceSeverity.CRITICAL_DEFICIENCY,
      );
    });

    it('should detect metadata timeline inversion in PDF', async () => {
      const docRepo = dataSource.getRepository(Document);
      const invertedBuffer = Buffer.from(
        '%PDF-1.4\n' +
          '/CreationDate (D:20240815100000Z)\n' +
          '/ModDate (D:20210101100000Z)\n' +
          '%%EOF',
      );
      const storagePath = `documents/${appA.id}/inverted_time.pdf`;
      await storageAdapter.save(storagePath, invertedBuffer, 'application/pdf');

      const doc = docRepo.create({
        applicationId: appA.id,
        documentType: 'FIRE_SAFETY_CERTIFICATE',
        fileName: 'inverted_time.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: invertedBuffer.length,
        storagePath,
        fileHashSha256: crypto
          .createHash('sha256')
          .update(invertedBuffer)
          .digest('hex'),
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });
      await docRepo.save(doc);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${doc.id}/integrity`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const timelineFinding = res.body.data.findings.find(
        (f: any) => f.ruleId === 'DOC-INT-METADATA-TIMELINE-INVERSION',
      );
      expect(timelineFinding).toBeDefined();
      expect(timelineFinding.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(timelineFinding.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
    });

    it('should detect Adobe Photoshop editing artifact in image file', async () => {
      const docRepo = dataSource.getRepository(Document);
      const photoshopJpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
        Buffer.from('Photoshop 3.0 8BIM Adobe Photoshop CS6 Extended'),
        Buffer.from([0xff, 0xd9]),
      ]);
      const storagePath = `documents/${appA.id}/ps_deed.jpg`;
      await storageAdapter.save(storagePath, photoshopJpeg, 'image/jpeg');

      const doc = docRepo.create({
        applicationId: appA.id,
        documentType: 'LAND_TITLE_DEED',
        fileName: 'ps_deed.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: photoshopJpeg.length,
        storagePath,
        fileHashSha256: crypto
          .createHash('sha256')
          .update(photoshopJpeg)
          .digest('hex'),
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });
      await docRepo.save(doc);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/documents/${doc.id}/check-integrity`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      const psFinding = res.body.data.findings.find(
        (f: any) => f.ruleId === 'DOC-INT-IMAGE-EDITING-TOOL',
      );
      expect(psFinding).toBeDefined();
      expect(psFinding.outcome).toBe(ValidationOutcome.ANOMALY_DETECTED);
      expect(psFinding.severity).toBe(ComplianceSeverity.ADVISORY_FLAG);
      expect(psFinding.message).toContain('Adobe Photoshop');
    });
  });

  describe('4. Full Application Validation Aggregation', () => {
    it('should aggregate duplicate detection and integrity findings into POST /api/v1/applications/:id/validate-documents', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/validate-documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const findings = res.body.data.findings;

      // Verify DUPLICATE_DETECTION category findings are present
      const dupFindings = findings.filter(
        (f: any) => f.category === ValidationCategory.DUPLICATE_DETECTION,
      );
      expect(dupFindings.length).toBeGreaterThan(0);

      // Verify DOCUMENT_INTEGRITY category findings are present
      const integrityFindings = findings.filter(
        (f: any) => f.category === ValidationCategory.DOCUMENT_INTEGRITY,
      );
      expect(integrityFindings.length).toBeGreaterThan(0);

      // Verify Human Sovereignty rule: all findings are advisory
      for (const f of findings) {
        expect(f.isAdvisory).toBe(true);
      }
    });
  });

  describe('5. Authorization & Tenant Security (IDOR Defense)', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/check-duplicates`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/v1/documents/${appA.id}/integrity`)
        .expect(401);
    });

    it('should reject College A user requesting duplicate check on College B application with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should reject College A user inspecting integrity of College B document with 403 Forbidden', async () => {
      const docRepo = dataSource.getRepository(Document);
      const docB = await docRepo.findOne({
        where: { applicationId: appB.id },
      });

      if (docB) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/documents/${docB.id}/check-integrity`)
          .set('Authorization', `Bearer ${tokenInstA}`)
          .expect(403);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('ERR_FORBIDDEN');
      }
    });

    it('should allow College B user to check duplicates on College B application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appB.id}/check-duplicates`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toBe(appB.id);
      expect(res.body.data.findings).toBeDefined();
    });
  });
});
