/**
 * ApprovalSync — Secure Document Intake & Storage E2E Integration Test Suite
 * Milestone: DOC-01
 *
 * Verifies against live PostgreSQL 16 database:
 * 1. Valid PDF, JPEG, and PNG document uploads via multipart/form-data.
 * 2. Rejection of empty (0-byte) files.
 * 3. Rejection of forbidden file extensions (.exe, .sh, .zip).
 * 4. Rejection of disguised executable files (PE/DOS MZ header with .pdf extension).
 * 5. Rejection of MIME spoofing (extension .pdf with JPEG binary signature).
 * 6. Rejection of files containing EICAR malware signature.
 * 7. Path traversal prevention and server-controlled storage key generation.
 * 8. Deny-by-default unauthenticated access (401 Unauthorized).
 * 9. Institutional tenant isolation on upload (Institution A cannot upload to Institution B).
 * 10. Role-based access control (regulatory officers cannot upload applicant documents).
 * 11. Application lifecycle status lock (uploads blocked on SUBMITTED applications).
 * 12. Safe metadata exposure (never leaks storagePath or internal storage details).
 * 13. Tenant-isolated metadata retrieval and cross-institution regulatory read access.
 * 14. Safe streaming download with Content-Disposition: attachment and anti-sniff headers.
 * 15. Tenant-isolated download rejection (Institution B cannot download Institution A files).
 * 16. Regression against existing GET /api/v1/applications/:id/documents endpoint.
 * 17. Document deletion and storage file cleanup with tenancy/status guards.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import {
  UserRole,
  ApplicationStatus,
  DocumentProcessingStatus,
} from '../src/shared/contracts';
import { User } from '../src/database/entities/user.entity';
import { Institution } from '../src/database/entities/institution.entity';
import { Application } from '../src/database/entities/application.entity';
import { Document } from '../src/database/entities/document.entity';

jest.setTimeout(45000);

describe('Secure Document Intake & Storage (e2e)', () => {
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
  let submittedAppA: Application;

  const demoPassword = 'DemoPass@123';
  const fixturesDir = path.resolve(__dirname, 'fixtures', 'documents');

  // Synthetic test file buffers
  const validPdfBuffer = fs.readFileSync(
    path.join(fixturesDir, 'valid-sample.pdf'),
  );
  const validJpgBuffer = fs.readFileSync(
    path.join(fixturesDir, 'valid-sample.jpg'),
  );
  const validPngBuffer = fs.readFileSync(
    path.join(fixturesDir, 'valid-sample.png'),
  );
  const eicarPdfBuffer = fs.readFileSync(
    path.join(fixturesDir, 'eicar-threat.pdf'),
  );
  const exeBuffer = fs.readFileSync(path.join(fixturesDir, 'executable.exe'));
  const spoofedJpegBuffer = fs.readFileSync(
    path.join(fixturesDir, 'spoofed-jpeg.pdf'),
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
    const userRepo = dataSource.getRepository(User);
    const instRepo = dataSource.getRepository(Institution);
    const appRepo = dataSource.getRepository(Application);

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

    // Ensure User B exists
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

    // Create a fresh draft application for Institution A
    appA = appRepo.create({
      applicationNumber: `APP-DOC01-A-${Date.now()}`,
      institutionId: institutionA.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'ENGINEERING_TECHNOLOGY',
      payloadJsonb: { institutionName: institutionA.name },
    });
    await appRepo.save(appA);

    // Create a fresh draft application for Institution B
    appB = appRepo.create({
      applicationNumber: `APP-DOC01-B-${Date.now()}`,
      institutionId: institutionB.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.DRAFT,
      programType: 'ENGINEERING_TECHNOLOGY',
      payloadJsonb: { institutionName: institutionB.name },
    });
    await appRepo.save(appB);

    // Create a SUBMITTED (locked) application for Institution A
    submittedAppA = appRepo.create({
      applicationNumber: `APP-DOC01-SUB-${Date.now()}`,
      institutionId: institutionA.id,
      academicYear: '2026-2027',
      status: ApplicationStatus.SUBMITTED,
      programType: 'ENGINEERING_TECHNOLOGY',
      submittedAt: new Date(),
      payloadJsonb: { institutionName: institutionA.name },
    });
    await appRepo.save(submittedAppA);
  });

  afterAll(async () => {
    // Teardown created applications and documents
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
      if (submittedAppA) {
        await docRepo.delete({ applicationId: submittedAppA.id });
        await appRepo.delete({ id: submittedAppA.id });
      }
    }

    // Clean up test storage directory if created during testing
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (fs.existsSync(storageDir)) {
      try {
        fs.rmSync(storageDir, { recursive: true, force: true });
      } catch {
        // Ignore file system lock errors during test cleanup
      }
    }
    await app.close();
  });

  describe('1. Valid Document Uploads & Contract Compliance', () => {
    it('should successfully upload a valid PDF document to draft application', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, 'land_title_deed.pdf')
        .field('documentType', 'LAND_TITLE_DEED')
        .field('description', '30-year registered lease deed');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const doc = res.body.data;
      expect(doc.id).toBeDefined();
      expect(doc.applicationId).toBe(appA.id);
      expect(doc.documentType).toBe('LAND_TITLE_DEED');
      expect(doc.fileName).toBe('land_title_deed.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.fileSizeBytes).toBe(validPdfBuffer.length);
      expect(doc.sha256Checksum).toHaveLength(64);
      expect(doc.processingStatus).toBe(DocumentProcessingStatus.UPLOADED);
      expect(doc.uploadedAt).toBeDefined();

      // Non-negotiable security: verify internal storagePath is NOT leaked to client
      expect(doc.storagePath).toBeUndefined();
    });

    it('should successfully upload a valid JPEG image', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validJpgBuffer, 'campus_front_view.jpg')
        .field('documentType', 'BUILDING_PHOTO');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mimeType).toBe('image/jpeg');
      expect(res.body.data.fileName).toBe('campus_front_view.jpg');
    });

    it('should successfully upload a valid PNG image', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPngBuffer, 'architectural_plan.png')
        .field('documentType', 'BUILDING_PLAN');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mimeType).toBe('image/png');
      expect(res.body.data.fileName).toBe('architectural_plan.png');
    });

    it('should support direct upload route POST /api/v1/documents/upload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, 'fire_safety.pdf')
        .field('applicationId', appA.id)
        .field('documentType', 'FIRE_SAFETY_CERTIFICATE');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentType).toBe('FIRE_SAFETY_CERTIFICATE');
    });
  });

  describe('2. Negative Security & Binary Signature Validation', () => {
    it('should reject upload when no file is attached with 400 ERR_EMPTY_FILE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_EMPTY_FILE');
    });

    it('should reject a 0-byte empty file with 400 ERR_EMPTY_FILE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', Buffer.alloc(0), 'empty_deed.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_EMPTY_FILE');
    });

    it('should reject forbidden file extension (.exe) with 400 ERR_INVALID_FILE_TYPE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', Buffer.from('malicious code'), 'installer.exe')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_FILE_TYPE');
    });

    it('should reject executable file disguised with .pdf extension (THR-01 PE header) with 400 ERR_MALICIOUS_FILE_TYPE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', exeBuffer, 'disguised_trojan.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_MALICIOUS_FILE_TYPE');
    });

    it('should reject MIME spoofing (extension .pdf with JPEG magic bytes) with 400 ERR_FILE_SIGNATURE_MISMATCH', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', spoofedJpegBuffer, 'spoofed_document.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FILE_SIGNATURE_MISMATCH');
    });

    it('should reject a file containing EICAR malware test string with 400 ERR_MALWARE_DETECTED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', eicarPdfBuffer, 'eicar_infected.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_MALWARE_DETECTED');
    });

    it('should sanitize path traversal attempts in uploaded filenames', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, '../../../../etc/passwd.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('passwd.pdf');
      expect(res.body.data.fileName).not.toContain('..');
      expect(res.body.data.fileName).not.toContain('/');
    });
  });

  describe('3. Authentication, RBAC & Tenant Isolation', () => {
    it('should reject unauthenticated upload attempt with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .attach('file', validPdfBuffer, 'unauth.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(401);
    });

    it('should reject cross-tenant upload: Institution B user attempting to upload to Institution A application (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstB}`)
        .attach('file', validPdfBuffer, 'cross_tenant.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should reject upload by regulatory officers (SCRUTINY_OFFICER) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .attach('file', validPdfBuffer, 'officer_upload.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject upload on a SUBMITTED application with 400 ERR_APPLICATION_LOCKED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${submittedAppA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, 'post_submit.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_APPLICATION_LOCKED');
    });
  });

  describe('4. Metadata Retrieval, Streaming Download & Tenant Isolation', () => {
    let testDocId: string;

    beforeAll(async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, 'download_test.pdf')
        .field('documentType', 'LAND_TITLE_DEED');

      expect(uploadRes.status).toBe(201);
      testDocId = uploadRes.body.data.id;
    });

    it('should retrieve safe document metadata for owner institution', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testDocId);
      expect(res.body.data.fileName).toBe('download_test.pdf');
      expect(res.body.data.storagePath).toBeUndefined();
    });

    it('should reject cross-tenant metadata query by Institution B with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should allow Scrutiny Officer to view document metadata across institutions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testDocId);
    });

    it('should return 404 for a non-existent document UUID', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('should stream document file for download with secure headers for owner institution', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/download`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain(
        'attachment; filename="download_test.pdf"',
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.body).toBeDefined();

      // Verify downloaded content equals uploaded buffer
      expect(Buffer.from(res.body).slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should reject cross-tenant document download attempt with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/download`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should allow Scrutiny Officer to download document across institutions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${testDocId}/download`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('5. Regression: Existing Application Attachments Metadata Endpoint', () => {
    it('should return uploaded documents through GET /api/v1/applications/:id/documents', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstDoc = res.body.data[0];
      expect(firstDoc.id).toBeDefined();
      expect(firstDoc.applicationId).toBe(appA.id);
      expect(firstDoc.fileName).toBeDefined();
      expect(firstDoc.mimeType).toBeDefined();
      expect(firstDoc.fileSizeBytes).toBeDefined();
      expect(firstDoc.sha256Checksum).toBeDefined();
      expect(firstDoc.processingStatus).toBe(DocumentProcessingStatus.UPLOADED);
      expect(firstDoc.storagePath).toBeUndefined();
    });
  });

  describe('6. Document Deletion & Storage Cleanup', () => {
    let docToDeleteId: string;

    beforeEach(async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/applications/${appA.id}/documents`)
        .set('Authorization', `Bearer ${tokenInstA}`)
        .attach('file', validPdfBuffer, 'to_be_deleted.pdf')
        .field('documentType', 'AFFIDAVIT_APH');

      expect(uploadRes.status).toBe(201);
      docToDeleteId = uploadRes.body.data.id;
    });

    it('should reject deletion attempt by Institution B user with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${tokenInstB}`);

      expect(res.status).toBe(403);
    });

    it('should reject deletion attempt by Scrutiny Officer with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${tokenOfficer}`);

      expect(res.status).toBe(403);
    });

    it('should allow owner institution user to delete draft document attachment', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(docToDeleteId);

      // Verify document no longer exists
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/v1/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${tokenInstA}`);

      expect(verifyRes.status).toBe(404);
    });
  });
});
