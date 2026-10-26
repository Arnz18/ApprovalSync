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
import { APP_GUARD } from '@nestjs/core';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { ApplicationsModule } from './applications/applications.module';
import { RulesModule } from './rules/rules.module';
import { WorkflowModule } from './workflow/workflow.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { VerificationModule } from './verification/verification.module';
import { ProvidersModule } from './providers/providers.module';
import { ComplianceModule } from './compliance/compliance.module';
import { AuditModule } from './audit/audit.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

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
    UsersModule,
    AuthModule,
    InstitutionsModule,
    ApplicationsModule,
    RulesModule,
    WorkflowModule,
    AuditModule,
    DocumentsModule,
    AiModule,
    VerificationModule,
    ProvidersModule,
    ComplianceModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
