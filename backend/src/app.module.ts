/**
 * ApprovalSync — Root Application Module
 * Registers ConfigModule, CoreModule, and HealthModule.
 * Extension point for M2 and M3 domain modules.
 * Milestone: FND-02
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateConfig } from './config/config.validation';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    CoreModule,
    DatabaseModule,
    HealthModule,
    // Extension points for downstream modules:
    // M2: AuthModule, UsersModule, ApplicationsModule, WorkflowModule, RulesModule, AuditModule, SlaModule, UndertakingsModule
    // M3: DocumentsModule, VerificationModule, ComplianceModule, AiModule
  ],
})
export class AppModule {}
