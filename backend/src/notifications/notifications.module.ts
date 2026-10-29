/**
 * ApprovalSync — Notifications Module
 * Milestone: AICTE-26262
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { SlaTimer } from '../database/entities/sla-timer.entity';
import { Undertaking } from '../undertakings/entities/undertaking.entity';
import { Application } from '../database/entities/application.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      SlaTimer,
      Undertaking,
      Application,
    ]),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
