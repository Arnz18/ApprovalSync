/**
 * ApprovalSync — Application E2E Test Suite
 * Verifies application bootstrap, global prefix, filters, interceptors, and health endpoint.
 * Milestone: FND-02
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/core/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts runtime pipeline
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 OK with standard ApiResponse envelope', async () => {
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
      expect(typeof response.body.meta.correlationId).toBe('string');
      expect(typeof response.body.meta.timestamp).toBe('string');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/non-existent-route', () => {
    it('should return 404 with standard ApiErrorResponse envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-route')
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ERR_RESOURCE_NOT_FOUND');
      expect(response.body.error.statusCode).toBe(404);
      expect(typeof response.body.error.correlationId).toBe('string');
      expect(typeof response.body.error.timestamp).toBe('string');
    });
  });
});
