/**
 * ApprovalSync — Compliance Module
 * Milestone: DOC-06
 *
 * Encapsulates compliance evidence assessment, infrastructure review assist,
 * and regulatory checklist evaluation.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../database/entities/application.entity';
import { Institution } from '../database/entities/institution.entity';
import { Document } from '../database/entities/document.entity';
import { RulesModule } from '../rules/rules.module';
import { ComplianceController } from './compliance.controller';
import {
  ComplianceService,
  ComplianceEvidenceEvaluatorService,
  InfrastructureReviewAssistService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Institution, Document]),
    RulesModule,
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceEvidenceEvaluatorService,
    InfrastructureReviewAssistService,
    ComplianceService,
  ],
  exports: [
    ComplianceService,
    ComplianceEvidenceEvaluatorService,
    InfrastructureReviewAssistService,
  ],
})
export class ComplianceModule {}
