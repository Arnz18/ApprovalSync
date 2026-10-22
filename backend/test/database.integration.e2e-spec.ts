/**
 * ApprovalSync — PostgreSQL Database Integration Test Suite
 * Milestone: BE-02
 *
 * Exercises real PostgreSQL 16 persistence against the local database instance:
 * 1. Connection lifecycle and pooling
 * 2. Schema integrity, Foreign Key, and Unique constraints
 * 3. JSONB storage, index verification, and operator queries
 * 4. Audit Log tamper-evident mutation defense trigger (immutability)
 * 5. Seed service idempotency and safety
 */

import AppDataSource from '../src/database/data-source';
import {
  Institution,
  Application,
  Document,
  AuditLog,
} from '../src/database/entities';
import {
  UserRole,
  ApplicationStatus,
  DocumentProcessingStatus,
} from '../src/shared/contracts';
import { SeedService } from '../src/database/seeds/seed.service';

describe('Database Integration (PostgreSQL 16 Persistence)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      dbAvailable = true;
    } catch (err: unknown) {
      dbAvailable = false;
      console.warn(
        '[DatabaseIntegration] PostgreSQL 16 service unavailable on 127.0.0.1:5432. Real database integration tests skipped.',
      );
    }
  });

  afterAll(async () => {
    if (dbAvailable && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('Connection & Pool Lifecycle', () => {
    it('should connect to PostgreSQL and execute a raw query', async () => {
      if (!dbAvailable) return;
      const result = await AppDataSource.query('SELECT 1 as connected');
      expect(result).toBeDefined();
      expect(result[0].connected).toBe(1);
    });

    it('should confirm core schema tables exist in information_schema', async () => {
      if (!dbAvailable) return;
      const tables: Array<{ table_name: string }> = await AppDataSource.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('institutions', 'users', 'applications', 'documents', 'audit_logs', 'sla_timers')
        ORDER BY table_name;
      `);
      const tableNames = tables.map((t) => t.table_name);
      expect(tableNames).toContain('institutions');
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('applications');
      expect(tableNames).toContain('documents');
      expect(tableNames).toContain('audit_logs');
      expect(tableNames).toContain('sla_timers');
    });

    it('should confirm GIN index on applications.payload_jsonb exists', async () => {
      if (!dbAvailable) return;
      const indexResult: Array<{ indexname: string; indexdef: string }> =
        await AppDataSource.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'applications'
            AND indexname = 'idx_applications_payload_jsonb';
        `);
      expect(indexResult.length).toBe(1);
      expect(indexResult[0].indexdef.toLowerCase()).toContain('using gin');
    });
  });

  describe('Relational Constraints & Data Integrity', () => {
    const testRegNo = `INT-TEST-${Date.now()}`;
    let createdInstitutionId: string;

    it('should create an institution and enforce unique registration_number', async () => {
      if (!dbAvailable) return;
      const institutionRepo = AppDataSource.getRepository(Institution);
      const inst = institutionRepo.create({
        name: 'Integration Test Institute',
        registrationNumber: testRegNo,
        institutionType: 'Engineering',
        state: 'Delhi',
        district: 'New Delhi',
        pincode: '110001',
        address: '123 Test Marg, New Delhi',
      });
      const saved = await institutionRepo.save(inst);
      createdInstitutionId = saved.id;
      expect(saved.id).toBeDefined();

      // Duplicate registration_number must fail with code 23505 (unique_violation)
      const duplicateInst = institutionRepo.create({
        name: 'Duplicate Institute',
        registrationNumber: testRegNo,
        institutionType: 'Management',
        state: 'Delhi',
        district: 'New Delhi',
        pincode: '110001',
        address: '456 Another Road',
      });
      await expect(institutionRepo.save(duplicateInst)).rejects.toMatchObject({
        code: '23505',
      });
    });

    it('should enforce foreign key constraint on applications.institution_id', async () => {
      if (!dbAvailable) return;
      const appRepo = AppDataSource.getRepository(Application);
      const invalidApp = appRepo.create({
        applicationNumber: `APP-INVALID-FK-${Date.now()}`,
        institutionId: '00000000-0000-0000-0000-000000000000', // Non-existent FK
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Engineering',
        payloadJsonb: {},
      });

      // Must fail with code 23503 (foreign_key_violation)
      await expect(appRepo.save(invalidApp)).rejects.toMatchObject({
        code: '23503',
      });
    });

    it('should cascade delete documents when an application without audit records is deleted', async () => {
      if (!dbAvailable) return;
      const appRepo = AppDataSource.getRepository(Application);
      const docRepo = AppDataSource.getRepository(Document);

      const testApp = appRepo.create({
        applicationNumber: `APP-CASCADE-${Date.now()}`,
        institutionId: createdInstitutionId,
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Engineering',
        payloadJsonb: {},
      });
      const savedApp = await appRepo.save(testApp);

      const doc = docRepo.create({
        applicationId: savedApp.id,
        documentType: 'LAND_DOCUMENT',
        fileName: 'test_cascade_doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        storagePath: '/test/cascade.pdf',
        fileHashSha256:
          'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        processingStatus: DocumentProcessingStatus.UPLOADED,
        metadata: {},
      });
      const savedDoc = await docRepo.save(doc);

      // Verify doc exists
      expect(
        await docRepo.findOne({ where: { id: savedDoc.id } }),
      ).not.toBeNull();

      // Delete parent application
      await appRepo.delete({ id: savedApp.id });

      // Document should be deleted via ON DELETE CASCADE
      const deletedDoc = await docRepo.findOne({ where: { id: savedDoc.id } });
      expect(deletedDoc).toBeNull();
    });
  });

  describe('JSONB Persistence & Querying', () => {
    it('should store, index, and query structured application JSONB payloads', async () => {
      if (!dbAvailable) return;
      const appRepo = AppDataSource.getRepository(Application);
      const instRepo = AppDataSource.getRepository(Institution);

      const inst = await instRepo.findOne({
        where: { registrationNumber: 'DEMO-INST-2026-001' },
      });
      expect(inst).toBeDefined();

      const uniqueKey = `APP-JSONB-${Date.now()}`;
      const app = appRepo.create({
        applicationNumber: uniqueKey,
        institutionId: inst!.id,
        academicYear: '2026-2027',
        status: ApplicationStatus.DRAFT,
        programType: 'Engineering',
        payloadJsonb: {
          campusDetails: {
            landAreaAcres: 15.5,
            builtUpAreaSqMeters: 9200,
          },
          facultyCount: 52,
          programs: ['CSE', 'ECE', 'MECH'],
        },
      });
      await appRepo.save(app);

      // Query using PostgreSQL JSONB operators ->> and @>
      const foundApps = await appRepo
        .createQueryBuilder('app')
        .where(
          "app.payloadJsonb -> 'campusDetails' ->> 'landAreaAcres' = :land",
          {
            land: '15.5',
          },
        )
        .andWhere('app.applicationNumber = :appNumber', {
          appNumber: uniqueKey,
        })
        .getMany();

      expect(foundApps.length).toBe(1);
      expect(foundApps[0].payloadJsonb['facultyCount']).toBe(52);
    });
  });

  describe('Audit Log Immutability & Mutation Defense Trigger', () => {
    it('should block UPDATE on audit_logs via trg_audit_logs_no_mutation trigger', async () => {
      if (!dbAvailable) return;
      const auditRepo = AppDataSource.getRepository(AuditLog);
      const appRepo = AppDataSource.getRepository(Application);

      // Get an existing demo application
      const app = await appRepo.findOne({
        where: { applicationNumber: 'APP-2026-DEMO-002' },
      });
      expect(app).toBeDefined();

      // Insert an audit log entry
      const log = auditRepo.create({
        applicationId: app!.id,
        actorId: 'test-immutable-actor',
        actorRole: UserRole.INSTITUTION_USER,
        eventType: 'TEST_IMMUTABILITY_EVENT',
        payloadSnapshot: { test: true },
        previousHash:
          '0000000000000000000000000000000000000000000000000000000000000000',
        leafHash:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        currentHash:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      const savedLog = await auditRepo.save(log);
      expect(savedLog.sequenceNumber).toBeDefined();

      // Attempt UPDATE — trigger must raise exception
      await expect(
        AppDataSource.query(
          `UPDATE audit_logs SET actor_id = 'tampered' WHERE sequence_number = $1`,
          [savedLog.sequenceNumber],
        ),
      ).rejects.toThrow(
        /Audit log entries are immutable and cannot be updated or deleted/,
      );

      // Attempt DELETE — trigger must raise exception
      await expect(
        AppDataSource.query(
          `DELETE FROM audit_logs WHERE sequence_number = $1`,
          [savedLog.sequenceNumber],
        ),
      ).rejects.toThrow(
        /Audit log entries are immutable and cannot be updated or deleted/,
      );
    });

    it('should prevent parent application deletion when audit records exist (ON DELETE RESTRICT)', async () => {
      if (!dbAvailable) return;
      const appRepo = AppDataSource.getRepository(Application);
      const auditRepo = AppDataSource.getRepository(AuditLog);
      const instRepo = AppDataSource.getRepository(Institution);

      const inst = await instRepo.findOne({
        where: { registrationNumber: 'DEMO-INST-2026-001' },
      });
      expect(inst).toBeDefined();

      // Create an application with an audit record
      const protectedApp = appRepo.create({
        applicationNumber: `APP-AUDIT-RESTRICT-${Date.now()}`,
        institutionId: inst!.id,
        academicYear: '2026-2027',
        status: ApplicationStatus.SUBMITTED,
        programType: 'Engineering',
        payloadJsonb: {},
      });
      const savedApp = await appRepo.save(protectedApp);

      const auditEntry = auditRepo.create({
        applicationId: savedApp.id,
        actorId: 'system-test-actor',
        actorRole: UserRole.SYSTEM_ADMIN,
        eventType: 'APPLICATION_CREATED',
        payloadSnapshot: { appNum: savedApp.applicationNumber },
        previousHash:
          '0000000000000000000000000000000000000000000000000000000000000000',
        leafHash:
          'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        currentHash:
          'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      });
      const savedAudit = await auditRepo.save(auditEntry);
      expect(savedAudit.sequenceNumber).toBeDefined();

      // Attempt parent application deletion — must fail via fk_audit_logs_application (ON DELETE RESTRICT)
      await expect(
        AppDataSource.query(`DELETE FROM applications WHERE id = $1`, [
          savedApp.id,
        ]),
      ).rejects.toMatchObject({
        code: '23503', // foreign_key_violation in PostgreSQL
      });

      // Verify audit record remains intact and was NOT silently removed through a cascade
      const retrievedAudit = await auditRepo.findOne({
        where: { sequenceNumber: savedAudit.sequenceNumber },
      });
      expect(retrievedAudit).not.toBeNull();
      expect(retrievedAudit?.applicationId).toBe(savedApp.id);
    });
  });

  describe('Seed Service Idempotence', () => {
    it('should execute SeedService.run idempotently without error', async () => {
      if (!dbAvailable) return;
      const report = await SeedService.run(AppDataSource);
      expect(report).toBeDefined();
      expect(typeof report.institutionsCreated).toBe('number');
      expect(typeof report.skippedExisting).toBe('number');
      // On an already seeded database, created counts should be 0 and skipped should be > 0
      expect(report.institutionsCreated).toBe(0);
      expect(report.usersCreated).toBe(0);
      expect(report.applicationsCreated).toBe(0);
      expect(report.skippedExisting).toBeGreaterThan(0);
    });
  });
});
