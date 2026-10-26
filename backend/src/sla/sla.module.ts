/**
 * ApprovalSync — SLA Module
 * Milestone: BE-08
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaTimer } from '../database/entities/sla-timer.entity';
import { Application } from '../database/entities/application.entity';
import { SlaEscalation } from './entities/sla-escalation.entity';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaClockService } from './clock/sla-clock.service';
import { SlaQueueService } from './queue/sla-queue.service';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SlaTimer, SlaEscalation, Application]),
    UsersModule,
    AuditModule,
  ],
  controllers: [SlaController],
  providers: [SlaService, SlaClockService, SlaQueueService],
  exports: [SlaService, SlaClockService, SlaQueueService],
})
export class SlaModule {}
