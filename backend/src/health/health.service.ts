/**
 * ApprovalSync — Health Check Service
 * Milestone: BE-01
 *
 * Implements truthful liveness and readiness evaluations.
 * Accurately reports unconfigured dependencies (e.g. database scheduled for BE-02)
 * without prematurely constructing ad-hoc database connections.
 */

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DependencyStatus = 'healthy' | 'unhealthy' | 'unconfigured';

export interface HealthIndicatorDetails {
  status: DependencyStatus;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  version: string;
}

export interface LivenessResponse {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  uptimeSeconds: number;
  timestamp: string;
  checks: Record<string, HealthIndicatorDetails>;
}

export type HealthIndicatorFn = () =>
  Promise<HealthIndicatorDetails> | HealthIndicatorDetails;

@Injectable()
export class HealthService {
  private readonly version = '0.1.0';
  private customIndicators: Map<string, HealthIndicatorFn> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * General compatibility health check (GET /api/v1/health).
   */
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      version: this.version,
    };
  }

  /**
   * Process liveness check (GET /api/v1/health/liveness).
   * Verifies that the Node.js event loop and HTTP server are responsive.
   */
  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Dependency readiness check (GET /api/v1/health/readiness).
   * Evaluates dependencies required by current runtime configuration.
   * Reports database state truthfully as 'unconfigured' during BE-01 before BE-02.
   */
  async getReadiness(): Promise<ReadinessResponse> {
    const checks: Record<string, HealthIndicatorDetails> = {
      config: {
        status: 'healthy',
        message: 'Application configuration validated',
      },
      database: {
        status: 'unconfigured',
        message:
          'Database connection provider not configured (scheduled for BE-02)',
      },
    };

    // Execute any dynamically registered indicators (e.g. for testing failure states or future modules)
    let isDegraded = false;
    for (const [name, indicator] of this.customIndicators.entries()) {
      try {
        const result = await indicator();
        checks[name] = result;
        if (result.status === 'unhealthy') {
          isDegraded = true;
        }
      } catch (err: unknown) {
        checks[name] = {
          status: 'unhealthy',
          message: 'Health indicator check failed',
        };
        isDegraded = true;
      }
    }

    if (isDegraded) {
      throw new ServiceUnavailableException({
        code: 'ERR_SERVICE_UNAVAILABLE',
        message:
          'One or more required health checks reported an unhealthy status.',
        details: checks,
      });
    }

    return {
      status: 'ready',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Testing & extension hook: register custom indicator
   */
  registerIndicator(name: string, indicator: HealthIndicatorFn): void {
    this.customIndicators.set(name, indicator);
  }

  /**
   * Testing & extension hook: unregister custom indicator
   */
  unregisterIndicator(name: string): void {
    this.customIndicators.delete(name);
  }
}
