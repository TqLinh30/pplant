import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseReminderExceptionRow,
  parseReminderRow,
  parseReminderScheduledNotificationRow,
  type ReminderExceptionRow,
  type ReminderRow,
  type ReminderScheduledNotificationRow,
} from '@/domain/reminders/schemas';
import type {
  Reminder,
  ReminderException,
  ReminderScheduledNotification,
  SaveReminderExceptionInput,
  SaveReminderInput,
  SaveReminderScheduledNotificationInput,
} from '@/domain/reminders/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type ReminderRepository = {
  createException(input: SaveReminderExceptionInput): Promise<AppResult<ReminderException>>;
  createReminder(input: SaveReminderInput): Promise<AppResult<Reminder>>;
  deleteReminder(workspaceId: WorkspaceId, id: EntityId, deletedAt: string, updatedAt: string): Promise<AppResult<Reminder>>;
  getReminder(workspaceId: WorkspaceId, id: EntityId, options?: { includeDeleted?: boolean }): Promise<AppResult<Reminder | null>>;
  listExceptions(workspaceId: WorkspaceId, reminderId: EntityId): Promise<AppResult<ReminderException[]>>;
  listReminders(workspaceId: WorkspaceId): Promise<AppResult<Reminder[]>>;
  listScheduledNotifications(workspaceId: WorkspaceId, reminderId: EntityId): Promise<AppResult<ReminderScheduledNotification[]>>;
  replaceScheduledNotifications(
    workspaceId: WorkspaceId,
    reminderId: EntityId,
    deletedAt: string,
    notifications: SaveReminderScheduledNotificationInput[],
  ): Promise<AppResult<ReminderScheduledNotification[]>>;
  updateScheduleState(
    workspaceId: WorkspaceId,
    id: EntityId,
    permissionStatus: Reminder['permissionStatus'],
    scheduleState: Reminder['scheduleState'],
    updatedAt: string,
  ): Promise<AppResult<Reminder>>;
};

type ReminderSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectReminderColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  owner_kind AS ownerKind,
  task_id AS taskId,
  task_recurrence_rule_id AS taskRecurrenceRuleId,
  title,
  notes,
  frequency,
  starts_on_local_date AS startsOnLocalDate,
  reminder_local_time AS reminderLocalTime,
  ends_on_local_date AS endsOnLocalDate,
  source,
  source_of_truth AS sourceOfTruth,
  permission_status AS permissionStatus,
  schedule_state AS scheduleState,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM reminders
`;
}

function runAtomic(client: ReminderSqlClient, task: () => void): void {
  if (client.withTransactionSync) {
    client.withTransactionSync(task);
    return;
  }

  client.execSync('BEGIN TRANSACTION');

  try {
    task();
    client.execSync('COMMIT');
  } catch (cause) {
    client.execSync('ROLLBACK');
    throw cause;
  }
}

async function loadReminder(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<Reminder | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<ReminderRow>(
      `${selectReminderColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseReminderRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local reminder could not be loaded.', 'retry', cause));
  }
}

function parseReminderInput(input: SaveReminderInput): AppResult<Reminder> {
  return parseReminderRow({
    createdAt: input.createdAt,
    deletedAt: input.deletedAt ?? null,
    endsOnLocalDate: input.endsOnLocalDate ?? null,
    frequency: input.frequency,
    id: input.id,
    notes: input.notes ?? null,
    ownerKind: input.ownerKind,
    permissionStatus: input.permissionStatus,
    reminderLocalTime: input.reminderLocalTime,
    scheduleState: input.scheduleState,
    source: input.source,
    sourceOfTruth: input.sourceOfTruth,
    startsOnLocalDate: input.startsOnLocalDate,
    taskId: input.taskId ?? null,
    taskRecurrenceRuleId: input.taskRecurrenceRuleId ?? null,
    title: input.title,
    updatedAt: input.updatedAt,
    workspaceId: input.workspaceId,
  });
}

function insertReminder(database: PplantDatabase, reminder: Reminder): void {
  database.$client.runSync(
    `INSERT INTO reminders
      (id, workspace_id, owner_kind, task_id, task_recurrence_rule_id, title, notes,
       frequency, starts_on_local_date, reminder_local_time, ends_on_local_date,
       source, source_of_truth, permission_status, schedule_state, created_at,
       updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    reminder.id,
    reminder.workspaceId,
    reminder.ownerKind,
    reminder.taskId,
    reminder.taskRecurrenceRuleId,
    reminder.title,
    reminder.notes,
    reminder.frequency,
    reminder.startsOnLocalDate,
    reminder.reminderLocalTime,
    reminder.endsOnLocalDate,
    reminder.source,
    reminder.sourceOfTruth,
    reminder.permissionStatus,
    reminder.scheduleState,
    reminder.createdAt,
    reminder.updatedAt,
    reminder.deletedAt,
  );
}

function insertScheduledNotification(database: PplantDatabase, notification: ReminderScheduledNotification): void {
  database.$client.runSync(
    `INSERT INTO reminder_scheduled_notifications
      (id, reminder_id, workspace_id, occurrence_local_date, fire_at_local,
       scheduled_notification_id, delivery_state, schedule_attempted_at,
       schedule_error_category, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    notification.id,
    notification.reminderId,
    notification.workspaceId,
    notification.occurrenceLocalDate,
    notification.fireAtLocal,
    notification.scheduledNotificationId,
    notification.deliveryState,
    notification.scheduleAttemptedAt,
    notification.scheduleErrorCategory,
    notification.createdAt,
    notification.updatedAt,
    notification.deletedAt,
  );
}

function parseScheduledNotificationInput(
  input: SaveReminderScheduledNotificationInput,
): AppResult<ReminderScheduledNotification> {
  return parseReminderScheduledNotificationRow({
    createdAt: input.createdAt,
    deletedAt: input.deletedAt ?? null,
    deliveryState: input.deliveryState,
    fireAtLocal: input.fireAtLocal,
    id: input.id,
    occurrenceLocalDate: input.occurrenceLocalDate,
    reminderId: input.reminderId,
    scheduleAttemptedAt: input.scheduleAttemptedAt,
    scheduleErrorCategory: input.scheduleErrorCategory ?? null,
    scheduledNotificationId: input.scheduledNotificationId,
    updatedAt: input.updatedAt,
    workspaceId: input.workspaceId,
  });
}

export function createReminderRepository(database: PplantDatabase): ReminderRepository {
  return {
    async createException(input) {
      try {
        const existing = database.$client.getFirstSync<ReminderExceptionRow>(
          `SELECT
             id,
             reminder_id AS reminderId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM reminder_exceptions
           WHERE workspace_id = ? AND reminder_id = ? AND occurrence_local_date = ? AND action = ?
           LIMIT 1`,
          input.workspaceId,
          input.reminderId,
          input.occurrenceLocalDate,
          input.action,
        );

        if (existing) {
          return parseReminderExceptionRow(existing);
        }

        const parsed = parseReminderExceptionRow({
          action: input.action,
          createdAt: input.createdAt,
          id: input.id,
          occurrenceLocalDate: input.occurrenceLocalDate,
          reminderId: input.reminderId,
          updatedAt: input.updatedAt,
          workspaceId: input.workspaceId,
        });

        if (!parsed.ok) {
          return parsed;
        }

        database.$client.runSync(
          `INSERT INTO reminder_exceptions
            (id, reminder_id, workspace_id, occurrence_local_date, action, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.reminderId,
          parsed.value.workspaceId,
          parsed.value.occurrenceLocalDate,
          parsed.value.action,
          parsed.value.createdAt,
          parsed.value.updatedAt,
        );

        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminder exception could not be saved.', 'retry', cause));
      }
    },

    async createReminder(input) {
      const parsed = parseReminderInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      try {
        insertReminder(database, parsed.value);
        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminder could not be saved.', 'retry', cause));
      }
    },

    async deleteReminder(workspaceId, id, deletedAt, updatedAt) {
      try {
        database.$client.runSync(
          `UPDATE reminders
           SET deleted_at = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          deletedAt,
          updatedAt,
          workspaceId,
          id,
        );
        database.$client.runSync(
          `UPDATE reminder_scheduled_notifications
           SET deleted_at = ?, updated_at = ?
           WHERE workspace_id = ? AND reminder_id = ? AND deleted_at IS NULL`,
          deletedAt,
          updatedAt,
          workspaceId,
          id,
        );

        const deleted = await loadReminder(database, workspaceId, id, { includeDeleted: true });

        if (!deleted.ok) {
          return deleted;
        }

        if (!deleted.value) {
          return err(createAppError('not_found', 'Reminder was not found.', 'edit'));
        }

        return ok(deleted.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminder could not be deleted.', 'retry', cause));
      }
    },

    async getReminder(workspaceId, id, options = {}) {
      return loadReminder(database, workspaceId, id, options);
    },

    async listExceptions(workspaceId, reminderId) {
      try {
        const rows = database.$client.getAllSync<ReminderExceptionRow>(
          `SELECT
             id,
             reminder_id AS reminderId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM reminder_exceptions
           WHERE workspace_id = ? AND reminder_id = ?
           ORDER BY occurrence_local_date ASC, created_at ASC`,
          workspaceId,
          reminderId,
        );
        const exceptions: ReminderException[] = [];

        for (const row of rows) {
          const parsed = parseReminderExceptionRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          exceptions.push(parsed.value);
        }

        return ok(exceptions);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminder exceptions could not be loaded.', 'retry', cause));
      }
    },

    async listReminders(workspaceId) {
      try {
        const rows = database.$client.getAllSync<ReminderRow>(
          `${selectReminderColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY starts_on_local_date ASC, reminder_local_time ASC, created_at ASC`,
          workspaceId,
        );
        const reminders: Reminder[] = [];

        for (const row of rows) {
          const parsed = parseReminderRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          reminders.push(parsed.value);
        }

        return ok(reminders);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminders could not be loaded.', 'retry', cause));
      }
    },

    async listScheduledNotifications(workspaceId, reminderId) {
      try {
        const rows = database.$client.getAllSync<ReminderScheduledNotificationRow>(
          `SELECT
             id,
             reminder_id AS reminderId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             fire_at_local AS fireAtLocal,
             scheduled_notification_id AS scheduledNotificationId,
             delivery_state AS deliveryState,
             schedule_attempted_at AS scheduleAttemptedAt,
             schedule_error_category AS scheduleErrorCategory,
             created_at AS createdAt,
             updated_at AS updatedAt,
             deleted_at AS deletedAt
           FROM reminder_scheduled_notifications
           WHERE workspace_id = ? AND reminder_id = ? AND deleted_at IS NULL
           ORDER BY occurrence_local_date ASC, created_at ASC`,
          workspaceId,
          reminderId,
        );
        const notifications: ReminderScheduledNotification[] = [];

        for (const row of rows) {
          const parsed = parseReminderScheduledNotificationRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          notifications.push(parsed.value);
        }

        return ok(notifications);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local scheduled reminders could not be loaded.', 'retry', cause));
      }
    },

    async replaceScheduledNotifications(workspaceId, reminderId, deletedAt, notifications) {
      const parsedNotifications: ReminderScheduledNotification[] = [];

      for (const notification of notifications) {
        const parsed = parseScheduledNotificationInput(notification);

        if (!parsed.ok) {
          return parsed;
        }

        parsedNotifications.push(parsed.value);
      }

      try {
        runAtomic(database.$client as ReminderSqlClient, () => {
          database.$client.runSync(
            `UPDATE reminder_scheduled_notifications
             SET deleted_at = ?, updated_at = ?
             WHERE workspace_id = ? AND reminder_id = ? AND deleted_at IS NULL`,
            deletedAt,
            deletedAt,
            workspaceId,
            reminderId,
          );

          for (const notification of parsedNotifications) {
            insertScheduledNotification(database, notification);
          }
        });

        return ok(parsedNotifications);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local scheduled reminders could not be replaced.', 'retry', cause));
      }
    },

    async updateScheduleState(workspaceId, id, permissionStatus, scheduleState, updatedAt) {
      try {
        database.$client.runSync(
          `UPDATE reminders
           SET permission_status = ?, schedule_state = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          permissionStatus,
          scheduleState,
          updatedAt,
          workspaceId,
          id,
        );

        const updated = await loadReminder(database, workspaceId, id);

        if (!updated.ok) {
          return updated;
        }

        if (!updated.value) {
          return err(createAppError('not_found', 'Reminder was not found.', 'edit'));
        }

        return ok(updated.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reminder could not be updated.', 'retry', cause));
      }
    },
  };
}
