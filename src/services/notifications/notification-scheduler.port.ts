import type { AppResult } from '@/domain/common/result';

export type ScheduleReminderRequest = {
  reminderId: string;
  fireAtLocal: string;
};

export type NotificationSchedulerPort = {
  scheduleReminder(request: ScheduleReminderRequest): Promise<AppResult<{ scheduled: boolean }>>;
  cancelReminder(reminderId: string): Promise<AppResult<{ cancelled: boolean }>>;
};
