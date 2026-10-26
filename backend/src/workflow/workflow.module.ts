/**
 * ApprovalSync — Workflow Module
 * Milestone: BE-06
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../database/entities/application.entity';
import { WorkflowTimelineEvent } from './entities/workflow-timeline-event.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, WorkflowTimelineEvent]),
    UsersModule,
    AuditModule,
    SlaModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
