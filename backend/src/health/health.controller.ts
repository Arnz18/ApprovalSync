/**
 * ApprovalSync — Health & Observability Controller
 * Provides system status, liveness, and dependency readiness checks.
 * Milestone: BE-01
 */

import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import {
  HealthService,
  HealthCheckResponse,
  LivenessResponse,
  ReadinessResponse,
} from './health.service';
import { HealthCheckDto, LivenessDto, ReadinessDto } from './health.dto';

@ApiTags('Health & System')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'System health summary (Compatibility endpoint)',
    description:
      'Returns basic process status, uptime, environment, and version within the standard ApiResponse envelope.',
  })
  @ApiOkResponse({
    description: 'System is running normally.',
    type: HealthCheckDto,
  })
  check(): HealthCheckResponse {
    return this.healthService.getHealth();
  }

  @Get('liveness')
  @ApiOperation({
    summary: 'Process liveness check',
    description:
      'Lightweight probe for container orchestrators (e.g. Kubernetes, Docker) to determine if the process is alive and responsive.',
  })
  @ApiOkResponse({
    description: 'Process is alive and responding to HTTP requests.',
    type: LivenessDto,
  })
  checkLiveness(): LivenessResponse {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'Dependency readiness check',
    description:
      'Evaluates readiness to accept client traffic based on dependencies configured for the current runtime milestone. Truthfully reports unconfigured dependencies.',
  })
  @ApiOkResponse({
    description: 'Application is ready to serve configured routes.',
    type: ReadinessDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'One or more required dependencies failed readiness verification.',
  })
  async checkReadiness(): Promise<ReadinessResponse> {
    return this.healthService.getReadiness();
  }
}
