/**
 * ApprovalSync — Undertakings Module
 * Milestone: BE-09
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Undertaking } from './entities/undertaking.entity';
import { UndertakingHistory } from './entities/undertaking-history.entity';
import { Institution } from '../database/entities/institution.entity';
import { Application } from '../database/entities/application.entity';
import { UndertakingsService } from './undertakings.service';
import { UndertakingsController } from './undertakings.controller';
import { UndertakingsClockService } from './clock/undertakings-clock.service';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Undertaking,
      UndertakingHistory,
      Institution,
      Application,
    ]),
    UsersModule,
    AuditModule,
    SlaModule,
  ],
  controllers: [UndertakingsController],
  providers: [UndertakingsService, UndertakingsClockService],
  exports: [UndertakingsService, UndertakingsClockService],
})
export class UndertakingsModule {}
