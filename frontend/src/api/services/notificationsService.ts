/**
 * ApprovalSync — Notifications API Service
 * Milestone: AICTE-PS26262-ALERTS
 * Connects to /api/v1/notifications endpoints.
 */

import { apiClient } from '../client';
import {
  AppNotification,
  NotificationListResponse,
  NotificationSeverity,
  NotificationType,
} from '../types';

export interface NotificationQueryParams {
  isRead?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  page?: number;
  limit?: number;
}

export interface SweepResult {
  evaluated: number;
  triggered: number;
  details: string[];
}

export const notificationsService = {
  /**
   * Retrieve paginated notifications and total unread count for the active tenant.
   * Path: GET /api/v1/notifications
   */
  async getNotifications(params?: NotificationQueryParams): Promise<NotificationListResponse> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.isRead !== undefined) query.isRead = params.isRead;
    if (params?.type) query.type = params.type;
    if (params?.severity) query.severity = params.severity;
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;

    return apiClient.get<NotificationListResponse>('/notifications', query);
  },

  /**
   * Mark a specific notification as read.
   * Path: PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(notificationId: string): Promise<AppNotification> {
    return apiClient.patch<AppNotification>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      {},
    );
  },

  /**
   * Mark all unread notifications for the active tenant as read.
   * Path: POST /api/v1/notifications/mark-all-read
   */
  async markAllAsRead(): Promise<{ updatedCount: number }> {
    return apiClient.post<{ updatedCount: number }>('/notifications/mark-all-read', {});
  },

  /**
   * Evaluate SLA deadlines, undertakings, and doc expiries across applications.
   * Path: POST /api/v1/notifications/sweep
   */
  async sweepDeadlines(): Promise<SweepResult> {
    return apiClient.post<SweepResult>('/notifications/sweep', {});
  },
};

