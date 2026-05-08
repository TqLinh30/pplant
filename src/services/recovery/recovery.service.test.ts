import { ok, type AppResult } from '@/domain/common/result';
import type { Reminder, ReminderScheduledNotification } from '@/domain/reminders/types';
import type { RecoveryEvent, SaveRecoveryEventInput } from '@/domain/recovery/types';
import type {
  Task,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { ReminderMutationResult } from '@/services/reminders/reminder.service';

import {
  completeRecoveryItem,
  dismissRecoveryItem,
  loadRecoveryData,
  pauseRecoveryReminder,
  snoozeRecoveryReminder,
  type RecoveryServiceDependencies,
} from './recovery.service';

const fixedNow = new Date('2026-05-08T10:00:00.000Z');

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    categoryId: null,
    completedAt: null,
    createdAt: '2026-05-07T00:00:00.000Z',
    deadlineLocalDate: '2026-05-07' as never,
    deletedAt: null,
    id: 'task-1' as never,
    notes: null,
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Biology homework' as never,
    topicIds: [],
    updatedAt: '2026-05-07T00:00:00.000Z',
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRule(overrides: Partial<TaskRecurrenceRule> = {}): TaskRecurrenceRule {
  return {
    categoryId: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'rule-1' as never,
    kind: 'habit',
    notes: null,
    pausedAt: null,
    priority: 'low',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-06' as never,
    stoppedAt: null,
    stoppedOnLocalDate: null,
    title: 'Read notes' as never,
    topicIds: [],
    updatedAt: '2026-05-01T00:00:00.000Z',
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    createdAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'once',
    id: 'reminder-1' as never,
    notes: null,
    ownerKind: 'standalone',
    permissionStatus: 'granted',
    reminderLocalTime: '09:00' as never,
    scheduleState: 'scheduled',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-08' as never,
    taskId: null,
    taskRecurrenceRuleId: null,
    title: 'Review slides' as never,
    updatedAt: '2026-05-07T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createNotification(overrides: Partial<ReminderScheduledNotification> = {}): ReminderScheduledNotification {
  return {
    createdAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    deliveryState: 'scheduled',
    fireAtLocal: '2026-05-08T09:00' as never,
    id: 'notification-1' as never,
    occurrenceLocalDate: '2026-05-08' as never,
    reminderId: 'reminder-1' as never,
    scheduleAttemptedAt: '2026-05-07T00:00:00.000Z',
    scheduleErrorCategory: null,
    scheduledNotificationId: 'platform-1',
    updatedAt: '2026-05-07T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createDependencies() {
  const tasks = [createTask()];
  const rules = [createRule()];
  const completions: TaskRecurrenceCompletion[] = [];
  const exceptions: TaskRecurrenceException[] = [];
  const reminders = [
    createReminder(),
    createReminder({
      id: 'reminder-state' as never,
      permissionStatus: 'denied',
      scheduleState: 'permission_denied',
      title: 'Permission reminder' as never,
    }),
  ];
  const notifications = [createNotification()];
  const events: RecoveryEvent[] = [];

  const dependencies: RecoveryServiceDependencies = {
    createEventId: () => `recovery-${events.length + 1}`,
    createRecoveryRepository: () =>
      ({
        createEvent: jest.fn(async (input: SaveRecoveryEventInput): Promise<AppResult<RecoveryEvent>> => {
          const event = {
            action: input.action,
            createdAt: input.createdAt,
            id: input.id as never,
            occurredAt: input.occurredAt,
            occurrenceLocalDate: (input.occurrenceLocalDate ?? null) as never,
            targetId: input.targetId as never,
            targetKind: input.targetKind,
            workspaceId: input.workspaceId as never,
          };
          events.push(event);
          return ok(event);
        }),
        hasResolutionEvent: jest.fn(async (_workspaceId, targetKind, targetId, occurrenceLocalDate = null) =>
          ok(
            events.some(
              (event) =>
                event.targetKind === targetKind &&
                event.targetId === targetId &&
                event.occurrenceLocalDate === occurrenceLocalDate,
            ),
          ),
        ),
        listEventsForTarget: jest.fn(async (_workspaceId, targetKind, targetId, occurrenceLocalDate = null) =>
          ok(
            events.filter(
              (event) =>
                event.targetKind === targetKind &&
                event.targetId === targetId &&
                event.occurrenceLocalDate === occurrenceLocalDate,
            ),
          ),
        ),
        listEventsSince: jest.fn(async () => ok(events)),
      }) as never,
    createReminderRepository: () =>
      ({
        listReminders: jest.fn(async () => ok(reminders)),
        listScheduledNotifications: jest.fn(async (_workspaceId, reminderId) =>
          ok(notifications.filter((notification) => notification.reminderId === reminderId && notification.deletedAt === null)),
        ),
        markOverdueScheduledNotificationsMissed: jest.fn(async (_workspaceId, beforeFireAtLocal, updatedAt) => {
          let count = 0;
          notifications.forEach((notification) => {
            if (
              notification.deletedAt === null &&
              (notification.deliveryState === 'scheduled' || notification.deliveryState === 'snoozed') &&
              notification.fireAtLocal < beforeFireAtLocal
            ) {
              Object.assign(notification, { deliveryState: 'missed', updatedAt });
              count += 1;
            }
          });
          return ok(count);
        }),
      }) as never,
    createTaskRecurrenceRepository: () =>
      ({
        listCompletions: jest.fn(async () => ok(completions)),
        listExceptions: jest.fn(async () => ok(exceptions)),
        listRules: jest.fn(async () => ok(rules)),
      }) as never,
    createTaskRepository: () =>
      ({
        getTask: jest.fn(async (_workspaceId, id) => ok(tasks.find((task) => task.id === id) ?? null)),
        listSummaryTasks: jest.fn(async () => ok(tasks)),
        updateTask: jest.fn(async (input) => {
          const task = tasks.find((candidate) => candidate.id === input.id);
          Object.assign(task ?? {}, input);
          return ok(task as Task);
        }),
      }) as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    completions,
    dependencies,
    events,
    notifications,
    reminders,
    rules,
    tasks,
  };
}

describe('recovery service', () => {
  it('loads neutral recovery items and marks overdue reminder rows missed', async () => {
    const { dependencies, notifications } = createDependencies();

    const result = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items.map((item) => item.reason)).toEqual(
        expect.arrayContaining([
          'task_deadline_passed',
          'task_recurrence_open',
          'reminder_time_passed',
          'reminder_not_active',
        ]),
      );
    }
    expect(notifications[0].deliveryState).toBe('missed');
    expect(notifications[0].scheduledNotificationId).toBe('platform-1');
  });

  it('records dismissals and hides dismissed recovery items', async () => {
    const { dependencies } = createDependencies();

    const dismissed = await dismissRecoveryItem(
      {
        targetId: 'task-1',
        targetKind: 'task',
      },
      dependencies,
    );
    const result = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(dismissed.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items.some((item) => item.targetKind === 'task' && item.targetId === 'task-1')).toBe(false);
    }
  });

  it('completes daily tasks before recording a recovery event', async () => {
    const { dependencies, events, tasks } = createDependencies();

    const completed = await completeRecoveryItem(
      {
        targetId: 'task-1',
        targetKind: 'task',
      },
      dependencies,
    );

    expect(completed.ok).toBe(true);
    expect(tasks[0]).toMatchObject({
      completedAt: fixedNow.toISOString(),
      state: 'done',
    });
    expect(events[0]).toMatchObject({
      action: 'complete',
      targetId: 'task-1',
      targetKind: 'task',
    });
  });

  it('records reminder snooze and pause outcomes only after source actions succeed', async () => {
    const { dependencies, events } = createDependencies();
    const snoozedInputs: unknown[] = [];
    const pausedInputs: unknown[] = [];
    const actionDependencies: RecoveryServiceDependencies = {
      ...dependencies,
      pauseReminder: jest.fn(async (input) => {
        pausedInputs.push(input);
        return ok({} as ReminderMutationResult);
      }),
      snoozeReminder: jest.fn(async (input) => {
        snoozedInputs.push(input);
        return ok({} as ReminderMutationResult);
      }),
    };

    const snoozed = await snoozeRecoveryReminder(
      {
        minutes: 30,
        occurrenceLocalDate: '2026-05-08',
        targetId: 'reminder-1',
        targetKind: 'reminder_occurrence',
      },
      actionDependencies,
    );
    const paused = await pauseRecoveryReminder(
      {
        occurrenceLocalDate: '2026-05-08',
        targetId: 'reminder-1',
        targetKind: 'reminder_occurrence',
      },
      actionDependencies,
    );

    expect(snoozed.ok).toBe(true);
    expect(paused.ok).toBe(true);
    expect(snoozedInputs).toEqual([
      {
        id: 'reminder-1',
        minutes: 30,
        occurrenceLocalDate: '2026-05-08',
      },
    ]);
    expect(pausedInputs).toEqual([{ id: 'reminder-1' }]);
    expect(events.map((event) => event.action)).toEqual(['snooze', 'pause']);
  });
});
