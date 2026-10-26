/**
 * ApprovalSync — Cryptographic Audit Ledger Module
 * Milestone: BE-07
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Application } from '../database/entities/application.entity';
import { AuditCheckpoint } from './entities/audit-checkpoint.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Application, AuditCheckpoint]),
    UsersModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
