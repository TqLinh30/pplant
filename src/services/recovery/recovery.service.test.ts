import { ok, type AppResult } from '@/domain/common/result';
import type { EntityId } from '@/domain/common/ids';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { toCaptureDraftPayload, buildReceiptCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import type { Reminder, ReminderScheduledNotification } from '@/domain/reminders/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
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
  discardRecoveryReceiptParseJob,
  dismissRecoveryItem,
  loadRecoveryData,
  pauseRecoveryReminder,
  recordRecoveryHandoff,
  retryRecoveryReceiptParseJob,
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

function createReceiptDraft(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    createdAt: '2026-05-07T00:00:00.000Z',
    discardedAt: null,
    id: 'draft-receipt' as never,
    kind: 'expense',
    lastSavedAt: '2026-05-07T00:00:00.000Z',
    payload: toCaptureDraftPayload(
      buildReceiptCaptureDraftPayload({
        capturedAt: '2026-05-07T00:00:00.000Z',
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        source: 'camera',
      }),
    ),
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: '2026-05-07T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createReceiptJob(overrides: Partial<ReceiptParseJob> = {}): ReceiptParseJob {
  return {
    attemptCount: 0,
    completedAt: null,
    createdAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    id: 'receipt-job-1' as never,
    lastErrorCategory: null,
    normalizedResult: null,
    receiptDraftId: 'draft-receipt' as never,
    requestedAt: '2026-05-07T00:00:00.000Z',
    retryWindowStartedAt: null,
    startedAt: null,
    status: 'pending',
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
  const drafts: CaptureDraft[] = [];
  const receiptJobs: ReceiptParseJob[] = [];
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
    createCaptureDraftRepository: () =>
      ({
        discardDraft: jest.fn(async (_workspaceId, id: EntityId, timestamp: string) => {
          const draft = drafts.find((candidate) => candidate.id === id && candidate.status === 'active');

          if (draft) {
            draft.status = 'discarded';
            draft.discardedAt = timestamp;
            draft.updatedAt = timestamp;
          }

          return ok(draft ? { ...draft } : null);
        }),
        getDraft: jest.fn(async (_workspaceId, id) => {
          const draft = drafts.find((candidate) => candidate.id === id);

          return ok(draft ? { ...draft } : null);
        }),
      }) as never,
    createEventId: () => `recovery-${events.length + 1}`,
    createReceiptParseJobRepository: () =>
      ({
        getJobById: jest.fn(async (_workspaceId, id) =>
          ok(receiptJobs.find((job) => job.id === id && job.deletedAt === null) ?? null),
        ),
        listPendingOrRetryableJobs: jest.fn(async () =>
          ok(
            receiptJobs
              .filter((job) =>
                job.deletedAt === null &&
                (job.status === 'pending' ||
                  job.status === 'running' ||
                  job.status === 'failed' ||
                  job.status === 'retry_exhausted'),
              )
              .map((job) => ({ ...job })),
          ),
        ),
        markDeleted: jest.fn(async (_workspaceId, id, deletedAt) => {
          const job = receiptJobs.find((candidate) => candidate.id === id && candidate.deletedAt === null);

          if (job) {
            job.deletedAt = deletedAt;
            job.updatedAt = deletedAt;
          }

          return ok(job ? { ...job } : null);
        }),
      }) as never,
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
    drafts,
    events,
    notifications,
    receiptJobs,
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

  it('loads pending receipt parse jobs with recovery actions and safe generic copy', async () => {
    const { dependencies, drafts, receiptJobs } = createDependencies();
    drafts.push(createReceiptDraft());
    receiptJobs.push(
      createReceiptJob({ id: 'receipt-job-pending' as never, status: 'pending' }),
      createReceiptJob({ id: 'receipt-job-running' as never, status: 'running' }),
      createReceiptJob({ id: 'receipt-job-failed' as never, status: 'failed' }),
      createReceiptJob({
        attemptCount: 3,
        id: 'receipt-job-exhausted' as never,
        lastErrorCategory: 'unavailable',
        status: 'retry_exhausted',
      }),
      createReceiptJob({ id: 'receipt-job-parsed' as never, status: 'parsed' }),
    );

    const result = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const receiptItems = result.value.items.filter((item) => item.targetKind === 'receipt_parse_job');

      expect(receiptItems.map((item) => item.reason)).toEqual([
        'receipt_parsing_queued',
        'receipt_parsing_running',
        'receipt_parsing_failed',
        'receipt_parsing_retry_exhausted',
      ]);
      expect(receiptItems[0]).toMatchObject({
        availableActions: ['retry', 'edit', 'manual_entry', 'discard'],
        relatedDraftId: 'draft-receipt',
        title: 'Receipt parsing',
      });
      expect(receiptItems[1].availableActions).toEqual(['edit', 'manual_entry', 'discard']);
      expect(receiptItems.map((item) => item.title).join(' ')).not.toContain('file://');
    }
  });

  it('does not load receipt jobs whose draft is inactive or missing', async () => {
    const { dependencies, drafts, receiptJobs } = createDependencies();
    drafts.push(createReceiptDraft({ id: 'discarded-draft' as never, status: 'discarded' }));
    receiptJobs.push(
      createReceiptJob({
        id: 'receipt-job-discarded' as never,
        receiptDraftId: 'discarded-draft' as never,
      }),
      createReceiptJob({
        id: 'receipt-job-missing' as never,
        receiptDraftId: 'missing-draft' as never,
      }),
    );

    const result = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items.some((item) => item.targetKind === 'receipt_parse_job')).toBe(false);
    }
  });

  it('retries receipt parse jobs as explicit user actions without resolving the recovery item', async () => {
    const { dependencies, drafts, receiptJobs } = createDependencies();
    const runReceiptParseJob = jest.fn(async (input) => {
      const job = receiptJobs.find((candidate) => candidate.id === input.jobId);

      if (!job) {
        throw new Error('missing job fixture');
      }

      job.attemptCount = 1;
      job.status = 'failed';
      return ok({ ...job });
    });
    drafts.push(createReceiptDraft());
    receiptJobs.push(createReceiptJob({ attemptCount: 3, status: 'retry_exhausted' }));

    const retried = await retryRecoveryReceiptParseJob(
      {
        targetId: 'receipt-job-1',
        targetKind: 'receipt_parse_job',
      },
      {
        ...dependencies,
        runReceiptParseJob,
      },
    );
    const reloaded = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(retried.ok).toBe(true);
    expect(runReceiptParseJob).toHaveBeenCalledWith({
      jobId: 'receipt-job-1',
      userInitiated: true,
    });
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect(reloaded.value.items.some((item) => item.targetId === 'receipt-job-1')).toBe(true);
    }
  });

  it('discards receipt recovery by deleting retained image, draft, and parse job before recording resolution', async () => {
    const { dependencies, drafts, events, receiptJobs } = createDependencies();
    const deleteReceiptDraftImage = jest.fn(async () => ok({ deleted: true }));
    drafts.push(createReceiptDraft());
    receiptJobs.push(createReceiptJob({ status: 'failed' }));

    const discarded = await discardRecoveryReceiptParseJob(
      {
        targetId: 'receipt-job-1',
        targetKind: 'receipt_parse_job',
      },
      {
        ...dependencies,
        deleteReceiptDraftImage,
      },
    );
    const reloaded = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(discarded.ok).toBe(true);
    expect(deleteReceiptDraftImage).toHaveBeenCalledWith({
      deletionReason: 'user_deleted',
      draftId: 'draft-receipt',
    });
    expect(drafts[0].status).toBe('discarded');
    expect(receiptJobs[0].deletedAt).toBe(fixedNow.toISOString());
    expect(events[0]).toMatchObject({
      action: 'discard',
      targetId: 'receipt-job-1',
      targetKind: 'receipt_parse_job',
    });
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect(reloaded.value.items.some((item) => item.targetKind === 'receipt_parse_job')).toBe(false);
    }
  });

  it('records receipt edit handoff as a safe recovery resolution', async () => {
    const { dependencies, drafts, receiptJobs } = createDependencies();
    drafts.push(createReceiptDraft());
    receiptJobs.push(createReceiptJob({ status: 'failed' }));

    const edit = await recordRecoveryHandoff(
      {
        targetId: 'receipt-job-1',
        targetKind: 'receipt_parse_job',
      },
      'edit',
      dependencies,
    );
    const reloaded = await loadRecoveryData(dependencies, { lookbackDays: 2 });

    expect(edit.ok).toBe(true);
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect(reloaded.value.items.some((item) => item.targetId === 'receipt-job-1')).toBe(false);
    }
  });
});
