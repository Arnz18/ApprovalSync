/**
 * ApprovalSync — Workflow Module
 * Milestone: BE-06 / AICTE-26262
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../database/entities/application.entity';
import { WorkflowTimelineEvent } from './entities/workflow-timeline-event.entity';
import { EvcSchedule } from './entities/evc-schedule.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SlaModule } from '../sla/sla.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      WorkflowTimelineEvent,
      EvcSchedule,
    ]),
    UsersModule,
    AuditModule,
    SlaModule,
    NotificationsModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
