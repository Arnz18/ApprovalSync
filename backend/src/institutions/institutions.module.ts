/**
 * ApprovalSync — Institutions Module
 * Milestone: BE-04
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from '../database/entities/institution.entity';
import { InstitutionsService } from './institutions.service';
import { InstitutionsController } from './institutions.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Institution]), UsersModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
