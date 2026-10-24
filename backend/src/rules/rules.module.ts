/**
 * ApprovalSync — Rules and Checklists Module
 * Milestone: BE-05
 *
 * Encapsulates versioned regulatory rules, checklists, and evaluation resolution.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RuleSet,
  RuleVersion,
  RegulatoryRule,
  ChecklistTemplate,
  ChecklistItem,
} from './entities';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RuleSet,
      RuleVersion,
      RegulatoryRule,
      ChecklistTemplate,
      ChecklistItem,
    ]),
    UsersModule,
  ],

  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
