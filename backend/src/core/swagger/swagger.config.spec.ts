/**
 * ApprovalSync — Swagger Configuration Unit Tests
 * Milestone: BE-01
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './swagger.config';
import { HealthController } from '../../health/health.controller';
import { HealthService } from '../../health/health.service';

describe('setupSwagger', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => {
              if (key === 'app.nodeEnv') return 'development';
              if (key === 'app.swaggerEnabled') return true;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    configService = app.get(ConfigService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should generate an OpenAPI 3.0 document with correct metadata and tags', () => {
    const document = setupSwagger(app, configService);
    expect(document).toBeDefined();
    expect(document!.openapi).toMatch(/^3\./);
    expect(document!.info.title).toBe('ApprovalSync API');
    expect(document!.info.version).toBe('0.1.0');
    expect(document!.tags?.some((t) => t.name === 'Health & System')).toBe(
      true,
    );
  });

  it('should include the real health endpoints in OpenAPI paths', () => {
    const document = setupSwagger(app, configService);
    expect(document).toBeDefined();

    const paths = Object.keys(document!.paths);
    expect(paths).toContain('/api/v1/health');
    expect(paths).toContain('/api/v1/health/liveness');
    expect(paths).toContain('/api/v1/health/readiness');
  });

  it('should not contain any fake or unimplemented application/auth routes', () => {
    const document = setupSwagger(app, configService);
    expect(document).toBeDefined();

    const paths = Object.keys(document!.paths);
    expect(paths).not.toContain('/api/v1/auth/login');
    expect(paths).not.toContain('/api/v1/applications');
    expect(paths).not.toContain('/api/v1/verification');
  });

  it('should return null when swagger is disabled in production', () => {
    const prodConfigService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        if (key === 'app.nodeEnv') return 'production';
        if (key === 'app.swaggerEnabled') return false;
        return defaultValue;
      }),
    } as unknown as ConfigService;

    const document = setupSwagger(app, prodConfigService);
    expect(document).toBeNull();
  });
});
