/**
 * ApprovalSync — SLA Queue Service Unit Tests
 * Milestone: BE-08
 */

import { ConfigService } from '@nestjs/config';
import { SlaQueueService } from './sla-queue.service';
import { SlaJobPayload } from './sla-queue.interface';
import { ApplicationStatus, SlaTier } from '../../shared/contracts';

describe('SlaQueueService', () => {
  let service: SlaQueueService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    service = new SlaQueueService(mockConfigService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  const validPayload: SlaJobPayload = {
    timerId: '00000000-0000-0000-0000-000000000001',
    applicationId: '00000000-0000-0000-0000-000000000002',
    stage: ApplicationStatus.SUBMITTED,
    tier: SlaTier.TIER_1_RO_ALERT,
    checkType: 'WARNING_CHECK',
  };

  it('initializes in DATABASE_RECONCILIATION mode when Redis is unconfigured', () => {
    expect(service.isAvailable()).toBe(false);
    expect(service.getOperationalMode()).toBe('DATABASE_RECONCILIATION');
  });

  it('enqueues timer check with scheduling hint in fallback mode', async () => {
    await service.enqueueTimerCheck(validPayload, 5000);
    expect(service.getPendingHintsCount()).toBe(1);

    await service.enqueueTimerCheck(
      {
        ...validPayload,
        checkType: 'BREACH_CHECK',
      },
      10000,
    );
    expect(service.getPendingHintsCount()).toBe(2);

    service.clearPendingHints();
    expect(service.getPendingHintsCount()).toBe(0);
  });

  it('rejects invalid payloads missing required attributes', async () => {
    await expect(
      service.enqueueTimerCheck({ ...validPayload, timerId: '' }),
    ).rejects.toThrow('timerId is required');

    await expect(
      service.enqueueTimerCheck({ ...validPayload, applicationId: '' }),
    ).rejects.toThrow('applicationId is required');

    await expect(
      service.enqueueTimerCheck({ ...validPayload, stage: '' as any }),
    ).rejects.toThrow('stage is required');

    await expect(
      service.enqueueTimerCheck({ ...validPayload, tier: '' as any }),
    ).rejects.toThrow('tier is required');

    await expect(
      service.enqueueTimerCheck({ ...validPayload, checkType: '' as any }),
    ).rejects.toThrow('checkType is required');
  });
});
