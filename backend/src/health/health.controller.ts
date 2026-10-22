/**
 * ApprovalSync — Health Check Controller
 * Provides system status, uptime, environment, and version.
 * Milestone: FND-02
 */

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  version: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      version: '0.1.0',
    };
  }
}
