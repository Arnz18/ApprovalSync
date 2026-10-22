/**
 * ApprovalSync — Health Check OpenAPI Models
 * Milestone: BE-01
 */

import { ApiProperty } from '@nestjs/swagger';
import { DependencyStatus } from './health.service';

export class HealthCheckDto {
  @ApiProperty({ example: 'ok', description: 'Overall system health status' })
  status: 'ok';

  @ApiProperty({ example: 42, description: 'Application uptime in seconds' })
  uptimeSeconds: number;

  @ApiProperty({
    example: '2026-10-22T20:00:00.000Z',
    description: 'Current UTC timestamp in ISO 8601 format',
  })
  timestamp: string;

  @ApiProperty({
    example: 'development',
    description: 'Active runtime environment',
  })
  environment: string;

  @ApiProperty({ example: '0.1.0', description: 'Current application version' })
  version: string;
}

export class LivenessDto {
  @ApiProperty({ example: 'ok', description: 'Process liveness indicator' })
  status: 'ok';

  @ApiProperty({ example: 42, description: 'Process uptime in seconds' })
  uptimeSeconds: number;

  @ApiProperty({
    example: '2026-10-22T20:00:00.000Z',
    description: 'Current UTC timestamp in ISO 8601 format',
  })
  timestamp: string;
}

export class DependencyStatusDto {
  @ApiProperty({
    example: 'unconfigured',
    enum: ['healthy', 'unhealthy', 'unconfigured'],
    description: 'Current status of the dependency',
  })
  status: DependencyStatus;

  @ApiProperty({
    example:
      'Database connection provider not configured (scheduled for BE-02)',
    description: 'Descriptive status information',
    required: false,
  })
  message?: string;
}

export class ReadinessDto {
  @ApiProperty({
    example: 'ready',
    enum: ['ready', 'not_ready'],
    description: 'Overall application readiness status',
  })
  status: 'ready' | 'not_ready';

  @ApiProperty({ example: 42, description: 'Application uptime in seconds' })
  uptimeSeconds: number;

  @ApiProperty({
    example: '2026-10-22T20:00:00.000Z',
    description: 'Current UTC timestamp in ISO 8601 format',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Readiness check details by dependency',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'unhealthy', 'unconfigured'],
        },
        message: { type: 'string' },
      },
    },
  })
  checks: Record<string, DependencyStatusDto>;
}
