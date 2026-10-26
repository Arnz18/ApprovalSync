/**
 * ApprovalSync — Applications Module
 * Milestone: BE-04
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { Document } from '../database/entities/document.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { UsersModule } from '../users/users.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Institution, Document]),
    UsersModule,
    WorkflowModule,
    AuditModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
