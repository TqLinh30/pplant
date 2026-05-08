import { parseTaskRecurrenceRuleRow, parseTaskRow } from '@/domain/tasks/schemas';
import type { Task, TaskRecurrenceRule } from '@/domain/tasks/types';
import { createAppError } from '@/domain/common/app-error';
import { formatDateAsLocalDate } from '@/domain/common/date-rules';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseReminderExceptionRow,
  parseReminderRow,
  parseReminderScheduledNotificationRow,
} from '@/domain/reminders/schemas';
import type {
  Reminder,
  ReminderException,
  ReminderScheduledNotification,
  SaveReminderExceptionInput,
  SaveReminderInput,
  SaveReminderScheduledNotificationInput,
} from '@/domain/reminders/types';
import type { ScheduleReminderNotificationRequest } from '@/services/notifications/notification-scheduler.port';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createReminder,
  deleteReminder,
  disableReminder,
  enableReminder,
  loadReminderData,
  pauseReminder,
  resumeReminder,
  skipReminderOccurrence,
  snoozeReminder,
  updateReminder,
  type ReminderServiceDependencies,
} from './reminder.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function formatExpectedFireAtLocal(date: Date): string {
  return `${formatDateAsLocalDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function createTaskFixture(overrides: Record<string, unknown> = {}): Task {
  const result = parseTaskRow({
    categoryId: null,
    completedAt: null,
    createdAt: fixedNow.toISOString(),
    deadlineLocalDate: '2026-05-10',
    deletedAt: null,
    id: 'task-1',
    notes: 'Read chapter',
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Study biology',
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('task fixture failed');
  }

  return result.value;
}

function createRuleFixture(overrides: Record<string, unknown> = {}): TaskRecurrenceRule {
  const result = parseTaskRecurrenceRuleRow(
    {
      categoryId: null,
      createdAt: fixedNow.toISOString(),
      deletedAt: null,
      endsOnLocalDate: null,
      frequency: 'weekly',
      id: 'rule-1',
      kind: 'habit',
      notes: null,
      pausedAt: null,
      priority: 'high',
      source: 'manual',
      sourceOfTruth: 'manual',
      startsOnLocalDate: '2026-05-08',
      stoppedAt: null,
      stoppedOnLocalDate: null,
      title: 'Weekly planning',
      updatedAt: fixedNow.toISOString(),
      userCorrectedAt: null,
      workspaceId: localWorkspaceId,
      ...overrides,
    },
    [],
  );

  if (!result.ok) {
    throw new Error('rule fixture failed');
  }

  return result.value;
}

class FakeNotificationScheduler {
  cancelled: string[] = [];
  failCancelIdentifier: string | null = null;
  failGetPermission = false;
  failScheduleAfter: number | null = null;
  getPermissionStatusValue: 'denied' | 'granted' | 'undetermined' | 'unavailable' = 'granted';
  requestPermissionValue: 'denied' | 'granted' | 'undetermined' | 'unavailable' = 'granted';
  scheduled: ScheduleReminderNotificationRequest[] = [];

  async cancelScheduledNotification(identifier: string): Promise<AppResult<{ cancelled: boolean }>> {
    this.cancelled.push(identifier);

    if (this.failCancelIdentifier === identifier) {
      return err(createAppError('unavailable', 'Native notification cancellation failed.', 'retry'));
    }

    return ok({ cancelled: true });
  }

  async ensureAndroidChannel(): Promise<AppResult<{ configured: boolean }>> {
    return ok({ configured: false });
  }

  async getAllScheduledNotifications(): Promise<AppResult<{ identifier: string }[]>> {
    return ok(this.scheduled.map((_, index) => ({ identifier: `platform-${index + 1}` })));
  }

  async getPermissionStatus(): Promise<AppResult<'denied' | 'granted' | 'undetermined' | 'unavailable'>> {
    if (this.failGetPermission) {
      return err(createAppError('unavailable', 'Native notifications unavailable.', 'retry'));
    }

    return ok(this.getPermissionStatusValue);
  }

  async requestPermission(): Promise<AppResult<'denied' | 'granted' | 'undetermined' | 'unavailable'>> {
    return ok(this.requestPermissionValue);
  }

  async scheduleReminderNotification(
    request: ScheduleReminderNotificationRequest,
  ): Promise<AppResult<{ scheduledNotificationId: string }>> {
    this.scheduled.push(request);

    if (this.failScheduleAfter !== null && this.scheduled.length > this.failScheduleAfter) {
      return err(createAppError('unavailable', 'Native schedule failed.', 'retry'));
    }

    return ok({ scheduledNotificationId: `platform-${this.scheduled.length}` });
  }
}

function createDependencies({
  rules = [] as TaskRecurrenceRule[],
  scheduler = new FakeNotificationScheduler(),
  tasks = [createTaskFixture()],
}: {
  rules?: TaskRecurrenceRule[];
  scheduler?: FakeNotificationScheduler;
  tasks?: Task[];
} = {}) {
  const diagnostics: unknown[] = [];
  const exceptions: ReminderException[] = [];
  const reminders: Reminder[] = [];
  const scheduledNotifications: ReminderScheduledNotification[] = [];
  const reminderRepository = {
    createException: jest.fn(async (input: SaveReminderExceptionInput) => {
      const existing = exceptions.find(
        (exception) =>
          exception.reminderId === input.reminderId &&
          exception.occurrenceLocalDate === input.occurrenceLocalDate &&
          exception.action === input.action,
      );

      if (existing) {
        return ok(existing);
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

      if (parsed.ok) {
        exceptions.push(parsed.value);
      }

      return parsed;
    }),
    createReminder: jest.fn(async (input: SaveReminderInput) => {
      const parsed = parseReminderRow({
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

      if (parsed.ok) {
        reminders.push(parsed.value);
      }

      return parsed;
    }),
    updateReminder: jest.fn(async (input: SaveReminderInput) => {
      const reminder = reminders.find((candidate) => candidate.id === input.id && candidate.deletedAt === null);

      if (!reminder) {
        return err(createAppError('not_found', 'Missing reminder.', 'edit'));
      }

      const parsed = parseReminderRow({
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

      if (parsed.ok) {
        Object.assign(reminder, parsed.value);
      }

      return parsed;
    }),
    deleteReminder: jest.fn(async (_workspaceId: string, id: string, deletedAt: string, updatedAt: string) => {
      const reminder = reminders.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!reminder) {
        return err(createAppError('not_found', 'Missing reminder.', 'edit'));
      }

      Object.assign(reminder, { deletedAt, updatedAt });
      scheduledNotifications.forEach((notification) => {
        if (notification.reminderId === id && notification.deletedAt === null) {
          Object.assign(notification, { deletedAt, updatedAt });
        }
      });

      return ok({ ...reminder });
    }),
    getReminder: jest.fn(async (_workspaceId: string, id: string) =>
      ok(reminders.find((reminder) => reminder.id === id && reminder.deletedAt === null) ?? null),
    ),
    listExceptions: jest.fn(async (_workspaceId: string, reminderId: string) =>
      ok(exceptions.filter((exception) => exception.reminderId === reminderId)),
    ),
    listReminders: jest.fn(async () => ok(reminders.filter((reminder) => reminder.deletedAt === null))),
    listScheduledNotifications: jest.fn(async (_workspaceId: string, reminderId: string) =>
      ok(
        scheduledNotifications.filter(
          (notification) => notification.reminderId === reminderId && notification.deletedAt === null,
        ),
      ),
    ),
    replaceScheduledNotifications: jest.fn(
      async (_workspaceId: string, reminderId: string, deletedAt: string, inputs: SaveReminderScheduledNotificationInput[]) => {
        scheduledNotifications.forEach((notification) => {
          if (notification.reminderId === reminderId && notification.deletedAt === null) {
            Object.assign(notification, { deletedAt, updatedAt: deletedAt });
          }
        });

        const created: ReminderScheduledNotification[] = [];

        for (const input of inputs) {
          const parsed = parseReminderScheduledNotificationRow({
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

          if (!parsed.ok) {
            return parsed;
          }

          scheduledNotifications.push(parsed.value);
          created.push(parsed.value);
        }

        return ok(created);
      },
    ),
    updateScheduleState: jest.fn(
      async (_workspaceId: string, id: string, permissionStatus: Reminder['permissionStatus'], scheduleState: Reminder['scheduleState'], updatedAt: string) => {
        const reminder = reminders.find((candidate) => candidate.id === id && candidate.deletedAt === null);

        if (!reminder) {
          return err(createAppError('not_found', 'Missing reminder.', 'edit'));
        }

        Object.assign(reminder, { permissionStatus, scheduleState, updatedAt });
        return ok({ ...reminder });
      },
    ),
  };
  const taskRepository = {
    createTask: jest.fn(),
    deleteTask: jest.fn(),
    getTask: jest.fn(async (_workspaceId: string, id: string) =>
      ok(tasks.find((task) => task.id === id && task.deletedAt === null) ?? null),
    ),
    listRecentTasks: jest.fn(async () => ok(tasks.filter((task) => task.deletedAt === null))),
    listSummaryTasks: jest.fn(),
    updateTask: jest.fn(),
  };
  const taskRecurrenceRepository = {
    createException: jest.fn(),
    createRule: jest.fn(),
    deleteRule: jest.fn(),
    getRule: jest.fn(async (_workspaceId: string, id: string) =>
      ok(rules.find((rule) => rule.id === id && rule.deletedAt === null) ?? null),
    ),
    listCompletions: jest.fn(),
    listExceptions: jest.fn(),
    listRules: jest.fn(async () => ok(rules.filter((rule) => rule.deletedAt === null))),
    markCompletion: jest.fn(),
    pauseRule: jest.fn(),
    resumeRule: jest.fn(),
    stopRule: jest.fn(),
    undoCompletion: jest.fn(),
    updateRule: jest.fn(),
  };
  const dependencies: ReminderServiceDependencies = {
    appVersion: 'test-version',
    createDiagnosticEventId: () => `diagnostic-${diagnostics.length + 1}`,
    createDiagnosticsRepository: () =>
      ({
        recordEvent: jest.fn(async (input) => {
          diagnostics.push(input);
          return ok(input);
        }),
      }) as never,
    createExceptionId: () => `exception-${exceptions.length + 1}`,
    createReminderId: () => `reminder-${reminders.length + 1}`,
    createReminderRepository: () => reminderRepository as never,
    createScheduledNotificationId: () => `scheduled-${scheduledNotifications.length + 1}`,
    createTaskRecurrenceRepository: () => taskRecurrenceRepository as never,
    createTaskRepository: () => taskRepository as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    notificationScheduler: scheduler,
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    dependencies,
    diagnostics,
    exceptions,
    reminderRepository,
    reminders,
    scheduledNotifications,
    scheduler,
  };
}

describe('reminder service', () => {
  it('loads reminder data with bounded virtual occurrence previews', async () => {
    const { dependencies, reminders } = createDependencies();

    const created = await createReminder(
      {
        frequency: 'weekly',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        scheduleMode: 'local_only',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(created.ok).toBe(true);
    expect(reminders).toHaveLength(1);

    const loaded = await loadReminderData(dependencies);

    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.reminders[0].occurrences.map((occurrence) => occurrence.localDate).slice(0, 2)).toEqual([
        '2026-05-08',
        '2026-05-15',
      ]);
    }
  });

  it('schedules reminders when permission is granted and persists platform ids', async () => {
    const { dependencies, scheduler, scheduledNotifications } = createDependencies();

    const result = await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reminder.scheduleState).toBe('scheduled');
      expect(result.value.reminder.permissionStatus).toBe('granted');
    }
    expect(scheduler.scheduled).toHaveLength(30);
    expect(scheduledNotifications).toHaveLength(30);
    expect(scheduledNotifications[0]).toMatchObject({
      deliveryState: 'scheduled',
      fireAtLocal: '2026-05-08T09:30',
      scheduledNotificationId: 'platform-1',
    });
  });

  it('requests permission in context and falls back to local-only when denied', async () => {
    const scheduler = new FakeNotificationScheduler();
    scheduler.getPermissionStatusValue = 'undetermined';
    scheduler.requestPermissionValue = 'denied';
    const { dependencies, scheduledNotifications } = createDependencies({ scheduler });

    const result = await createReminder(
      {
        frequency: 'once',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reminder.scheduleState).toBe('permission_denied');
      expect(result.value.reminder.permissionStatus).toBe('denied');
    }
    expect(scheduler.scheduled).toHaveLength(0);
    expect(scheduledNotifications).toHaveLength(0);
  });

  it('records redacted scheduling diagnostics when notifications are unavailable', async () => {
    const scheduler = new FakeNotificationScheduler();
    scheduler.failGetPermission = true;
    const { dependencies, diagnostics } = createDependencies({ scheduler });

    const result = await createReminder(
      {
        frequency: 'once',
        notes: 'private note',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'private title',
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reminder.scheduleState).toBe('unavailable');
    }
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      errorCategory: 'unavailable',
      metadata: {
        deliveryState: 'unavailable',
        offline: false,
        permissionStatus: 'unavailable',
      },
      name: 'reminder_scheduling_failed',
    });
    expect(JSON.stringify(diagnostics[0])).not.toContain('private title');
    expect(JSON.stringify(diagnostics[0])).not.toContain('private note');
  });

  it('cancels partial schedules and keeps the reminder when native scheduling fails', async () => {
    const scheduler = new FakeNotificationScheduler();
    scheduler.failScheduleAfter = 1;
    const { dependencies, diagnostics, scheduledNotifications } = createDependencies({ scheduler });

    const result = await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reminder.scheduleState).toBe('unavailable');
    }
    expect(scheduler.cancelled).toEqual(['platform-1']);
    expect(scheduledNotifications).toHaveLength(0);
    expect(diagnostics).toHaveLength(1);
  });

  it('validates task and recurrence owners without materializing task occurrences', async () => {
    const { dependencies: taskDependencies } = createDependencies();
    const { dependencies: ruleDependencies } = createDependencies({ rules: [createRuleFixture()] });
    const missing = await createReminder(
      {
        frequency: 'once',
        ownerKind: 'task',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      taskDependencies,
    );
    const taskReminder = await createReminder(
      {
        frequency: 'once',
        ownerKind: 'task',
        reminderLocalTime: '09:30',
        scheduleMode: 'local_only',
        startsOnLocalDate: '2026-05-08',
        taskId: 'task-1',
        title: 'Study',
      },
      taskDependencies,
    );
    const recurrenceReminder = await createReminder(
      {
        frequency: 'weekly',
        ownerKind: 'task_recurrence',
        reminderLocalTime: '09:30',
        scheduleMode: 'local_only',
        startsOnLocalDate: '2026-05-08',
        taskRecurrenceRuleId: 'rule-1',
        title: 'Planning',
      },
      ruleDependencies,
    );

    expect(missing.ok).toBe(false);
    expect(taskReminder.ok && taskReminder.value.reminder.taskId).toBe('task-1');
    expect(recurrenceReminder.ok && recurrenceReminder.value.reminder.taskRecurrenceRuleId).toBe('rule-1');
  });

  it('stores skip exceptions and cancels the skipped scheduled occurrence', async () => {
    const { dependencies, exceptions, scheduler, scheduledNotifications } = createDependencies();

    const created = await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(created.ok).toBe(true);
    const skipped = await skipReminderOccurrence({ id: 'reminder-1' }, dependencies);

    expect(skipped).toEqual({ ok: true, value: '2026-05-08' });
    expect(exceptions).toHaveLength(1);
    expect(scheduler.cancelled).toContain('platform-1');
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(29);
  });

  it('updates reminder timing and rewrites the scheduled notification window', async () => {
    const { dependencies, scheduler, scheduledNotifications } = createDependencies();

    const created = await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    expect(created.ok).toBe(true);

    const updated = await updateReminder(
      {
        frequency: 'once',
        id: 'reminder-1',
        notes: 'Bring workbook',
        ownerKind: 'standalone',
        reminderLocalTime: '10:45',
        startsOnLocalDate: '2026-05-09',
        title: 'Study updated',
      },
      dependencies,
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.reminder).toMatchObject({
        frequency: 'once',
        reminderLocalTime: '10:45',
        scheduleState: 'scheduled',
        startsOnLocalDate: '2026-05-09',
        title: 'Study updated',
      });
    }
    expect(scheduler.cancelled).toHaveLength(30);
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(1);
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)[0]).toMatchObject({
      fireAtLocal: '2026-05-09T10:45',
      scheduledNotificationId: 'platform-31',
    });
  });

  it('cancels native notifications before clearing local rows when update loses permission', async () => {
    const { dependencies, scheduler, scheduledNotifications } = createDependencies();

    await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    scheduler.cancelled = [];
    scheduler.getPermissionStatusValue = 'denied';

    const updated = await updateReminder(
      {
        frequency: 'once',
        id: 'reminder-1',
        ownerKind: 'standalone',
        reminderLocalTime: '10:45',
        startsOnLocalDate: '2026-05-09',
        title: 'Study updated',
      },
      dependencies,
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.reminder).toMatchObject({
        permissionStatus: 'denied',
        scheduleState: 'permission_denied',
      });
    }
    expect(scheduler.cancelled).toHaveLength(30);
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(0);
  });

  it('keeps local notification ids when native cancellation fails during permission loss', async () => {
    const scheduler = new FakeNotificationScheduler();
    const { dependencies, scheduledNotifications } = createDependencies({ scheduler });

    await createReminder(
      {
        frequency: 'once',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    scheduler.cancelled = [];
    scheduler.failCancelIdentifier = 'platform-1';
    scheduler.getPermissionStatusValue = 'denied';

    const updated = await updateReminder(
      {
        frequency: 'once',
        id: 'reminder-1',
        ownerKind: 'standalone',
        reminderLocalTime: '10:45',
        startsOnLocalDate: '2026-05-09',
        title: 'Study updated',
      },
      dependencies,
    );

    expect(updated.ok).toBe(false);
    if (!updated.ok) {
      expect(updated.error.code).toBe('unavailable');
    }
    expect(scheduler.cancelled).toEqual(['platform-1']);
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(1);
  });

  it('snoozes the next occurrence without changing the source recurrence rule', async () => {
    const { dependencies, scheduler, scheduledNotifications } = createDependencies();

    await createReminder(
      {
        frequency: 'once',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    const snoozed = await snoozeReminder({ id: 'reminder-1', minutes: 30 }, dependencies);

    expect(snoozed.ok).toBe(true);
    if (snoozed.ok) {
      expect(snoozed.value.reminder).toMatchObject({
        reminderLocalTime: '09:30',
        scheduleState: 'snoozed',
        startsOnLocalDate: '2026-05-08',
      });
    }
    expect(scheduler.cancelled).toContain('platform-1');
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toEqual([
      expect.objectContaining({
        deliveryState: 'snoozed',
        fireAtLocal: formatExpectedFireAtLocal(new Date(fixedNow.getTime() + 30 * 60_000)),
        occurrenceLocalDate: '2026-05-08',
      }),
    ]);
  });

  it('cancels native notifications before clearing local rows when snooze loses permission', async () => {
    const { dependencies, scheduler, scheduledNotifications } = createDependencies();

    await createReminder(
      {
        frequency: 'once',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    scheduler.cancelled = [];
    scheduler.getPermissionStatusValue = 'denied';

    const snoozed = await snoozeReminder({ id: 'reminder-1', minutes: 30 }, dependencies);

    expect(snoozed.ok).toBe(true);
    if (snoozed.ok) {
      expect(snoozed.value.reminder).toMatchObject({
        permissionStatus: 'denied',
        scheduleState: 'permission_denied',
      });
    }
    expect(scheduler.cancelled).toEqual(['platform-1']);
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(0);
  });

  it('pauses, resumes, disables, and enables reminders without deleting reminder data', async () => {
    const { dependencies, scheduledNotifications } = createDependencies();

    await createReminder(
      {
        frequency: 'daily',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    const paused = await pauseReminder({ id: 'reminder-1' }, dependencies);
    const resumed = await resumeReminder({ id: 'reminder-1' }, dependencies);
    const disabled = await disableReminder({ id: 'reminder-1' }, dependencies);
    const enabled = await enableReminder({ id: 'reminder-1' }, dependencies);
    const activeNotifications = scheduledNotifications.filter((notification) => notification.deletedAt === null);

    expect(paused.ok && paused.value.reminder.scheduleState).toBe('paused');
    expect(resumed.ok && resumed.value.reminder.scheduleState).toBe('scheduled');
    expect(disabled.ok && disabled.value.reminder.scheduleState).toBe('disabled');
    expect(enabled.ok && enabled.value.reminder.scheduleState).toBe('scheduled');
    expect(enabled.ok && enabled.value.reminder.title).toBe('Study');
    expect(activeNotifications).toHaveLength(30);
  });

  it('soft deletes reminders and cancels active scheduled notification ids', async () => {
    const { dependencies, reminders, scheduler, scheduledNotifications } = createDependencies();

    await createReminder(
      {
        frequency: 'once',
        ownerKind: 'standalone',
        reminderLocalTime: '09:30',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      dependencies,
    );

    const deleted = await deleteReminder({ id: 'reminder-1' }, dependencies);
    const loaded = await loadReminderData(dependencies);

    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.value.reminder.deletedAt).toBe(fixedNow.toISOString());
    }
    expect(loaded.ok && loaded.value.reminders).toEqual([]);
    expect(reminders).toHaveLength(1);
    expect(scheduler.cancelled).toContain('platform-1');
    expect(scheduledNotifications.filter((notification) => notification.deletedAt === null)).toHaveLength(0);
  });
});
