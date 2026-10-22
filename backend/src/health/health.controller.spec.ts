/**
 * ApprovalSync — Health Controller & Service Unit Tests
 * Milestone: BE-02
 *
 * Validates liveness, compatibility health, and readiness behaviors across
 * connected, disconnected, and unconfigured database states.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;
  let healthService: HealthService;
  let mockDataSource: { isInitialized: boolean; query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

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
        {
          provide: DataSource,
          useValue: mockDataSource,
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
    it('should return liveness ok with uptime and timestamp regardless of database', () => {
      const result = healthController.checkLiveness();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkReadiness', () => {
    it('should return status ready with healthy database when PostgreSQL is connected', async () => {
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
        status: 'healthy',
        message: 'PostgreSQL connection active',
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException when database query fails (disconnected)', async () => {
      mockDataSource.query.mockRejectedValueOnce(
        new Error('connection timeout to postgres:5432'),
      );

      await expect(healthController.checkReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      try {
        await healthController.checkReadiness();
      } catch (err: unknown) {
        const error = err as ServiceUnavailableException;
        const response = error.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('ERR_SERVICE_UNAVAILABLE');
        const details = response.details as Record<
          string,
          { status: string; message: string }
        >;
        expect(details.database.status).toBe('unhealthy');
        expect(details.database.message).toBe(
          'Database connection unavailable',
        );
        // Ensure connection strings, passwords, or raw exceptions are NOT leaked
        expect(JSON.stringify(response)).not.toContain('postgres:5432');
      }
    });

    it('should throw ServiceUnavailableException when database is not initialized', async () => {
      mockDataSource.isInitialized = false;

      await expect(healthController.checkReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when database is unconfigured', async () => {
      // Create service without DataSource provider
      const unconfiguredService = new HealthService({
        get: jest.fn().mockReturnValue('test'),
      } as unknown as ConfigService);
      const controller = new HealthController(unconfiguredService);

      await expect(controller.checkReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      try {
        await controller.checkReadiness();
      } catch (err: unknown) {
        const error = err as ServiceUnavailableException;
        const response = error.getResponse() as Record<string, unknown>;
        const details = response.details as Record<
          string,
          { status: string; message: string }
        >;
        expect(details.database.status).toBe('unconfigured');
        expect(details.database.message).toBe(
          'Database connection provider not configured',
        );
      }
    });

    it('should throw ServiceUnavailableException when a custom dependency check reports unhealthy', async () => {
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
