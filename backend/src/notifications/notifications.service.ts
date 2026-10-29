/**
 * ApprovalSync — Notifications & Alert Management Service
 * Milestone: AICTE-26262
 *
 * Implements deadline reminder monitoring, SLA warning/breach alerts,
 * compliance validity tracking, in-app notification dispatch, and tenant isolation.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationSeverity } from './enums/notification-severity.enum';
import {
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationListResponseDto,
} from './dto/notification-dtos';
import { AuthUserPrincipal } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../shared/contracts';
import { SlaTimer } from '../database/entities/sla-timer.entity';
import { Undertaking } from '../undertakings/entities/undertaking.entity';
import { Application } from '../database/entities/application.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(SlaTimer)
    private readonly slaTimerRepo: Repository<SlaTimer>,
    @InjectRepository(Undertaking)
    private readonly undertakingRepo: Repository<Undertaking>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
  ) {}

  /**
   * Retrieves notifications tailored to the authenticated user and their institutional tenant.
   */
  async getNotifications(
    currentUser: AuthUserPrincipal,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const qb = this.notificationRepo.createQueryBuilder('n');

    // Tenant / Role routing:
    // User sees notifications specifically for their userId, OR for their role
    // For INSTITUTION_USER, only see notifications for their institutionId
    if (
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      currentUser.role === UserRole.AUDITOR
    ) {
      // System administrators and auditors have oversight across all alerts
    } else if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (currentUser.institutionId) {
        qb.where(
          '(n.user_id = :userId OR (n.institution_id = :instId AND (n.target_role = :role OR n.target_role IS NULL)))',
          {
            userId: currentUser.id,
            instId: currentUser.institutionId,
            role: currentUser.role,
          },
        );
      } else {
        qb.where('n.user_id = :userId', { userId: currentUser.id });
      }
    } else {
      // Regulatory roles see role-targeted alerts or user-specific alerts
      qb.where(
        '(n.user_id = :userId OR n.target_role = :role OR n.target_role IS NULL)',
        {
          userId: currentUser.id,
          role: currentUser.role,
        },
      );
    }

    if (query.unreadOnly) {
      qb.andWhere('n.is_read = FALSE');
    }

    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    // Calculate unread count with same access rules
    const unreadQb = this.notificationRepo.createQueryBuilder('n');
    unreadQb.where('n.is_read = FALSE');
    if (
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      currentUser.role === UserRole.AUDITOR
    ) {
      // System administrators and auditors have global unread count
    } else if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (currentUser.institutionId) {
        unreadQb.andWhere(
          '(n.user_id = :userId OR (n.institution_id = :instId AND (n.target_role = :role OR n.target_role IS NULL)))',
          {
            userId: currentUser.id,
            instId: currentUser.institutionId,
            role: currentUser.role,
          },
        );
      } else {
        unreadQb.andWhere('n.user_id = :userId', {
          userId: currentUser.id,
        });
      }
    } else {
      unreadQb.andWhere(
        '(n.user_id = :userId OR n.target_role = :role OR n.target_role IS NULL)',
        {
          userId: currentUser.id,
          role: currentUser.role,
        },
      );
    }

    const unreadCount = await unreadQb.getCount();

    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    qb.orderBy('n.created_at', 'DESC').skip(skip).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.mapToDto(item)),
      unreadCount,
      totalItems,
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(
    id: string,
    currentUser: AuthUserPrincipal,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (
      currentUser.role === UserRole.INSTITUTION_USER &&
      notification.institutionId &&
      notification.institutionId !== currentUser.institutionId
    ) {
      throw new NotFoundException('Notification not found.');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    const saved = await this.notificationRepo.save(notification);
    return this.mapToDto(saved);
  }

  /**
   * Marks all notifications for the current user as read.
   */
  async markAllAsRead(
    currentUser: AuthUserPrincipal,
  ): Promise<{ count: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('is_read = FALSE');

    if (currentUser.role === UserRole.INSTITUTION_USER) {
      if (currentUser.institutionId) {
        qb.andWhere(
          '(user_id = :userId OR (institution_id = :instId AND (target_role = :role OR target_role IS NULL)))',
          {
            userId: currentUser.id,
            instId: currentUser.institutionId,
            role: currentUser.role,
          },
        );
      } else {
        qb.andWhere('user_id = :userId', { userId: currentUser.id });
      }
    } else {
      qb.andWhere(
        '(user_id = :userId OR target_role = :role OR target_role IS NULL)',
        {
          userId: currentUser.id,
          role: currentUser.role,
        },
      );
    }

    const result = await qb.execute();
    return { count: result.affected || 0 };
  }

  /**
   * Creates an in-app notification idempotently.
   */
  async createNotification(data: {
    userId?: string | null;
    targetRole?: UserRole | null;
    institutionId?: string | null;
    applicationId?: string | null;
    undertakingId?: string | null;
    type: NotificationType;
    severity?: NotificationSeverity;
    title: string;
    message: string;
    link?: string | null;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<Notification | null> {
    if (data.idempotencyKey) {
      const existing = await this.notificationRepo.findOne({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const notification = this.notificationRepo.create({
      userId: data.userId || null,
      targetRole: data.targetRole || null,
      institutionId: data.institutionId || null,
      applicationId: data.applicationId || null,
      undertakingId: data.undertakingId || null,
      type: data.type,
      severity: data.severity || NotificationSeverity.INFO,
      title: data.title,
      message: data.message,
      link: data.link || null,
      idempotencyKey: data.idempotencyKey || null,
      metadataJsonb: data.metadata || {},
    });

    try {
      return await this.notificationRepo.save(notification);
    } catch (err: unknown) {
      this.logger.warn(
        `Notification creation failed or duplicate key skipped: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Sweeps active timers, compliance undertakings, and deadlines, emitting in-app alerts.
   */
  async sweepDeadlines(): Promise<{
    slaWarningsEmitted: number;
    slaBreachesEmitted: number;
    undertakingAlertsEmitted: number;
    totalGenerated: number;
  }> {
    const now = new Date();
    let slaWarnings = 0;
    let slaBreaches = 0;
    let undertakingAlerts = 0;

    // 1. Sweep active SLA timers for approaching warnings and breaches
    const activeTimers = await this.slaTimerRepo.find({
      where: {},
      relations: ['application'],
    });

    for (const timer of activeTimers) {
      const appNumber =
        timer.application?.applicationNumber || timer.applicationId;
      const targetDeadline = new Date(timer.targetDeadline);
      const isBreached = now > targetDeadline;

      if (isBreached) {
        const idempotencyKey = `sla_breach_${timer.id}_${targetDeadline.toISOString().split('T')[0]}`;
        const created = await this.createNotification({
          targetRole: UserRole.REGIONAL_OFFICER,
          institutionId: timer.application?.institutionId || null,
          applicationId: timer.applicationId,
          type: NotificationType.SLA_BREACH,
          severity: NotificationSeverity.CRITICAL,
          title: `SLA Breach Notice: ${appNumber}`,
          message: `Application ${appNumber} in stage ${timer.stage} has breached its regulatory turnaround deadline of ${targetDeadline.toLocaleDateString()}. Escalation alert raised.`,
          link: `/scrutiny/${timer.applicationId}`,
          idempotencyKey,
          metadata: {
            timerId: timer.id,
            stage: timer.stage,
            deadline: targetDeadline,
          },
        });
        if (created) slaBreaches++;
      } else {
        // Check if within 24 hours of deadline
        const hoursRemaining =
          (targetDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursRemaining <= 24 && hoursRemaining > 0) {
          const idempotencyKey = `sla_warning_${timer.id}_${Math.floor(hoursRemaining / 12)}`;
          const created = await this.createNotification({
            targetRole: UserRole.SCRUTINY_OFFICER,
            institutionId: timer.application?.institutionId || null,
            applicationId: timer.applicationId,
            type: NotificationType.SLA_WARNING,
            severity: NotificationSeverity.WARNING,
            title: `SLA Warning: ${appNumber} Due Soon`,
            message: `Stage ${timer.stage} review deadline expires in ${Math.round(hoursRemaining)} hours for ${appNumber}.`,
            link: `/scrutiny/${timer.applicationId}`,
            idempotencyKey,
            metadata: { timerId: timer.id, hoursRemaining },
          });
          if (created) slaWarnings++;
        }
      }
    }

    // 2. Sweep compliance undertakings nearing renewal due date or expired
    const undertakings = await this.undertakingRepo.find({
      where: {},
      relations: ['institution'],
    });

    for (const u of undertakings) {
      const renewalDue = new Date(u.renewalDueDate);
      const expiry = new Date(u.expiryDate);
      const instName = u.institution?.name || 'Institution';

      // Check expired
      if (now > expiry) {
        const idempotencyKey = `undertaking_expired_${u.id}_${expiry.toISOString().split('T')[0]}`;
        const created = await this.createNotification({
          targetRole: UserRole.REGIONAL_OFFICER,
          institutionId: u.institutionId,
          undertakingId: u.id,
          type: NotificationType.COMPLIANCE_OVERDUE,
          severity: NotificationSeverity.CRITICAL,
          title: `Overdue Compliance: ${u.title}`,
          message: `Statutory undertaking "${u.title}" (${u.documentNumber || 'Ref'}) for ${instName} expired on ${expiry.toLocaleDateString()}. Urgent regulatory escalation required.`,
          link: `/undertakings`,
          idempotencyKey,
          metadata: { undertakingId: u.id, expiryDate: expiry },
        });
        if (created) undertakingAlerts++;
      } else {
        // Check if renewal is due within 30 days
        const daysToRenewal =
          (renewalDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysToRenewal <= 30 && daysToRenewal >= -7) {
          const idempotencyKey = `undertaking_renewal_${u.id}_${Math.max(0, Math.floor(daysToRenewal / 7))}`;
          const created = await this.createNotification({
            targetRole: UserRole.INSTITUTION_USER,
            institutionId: u.institutionId,
            undertakingId: u.id,
            type: NotificationType.DEADLINE_REMINDER,
            severity: NotificationSeverity.WARNING,
            title: `Renewal Reminder: ${u.title}`,
            message: `Undertaking "${u.title}" renewal submission is due on ${renewalDue.toLocaleDateString()} (${Math.round(daysToRenewal)} days remaining). Please submit renewed deed/certificate.`,
            link: `/undertakings`,
            idempotencyKey,
            metadata: { undertakingId: u.id, renewalDueDate: renewalDue },
          });
          if (created) undertakingAlerts++;
        }
      }
    }

    const total = slaWarnings + slaBreaches + undertakingAlerts;
    this.logger.log(
      `Deadline sweep completed: ${slaWarnings} SLA warnings, ${slaBreaches} SLA breaches, ${undertakingAlerts} compliance alerts emitted.`,
    );

    return {
      slaWarningsEmitted: slaWarnings,
      slaBreachesEmitted: slaBreaches,
      undertakingAlertsEmitted: undertakingAlerts,
      totalGenerated: total,
    };
  }

  private mapToDto(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      userId: n.userId || null,
      targetRole: n.targetRole || null,
      institutionId: n.institutionId || null,
      applicationId: n.applicationId || null,
      undertakingId: n.undertakingId || null,
      type: n.type,
      severity: n.severity,
      title: n.title,
      message: n.message,
      link: n.link || null,
      isRead: n.isRead,
      readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
      metadata: n.metadataJsonb || {},
      createdAt: new Date(n.createdAt).toISOString(),
    };
  }
}
