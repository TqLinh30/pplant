import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

import type { NotificationPermissionStatus, NotificationSchedulerPort } from './notification-scheduler.port';

const reminderChannelId = 'pplant-reminders';

function normalizePermissionStatus(status: string | null | undefined, granted?: boolean): NotificationPermissionStatus {
  if (granted || status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}

function unavailable(cause: unknown): AppResult<never> {
  return err(createAppError('unavailable', 'Notification scheduling is unavailable right now.', 'retry', cause));
}

export const expoNotificationScheduler: NotificationSchedulerPort = {
  async cancelScheduledNotification(identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      return ok({ cancelled: true });
    } catch (cause) {
      return unavailable(cause);
    }
  },

  async ensureAndroidChannel() {
    if (Platform.OS !== 'android') {
      return ok({ configured: false });
    }

    try {
      await Notifications.setNotificationChannelAsync(reminderChannelId, {
        importance: Notifications.AndroidImportance.DEFAULT,
        name: 'Pplant reminders',
      });

      return ok({ configured: true });
    } catch (cause) {
      return unavailable(cause);
    }
  },

  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();

      return ok(notifications.map((notification) => ({ identifier: notification.identifier })));
    } catch (cause) {
      return unavailable(cause);
    }
  },

  async getPermissionStatus() {
    try {
      const status = await Notifications.getPermissionsAsync();

      return ok(normalizePermissionStatus(status.status, status.granted));
    } catch (cause) {
      return unavailable(cause);
    }
  },

  async requestPermission() {
    const channel = await this.ensureAndroidChannel();

    if (!channel.ok) {
      return channel;
    }

    try {
      const status = await Notifications.requestPermissionsAsync();

      return ok(normalizePermissionStatus(status.status, status.granted));
    } catch (cause) {
      return unavailable(cause);
    }
  },

  async scheduleReminderNotification(request) {
    try {
      const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          body: request.body ?? undefined,
          title: request.title,
        },
        trigger: {
          channelId: reminderChannelId,
          date: request.fireAt,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
        },
      });

      return ok({ scheduledNotificationId });
    } catch (cause) {
      return unavailable(cause);
    }
  },
};
