/**
 * ApprovalSync — Health Controller & Service Unit Tests
 * Milestone: BE-01
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => {
              if (key === 'app.nodeEnv') return 'test';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    healthController = moduleRef.get<HealthController>(HealthController);
    healthService = moduleRef.get<HealthService>(HealthService);
  });

  describe('check (compatibility)', () => {
    it('should return health status ok with valid fields', () => {
      const result = healthController.check();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.version).toBe('0.1.0');
      expect(result.environment).toBe('test');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkLiveness', () => {
    it('should return liveness ok with uptime and timestamp', () => {
      const result = healthController.checkLiveness();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkReadiness', () => {
    it('should return status ready with truthful unconfigured database in BE-01', async () => {
      const result = await healthController.checkReadiness();
      expect(result).toBeDefined();
      expect(result.status).toBe('ready');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.checks).toBeDefined();
      expect(result.checks.config).toEqual({
        status: 'healthy',
        message: 'Application configuration validated',
      });
      expect(result.checks.database).toEqual({
        status: 'unconfigured',
        message:
          'Database connection provider not configured (scheduled for BE-02)',
      });
    });

    it('should throw ServiceUnavailableException when a dependency check reports unhealthy', async () => {
      healthService.registerIndicator('externalService', () => ({
        status: 'unhealthy',
        message: 'Mock external service unreachable',
      }));

      await expect(healthController.checkReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      healthService.unregisterIndicator('externalService');
    });

    it('should throw ServiceUnavailableException when an indicator throws an exception', async () => {
      healthService.registerIndicator('faultyIndicator', () => {
        throw new Error('Connection timeout');
      });

      await expect(healthController.checkReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      healthService.unregisterIndicator('faultyIndicator');
    });
  });
});
