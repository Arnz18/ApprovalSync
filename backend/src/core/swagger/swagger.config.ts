/**
 * ApprovalSync — OpenAPI / Swagger Specification Builder
 * Milestone: BE-01
 *
 * Configures OpenAPI 3.0 documentation with standard ApiResponse envelopes,
 * correlation tracking headers, and truthful health/readiness schemas.
 * Disables documentation in production according to security baseline policy.
 */

import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(
  app: INestApplication,
  configService?: ConfigService,
): OpenAPIObject | null {
  const logger = new Logger('Swagger');
  const cfg: ConfigService =
    configService ?? app.get<ConfigService>(ConfigService);
  const nodeEnv = cfg.get<string>('app.nodeEnv', 'development');
  const isSwaggerEnabled = cfg.get<boolean>(
    'app.swaggerEnabled',
    nodeEnv !== 'production',
  );

  if (!isSwaggerEnabled) {
    logger.log('Swagger documentation is disabled in production environment.');
    return null;
  }

  const config = new DocumentBuilder()
    .setTitle('ApprovalSync API')
    .setDescription(
      'AI-Powered Application Validation, Document Authentication and Regulatory Compliance Decision-Support Platform for AICTE.',
    )
    .setVersion('0.1.0')
    .addTag(
      'Health & System',
      'System status, liveness, and dependency readiness diagnostics',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Correlation-Id',
        in: 'header',
        description:
          'Optional client-supplied UUIDv4 request correlation identifier',
      },
      'correlation-id',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Bearer token for authorized routes',
      },
      'bearer-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Mount at predictable, non-colliding UI routes (/api/docs and /api/v1/docs)
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'ApprovalSync API Documentation',
  });

  SwaggerModule.setup('api/v1/docs', app, document, {
    jsonDocumentUrl: 'api/v1/docs-json',
    customSiteTitle: 'ApprovalSync API Documentation',
  });

  logger.log('Swagger UI available at: /api/docs and /api/v1/docs');
  logger.log('OpenAPI JSON available at: /api/docs-json');

  return document;
}
