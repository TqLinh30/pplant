import { createAppError } from '@/domain/common/app-error';
import { err } from '@/domain/common/result';

import type { NotificationSchedulerPort } from './notification-scheduler.port';

export const expoNotificationScheduler: NotificationSchedulerPort = {
  async scheduleReminder() {
    return err(createAppError('unavailable', 'Notification scheduling is not implemented yet.', 'none'));
  },
  async cancelReminder() {
    return err(createAppError('unavailable', 'Notification cancellation is not implemented yet.', 'none'));
  },
};
