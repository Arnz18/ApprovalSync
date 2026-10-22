/**
 * ApprovalSync — Backend Application Entry Point
 * NestJS Modular Monolith Runtime Bootstrap
 * Milestone: BE-01
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { createAppValidationPipe } from './core/pipes/validation.pipe';
import { setupSwagger } from './core/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:5173',
    'http://localhost:3000',
  ]);

  // Global API Prefix: /api/v1 applied exactly once
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe: defensive whitelisting with structured error factory
  app.useGlobalPipes(createAppValidationPipe());

  // Global Exception Filter: standardized ApiErrorResponse envelope
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors: structured logging, correlation ID, and ApiResponse envelope
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'X-Idempotency-Key',
      'X-Institution-Id',
      'X-Dev-User-Id',
      'X-Dev-User-Role',
    ],
    exposedHeaders: ['X-Correlation-Id', 'X-ApprovalSync-Simulation'],
  });

  // OpenAPI / Swagger Documentation (disabled in production)
  setupSwagger(app, configService);

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `ApprovalSync Backend initialized on port ${port} with prefix /${apiPrefix}`,
  );
  logger.log(
    `Health check ready at: http://localhost:${port}/${apiPrefix}/health`,
  );
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    `Fatal bootstrap failure: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
