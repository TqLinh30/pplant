import type {
  ReminderExceptionRow,
  ReminderRow,
  ReminderScheduledNotificationRow,
} from '@/domain/reminders/schemas';
import type { SaveReminderInput } from '@/domain/reminders/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createReminderRepository } from './reminders.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

class FakeReminderClient {
  readonly executedSql: string[] = [];
  exceptions: ReminderExceptionRow[] = [];
  reminders: ReminderRow[] = [];
  scheduledNotifications: ReminderScheduledNotificationRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const exceptions = this.exceptions.map((exception) => ({ ...exception }));
    const reminders = this.reminders.map((reminder) => ({ ...reminder }));
    const scheduledNotifications = this.scheduledNotifications.map((notification) => ({ ...notification }));

    try {
      task();
    } catch (cause) {
      this.exceptions = exceptions;
      this.reminders = reminders;
      this.scheduledNotifications = scheduledNotifications;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO reminders')) {
      const [
        id,
        workspaceId,
        ownerKind,
        taskId,
        taskRecurrenceRuleId,
        title,
        notes,
        frequency,
        startsOnLocalDate,
        reminderLocalTime,
        endsOnLocalDate,
        sourceValue,
        sourceOfTruth,
        permissionStatus,
        scheduleState,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.reminders.push({
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        endsOnLocalDate: endsOnLocalDate as string | null,
        frequency: frequency as 'once' | 'daily' | 'weekly' | 'monthly',
        id: id as string,
        notes: notes as string | null,
        ownerKind: ownerKind as 'standalone' | 'task' | 'task_recurrence',
        permissionStatus: permissionStatus as 'unknown' | 'undetermined' | 'granted' | 'denied' | 'unavailable',
        reminderLocalTime: reminderLocalTime as string,
        scheduleState: scheduleState as 'local_only' | 'scheduled' | 'permission_denied' | 'unavailable' | 'failed',
        source: sourceValue as 'manual',
        sourceOfTruth: sourceOfTruth as 'manual',
        startsOnLocalDate: startsOnLocalDate as string,
        taskId: taskId as string | null,
        taskRecurrenceRuleId: taskRecurrenceRuleId as string | null,
        title: title as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE reminders') && source.includes('permission_status')) {
      const [permissionStatus, scheduleState, updatedAt, workspaceId, id] = params;
      const reminder = this.reminders.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (reminder) {
        reminder.permissionStatus = permissionStatus as ReminderRow['permissionStatus'];
        reminder.scheduleState = scheduleState as ReminderRow['scheduleState'];
        reminder.updatedAt = updatedAt as string;
      }

      return { changes: reminder ? 1 : 0 };
    }

    if (source.includes('UPDATE reminders') && source.includes('deleted_at')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const reminder = this.reminders.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (reminder) {
        reminder.deletedAt = deletedAt as string;
        reminder.updatedAt = updatedAt as string;
      }

      return { changes: reminder ? 1 : 0 };
    }

    if (source.includes('INSERT INTO reminder_exceptions')) {
      const [id, reminderId, workspaceId, occurrenceLocalDate, action, createdAt, updatedAt] = params;
      this.exceptions.push({
        action: action as 'skip',
        createdAt: createdAt as string,
        id: id as string,
        occurrenceLocalDate: occurrenceLocalDate as string,
        reminderId: reminderId as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO reminder_scheduled_notifications')) {
      const [
        id,
        reminderId,
        workspaceId,
        occurrenceLocalDate,
        fireAtLocal,
        scheduledNotificationId,
        deliveryState,
        scheduleAttemptedAt,
        scheduleErrorCategory,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.scheduledNotifications.push({
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        deliveryState: deliveryState as 'scheduled',
        fireAtLocal: fireAtLocal as string,
        id: id as string,
        occurrenceLocalDate: occurrenceLocalDate as string,
        reminderId: reminderId as string,
        scheduleAttemptedAt: scheduleAttemptedAt as string,
        scheduleErrorCategory: scheduleErrorCategory as string | null,
        scheduledNotificationId: scheduledNotificationId as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE reminder_scheduled_notifications')) {
      const [deletedAt, updatedAt, workspaceId, reminderId] = params;
      let changes = 0;

      this.scheduledNotifications.forEach((notification) => {
        if (
          notification.workspaceId === workspaceId &&
          notification.reminderId === reminderId &&
          notification.deletedAt === null
        ) {
          notification.deletedAt = deletedAt as string;
          notification.updatedAt = updatedAt as string;
          changes += 1;
        }
      });

      return { changes };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('FROM reminder_exceptions')) {
      const [workspaceId, reminderId, occurrenceLocalDate, action] = params;

      return (
        (this.exceptions.find(
          (exception) =>
            exception.workspaceId === workspaceId &&
            exception.reminderId === reminderId &&
            exception.occurrenceLocalDate === occurrenceLocalDate &&
            exception.action === action,
        ) as T | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;
    const includeDeleted = !source.includes('deleted_at IS NULL');

    return (
      (this.reminders.find(
        (reminder) =>
          reminder.workspaceId === workspaceId &&
          reminder.id === id &&
          (includeDeleted || reminder.deletedAt === null),
      ) as T | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('FROM reminder_exceptions')) {
      const [workspaceId, reminderId] = params;

      return this.exceptions
        .filter((exception) => exception.workspaceId === workspaceId && exception.reminderId === reminderId)
        .sort((left, right) => left.occurrenceLocalDate.localeCompare(right.occurrenceLocalDate))
        .map((exception) => ({ ...exception }) as T);
    }

    if (source.includes('FROM reminder_scheduled_notifications')) {
      const [workspaceId, reminderId] = params;

      return this.scheduledNotifications
        .filter(
          (notification) =>
            notification.workspaceId === workspaceId &&
            notification.reminderId === reminderId &&
            notification.deletedAt === null,
        )
        .sort((left, right) => left.occurrenceLocalDate.localeCompare(right.occurrenceLocalDate))
        .map((notification) => ({ ...notification }) as T);
    }

    const [workspaceId] = params;

    return this.reminders
      .filter((reminder) => reminder.workspaceId === workspaceId && reminder.deletedAt === null)
      .sort((left, right) => left.startsOnLocalDate.localeCompare(right.startsOnLocalDate))
      .map((reminder) => ({ ...reminder }) as T);
  }
}

function createInput(overrides: Partial<SaveReminderInput> = {}): SaveReminderInput {
  return {
    createdAt: fixedNow,
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'reminder-study',
    notes: 'Bring workbook',
    ownerKind: 'standalone',
    permissionStatus: 'unknown',
    reminderLocalTime: '09:30',
    scheduleState: 'local_only',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-08',
    taskId: null,
    taskRecurrenceRuleId: null,
    title: 'Study reminder',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRepository(client: FakeReminderClient) {
  return createReminderRepository({ $client: client } as never);
}

describe('reminder repository', () => {
  it('creates and lists active reminders without touching recurrence tables', async () => {
    const client = new FakeReminderClient();
    const repository = createRepository(client);

    const created = await repository.createReminder(createInput());
    const listed = await repository.listReminders(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
      expect(listed.value[0]).toMatchObject({
        frequency: 'daily',
        ownerKind: 'standalone',
        title: 'Study reminder',
      });
    }
    expect(client.executedSql.join('\n')).toContain('INSERT INTO reminders');
    expect(client.executedSql.join('\n')).not.toContain(' recurrence_rules ');
    expect(client.executedSql.join('\n')).not.toContain(' task_recurrence_rules ');
  });

  it('stores skip exceptions idempotently', async () => {
    const client = new FakeReminderClient();
    const repository = createRepository(client);

    await repository.createReminder(createInput());

    const first = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-1',
      occurrenceLocalDate: '2026-05-09',
      reminderId: 'reminder-study',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const duplicate = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-2',
      occurrenceLocalDate: '2026-05-09',
      reminderId: 'reminder-study',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const listed = await repository.listExceptions(localWorkspaceId, 'reminder-study' as never);

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    expect(client.exceptions).toHaveLength(1);
    expect(listed.ok && listed.value[0].id).toBe('exception-1');
  });

  it('replaces scheduled notification ids and soft deletes stale rows', async () => {
    const client = new FakeReminderClient();
    const repository = createRepository(client);

    await repository.createReminder(createInput());

    const first = await repository.replaceScheduledNotifications(localWorkspaceId, 'reminder-study' as never, fixedNow, [
      {
        createdAt: fixedNow,
        deliveryState: 'scheduled',
        fireAtLocal: '2026-05-08T09:30',
        id: 'notification-1',
        occurrenceLocalDate: '2026-05-08',
        reminderId: 'reminder-study',
        scheduleAttemptedAt: fixedNow,
        scheduledNotificationId: 'platform-1',
        updatedAt: fixedNow,
        workspaceId: localWorkspaceId,
      },
    ]);
    const second = await repository.replaceScheduledNotifications(
      localWorkspaceId,
      'reminder-study' as never,
      '2026-05-08T01:00:00.000Z',
      [
        {
          createdAt: '2026-05-08T01:00:00.000Z',
          deliveryState: 'scheduled',
          fireAtLocal: '2026-05-09T09:30',
          id: 'notification-2',
          occurrenceLocalDate: '2026-05-09',
          reminderId: 'reminder-study',
          scheduleAttemptedAt: '2026-05-08T01:00:00.000Z',
          scheduledNotificationId: 'platform-2',
          updatedAt: '2026-05-08T01:00:00.000Z',
          workspaceId: localWorkspaceId,
        },
      ],
    );
    const active = await repository.listScheduledNotifications(localWorkspaceId, 'reminder-study' as never);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(client.scheduledNotifications).toHaveLength(2);
    expect(client.scheduledNotifications[0].deletedAt).toBe('2026-05-08T01:00:00.000Z');
    expect(active.ok && active.value.map((notification) => notification.scheduledNotificationId)).toEqual(['platform-2']);
  });

  it('updates schedule state and soft deletes reminders with notification rows', async () => {
    const client = new FakeReminderClient();
    const repository = createRepository(client);

    await repository.createReminder(createInput());
    await repository.replaceScheduledNotifications(localWorkspaceId, 'reminder-study' as never, fixedNow, [
      {
        createdAt: fixedNow,
        deliveryState: 'scheduled',
        fireAtLocal: '2026-05-08T09:30',
        id: 'notification-1',
        occurrenceLocalDate: '2026-05-08',
        reminderId: 'reminder-study',
        scheduleAttemptedAt: fixedNow,
        scheduledNotificationId: 'platform-1',
        updatedAt: fixedNow,
        workspaceId: localWorkspaceId,
      },
    ]);

    const updated = await repository.updateScheduleState(
      localWorkspaceId,
      'reminder-study' as never,
      'granted',
      'scheduled',
      '2026-05-08T01:00:00.000Z',
    );
    const deleted = await repository.deleteReminder(
      localWorkspaceId,
      'reminder-study' as never,
      '2026-05-08T02:00:00.000Z',
      '2026-05-08T02:00:00.000Z',
    );
    const active = await repository.getReminder(localWorkspaceId, 'reminder-study' as never);

    expect(updated.ok && updated.value.scheduleState).toBe('scheduled');
    expect(deleted.ok && deleted.value.deletedAt).toBe('2026-05-08T02:00:00.000Z');
    expect(client.scheduledNotifications[0].deletedAt).toBe('2026-05-08T02:00:00.000Z');
    expect(active).toEqual({ ok: true, value: null });
  });
});
