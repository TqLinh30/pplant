import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createCaptureDraftRepository,
  type CaptureDraftRepository,
} from '@/data/repositories/capture-drafts.repository';
import {
  createReceiptParseJobRepository,
  type ReceiptParseJobRepository,
} from '@/data/repositories/receipt-parse-jobs.repository';
import {
  createRecoveryRepository,
  type RecoveryRepository,
} from '@/data/repositories/recovery.repository';
import {
  createReminderRepository,
  type ReminderRepository,
} from '@/data/repositories/reminders.repository';
import {
  createTaskRecurrenceRepository,
  type TaskRecurrenceRepository,
} from '@/data/repositories/task-recurrence.repository';
import {
  createTaskRepository,
  type TaskRepository,
} from '@/data/repositories/tasks.repository';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { isReceiptCaptureDraftPayload } from '@/features/capture-drafts/captureDraftPayloads';
import { combineReminderFireAtLocal } from '@/domain/reminders/schemas';
import type { Reminder, ReminderScheduledNotification } from '@/domain/reminders/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import {
  buildMissedTaskRecurrenceOccurrences,
  defaultRecoveryLookbackDays,
  isMissedDailyTask,
  isMissedReminderNotification,
  isReminderNotificationRecoveryState,
  isReminderRecoveryScheduleState,
} from '@/domain/recovery/recovery-rules';
import type {
  RecoveryAction,
  RecoveryEvent,
  RecoveryTargetKind,
  SaveRecoveryEventInput,
} from '@/domain/recovery/types';
import type { Task } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import {
  completeTaskRecurrenceOccurrence as completeTaskRecurrenceOccurrenceService,
  type TaskRecurrenceDatedOccurrenceActionRequest,
} from '@/services/tasks/task-recurrence.service';
import {
  pauseReminder as pauseReminderService,
  snoozeReminder as snoozeReminderService,
  updateReminder as updateReminderService,
  type ReminderMutationResult,
  type ReminderRequest,
} from '@/services/reminders/reminder.service';
import {
  runReceiptParseJob as runReceiptParseJobService,
  type RunReceiptParseJobRequest,
} from '@/services/receipt-parsing/receipt-parse-job.service';
import { deleteReceiptDraftImage as deleteReceiptDraftImageService } from '@/services/files/receipt-retention.service';

export type RecoveryItemReason =
  | 'receipt_parsing_failed'
  | 'receipt_parsing_queued'
  | 'receipt_parsing_retry_exhausted'
  | 'receipt_parsing_running'
  | 'reminder_not_active'
  | 'reminder_time_passed'
  | 'task_deadline_passed'
  | 'task_recurrence_open';

export type RecoveryItem = {
  availableActions: RecoveryAction[];
  createdFromState: string;
  id: string;
  occurrenceLocalDate: LocalDate | null;
  reason: RecoveryItemReason;
  relatedDraftId?: EntityId;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
  title: string;
};

export type RecoveryData = {
  events: RecoveryEvent[];
  items: RecoveryItem[];
};

export type RecoveryTargetRequest = {
  occurrenceLocalDate?: string | null;
  targetId: string;
  targetKind: RecoveryTargetKind;
};

export type RecoveryServiceDependencies = {
  completeTaskRecurrenceOccurrence?: (
    input: TaskRecurrenceDatedOccurrenceActionRequest,
  ) => Promise<AppResult<LocalDate>>;
  createCaptureDraftRepository?: (database: unknown) => CaptureDraftRepository;
  createEventId?: () => string;
  createReceiptParseJobRepository?: (database: unknown) => ReceiptParseJobRepository;
  createRecoveryRepository?: (database: unknown) => RecoveryRepository;
  createReminderRepository?: (database: unknown) => ReminderRepository;
  createTaskRecurrenceRepository?: (database: unknown) => TaskRecurrenceRepository;
  createTaskRepository?: (database: unknown) => TaskRepository;
  deleteReceiptDraftImage?: (input: { deletionReason?: 'user_deleted'; draftId: string }) => Promise<AppResult<unknown>>;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
  pauseReminder?: (input: { id: string }) => Promise<AppResult<ReminderMutationResult>>;
  snoozeReminder?: (input: {
    id: string;
    minutes?: number;
    occurrenceLocalDate?: string | null;
  }) => Promise<AppResult<ReminderMutationResult>>;
  runReceiptParseJob?: (input: RunReceiptParseJobRequest) => Promise<AppResult<ReceiptParseJob>>;
  updateReminder?: (input: ReminderRequest & { id: string }) => Promise<AppResult<ReminderMutationResult>>;
};

type PreparedRecoveryAccess = {
  captureDraftRepository: CaptureDraftRepository;
  now: Date;
  receiptParseJobRepository: ReceiptParseJobRepository;
  recoveryRepository: RecoveryRepository;
  reminderRepository: ReminderRepository;
  taskRecurrenceRepository: TaskRecurrenceRepository;
  taskRepository: TaskRepository;
};

function defaultCreateId(): string {
  return `recovery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareRecoveryAccess({
  createCaptureDraftRepository: createCaptureDraftRepositoryDependency = (database) =>
    createCaptureDraftRepository(database as PplantDatabase),
  createReceiptParseJobRepository: createReceiptParseJobRepositoryDependency = (database) =>
    createReceiptParseJobRepository(database as PplantDatabase),
  createRecoveryRepository: createRecoveryRepositoryDependency = (database) =>
    createRecoveryRepository(database as PplantDatabase),
  createReminderRepository: createReminderRepositoryDependency = (database) =>
    createReminderRepository(database as PplantDatabase),
  createTaskRecurrenceRepository: createTaskRecurrenceRepositoryDependency = (database) =>
    createTaskRecurrenceRepository(database as PplantDatabase),
  createTaskRepository: createTaskRepositoryDependency = (database) =>
    createTaskRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: RecoveryServiceDependencies = {}): Promise<AppResult<PreparedRecoveryAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local recovery data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    captureDraftRepository: createCaptureDraftRepositoryDependency(database),
    now,
    receiptParseJobRepository: createReceiptParseJobRepositoryDependency(database),
    recoveryRepository: createRecoveryRepositoryDependency(database),
    reminderRepository: createReminderRepositoryDependency(database),
    taskRecurrenceRepository: createTaskRecurrenceRepositoryDependency(database),
    taskRepository: createTaskRepositoryDependency(database),
  });
}

function formatReminderFireAtLocalFromDate(date: Date): AppResult<string> {
  const localDate = formatDateAsLocalDate(date);
  const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return combineReminderFireAtLocal(localDate, localTime);
}

function itemId(targetKind: RecoveryTargetKind, targetId: EntityId, occurrenceLocalDate: LocalDate | null): string {
  return `${targetKind}:${targetId}:${occurrenceLocalDate ?? 'state'}`;
}

async function targetIsResolved(
  repository: RecoveryRepository,
  targetKind: RecoveryTargetKind,
  targetId: EntityId,
  occurrenceLocalDate: LocalDate | null,
): Promise<AppResult<boolean>> {
  return repository.hasResolutionEvent(localWorkspaceId, targetKind, targetId, occurrenceLocalDate);
}

async function recordRecoveryEvent(
  access: PreparedRecoveryAccess,
  dependencies: RecoveryServiceDependencies,
  input: Omit<SaveRecoveryEventInput, 'createdAt' | 'id' | 'occurredAt' | 'workspaceId'>,
): Promise<AppResult<RecoveryEvent>> {
  const timestamp = access.now.toISOString();

  return access.recoveryRepository.createEvent({
    ...input,
    createdAt: timestamp,
    id: (dependencies.createEventId ?? defaultCreateId)(),
    occurredAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

async function addDailyTaskRecoveryItems(
  access: PreparedRecoveryAccess,
  items: RecoveryItem[],
): Promise<AppResult<void>> {
  const tasks = await access.taskRepository.listSummaryTasks(localWorkspaceId);

  if (isErr(tasks)) {
    return tasks;
  }

  const today = formatDateAsLocalDate(access.now);

  for (const task of tasks.value) {
    if (!isMissedDailyTask(task, today)) {
      continue;
    }

    const resolved = await targetIsResolved(access.recoveryRepository, 'task', task.id, null);

    if (isErr(resolved)) {
      return resolved;
    }

    if (resolved.value) {
      continue;
    }

    items.push({
      availableActions: ['complete', 'edit', 'dismiss'],
      createdFromState: task.state,
      id: itemId('task', task.id, null),
      occurrenceLocalDate: null,
      reason: 'task_deadline_passed',
      targetId: task.id,
      targetKind: 'task',
      title: task.title,
    });
  }

  return ok(undefined);
}

async function addRecurringTaskRecoveryItems(
  access: PreparedRecoveryAccess,
  items: RecoveryItem[],
  lookbackDays: number,
): Promise<AppResult<void>> {
  const rules = await access.taskRecurrenceRepository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  for (const rule of rules.value) {
    const exceptions = await access.taskRecurrenceRepository.listExceptions(localWorkspaceId, rule.id);

    if (isErr(exceptions)) {
      return exceptions;
    }

    const completions = await access.taskRecurrenceRepository.listCompletions(localWorkspaceId, rule.id);

    if (isErr(completions)) {
      return completions;
    }

    const occurrences = buildMissedTaskRecurrenceOccurrences({
      completions: completions.value,
      exceptions: exceptions.value,
      lookbackDays,
      now: access.now,
      rule,
    });

    if (isErr(occurrences)) {
      return occurrences;
    }

    for (const occurrence of occurrences.value) {
      const resolved = await targetIsResolved(
        access.recoveryRepository,
        'task_recurrence_occurrence',
        rule.id,
        occurrence.localDate,
      );

      if (isErr(resolved)) {
        return resolved;
      }

      if (resolved.value) {
        continue;
      }

      items.push({
        availableActions: ['complete', 'edit', 'dismiss'],
        createdFromState: occurrence.state,
        id: itemId('task_recurrence_occurrence', rule.id, occurrence.localDate),
        occurrenceLocalDate: occurrence.localDate,
        reason: 'task_recurrence_open',
        targetId: rule.id,
        targetKind: 'task_recurrence_occurrence',
        title: rule.title,
      });
    }
  }

  return ok(undefined);
}

function reminderActionsForNotification(): RecoveryAction[] {
  return ['snooze', 'reschedule', 'pause', 'edit', 'dismiss'];
}

function reminderActionsForState(): RecoveryAction[] {
  return ['reschedule', 'pause', 'edit', 'dismiss'];
}

async function addReminderNotificationItem(
  access: PreparedRecoveryAccess,
  items: RecoveryItem[],
  reminder: Reminder,
  notification: ReminderScheduledNotification,
): Promise<AppResult<void>> {
  const resolved = await targetIsResolved(
    access.recoveryRepository,
    'reminder_occurrence',
    reminder.id,
    notification.occurrenceLocalDate,
  );

  if (isErr(resolved)) {
    return resolved;
  }

  if (resolved.value) {
    return ok(undefined);
  }

  items.push({
    availableActions: reminderActionsForNotification(),
    createdFromState: notification.deliveryState,
    id: itemId('reminder_occurrence', reminder.id, notification.occurrenceLocalDate),
    occurrenceLocalDate: notification.occurrenceLocalDate,
    reason: 'reminder_time_passed',
    targetId: reminder.id,
    targetKind: 'reminder_occurrence',
    title: reminder.title,
  });

  return ok(undefined);
}

async function addReminderRecoveryItems(
  access: PreparedRecoveryAccess,
  items: RecoveryItem[],
): Promise<AppResult<void>> {
  const nowFireAtLocal = formatReminderFireAtLocalFromDate(access.now);

  if (isErr(nowFireAtLocal)) {
    return nowFireAtLocal;
  }

  const markedMissed = await access.reminderRepository.markOverdueScheduledNotificationsMissed(
    localWorkspaceId,
    nowFireAtLocal.value,
    access.now.toISOString(),
  );

  if (isErr(markedMissed)) {
    return markedMissed;
  }

  const reminders = await access.reminderRepository.listReminders(localWorkspaceId);

  if (isErr(reminders)) {
    return reminders;
  }

  for (const reminder of reminders.value) {
    if (isReminderRecoveryScheduleState(reminder)) {
      const resolved = await targetIsResolved(access.recoveryRepository, 'reminder_occurrence', reminder.id, null);

      if (isErr(resolved)) {
        return resolved;
      }

      if (!resolved.value) {
        items.push({
          availableActions: reminderActionsForState(),
          createdFromState: reminder.scheduleState,
          id: itemId('reminder_occurrence', reminder.id, null),
          occurrenceLocalDate: null,
          reason: 'reminder_not_active',
          targetId: reminder.id,
          targetKind: 'reminder_occurrence',
          title: reminder.title,
        });
      }
    }

    const notifications = await access.reminderRepository.listScheduledNotifications(localWorkspaceId, reminder.id);

    if (isErr(notifications)) {
      return notifications;
    }

    for (const notification of notifications.value) {
      if (
        !isReminderNotificationRecoveryState(notification) &&
        !isMissedReminderNotification(notification, nowFireAtLocal.value)
      ) {
        continue;
      }

      const added = await addReminderNotificationItem(access, items, reminder, notification);

      if (isErr(added)) {
        return added;
      }
    }
  }

  return ok(undefined);
}

function receiptReasonForStatus(status: ReceiptParseJob['status']): RecoveryItemReason | null {
  switch (status) {
    case 'pending':
      return 'receipt_parsing_queued';
    case 'running':
      return 'receipt_parsing_running';
    case 'failed':
      return 'receipt_parsing_failed';
    case 'retry_exhausted':
      return 'receipt_parsing_retry_exhausted';
    case 'low_confidence':
    case 'parsed':
    case 'reviewed':
    case 'saved':
      return null;
    default:
      status satisfies never;
      return null;
  }
}

function receiptActionsForJob(job: ReceiptParseJob): RecoveryAction[] {
  if (job.status === 'running') {
    return ['edit', 'manual_entry', 'discard'];
  }

  return ['retry', 'edit', 'manual_entry', 'discard'];
}

async function addReceiptParseJobRecoveryItems(
  access: PreparedRecoveryAccess,
  items: RecoveryItem[],
): Promise<AppResult<void>> {
  const jobs = await access.receiptParseJobRepository.listPendingOrRetryableJobs(localWorkspaceId);

  if (isErr(jobs)) {
    return jobs;
  }

  for (const job of jobs.value) {
    const reason = receiptReasonForStatus(job.status);

    if (!reason) {
      continue;
    }

    const draft = await access.captureDraftRepository.getDraft(localWorkspaceId, job.receiptDraftId);

    if (isErr(draft)) {
      return draft;
    }

    if (
      !draft.value ||
      draft.value.status !== 'active' ||
      draft.value.kind !== 'expense' ||
      !isReceiptCaptureDraftPayload(draft.value.payload)
    ) {
      continue;
    }

    const resolved = await targetIsResolved(access.recoveryRepository, 'receipt_parse_job', job.id, null);

    if (isErr(resolved)) {
      return resolved;
    }

    if (resolved.value) {
      continue;
    }

    items.push({
      availableActions: receiptActionsForJob(job),
      createdFromState: job.status,
      id: itemId('receipt_parse_job', job.id, null),
      occurrenceLocalDate: null,
      reason,
      relatedDraftId: draft.value.id,
      targetId: job.id,
      targetKind: 'receipt_parse_job',
      title: 'Receipt parsing',
    });
  }

  return ok(undefined);
}

function eventWindowStart(now: Date, lookbackDays: number): string {
  return new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
}

export async function loadRecoveryData(
  dependencies: RecoveryServiceDependencies = {},
  options: { lookbackDays?: number } = {},
): Promise<AppResult<RecoveryData>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const lookbackDays = options.lookbackDays ?? defaultRecoveryLookbackDays;
  const items: RecoveryItem[] = [];
  const taskItems = await addDailyTaskRecoveryItems(access.value, items);

  if (isErr(taskItems)) {
    return taskItems;
  }

  const recurringItems = await addRecurringTaskRecoveryItems(access.value, items, lookbackDays);

  if (isErr(recurringItems)) {
    return recurringItems;
  }

  const reminderItems = await addReminderRecoveryItems(access.value, items);

  if (isErr(reminderItems)) {
    return reminderItems;
  }

  const receiptItems = await addReceiptParseJobRecoveryItems(access.value, items);

  if (isErr(receiptItems)) {
    return receiptItems;
  }

  const events = await access.value.recoveryRepository.listEventsSince(
    localWorkspaceId,
    eventWindowStart(access.value.now, lookbackDays),
  );

  if (isErr(events)) {
    return events;
  }

  return ok({ events: events.value, items });
}

function parseRecoveryTarget(input: RecoveryTargetRequest): AppResult<{
  occurrenceLocalDate: LocalDate | null;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
}> {
  const targetId = asEntityId(input.targetId);

  if (!targetId.ok) {
    return targetId;
  }

  if (input.targetKind === 'task_recurrence_occurrence' && !input.occurrenceLocalDate) {
    return err(createAppError('validation_failed', 'Choose a recurring task occurrence.', 'edit'));
  }

  const occurrenceLocalDate = input.occurrenceLocalDate
    ? asLocalDate(input.occurrenceLocalDate)
    : ok(null);

  if (isErr(occurrenceLocalDate)) {
    return occurrenceLocalDate;
  }

  return ok({
    occurrenceLocalDate: occurrenceLocalDate.value,
    targetId: targetId.value,
    targetKind: input.targetKind,
  });
}

async function getActiveTask(repository: TaskRepository, id: EntityId): Promise<AppResult<Task>> {
  const task = await repository.getTask(localWorkspaceId, id);

  if (isErr(task)) {
    return task;
  }

  if (!task.value) {
    return err(createAppError('not_found', 'Task was not found.', 'edit'));
  }

  return ok(task.value);
}

async function completeDailyTask(access: PreparedRecoveryAccess, id: EntityId): Promise<AppResult<Task>> {
  const task = await getActiveTask(access.taskRepository, id);

  if (isErr(task)) {
    return task;
  }

  const timestamp = access.now.toISOString();

  return access.taskRepository.updateTask({
    categoryId: task.value.categoryId,
    completedAt: task.value.completedAt ?? timestamp,
    createdAt: task.value.createdAt,
    deadlineLocalDate: task.value.deadlineLocalDate,
    deletedAt: null,
    id: task.value.id,
    notes: task.value.notes,
    priority: task.value.priority,
    source: task.value.source,
    sourceOfTruth: 'manual',
    state: 'done',
    title: task.value.title,
    topicIds: task.value.topicIds,
    updatedAt: timestamp,
    userCorrectedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function completeRecoveryItem(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  if (target.value.targetKind === 'task') {
    const completed = await completeDailyTask(access.value, target.value.targetId);

    if (isErr(completed)) {
      return completed;
    }
  } else if (target.value.targetKind === 'task_recurrence_occurrence') {
    if (!target.value.occurrenceLocalDate) {
      return err(createAppError('validation_failed', 'Choose a recurring task occurrence.', 'edit'));
    }

    const completeTaskRecurrenceOccurrence =
      dependencies.completeTaskRecurrenceOccurrence ?? completeTaskRecurrenceOccurrenceService;
    const completed = await completeTaskRecurrenceOccurrence({
      id: target.value.targetId,
      occurrenceLocalDate: target.value.occurrenceLocalDate,
    });

    if (isErr(completed)) {
      return completed;
    }
  } else {
    return err(createAppError('validation_failed', 'Complete is only available for task recovery items.', 'edit'));
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'complete',
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

export async function dismissRecoveryItem(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'dismiss',
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

export async function recordRecoveryEdit(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  return recordRecoveryHandoff(input, 'edit', dependencies);
}

export async function recordRecoveryHandoff(
  input: RecoveryTargetRequest,
  action: Extract<RecoveryAction, 'edit' | 'reschedule'>,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action,
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

function requireReceiptParseJobTarget(
  input: RecoveryTargetRequest,
): AppResult<{ targetId: EntityId; targetKind: 'receipt_parse_job' }> {
  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  if (target.value.targetKind !== 'receipt_parse_job') {
    return err(createAppError('validation_failed', 'Choose a receipt parsing recovery item.', 'edit'));
  }

  return ok({
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

export async function retryRecoveryReceiptParseJob(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<ReceiptParseJob>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = requireReceiptParseJobTarget(input);

  if (isErr(target)) {
    return target;
  }

  const runReceiptParseJob = dependencies.runReceiptParseJob;

  if (runReceiptParseJob) {
    return runReceiptParseJob({
      jobId: target.value.targetId,
      userInitiated: true,
    });
  }

  return runReceiptParseJobService(
    {
      jobId: target.value.targetId,
      userInitiated: true,
    },
    {
      captureDraftRepository: access.value.captureDraftRepository,
      now: () => access.value.now,
      receiptParseJobRepository: access.value.receiptParseJobRepository,
    },
  );
}

export async function recordRecoveryManualEntry(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<null>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = requireReceiptParseJobTarget(input);

  if (isErr(target)) {
    return target;
  }

  return ok(null);
}

export async function discardRecoveryReceiptParseJob(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = requireReceiptParseJobTarget(input);

  if (isErr(target)) {
    return target;
  }

  const job = await access.value.receiptParseJobRepository.getJobById(localWorkspaceId, target.value.targetId);

  if (isErr(job)) {
    return job;
  }

  if (!job.value) {
    return err(createAppError('not_found', 'Receipt parse job was not found.', 'discard'));
  }

  const draft = await access.value.captureDraftRepository.getDraft(localWorkspaceId, job.value.receiptDraftId);

  if (isErr(draft)) {
    return draft;
  }

  if (draft.value?.status === 'active' && isReceiptCaptureDraftPayload(draft.value.payload)) {
    const deleteImage = dependencies.deleteReceiptDraftImage
      ? await dependencies.deleteReceiptDraftImage({
          deletionReason: 'user_deleted',
          draftId: draft.value.id,
        })
      : await deleteReceiptDraftImageService(
          {
            deletionReason: 'user_deleted',
            draftId: draft.value.id,
          },
          {
            now: () => access.value.now,
            repository: access.value.captureDraftRepository,
          },
        );

    if (isErr(deleteImage)) {
      return deleteImage;
    }

    const discarded = await access.value.captureDraftRepository.discardDraft(
      localWorkspaceId,
      draft.value.id,
      access.value.now.toISOString(),
    );

    if (isErr(discarded)) {
      return discarded;
    }
  }

  const deleted = await access.value.receiptParseJobRepository.markDeleted(
    localWorkspaceId,
    job.value.id,
    access.value.now.toISOString(),
  );

  if (isErr(deleted)) {
    return deleted;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'discard',
    occurrenceLocalDate: null,
    targetId: target.value.targetId,
    targetKind: 'receipt_parse_job',
  });
}

export async function snoozeRecoveryReminder(
  input: RecoveryTargetRequest & { minutes?: number },
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  if (target.value.targetKind !== 'reminder_occurrence') {
    return err(createAppError('validation_failed', 'Snooze is only available for reminders.', 'edit'));
  }

  const snoozeReminder = dependencies.snoozeReminder ?? snoozeReminderService;
  const snoozed = await snoozeReminder({
    id: target.value.targetId,
    minutes: input.minutes,
    occurrenceLocalDate: target.value.occurrenceLocalDate,
  });

  if (isErr(snoozed)) {
    return snoozed;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'snooze',
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

export async function pauseRecoveryReminder(
  input: RecoveryTargetRequest,
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  if (target.value.targetKind !== 'reminder_occurrence') {
    return err(createAppError('validation_failed', 'Pause is only available for reminders.', 'edit'));
  }

  const pauseReminder = dependencies.pauseReminder ?? pauseReminderService;
  const paused = await pauseReminder({ id: target.value.targetId });

  if (isErr(paused)) {
    return paused;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'pause',
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}

export async function rescheduleRecoveryReminder(
  input: RecoveryTargetRequest & { reminder: ReminderRequest & { id: string } },
  dependencies: RecoveryServiceDependencies = {},
): Promise<AppResult<RecoveryEvent>> {
  const access = await prepareRecoveryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const target = parseRecoveryTarget(input);

  if (isErr(target)) {
    return target;
  }

  if (target.value.targetKind !== 'reminder_occurrence') {
    return err(createAppError('validation_failed', 'Reschedule is only available for reminders.', 'edit'));
  }

  const updateReminder = dependencies.updateReminder ?? updateReminderService;
  const updated = await updateReminder(input.reminder);

  if (isErr(updated)) {
    return updated;
  }

  return recordRecoveryEvent(access.value, dependencies, {
    action: 'reschedule',
    occurrenceLocalDate: target.value.occurrenceLocalDate,
    targetId: target.value.targetId,
    targetKind: target.value.targetKind,
  });
}
