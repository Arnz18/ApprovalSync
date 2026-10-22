/**
 * ApprovalSync — Application E2E Test Suite
 * Milestone: BE-01
 *
 * Verifies:
 * 1. Application bootstrap, global prefix, and shutdown hooks.
 * 2. Health check compatibility (GET /api/v1/health).
 * 3. Liveness probe (GET /api/v1/health/liveness).
 * 4. Truthful readiness probe (GET /api/v1/health/readiness).
 * 5. Structured field-level DTO validation errors with rule names and nested paths.
 * 6. Whitelisting / unknown property rejection (forbidNonWhitelisted: true).
 * 7. Correlation ID generation, header return, propagation, and invalid input sanitization.
 * 8. Standard ApiResponse and ApiErrorResponse contract envelopes.
 * 9. OpenAPI JSON schema generation containing real health endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Body } from '@nestjs/common';
import * as request from 'supertest';
import { validate as validateUuid } from 'uuid';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { createAppValidationPipe } from '../src/core/pipes/validation.pipe';
import { setupSwagger } from '../src/core/swagger/swagger.config';

jest.setTimeout(30000);

// Test DTOs to exercise structured field-level validation and nested property paths
class TestAddressDto {
  @IsString()
  @IsNotEmpty()
  district: string;
}

class TestValidationDto {
  @IsNumber()
  @IsPositive()
  landAreaAcres: number;

  @ValidateNested()
  @Type(() => TestAddressDto)
  address: TestAddressDto;
}

@Controller('test-harness')
class TestHarnessController {
  @Post('validate')
  testValidation(@Body() dto: TestValidationDto) {
    return { status: 'accepted', data: dto };
  }
}

describe('ApprovalSync Backend Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestHarnessController],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts production bootstrap pipeline exactly
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // Mount Swagger specification in test mode
    setupSwagger(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Observability Endpoints', () => {
    it('GET /api/v1/health should return 200 OK with standard ApiResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.version).toBe('0.1.0');
      expect(typeof response.body.data.uptimeSeconds).toBe('number');
      expect(response.body.meta).toBeDefined();
      expect(validateUuid(response.body.meta.correlationId)).toBe(true);
      expect(typeof response.body.meta.timestamp).toBe('string');
      expect(response.headers['x-correlation-id']).toBe(
        response.body.meta.correlationId,
      );
    });

    it('GET /api/v1/health/liveness should return 200 OK with process liveness data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/liveness')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(typeof response.body.data.uptimeSeconds).toBe('number');
      expect(typeof response.body.data.timestamp).toBe('string');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('GET /api/v1/health/readiness should report truthful dependency state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/readiness')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
      expect(response.body.data.checks).toBeDefined();
      expect(response.body.data.checks.config).toEqual({
        status: 'healthy',
        message: 'Application configuration validated',
      });
      expect(response.body.data.checks.database).toEqual({
        status: 'healthy',
        message: 'PostgreSQL connection active',
      });
    });
  });

  describe('Correlation ID Tracing & Sanitization', () => {
    it('should propagate a valid client-supplied X-Correlation-Id', async () => {
      const clientCorrId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Correlation-Id', clientCorrId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(clientCorrId);
      expect(response.body.meta.correlationId).toBe(clientCorrId);
    });

    it('should sanitize and replace malformed/invalid X-Correlation-Id with a clean UUIDv4', async () => {
      const invalidCorrId = 'bad-id-with-illegal-spaces and <chars>';

      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Correlation-Id', invalidCorrId)
        .expect(200);

      const returnedId = response.headers['x-correlation-id'];
      expect(validateUuid(returnedId)).toBe(true);
      expect(returnedId).not.toBe(invalidCorrId);
      expect(response.body.meta.correlationId).toBe(returnedId);
    });

    it('should sanitize and replace oversized X-Correlation-Id (>64 chars) with a clean UUIDv4', async () => {
      const oversizedCorrId = 'a'.repeat(80);

      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Correlation-Id', oversizedCorrId)
        .expect(200);

      const returnedId = response.headers['x-correlation-id'];
      expect(validateUuid(returnedId)).toBe(true);
      expect(returnedId).not.toBe(oversizedCorrId);
      expect(response.body.meta.correlationId).toBe(returnedId);
    });
  });

  describe('Standardized Error Handling & DTO Validation', () => {
    it('GET /api/v1/non-existent-route should return 404 with standard ApiErrorResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
      expect(response.body.error.statusCode).toBe(404);
      expect(typeof response.body.error.message).toBe('string');
      expect(validateUuid(response.body.error.correlationId)).toBe(true);
      expect(response.headers['x-correlation-id']).toBe(
        response.body.error.correlationId,
      );
      expect(typeof response.body.error.timestamp).toBe('string');
    });

    it('POST with invalid fields should return 400 ERR_VALIDATION_FAILED with field-level details', async () => {
      const invalidPayload = {
        landAreaAcres: -10, // Must be positive
        address: {}, // Missing required 'district'
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/test-harness/validate')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_VALIDATION_FAILED');
      expect(response.body.error.statusCode).toBe(400);
      expect(response.body.error.details).toBeInstanceOf(Array);

      const details = response.body.error.details;
      // Should find landAreaAcres isPositive failure
      const landError = details.find(
        (d: { field: string }) => d.field === 'landAreaAcres',
      );
      expect(landError).toBeDefined();
      expect(landError.rule).toBe('isPositive');

      // Should find nested address.district isNotEmpty failure
      const districtError = details.find(
        (d: { field: string }) => d.field === 'address.district',
      );
      expect(districtError).toBeDefined();
      expect(districtError.rule).toBe('isNotEmpty');
    });

    it('POST with unexpected non-whitelisted properties should be rejected (forbidNonWhitelisted: true)', async () => {
      const payloadWithUnknown = {
        landAreaAcres: 5.5,
        address: { district: 'Pune' },
        injectedAdminProperty: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/test-harness/validate')
        .send(payloadWithUnknown)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_VALIDATION_FAILED');
      const details = response.body.error.details;
      const unknownPropError = details.find(
        (d: { field: string }) => d.field === 'injectedAdminProperty',
      );
      expect(unknownPropError).toBeDefined();
      expect(unknownPropError.rule).toBe('whitelistValidation');
    });

    it('POST with malformed JSON body should return 400 ERR_MALFORMED_REQUEST', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/test-harness/validate')
        .set('Content-Type', 'application/json')
        .send('{"landAreaAcres": invalid_json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ERR_MALFORMED_REQUEST');
      expect(response.body.error.statusCode).toBe(400);
    });

    it('POST with valid payload should return 200/201 wrapped in ApiResponse envelope', async () => {
      const validPayload = {
        landAreaAcres: 5.5,
        address: { district: 'Pune' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/test-harness/validate')
        .send(validPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
      expect(response.body.data.data.landAreaAcres).toBe(5.5);
      expect(response.body.meta).toBeDefined();
      expect(validateUuid(response.body.meta.correlationId)).toBe(true);
    });
  });

  describe('OpenAPI / Swagger Endpoints', () => {
    it('GET /api/docs-json should serve OpenAPI 3.0 document with health routes and schemas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.openapi).toMatch(/^3\./);
      expect(response.body.info.title).toBe('ApprovalSync API');
      expect(response.body.info.version).toBe('0.1.0');
      expect(response.body.paths).toBeDefined();
      expect(response.body.paths['/api/v1/health']).toBeDefined();
      expect(response.body.paths['/api/v1/health/liveness']).toBeDefined();
      expect(response.body.paths['/api/v1/health/readiness']).toBeDefined();
    });

    it('GET /api/docs should serve Swagger UI HTML', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('ApprovalSync API Documentation');
    });

    it('GET /api/v1/docs should serve Swagger UI HTML', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('ApprovalSync API Documentation');
    });
  });
});
