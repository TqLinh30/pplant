import type { AppResult } from '@/domain/common/result';
import type { ReminderFireAtLocal } from '@/domain/reminders/types';

export type NotificationPermissionStatus = 'denied' | 'granted' | 'undetermined' | 'unavailable';

export type ScheduleReminderNotificationRequest = {
  body?: string | null;
  fireAt: Date;
  fireAtLocal: ReminderFireAtLocal;
  reminderId: string;
  title: string;
};

export type ScheduledNotificationSummary = {
  identifier: string;
};

export type NotificationSchedulerPort = {
  cancelScheduledNotification(identifier: string): Promise<AppResult<{ cancelled: boolean }>>;
  ensureAndroidChannel(): Promise<AppResult<{ configured: boolean }>>;
  getAllScheduledNotifications(): Promise<AppResult<ScheduledNotificationSummary[]>>;
  getPermissionStatus(): Promise<AppResult<NotificationPermissionStatus>>;
  requestPermission(): Promise<AppResult<NotificationPermissionStatus>>;
  scheduleReminderNotification(
    request: ScheduleReminderNotificationRequest,
  ): Promise<AppResult<{ scheduledNotificationId: string }>>;
};
