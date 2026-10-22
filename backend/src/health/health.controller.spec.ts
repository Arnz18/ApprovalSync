/**
 * ApprovalSync — Health Controller Unit Test
 * Milestone: FND-02
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
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
  });

  describe('check', () => {
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
});
