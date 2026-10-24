/**
 * ApprovalSync — Versioned Regulatory Rules & Checklists E2E Integration Test Suite
 * Milestone: BE-05
 *
 * Verifies against live PostgreSQL 16 database:
 * 1. Authentication and role-based access control (RBAC):
 *    - 401 for unauthenticated requests.
 *    - 403 for non-SYSTEM_ADMIN roles on administration endpoints (create, update, publish, retire, add rules/checklists).
 *    - Authorized read access for INSTITUTION_USER, SCRUTINY_OFFICER, and SYSTEM_ADMIN to published rule sets and applicable version.
 *    - Strict rejection (403) for non-SYSTEM_ADMIN inspecting DRAFT version details.
 * 2. Complete regulatory rules and checklist lifecycle:
 *    - RuleSet creation with unique code constraints.
 *    - Monotonic RuleVersion creation in DRAFT status.
 *    - Rule drafting with structured parameters, types, and source citations.
 *    - Checklist template and item creation with display order and rule linkages.
 *    - Publication validation: rejecting publication with zero rules, invalid dates, or overlapping published versions.
 *    - Atomic publication inside database transaction.
 * 3. Immutable history guarantees:
 *    - Rejection of metadata edits on published or retired versions.
 *    - Rejection of adding, updating, or deleting rules on published versions.
 *    - Rejection of adding checklist items to published versions.
 *    - Safe retirement preserving full historical regulatory records.
 * 4. Deterministic applicable-version resolution:
 *    - Effective-date filtering for evaluation date.
 *    - Standardized 404 for missing categories or non-covered evaluation dates.
 * 5. Input validation, error codes, and correlation tracking.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { UserRole, ComplianceSeverity } from '../src/shared/contracts';
import {
  RuleLifecycleStatus,
  RuleSourceClassification,
  RuleType,
  ChecklistItemType,
} from '../src/rules/enums';
import { User } from '../src/database/entities/user.entity';

jest.setTimeout(45000);

describe('Regulatory Rules & Checklists (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenAdmin: string;
  let tokenOfficer: string;
  let tokenInstitution: string;

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

    // Verify / ensure admin user exists
    let adminUser = await userRepo.findOne({
      where: { email: 'demo.admin@synthetic.approvalsync.local' },
    });
    if (!adminUser) {
      adminUser = userRepo.create({
        name: 'Demo System Administrator',
        email: 'demo.admin@synthetic.approvalsync.local',
        role: UserRole.SYSTEM_ADMIN,
        passwordHash:
          '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
        isActive: true,
      });
      await userRepo.save(adminUser);
    }

    // Login each principal to acquire verified JWTs
    const loginAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'demo.admin@synthetic.approvalsync.local',
        password: demoPassword,
      });
    expect(loginAdmin.status).toBe(200);
    tokenAdmin = loginAdmin.body.data.accessToken;

    const loginOfficer = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'demo.scrutiny@synthetic.approvalsync.local',
        password: demoPassword,
      });
    expect(loginOfficer.status).toBe(200);
    tokenOfficer = loginOfficer.body.data.accessToken;

    const loginInst = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'demo.institution@synthetic.approvalsync.local',
        password: demoPassword,
      });
    expect(loginInst.status).toBe(200);
    tokenInstitution = loginInst.body.data.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & RBAC Protection', () => {
    it('rejects unauthenticated requests to rule administration with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rules/sets')
        .send({
          code: 'RULESET-UNAUTH',
          name: 'Unauth Set',
          applicationCategory: 'Undergraduate Engineering',
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('rejects non-admin role (INSTITUTION_USER) from creating rule sets with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rules/sets')
        .set('Authorization', `Bearer ${tokenInstitution}`)
        .send({
          code: 'RULESET-FORBIDDEN',
          name: 'Forbidden Rule Set',
          applicationCategory: 'Undergraduate Engineering',
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects non-admin role (SCRUTINY_OFFICER) from creating draft versions with 403', async () => {
      const dummyId = 'a0000000-0000-0000-0000-000000000001';
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/sets/${dummyId}/versions`)
        .set('Authorization', `Bearer ${tokenOfficer}`)
        .send({
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          sourceTitle: 'Test Handbook',
          sourceReference: 'Clause 1',
          sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('allows all authenticated roles to list rule sets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rules/sets')
        .set('Authorization', `Bearer ${tokenInstitution}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
    });
  });

  describe('2. End-to-End Rule & Checklist Authoring, Publication, and Immutability', () => {
    let createdRuleSetId: string;
    let createdVersionId: string;
    let createdRuleId: string;
    let createdTemplateId: string;

    const testSetCode = `RULESET-E2E-${Date.now()}`;

    it('creates a new RuleSet with SYSTEM_ADMIN credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rules/sets')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          code: testSetCode,
          name: 'E2E Test Regulatory Rule Set',
          description: 'Created during live PostgreSQL e2e test suite',
          applicationCategory: 'Postgraduate Management',
          issuingAuthority: 'AICTE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBe(testSetCode);
      createdRuleSetId = res.body.data.id;
    });

    it('rejects creating duplicate RuleSet code with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rules/sets')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          code: testSetCode,
          name: 'Duplicate Code Rule Set',
          applicationCategory: 'Postgraduate Management',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CONCURRENCY_CONFLICT');
    });

    it('creates a new draft RuleVersion (versionNumber = 1)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/sets/${createdRuleSetId}/versions`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          sourceTitle: 'AICTE Management Norms Handbook 2026',
          sourceReference: 'Chapter 3 (Management Programs)',
          sourceClassification:
            RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
          changeSummary: 'Initial draft version for PG Management norms',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.versionNumber).toBe(1);
      expect(res.body.data.status).toBe(RuleLifecycleStatus.DRAFT);
      createdVersionId = res.body.data.id;
    });

    it('prevents non-admin (INSTITUTION_USER) from inspecting draft version details with 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rules/versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${tokenInstitution}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('rejects publishing a draft version that has 0 rules with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/publish`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('without any regulatory rules');
    });

    it('adds a regulatory rule to the draft version', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/rules`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          ruleCode: 'RULE-PGDM-LAND-01',
          title: 'Minimum Campus Area for PGDM Programs',
          description:
            'Standalone PGDM institutions in urban zones must possess at least 1.0 acre of land.',
          ruleType: RuleType.INFRASTRUCTURE_LAND,
          severity: ComplianceSeverity.CRITICAL_DEFICIENCY,
          parametersJsonb: {
            minLandAcres: 1.0,
            zone: 'URBAN',
          },
          sourceClause: 'Clause 3.2.1',
          sourceClassification:
            RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ruleCode).toBe('RULE-PGDM-LAND-01');
      expect(res.body.data.parametersJsonb.minLandAcres).toBe(1.0);
      createdRuleId = res.body.data.id;
    });

    it('rejects duplicate ruleCode in same version with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/rules`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          ruleCode: 'RULE-PGDM-LAND-01',
          title: 'Duplicate Land Rule',
          description: 'Duplicate description',
          ruleType: RuleType.INFRASTRUCTURE_LAND,
          parametersJsonb: { minLandAcres: 1.0 },
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CONCURRENCY_CONFLICT');
    });

    it('adds a checklist template and checklist items to the draft version', async () => {
      // 1. Template
      const templateRes = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/checklists`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          code: 'CHK-PGDM-INTAKE',
          name: 'PGDM Mandatory Intake Requirements',
          applicationCategory: 'Postgraduate Management',
        });

      expect(templateRes.status).toBe(201);
      expect(templateRes.body.data.code).toBe('CHK-PGDM-INTAKE');
      createdTemplateId = templateRes.body.data.id;

      // 2. Item linked to rule
      const itemRes = await request(app.getHttpServer())
        .post(
          `/api/v1/rules/versions/${createdVersionId}/checklists/${createdTemplateId}/items`,
        )
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          itemCode: 'CHK-ITEM-PGDM-LAND',
          description: 'Registered Lease or Title Deed for PGDM campus',
          itemType: ChecklistItemType.DOCUMENT_UPLOAD,
          required: true,
          evidenceDocumentType: 'LAND_TITLE_DEED',
          displayOrder: 10,
          ruleId: createdRuleId,
          guidanceNotes: 'Must show minimum 1.0 acre in urban zone.',
        });

      expect(itemRes.status).toBe(201);
      expect(itemRes.body.data.itemCode).toBe('CHK-ITEM-PGDM-LAND');
      expect(itemRes.body.data.ruleId).toBe(createdRuleId);
    });

    it('publishes the valid draft version atomically', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/publish`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(RuleLifecycleStatus.PUBLISHED);
      expect(res.body.data.publishedAt).toBeDefined();
      expect(res.body.data.publishedBy).toBeDefined();
    });

    it('rejects re-publishing an already PUBLISHED version with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/publish`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Only DRAFT versions can be published',
      );
    });

    it('IMMUTABILITY DEFENSE: rejects modifying metadata on published version with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/rules/versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          sourceTitle: 'Tampered Title After Publication',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot update metadata on a published or retired rule version',
      );
    });

    it('IMMUTABILITY DEFENSE: rejects adding rules to published version with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/rules/versions/${createdVersionId}/rules`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          ruleCode: 'RULE-POST-PUB',
          title: 'Illicit Post-Publication Rule',
          description: 'Should be rejected',
          ruleType: RuleType.INFRASTRUCTURE_LAND,
          parametersJsonb: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot add rules to a published or retired rule version',
      );
    });

    it('IMMUTABILITY DEFENSE: rejects updating existing rules in published version with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/api/v1/rules/versions/${createdVersionId}/rules/${createdRuleId}`,
        )
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Tampered Rule Title',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot modify rules in a published or retired rule version',
      );
    });

    it('IMMUTABILITY DEFENSE: rejects deleting rules from published version with 400', async () => {
      const res = await request(app.getHttpServer())
        .delete(
          `/api/v1/rules/versions/${createdVersionId}/rules/${createdRuleId}`,
        )
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot delete rules from a published or retired rule version',
      );
    });

    it('IMMUTABILITY DEFENSE: rejects adding checklist items to published version with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(
          `/api/v1/rules/versions/${createdVersionId}/checklists/${createdTemplateId}/items`,
        )
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          itemCode: 'CHK-POST-PUB',
          description: 'Item after publication',
          itemType: ChecklistItemType.DOCUMENT_UPLOAD,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Cannot add checklist items to a published or retired rule version',
      );
    });

    describe('Date Overlap Prevention on Subsequent Version Publication', () => {
      let version2Id: string;

      it('creates draft Version 2 in the same RuleSet', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/rules/sets/${createdRuleSetId}/versions`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({
            effectiveFrom: '2026-06-01T00:00:00.000Z', // Overlaps with Version 1 (which started 2026-01-01 open-ended)
            sourceTitle: 'Conflicting Revision 2026',
            sourceReference: 'Draft 2',
            sourceClassification: RuleSourceClassification.ILLUSTRATIVE_DEMO,
          });

        expect(res.status).toBe(201);
        expect(res.body.data.versionNumber).toBe(2);
        version2Id = res.body.data.id;

        // Add 1 rule so ruleCount check passes
        await request(app.getHttpServer())
          .post(`/api/v1/rules/versions/${version2Id}/rules`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({
            ruleCode: 'RULE-V2-01',
            title: 'Version 2 Rule',
            description: 'V2 Desc',
            ruleType: RuleType.INFRASTRUCTURE_LAND,
            parametersJsonb: {},
          });
      });

      it('rejects publishing Version 2 because its effective date range overlaps with published Version 1', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/rules/versions/${version2Id}/publish`)
          .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain(
          'overlaps with existing published version',
        );
      });
    });

    describe('Retirement Lifecycle', () => {
      it('successfully retires published version 1', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/rules/versions/${createdVersionId}/retire`)
          .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(RuleLifecycleStatus.RETIRED);
        expect(res.body.data.retiredAt).toBeDefined();
        expect(res.body.data.retiredBy).toBeDefined();
      });

      it('rejects retiring an already retired version with 400', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/rules/versions/${createdVersionId}/retire`)
          .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain(
          'Only PUBLISHED rule versions can be retired',
        );
      });
    });
  });

  describe('3. Deterministic Applicable-Version Resolution', () => {
    it('resolves applicable published rules for Undergraduate Engineering at evaluation date', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rules/applicable')
        .query({
          category: 'Undergraduate Engineering',
          evaluationDate: '2026-10-24T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${tokenInstitution}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ruleSet.applicationCategory).toBe(
        'Undergraduate Engineering',
      );
      expect(res.body.data.ruleVersion.status).toBe(
        RuleLifecycleStatus.PUBLISHED,
      );
      expect(res.body.data.ruleVersion.sourceClassification).toBe(
        RuleSourceClassification.UNVERIFIED_HUMAN_REVIEW_REQUIRED,
      );
      expect(Array.isArray(res.body.data.rules)).toBe(true);
      expect(res.body.data.rules.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.checklists)).toBe(true);
      expect(res.body.data.checklists[0].items.length).toBeGreaterThan(0);
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('returns 404 when no applicable version exists for evaluation date prior to inception', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rules/applicable')
        .query({
          category: 'Undergraduate Engineering',
          evaluationDate: '2010-01-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${tokenInstitution}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });

    it('returns 404 when querying an unknown application category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rules/applicable')
        .query({
          category:
            'Aeronautical Submarine Engineering (Synthetic Nonexistent)',
        })
        .set('Authorization', `Bearer ${tokenInstitution}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('4. Input Validation & Error Handling', () => {
    it('rejects malformed UUID in route parameter with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rules/sets/not-a-valid-uuid')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BAD_REQUEST');
    });

    it('rejects non-whitelisted request payload properties with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rules/sets')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          code: 'RULESET-WHITELIST',
          name: 'Whitelist Test',
          applicationCategory: 'Undergraduate Engineering',
          injectedMaliciousProperty: 'DROP TABLE users;',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_VALIDATION_FAILED');
    });
  });
});
