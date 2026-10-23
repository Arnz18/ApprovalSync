/**
 * ApprovalSync — Authentication, Session/JWT & RBAC E2E Integration Test Suite
 * Milestone: BE-03
 *
 * Verifies:
 * 1. Authentication flow against live PostgreSQL database (POST /api/v1/auth/login).
 * 2. Uniform rejection for nonexistent, inactive, or invalid password accounts (no enumeration).
 * 3. Token issuance with safe user projection (zero password hash leakage).
 * 4. Current user session endpoint (GET /api/v1/auth/me).
 * 5. Rejection of missing, malformed, expired, or tampered tokens.
 * 6. Role-Based Access Control (RBAC) deny-by-default and @Roles guard enforcement.
 * 7. Tenant isolation & IDOR prevention (INSTITUTION_USER cross-tenant access blocked).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { UserRole } from '../src/shared/contracts';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import { Institution } from '../src/database/entities/institution.entity';

jest.setTimeout(30000);

// Test Controller to verify @Roles RBAC guard enforcement
@Controller('test-rbac')
class TestRbacController {
  @Get('officer-only')
  @Roles(UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER)
  officerOnlyEndpoint() {
    return { access: 'granted', scope: 'officer-queue' };
  }

  @Get('admin-only')
  @Roles(UserRole.SYSTEM_ADMIN)
  adminOnlyEndpoint() {
    return { access: 'granted', scope: 'admin-dashboard' };
  }
}

describe('Authentication, JWT & RBAC (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let institutionUser: User;
  let scrutinyOfficer: User;
  let inactiveUser: User;
  let otherInstitutionUser: User;
  let auditorUser: User;

  let institutionToken: string;
  let scrutinyToken: string;

  const validPassword = 'DemoPass@123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestRbacController],
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

    // Fetch existing seeded users
    institutionUser = (await userRepo.findOne({
      where: { email: 'demo.institution@synthetic.approvalsync.local' },
    }))!;
    scrutinyOfficer = (await userRepo.findOne({
      where: { email: 'demo.scrutiny@synthetic.approvalsync.local' },
    }))!;
    inactiveUser = (await userRepo.findOne({
      where: { email: 'demo.inactive@synthetic.approvalsync.local' },
    }))!;
    expect(scrutinyOfficer).toBeDefined();
    expect(inactiveUser).toBeDefined();

    // Create a second institution user to test cross-tenant isolation (IDOR)
    const instB = await instRepo.findOne({
      where: { registrationNumber: 'DEMO-INST-2026-002' },
    });
    if (instB) {
      let userB = await userRepo.findOne({
        where: { email: 'college.b@synthetic.approvalsync.local' },
      });
      if (!userB) {
        userB = userRepo.create({
          name: 'Representative College B',
          email: 'college.b@synthetic.approvalsync.local',
          role: UserRole.INSTITUTION_USER,
          passwordHash:
            '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
          institutionId: instB.id,
          isActive: true,
        });
        await userRepo.save(userB);
      }
      otherInstitutionUser = userB;
    }

    // Create an auditor user to test non-privileged RBAC rejections against real database
    let userAuditor = await userRepo.findOne({
      where: { email: 'demo.auditor@synthetic.approvalsync.local' },
    });
    if (!userAuditor) {
      userAuditor = userRepo.create({
        name: 'Demo Auditor',
        email: 'demo.auditor@synthetic.approvalsync.local',
        role: UserRole.AUDITOR,
        passwordHash:
          '$2b$10$5tdfV.pdkzzJIE9eyS58EOT/ioZcveA4AsuPQc1kZ7PwOslVXx9Oe',
        isActive: true,
      });
      await userRepo.save(userAuditor);
    }
    auditorUser = userAuditor;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully authenticate seeded institution user and return JWT + safe projection', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: validPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe(3600);

      const user = response.body.data.user;
      expect(user).toBeDefined();
      expect(user.email).toBe('demo.institution@synthetic.approvalsync.local');
      expect(user.role).toBe(UserRole.INSTITUTION_USER);
      expect(user.isActive).toBe(true);
      expect(user.institutionId).toBeDefined();

      // Invariant: passwordHash is NEVER present on returned JSON
      expect(user.passwordHash).toBeUndefined();

      // Store token for subsequent authenticated requests
      institutionToken = response.body.data.accessToken;
    });

    it('should successfully authenticate seeded scrutiny officer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'demo.scrutiny@synthetic.approvalsync.local',
          password: validPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe(UserRole.SCRUTINY_OFFICER);
      expect(response.body.data.user.passwordHash).toBeUndefined();

      scrutinyToken = response.body.data.accessToken;
    });

    it('should reject invalid password with 401 ERR_UNAUTHORIZED and uniform error message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'demo.institution@synthetic.approvalsync.local',
          password: 'WrongPassword#999',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('should reject nonexistent email with identical 401 ERR_UNAUTHORIZED (no account enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'does.not.exist@synthetic.approvalsync.local',
          password: validPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('should reject inactive / disabled account with identical 401 ERR_UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'demo.inactive@synthetic.approvalsync.local',
          password: validPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('should reject missing or malformed login parameters with 400 ERR_VALIDATION_FAILED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_VALIDATION_FAILED');
      expect(response.body.error.details).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile when supplied with a valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${institutionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(institutionUser.id);
      expect(response.body.data.email).toBe(institutionUser.email);
      expect(response.body.data.role).toBe(UserRole.INSTITUTION_USER);
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should reject request missing Authorization header with 401 ERR_UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
      expect(response.body.error.message).toBe(
        'Missing or invalid authentication token.',
      );
    });

    it('should reject malformed or tampered token with 401 ERR_UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('should reject token signed with an invalid / unknown secret', async () => {
      const forgedToken = jwt.sign(
        {
          sub: institutionUser.id,
          email: institutionUser.email,
          role: UserRole.SYSTEM_ADMIN, // Privilege escalation attempt
        },
        'wrong_attacker_secret_key_12345678901234567890',
        { algorithm: 'HS256', expiresIn: '1h' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('should reject expired token with 401 ERR_UNAUTHORIZED', async () => {
      const secret =
        process.env.JWT_SECRET ||
        'dev_synthetic_jwt_signing_secret_min_32_characters_for_local_demo_only';
      const expiredToken = jwt.sign(
        {
          sub: institutionUser.id,
          email: institutionUser.email,
          role: UserRole.INSTITUTION_USER,
        },
        secret,
        {
          algorithm: 'HS256',
          expiresIn: '-10s',
          issuer: 'approvalsync-auth',
          audience: 'approvalsync-client',
        },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('should reject with 401 ERR_UNAUTHORIZED if user account is deactivated in the database after token issuance', async () => {
      const userRepo = dataSource.getRepository(User);
      // Temporarily mark institutionUser as inactive in database
      await userRepo.update(institutionUser.id, { isActive: false });

      try {
        const response = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${institutionToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
        expect(response.body.error.message).toBe(
          'User account no longer active or found.',
        );
      } finally {
        // Restore active state
        await userRepo.update(institutionUser.id, { isActive: true });
      }
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should deny INSTITUTION_USER from accessing officer-only route (403 ERR_FORBIDDEN)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/officer-only')
        .set('Authorization', `Bearer ${institutionToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
      expect(response.body.error.message).toBe(
        'Access denied: insufficient permissions for this resource.',
      );
    });

    it('should allow SCRUTINY_OFFICER to access officer-only route (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/officer-only')
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access).toBe('granted');
      expect(response.body.data.scope).toBe('officer-queue');
    });

    it('should deny unauthenticated requests to protected RBAC route (401 ERR_UNAUTHORIZED)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/officer-only')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
    });

    it('should deny SCRUTINY_OFFICER from accessing admin-only route (403 ERR_FORBIDDEN)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/admin-only')
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should deny AUDITOR from accessing GET /users/:id (403 ERR_FORBIDDEN)', async () => {
      const secret =
        process.env.JWT_SECRET ||
        'dev_synthetic_jwt_signing_secret_min_32_characters_for_local_demo_only';
      const auditorToken = jwt.sign(
        {
          sub: auditorUser.id,
          email: 'demo.auditor@synthetic.approvalsync.local',
          name: 'Demo Auditor',
          role: UserRole.AUDITOR,
        },
        secret,
        {
          algorithm: 'HS256',
          expiresIn: '1h',
          issuer: 'approvalsync-auth',
          audience: 'approvalsync-client',
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${institutionUser.id}`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
      expect(response.body.error.message).toBe(
        'Access denied: insufficient permissions for this resource.',
      );
    });
  });

  describe('Tenant Scoping & Insecure Direct Object Reference (IDOR) Protection', () => {
    it('should allow an institution user to access their own user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${institutionUser.id}`)
        .set('Authorization', `Bearer ${institutionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(institutionUser.id);
      expect(response.body.data.email).toBe(institutionUser.email);
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should block an institution user from accessing a user profile from another institution (403 ERR_FORBIDDEN)', async () => {
      if (!otherInstitutionUser) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${otherInstitutionUser.id}`)
        .set('Authorization', `Bearer ${institutionToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
      expect(response.body.error.message).toBe(
        'Access denied: cannot access user from another institution.',
      );
    });

    it('should return 403 ERR_FORBIDDEN when INSTITUTION_USER queries nonexistent external user ID (preventing enumeration)', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${randomUuid}`)
        .set('Authorization', `Bearer ${institutionToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
      expect(response.body.error.message).toBe(
        'Access denied: cannot access user from another institution.',
      );
    });

    it('should ignore client-supplied x-institution-id header and strictly enforce verified JWT tenant scope', async () => {
      if (!otherInstitutionUser) {
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${otherInstitutionUser.id}`)
        .set('Authorization', `Bearer ${institutionToken}`)
        .set('x-institution-id', otherInstitutionUser.institutionId || '')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_FORBIDDEN');
    });

    it('should allow a SCRUTINY_OFFICER to access any institution user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${institutionUser.id}`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(institutionUser.id);
    });

    it('should return 404 ERR_RESOURCE_NOT_FOUND when user ID does not exist for an authorized officer', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${randomUuid}`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
    });
  });

  describe('Immediate Stale Authorization Rejection on Protected Requests', () => {
    it('should reject already-issued token on protected route after user is deactivated in database (401 ERR_UNAUTHORIZED)', async () => {
      const userRepo = dataSource.getRepository(User);
      // Deactivate institution user in database
      await userRepo.update(institutionUser.id, { isActive: false });

      try {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/users/${institutionUser.id}`)
          .set('Authorization', `Bearer ${institutionToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ERR_UNAUTHORIZED');
        expect(response.body.error.message).toBe(
          'User account no longer active or found.',
        );
      } finally {
        await userRepo.update(institutionUser.id, { isActive: true });
      }
    });

    it('should immediately deny access with 403 when user role is demoted in database even with valid token', async () => {
      const userRepo = dataSource.getRepository(User);
      // Temporarily demote scrutinyOfficer in database to AUDITOR
      await userRepo.update(scrutinyOfficer.id, { role: UserRole.AUDITOR });

      try {
        // Token was issued with SCRUTINY_OFFICER claim, but DB now reflects AUDITOR
        const response = await request(app.getHttpServer())
          .get('/api/v1/test-rbac/officer-only')
          .set('Authorization', `Bearer ${scrutinyToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ERR_FORBIDDEN');
      } finally {
        // Restore SCRUTINY_OFFICER role
        await userRepo.update(scrutinyOfficer.id, {
          role: UserRole.SCRUTINY_OFFICER,
        });
      }
    });

    it('should immediately update institutional scope when user institutionId changes in database', async () => {
      if (!otherInstitutionUser) return;
      const userRepo = dataSource.getRepository(User);

      // Save original institutionId
      const originalInstId = institutionUser.institutionId;

      // Reassign institutionUser to otherInstitution in database
      await userRepo.update(institutionUser.id, {
        institutionId: otherInstitutionUser.institutionId,
      });

      try {
        // With original token, user can now access otherInstitutionUser because DB reflects their new tenant scope
        const response = await request(app.getHttpServer())
          .get(`/api/v1/users/${otherInstitutionUser.id}`)
          .set('Authorization', `Bearer ${institutionToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(otherInstitutionUser.id);
      } finally {
        // Restore original institutionId
        await userRepo.update(institutionUser.id, {
          institutionId: originalInstId,
        });
      }
    });
  });
});
