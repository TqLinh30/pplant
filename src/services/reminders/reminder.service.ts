import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createDiagnosticsRepository,
  type DiagnosticsRepository,
} from '@/data/repositories/diagnostics.repository';
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
import { addLocalDays, asLocalDate, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { buildReminderOccurrences, parseReminderFireAtLocalToDate } from '@/domain/reminders/reminder-occurrences';
import {
  asOptionalReminderLocalDate,
  asReminderFrequency,
  asReminderLocalTime,
  asReminderNotes,
  asReminderOwnerKind,
  asReminderTitle,
  combineReminderFireAtLocal,
} from '@/domain/reminders/schemas';
import type {
  Reminder,
  ReminderFireAtLocal,
  ReminderFrequency,
  ReminderOccurrence,
  ReminderOwnerKind,
  ReminderPermissionStatus,
  ReminderScheduleState,
  ReminderScheduledNotification,
} from '@/domain/reminders/types';
import type { Task, TaskRecurrenceRule } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import type {
  NotificationPermissionStatus,
  NotificationSchedulerPort,
} from '@/services/notifications/notification-scheduler.port';

const defaultPreviewCount = 6;
const scheduleWindowDays = 60;
const scheduleMaxOccurrences = 30;
const defaultAppVersion = '1.0.0';

export type ReminderScheduleMode = 'local_only' | 'request';

export type ReminderRequest = {
  endsOnLocalDate?: string | null;
  frequency: ReminderFrequency;
  notes?: string | null;
  ownerKind: ReminderOwnerKind;
  reminderLocalTime: string;
  scheduleMode?: ReminderScheduleMode;
  skipLocalDates?: string[];
  startsOnLocalDate: string;
  taskId?: string | null;
  taskRecurrenceRuleId?: string | null;
  title: string;
};

export type ReminderActionRequest = {
  id: string;
};

export type ReminderOccurrenceActionRequest = {
  id: string;
  occurrenceLocalDate?: string | null;
};

export type ReminderRuleView = {
  occurrences: ReminderOccurrence[];
  reminder: Reminder;
  scheduledNotifications: ReminderScheduledNotification[];
};

export type ReminderData = {
  recentTasks: Task[];
  reminders: ReminderRuleView[];
  taskRecurrenceRules: TaskRecurrenceRule[];
};

export type ReminderMutationResult = {
  reminder: Reminder;
  view: ReminderRuleView;
};

export type ReminderServiceDependencies = {
  createDiagnosticEventId?: () => string;
  createDiagnosticsRepository?: (database: unknown) => DiagnosticsRepository;
  createExceptionId?: () => string;
  createReminderId?: () => string;
  createReminderRepository?: (database: unknown) => ReminderRepository;
  createScheduledNotificationId?: () => string;
  createTaskRecurrenceRepository?: (database: unknown) => TaskRecurrenceRepository;
  createTaskRepository?: (database: unknown) => TaskRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  notificationScheduler?: NotificationSchedulerPort;
  now?: () => Date;
  openDatabase?: () => unknown;
  appVersion?: string;
};

type PreparedReminderAccess = {
  diagnosticsRepository: DiagnosticsRepository;
  now: Date;
  reminderRepository: ReminderRepository;
  taskRecurrenceRepository: TaskRecurrenceRepository;
  taskRepository: TaskRepository;
};

type ValidatedReminderRequest = {
  endsOnLocalDate: LocalDate | null;
  frequency: ReminderFrequency;
  notes: Reminder['notes'];
  ownerKind: ReminderOwnerKind;
  reminderLocalTime: Reminder['reminderLocalTime'];
  skipLocalDates: LocalDate[];
  startsOnLocalDate: LocalDate;
  taskId: EntityId | null;
  taskRecurrenceRuleId: EntityId | null;
  title: Reminder['title'];
};

type ScheduleReminderResult = {
  permissionStatus: ReminderPermissionStatus;
  scheduleState: ReminderScheduleState;
  scheduledNotifications: ReminderScheduledNotification[];
};

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveNotificationScheduler(
  dependencies: ReminderServiceDependencies,
): Promise<NotificationSchedulerPort> {
  if (dependencies.notificationScheduler) {
    return dependencies.notificationScheduler;
  }

  const notifications = await import('@/services/notifications/expo-notification-scheduler');

  return notifications.expoNotificationScheduler;
}

async function prepareReminderAccess({
  createDiagnosticsRepository: createDiagnosticsRepositoryDependency = (database) =>
    createDiagnosticsRepository(database as PplantDatabase),
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
}: ReminderServiceDependencies = {}): Promise<AppResult<PreparedReminderAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local reminder data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    diagnosticsRepository: createDiagnosticsRepositoryDependency(database),
    now,
    reminderRepository: createReminderRepositoryDependency(database),
    taskRecurrenceRepository: createTaskRecurrenceRepositoryDependency(database),
    taskRepository: createTaskRepositoryDependency(database),
  });
}

function parseOptionalOwnerId(value: string | null | undefined): AppResult<EntityId | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asEntityId(normalized);
}

function parseSkipLocalDates(values: string[] | undefined): AppResult<LocalDate[]> {
  const parsedDates: LocalDate[] = [];
  const seen = new Set<string>();

  for (const value of values ?? []) {
    const normalized = value.trim();

    if (normalized.length === 0) {
      continue;
    }

    const parsed = asLocalDate(normalized);

    if (!parsed.ok) {
      return parsed;
    }

    if (!seen.has(parsed.value)) {
      parsedDates.push(parsed.value);
      seen.add(parsed.value);
    }
  }

  return ok(parsedDates);
}

function parseSnoozeMinutes(minutes: number | undefined): AppResult<number> {
  const normalized = minutes ?? 30;

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 24 * 60) {
    return err(createAppError('validation_failed', 'Snooze minutes must be between 1 and 1440.', 'edit'));
  }

  return ok(normalized);
}

function formatReminderFireAtLocalFromDate(date: Date): AppResult<ReminderFireAtLocal> {
  const localDate = formatDateAsLocalDate(date);
  const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return combineReminderFireAtLocal(localDate, localTime);
}

async function validateOwnerReferences(
  request: ValidatedReminderRequest,
  access: PreparedReminderAccess,
): Promise<AppResult<ValidatedReminderRequest>> {
  if (request.ownerKind === 'standalone') {
    if (request.taskId || request.taskRecurrenceRuleId) {
      return err(createAppError('validation_failed', 'Standalone reminders cannot be linked to a task.', 'edit'));
    }

    return ok(request);
  }

  if (request.ownerKind === 'task') {
    if (!request.taskId || request.taskRecurrenceRuleId) {
      return err(createAppError('validation_failed', 'Choose one active task for this reminder.', 'edit'));
    }

    const task = await access.taskRepository.getTask(localWorkspaceId, request.taskId);

    if (isErr(task)) {
      return task;
    }

    if (!task.value || task.value.deletedAt !== null) {
      return err(createAppError('not_found', 'Task was not found for this reminder.', 'edit'));
    }

    return ok(request);
  }

  if (!request.taskRecurrenceRuleId || request.taskId) {
    return err(createAppError('validation_failed', 'Choose one active recurring task or habit for this reminder.', 'edit'));
  }

  const rule = await access.taskRecurrenceRepository.getRule(localWorkspaceId, request.taskRecurrenceRuleId);

  if (isErr(rule)) {
    return rule;
  }

  if (!rule.value || rule.value.deletedAt !== null) {
    return err(createAppError('not_found', 'Recurring task or habit was not found for this reminder.', 'edit'));
  }

  return ok(request);
}

async function validateReminderRequest(
  input: ReminderRequest,
  access: PreparedReminderAccess,
): Promise<AppResult<ValidatedReminderRequest>> {
  const ownerKind = asReminderOwnerKind(input.ownerKind);
  const frequency = asReminderFrequency(input.frequency);
  const title = asReminderTitle(input.title);
  const notes = asReminderNotes(input.notes);
  const startsOnLocalDate = asLocalDate(input.startsOnLocalDate);
  const endsOnLocalDate = asOptionalReminderLocalDate(input.endsOnLocalDate);
  const reminderLocalTime = asReminderLocalTime(input.reminderLocalTime);
  const taskId = parseOptionalOwnerId(input.taskId);
  const taskRecurrenceRuleId = parseOptionalOwnerId(input.taskRecurrenceRuleId);
  const skipLocalDates = parseSkipLocalDates(input.skipLocalDates);

  if (!ownerKind.ok) {
    return ownerKind;
  }

  if (!frequency.ok) {
    return frequency;
  }

  if (!title.ok) {
    return title;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (!reminderLocalTime.ok) {
    return reminderLocalTime;
  }

  if (!taskId.ok) {
    return taskId;
  }

  if (!taskRecurrenceRuleId.ok) {
    return taskRecurrenceRuleId;
  }

  if (!skipLocalDates.ok) {
    return skipLocalDates;
  }

  if (frequency.value === 'once' && endsOnLocalDate.value !== null) {
    return err(createAppError('validation_failed', 'One-time reminders do not use an end date.', 'edit'));
  }

  if (endsOnLocalDate.value && endsOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'End date must be on or after the start date.', 'edit'));
  }

  for (const skipLocalDate of skipLocalDates.value) {
    if (skipLocalDate < startsOnLocalDate.value) {
      return err(createAppError('validation_failed', 'Skip dates must be on or after the start date.', 'edit'));
    }

    if (endsOnLocalDate.value && skipLocalDate > endsOnLocalDate.value) {
      return err(createAppError('validation_failed', 'Skip dates must be on or before the end date.', 'edit'));
    }
  }

  return validateOwnerReferences(
    {
      endsOnLocalDate: endsOnLocalDate.value,
      frequency: frequency.value,
      notes: notes.value,
      ownerKind: ownerKind.value,
      reminderLocalTime: reminderLocalTime.value,
      skipLocalDates: skipLocalDates.value,
      startsOnLocalDate: startsOnLocalDate.value,
      taskId: taskId.value,
      taskRecurrenceRuleId: taskRecurrenceRuleId.value,
      title: title.value,
    },
    access,
  );
}

function toReminderPermissionStatus(status: NotificationPermissionStatus): ReminderPermissionStatus {
  if (status === 'granted' || status === 'denied' || status === 'undetermined' || status === 'unavailable') {
    return status;
  }

  return 'unknown';
}

function nextScheduleBounds(now: Date): AppResult<{ fromLocalDate: LocalDate; throughLocalDate: LocalDate }> {
  const fromLocalDate = formatDateAsLocalDate(now);
  const throughLocalDate = addLocalDays(fromLocalDate, scheduleWindowDays);

  if (!throughLocalDate.ok) {
    return throughLocalDate;
  }

  return ok({
    fromLocalDate,
    throughLocalDate: throughLocalDate.value,
  });
}

async function recordSchedulingDiagnostic(
  access: PreparedReminderAccess,
  dependencies: ReminderServiceDependencies,
  input: {
    errorCategory: string;
    permissionStatus: ReminderPermissionStatus;
    scheduleState: ReminderScheduleState;
  },
): Promise<void> {
  const timestamp = access.now.toISOString();

  await access.diagnosticsRepository.recordEvent({
    appVersion: dependencies.appVersion ?? defaultAppVersion,
    createdAt: timestamp,
    errorCategory: input.errorCategory,
    id: (dependencies.createDiagnosticEventId ?? (() => defaultCreateId('diagnostic')))(),
    metadata: {
      deliveryState: input.scheduleState,
      offline: false,
      permissionStatus: input.permissionStatus,
    },
    name: 'reminder_scheduling_failed',
    occurredAt: timestamp,
  });
}

async function createReminderView(
  repository: ReminderRepository,
  reminder: Reminder,
  now: Date,
): Promise<AppResult<ReminderRuleView>> {
  const exceptions = await repository.listExceptions(localWorkspaceId, reminder.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const scheduledNotifications = await repository.listScheduledNotifications(localWorkspaceId, reminder.id);

  if (isErr(scheduledNotifications)) {
    return scheduledNotifications;
  }

  const bounds = nextScheduleBounds(now);

  if (isErr(bounds)) {
    return bounds;
  }

  const occurrences = buildReminderOccurrences({
    exceptions: exceptions.value,
    fromLocalDate: bounds.value.fromLocalDate,
    maxCount: defaultPreviewCount,
    reminder,
    throughLocalDate: bounds.value.throughLocalDate,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  return ok({
    occurrences: occurrences.value,
    reminder,
    scheduledNotifications: scheduledNotifications.value,
  });
}

async function loadReminderViews(access: PreparedReminderAccess): Promise<AppResult<ReminderRuleView[]>> {
  const reminders = await access.reminderRepository.listReminders(localWorkspaceId);

  if (isErr(reminders)) {
    return reminders;
  }

  const views: ReminderRuleView[] = [];

  for (const reminder of reminders.value) {
    const view = await createReminderView(access.reminderRepository, reminder, access.now);

    if (isErr(view)) {
      return view;
    }

    views.push(view.value);
  }

  return ok(views);
}

async function getActiveReminder(
  repository: ReminderRepository,
  id: string,
): Promise<AppResult<Reminder>> {
  const entityId = asEntityId(id);

  if (!entityId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid reminder.', 'edit', entityId.error));
  }

  const reminder = await repository.getReminder(localWorkspaceId, entityId.value);

  if (isErr(reminder)) {
    return reminder;
  }

  if (!reminder.value) {
    return err(createAppError('not_found', 'Reminder was not found.', 'edit'));
  }

  return ok(reminder.value);
}

async function buildScheduleOccurrences(
  repository: ReminderRepository,
  reminder: Reminder,
  now: Date,
): Promise<AppResult<ReminderOccurrence[]>> {
  const exceptions = await repository.listExceptions(localWorkspaceId, reminder.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const bounds = nextScheduleBounds(now);

  if (isErr(bounds)) {
    return bounds;
  }

  const occurrences = buildReminderOccurrences({
    exceptions: exceptions.value,
    fromLocalDate: bounds.value.fromLocalDate,
    maxCount: scheduleMaxOccurrences,
    reminder,
    throughLocalDate: bounds.value.throughLocalDate,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  return ok(occurrences.value.filter((occurrence) => occurrence.state === 'open'));
}

async function cancelExistingScheduledNotifications(
  reminder: Reminder,
  repository: ReminderRepository,
  scheduler: NotificationSchedulerPort,
): Promise<AppResult<{ cancelled: number }>> {
  const existing = await repository.listScheduledNotifications(localWorkspaceId, reminder.id);

  if (isErr(existing)) {
    return existing;
  }

  let cancelled = 0;

  for (const notification of existing.value) {
    const result = await scheduler.cancelScheduledNotification(notification.scheduledNotificationId);

    if (isErr(result)) {
      return result;
    }

    cancelled += result.value.cancelled ? 1 : 0;
  }

  return ok({ cancelled });
}

async function cancelExistingScheduledNotificationsBeforeClear(
  reminder: Reminder,
  access: PreparedReminderAccess,
  dependencies: ReminderServiceDependencies,
  scheduler: NotificationSchedulerPort,
  permissionStatus: ReminderPermissionStatus,
): Promise<AppResult<{ cancelled: number }>> {
  const cancelled = await cancelExistingScheduledNotifications(reminder, access.reminderRepository, scheduler);

  if (isErr(cancelled)) {
    await recordSchedulingDiagnostic(access, dependencies, {
      errorCategory: cancelled.error.code,
      permissionStatus,
      scheduleState: 'unavailable',
    });
  }

  return cancelled;
}

async function scheduleReminderNotifications(
  reminder: Reminder,
  access: PreparedReminderAccess,
  dependencies: ReminderServiceDependencies,
): Promise<AppResult<ScheduleReminderResult>> {
  const scheduler = await resolveNotificationScheduler(dependencies);
  const timestamp = access.now.toISOString();
  const currentPermission = await scheduler.getPermissionStatus();

  if (isErr(currentPermission)) {
    await recordSchedulingDiagnostic(access, dependencies, {
      errorCategory: currentPermission.error.code,
      permissionStatus: 'unavailable',
      scheduleState: 'unavailable',
    });

    const cancelled = await cancelExistingScheduledNotificationsBeforeClear(
      reminder,
      access,
      dependencies,
      scheduler,
      'unavailable',
    );

    if (isErr(cancelled)) {
      return cancelled;
    }

    return ok({
      permissionStatus: 'unavailable',
      scheduledNotifications: [],
      scheduleState: 'unavailable',
    });
  }

  let permissionStatus = toReminderPermissionStatus(currentPermission.value);

  if (permissionStatus === 'undetermined') {
    const requested = await scheduler.requestPermission();

    if (isErr(requested)) {
      await recordSchedulingDiagnostic(access, dependencies, {
        errorCategory: requested.error.code,
        permissionStatus: 'unavailable',
        scheduleState: 'unavailable',
      });

      const cancelled = await cancelExistingScheduledNotificationsBeforeClear(
        reminder,
        access,
        dependencies,
        scheduler,
        'unavailable',
      );

      if (isErr(cancelled)) {
        return cancelled;
      }

      return ok({
        permissionStatus: 'unavailable',
        scheduledNotifications: [],
        scheduleState: 'unavailable',
      });
    }

    permissionStatus = toReminderPermissionStatus(requested.value);
  }

  if (permissionStatus === 'denied') {
    const cancelled = await cancelExistingScheduledNotificationsBeforeClear(
      reminder,
      access,
      dependencies,
      scheduler,
      permissionStatus,
    );

    if (isErr(cancelled)) {
      return cancelled;
    }

    return ok({
      permissionStatus: 'denied',
      scheduledNotifications: [],
      scheduleState: 'permission_denied',
    });
  }

  if (permissionStatus !== 'granted') {
    const cancelled = await cancelExistingScheduledNotificationsBeforeClear(
      reminder,
      access,
      dependencies,
      scheduler,
      permissionStatus,
    );

    if (isErr(cancelled)) {
      return cancelled;
    }

    return ok({
      permissionStatus,
      scheduledNotifications: [],
      scheduleState: 'local_only',
    });
  }

  const cancelled = await cancelExistingScheduledNotifications(reminder, access.reminderRepository, scheduler);

  if (isErr(cancelled)) {
    await recordSchedulingDiagnostic(access, dependencies, {
      errorCategory: cancelled.error.code,
      permissionStatus,
      scheduleState: 'unavailable',
    });

    return cancelled;
  }

  const occurrences = await buildScheduleOccurrences(access.reminderRepository, reminder, access.now);

  if (isErr(occurrences)) {
    return occurrences;
  }

  const scheduledNotifications: ReminderScheduledNotification[] = [];

  for (const occurrence of occurrences.value) {
    const fireAt = parseReminderFireAtLocalToDate(occurrence.fireAtLocal);

    if (isErr(fireAt)) {
      return fireAt;
    }

    const scheduled = await scheduler.scheduleReminderNotification({
      body: reminder.notes,
      fireAt: fireAt.value,
      fireAtLocal: occurrence.fireAtLocal,
      reminderId: reminder.id,
      title: reminder.title,
    });

    if (isErr(scheduled)) {
      for (const notification of scheduledNotifications) {
        await scheduler.cancelScheduledNotification(notification.scheduledNotificationId);
      }

      await recordSchedulingDiagnostic(access, dependencies, {
        errorCategory: scheduled.error.code,
        permissionStatus,
        scheduleState: scheduled.error.code === 'unavailable' ? 'unavailable' : 'failed',
      });

      return ok({
        permissionStatus,
        scheduledNotifications: [],
        scheduleState: scheduled.error.code === 'unavailable' ? 'unavailable' : 'failed',
      });
    }

    scheduledNotifications.push({
      createdAt: timestamp,
      deletedAt: null,
      deliveryState: 'scheduled',
      fireAtLocal: occurrence.fireAtLocal,
      id: (dependencies.createScheduledNotificationId ?? (() => defaultCreateId('reminder-notification')))() as EntityId,
      occurrenceLocalDate: occurrence.localDate,
      reminderId: reminder.id,
      scheduleAttemptedAt: timestamp,
      scheduleErrorCategory: null,
      scheduledNotificationId: scheduled.value.scheduledNotificationId,
      updatedAt: timestamp,
      workspaceId: localWorkspaceId,
    });
  }

  const replaced = await access.reminderRepository.replaceScheduledNotifications(
    localWorkspaceId,
    reminder.id,
    timestamp,
    scheduledNotifications.map((notification) => ({
      createdAt: notification.createdAt,
      deletedAt: notification.deletedAt,
      deliveryState: notification.deliveryState,
      fireAtLocal: notification.fireAtLocal,
      id: notification.id,
      occurrenceLocalDate: notification.occurrenceLocalDate,
      reminderId: notification.reminderId,
      scheduleAttemptedAt: notification.scheduleAttemptedAt,
      scheduleErrorCategory: notification.scheduleErrorCategory,
      scheduledNotificationId: notification.scheduledNotificationId,
      updatedAt: notification.updatedAt,
      workspaceId: notification.workspaceId,
    })),
  );

  if (isErr(replaced)) {
    return replaced;
  }

  return ok({
    permissionStatus,
    scheduledNotifications: replaced.value,
    scheduleState: 'scheduled',
  });
}

async function applyScheduleResult(
  reminder: Reminder,
  scheduleResult: ScheduleReminderResult,
  access: PreparedReminderAccess,
): Promise<AppResult<Reminder>> {
  const timestamp = access.now.toISOString();

  const updated = await access.reminderRepository.updateScheduleState(
    localWorkspaceId,
    reminder.id,
    scheduleResult.permissionStatus,
    scheduleResult.scheduleState,
    timestamp,
  );

  if (isErr(updated)) {
    return updated;
  }

  if (scheduleResult.scheduledNotifications.length === 0 && scheduleResult.scheduleState !== 'scheduled') {
    const replaced = await access.reminderRepository.replaceScheduledNotifications(
      localWorkspaceId,
      reminder.id,
      timestamp,
      [],
    );

    if (isErr(replaced)) {
      return replaced;
    }
  }

  return ok(updated.value);
}

async function createReminderMutationResult(
  access: PreparedReminderAccess,
  reminder: Reminder,
): Promise<AppResult<ReminderMutationResult>> {
  const view = await createReminderView(access.reminderRepository, reminder, access.now);

  if (isErr(view)) {
    return view;
  }

  return ok({
    reminder,
    view: view.value,
  });
}

async function saveReminderSkipExceptions(
  access: PreparedReminderAccess,
  dependencies: ReminderServiceDependencies,
  reminder: Reminder,
  skipLocalDates: LocalDate[],
): Promise<AppResult<{ saved: number }>> {
  const timestamp = access.now.toISOString();
  let saved = 0;

  for (const skipLocalDate of skipLocalDates) {
    const exception = await access.reminderRepository.createException({
      action: 'skip',
      createdAt: timestamp,
      id: (dependencies.createExceptionId ?? (() => defaultCreateId('reminder-exception')))(),
      occurrenceLocalDate: skipLocalDate,
      reminderId: reminder.id,
      updatedAt: timestamp,
      workspaceId: localWorkspaceId,
    });

    if (isErr(exception)) {
      return exception;
    }

    saved += 1;
  }

  return ok({ saved });
}

async function clearScheduledNotificationsForState(
  reminder: Reminder,
  access: PreparedReminderAccess,
  dependencies: ReminderServiceDependencies,
  scheduleState: Extract<ReminderScheduleState, 'disabled' | 'local_only' | 'paused'>,
): Promise<AppResult<ReminderMutationResult>> {
  const scheduler = await resolveNotificationScheduler(dependencies);
  const cancelled = await cancelExistingScheduledNotifications(reminder, access.reminderRepository, scheduler);

  if (isErr(cancelled)) {
    return cancelled;
  }

  const timestamp = access.now.toISOString();
  const replaced = await access.reminderRepository.replaceScheduledNotifications(
    localWorkspaceId,
    reminder.id,
    timestamp,
    [],
  );

  if (isErr(replaced)) {
    return replaced;
  }

  const updated = await access.reminderRepository.updateScheduleState(
    localWorkspaceId,
    reminder.id,
    reminder.permissionStatus,
    scheduleState,
    timestamp,
  );

  if (isErr(updated)) {
    return updated;
  }

  return createReminderMutationResult(access, updated.value);
}

async function nextOpenOccurrence(
  repository: ReminderRepository,
  reminder: Reminder,
  now: Date,
): Promise<AppResult<ReminderOccurrence>> {
  const view = await createReminderView(repository, reminder, now);

  if (isErr(view)) {
    return view;
  }

  const occurrence = view.value.occurrences.find((candidate) => candidate.state === 'open');

  if (!occurrence) {
    return err(createAppError('not_found', 'No upcoming reminder occurrence is available.', 'edit'));
  }

  return ok(occurrence);
}

async function validateGeneratedOccurrence(
  repository: ReminderRepository,
  reminder: Reminder,
  occurrenceLocalDate: string,
): Promise<AppResult<ReminderOccurrence>> {
  const parsedDate = asLocalDate(occurrenceLocalDate);

  if (!parsedDate.ok) {
    return parsedDate;
  }

  const exceptions = await repository.listExceptions(localWorkspaceId, reminder.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const occurrences = buildReminderOccurrences({
    exceptions: exceptions.value,
    fromLocalDate: parsedDate.value,
    maxCount: 1,
    reminder,
    throughLocalDate: parsedDate.value,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  const occurrence = occurrences.value.find((candidate) => candidate.localDate === parsedDate.value);

  if (!occurrence) {
    return err(createAppError('validation_failed', 'Choose a generated occurrence for this reminder.', 'edit'));
  }

  return ok(occurrence);
}

export async function loadReminderData(
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderData>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const recentTasks = await access.value.taskRepository.listRecentTasks(localWorkspaceId);

  if (isErr(recentTasks)) {
    return recentTasks;
  }

  const taskRecurrenceRules = await access.value.taskRecurrenceRepository.listRules(localWorkspaceId);

  if (isErr(taskRecurrenceRules)) {
    return taskRecurrenceRules;
  }

  const reminders = await loadReminderViews(access.value);

  if (isErr(reminders)) {
    return reminders;
  }

  return ok({
    recentTasks: recentTasks.value,
    reminders: reminders.value,
    taskRecurrenceRules: taskRecurrenceRules.value,
  });
}

export async function createReminder(
  input: ReminderRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = await validateReminderRequest(input, access.value);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const reminder = await access.value.reminderRepository.createReminder({
    createdAt: timestamp,
    deletedAt: null,
    endsOnLocalDate: validated.value.endsOnLocalDate,
    frequency: validated.value.frequency,
    id: (dependencies.createReminderId ?? (() => defaultCreateId('reminder')))(),
    notes: validated.value.notes,
    ownerKind: validated.value.ownerKind,
    permissionStatus: input.scheduleMode === 'local_only' ? 'unknown' : 'undetermined',
    reminderLocalTime: validated.value.reminderLocalTime,
    scheduleState: 'local_only',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: validated.value.startsOnLocalDate,
    taskId: validated.value.taskId,
    taskRecurrenceRuleId: validated.value.taskRecurrenceRuleId,
    title: validated.value.title,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(reminder)) {
    return reminder;
  }

  const savedExceptions = await saveReminderSkipExceptions(
    access.value,
    dependencies,
    reminder.value,
    validated.value.skipLocalDates,
  );

  if (isErr(savedExceptions)) {
    return savedExceptions;
  }

  const scheduleResult =
    input.scheduleMode === 'local_only'
      ? ok({
          permissionStatus: 'unknown' as const,
          scheduledNotifications: [],
          scheduleState: 'local_only' as const,
        })
      : await scheduleReminderNotifications(reminder.value, access.value, dependencies);

  if (isErr(scheduleResult)) {
    return scheduleResult;
  }

  const updatedReminder = await applyScheduleResult(reminder.value, scheduleResult.value, access.value);

  if (isErr(updatedReminder)) {
    return updatedReminder;
  }

  return createReminderMutationResult(access.value, updatedReminder.value);
}

export async function updateReminder(
  input: ReminderRequest & { id: string },
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const validated = await validateReminderRequest(input, access.value);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const updated = await access.value.reminderRepository.updateReminder({
    createdAt: existing.value.createdAt,
    deletedAt: null,
    endsOnLocalDate: validated.value.endsOnLocalDate,
    frequency: validated.value.frequency,
    id: existing.value.id,
    notes: validated.value.notes,
    ownerKind: validated.value.ownerKind,
    permissionStatus: input.scheduleMode === 'local_only' ? 'unknown' : existing.value.permissionStatus,
    reminderLocalTime: validated.value.reminderLocalTime,
    scheduleState: 'local_only',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: validated.value.startsOnLocalDate,
    taskId: validated.value.taskId,
    taskRecurrenceRuleId: validated.value.taskRecurrenceRuleId,
    title: validated.value.title,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(updated)) {
    return updated;
  }

  const savedExceptions = await saveReminderSkipExceptions(
    access.value,
    dependencies,
    updated.value,
    validated.value.skipLocalDates,
  );

  if (isErr(savedExceptions)) {
    return savedExceptions;
  }

  if (input.scheduleMode === 'local_only') {
    return clearScheduledNotificationsForState(updated.value, access.value, dependencies, 'local_only');
  }

  const scheduleResult = await scheduleReminderNotifications(updated.value, access.value, dependencies);

  if (isErr(scheduleResult)) {
    return scheduleResult;
  }

  const scheduled = await applyScheduleResult(updated.value, scheduleResult.value, access.value);

  if (isErr(scheduled)) {
    return scheduled;
  }

  return createReminderMutationResult(access.value, scheduled.value);
}

export async function skipReminderOccurrence(
  input: ReminderOccurrenceActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<LocalDate>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  const occurrence = input.occurrenceLocalDate
    ? await validateGeneratedOccurrence(access.value.reminderRepository, reminder.value, input.occurrenceLocalDate)
    : await nextOpenOccurrence(access.value.reminderRepository, reminder.value, access.value.now);

  if (isErr(occurrence)) {
    return occurrence;
  }

  if (occurrence.value.state === 'skipped') {
    return ok(occurrence.value.localDate);
  }

  const timestamp = access.value.now.toISOString();
  const exception = await access.value.reminderRepository.createException({
    action: 'skip',
    createdAt: timestamp,
    id: (dependencies.createExceptionId ?? (() => defaultCreateId('reminder-exception')))(),
    occurrenceLocalDate: occurrence.value.localDate,
    reminderId: reminder.value.id,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(exception)) {
    return exception;
  }

  const scheduledNotifications = await access.value.reminderRepository.listScheduledNotifications(
    localWorkspaceId,
    reminder.value.id,
  );

  if (isErr(scheduledNotifications)) {
    return scheduledNotifications;
  }

  const scheduler = await resolveNotificationScheduler(dependencies);
  const retainedNotifications: ReminderScheduledNotification[] = [];

  for (const notification of scheduledNotifications.value) {
    if (notification.occurrenceLocalDate === occurrence.value.localDate) {
      await scheduler.cancelScheduledNotification(notification.scheduledNotificationId);
      continue;
    }

    retainedNotifications.push(notification);
  }

  const replaced = await access.value.reminderRepository.replaceScheduledNotifications(
    localWorkspaceId,
    reminder.value.id,
    timestamp,
    retainedNotifications.map((notification) => ({
      createdAt: timestamp,
      deletedAt: null,
      deliveryState: notification.deliveryState,
      fireAtLocal: notification.fireAtLocal,
      id: (dependencies.createScheduledNotificationId ?? (() => defaultCreateId('reminder-notification')))(),
      occurrenceLocalDate: notification.occurrenceLocalDate,
      reminderId: notification.reminderId,
      scheduleAttemptedAt: notification.scheduleAttemptedAt,
      scheduleErrorCategory: notification.scheduleErrorCategory,
      scheduledNotificationId: notification.scheduledNotificationId,
      updatedAt: timestamp,
      workspaceId: notification.workspaceId,
    })),
  );

  if (isErr(replaced)) {
    return replaced;
  }

  return ok(exception.value.occurrenceLocalDate);
}

export async function snoozeReminder(
  input: ReminderOccurrenceActionRequest & { minutes?: number },
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const minutes = parseSnoozeMinutes(input.minutes);

  if (isErr(minutes)) {
    return minutes;
  }

  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  const occurrence = input.occurrenceLocalDate
    ? await validateGeneratedOccurrence(access.value.reminderRepository, reminder.value, input.occurrenceLocalDate)
    : await nextOpenOccurrence(access.value.reminderRepository, reminder.value, access.value.now);

  if (isErr(occurrence)) {
    return occurrence;
  }

  if (occurrence.value.state !== 'open') {
    return err(createAppError('validation_failed', 'Skipped reminder occurrences cannot be snoozed.', 'edit'));
  }

  const scheduler = await resolveNotificationScheduler(dependencies);
  const timestamp = access.value.now.toISOString();
  const updateStateAndView = async (
    permissionStatus: ReminderPermissionStatus,
    scheduleState: ReminderScheduleState,
    clearNotifications: boolean,
  ): Promise<AppResult<ReminderMutationResult>> => {
    if (clearNotifications) {
      const cancelled = await cancelExistingScheduledNotificationsBeforeClear(
        reminder.value,
        access.value,
        dependencies,
        scheduler,
        permissionStatus,
      );

      if (isErr(cancelled)) {
        return cancelled;
      }

      const replaced = await access.value.reminderRepository.replaceScheduledNotifications(
        localWorkspaceId,
        reminder.value.id,
        timestamp,
        [],
      );

      if (isErr(replaced)) {
        return replaced;
      }
    }

    const updated = await access.value.reminderRepository.updateScheduleState(
      localWorkspaceId,
      reminder.value.id,
      permissionStatus,
      scheduleState,
      timestamp,
    );

    if (isErr(updated)) {
      return updated;
    }

    return createReminderMutationResult(access.value, updated.value);
  };

  const currentPermission = await scheduler.getPermissionStatus();

  if (isErr(currentPermission)) {
    await recordSchedulingDiagnostic(access.value, dependencies, {
      errorCategory: currentPermission.error.code,
      permissionStatus: 'unavailable',
      scheduleState: 'unavailable',
    });

    return updateStateAndView('unavailable', 'unavailable', true);
  }

  let permissionStatus = toReminderPermissionStatus(currentPermission.value);

  if (permissionStatus === 'undetermined') {
    const requested = await scheduler.requestPermission();

    if (isErr(requested)) {
      await recordSchedulingDiagnostic(access.value, dependencies, {
        errorCategory: requested.error.code,
        permissionStatus: 'unavailable',
        scheduleState: 'unavailable',
      });

      return updateStateAndView('unavailable', 'unavailable', true);
    }

    permissionStatus = toReminderPermissionStatus(requested.value);
  }

  if (permissionStatus === 'denied') {
    return updateStateAndView('denied', 'permission_denied', true);
  }

  if (permissionStatus !== 'granted') {
    return updateStateAndView(permissionStatus, 'local_only', true);
  }

  const fireAt = new Date(access.value.now.getTime() + minutes.value * 60_000);
  const fireAtLocal = formatReminderFireAtLocalFromDate(fireAt);

  if (isErr(fireAtLocal)) {
    return fireAtLocal;
  }

  const scheduled = await scheduler.scheduleReminderNotification({
    body: reminder.value.notes,
    fireAt,
    fireAtLocal: fireAtLocal.value,
    reminderId: reminder.value.id,
    title: reminder.value.title,
  });

  if (isErr(scheduled)) {
    const scheduleState = scheduled.error.code === 'unavailable' ? 'unavailable' : 'failed';

    await recordSchedulingDiagnostic(access.value, dependencies, {
      errorCategory: scheduled.error.code,
      permissionStatus,
      scheduleState,
    });

    return updateStateAndView(permissionStatus, scheduleState, false);
  }

  const existing = await access.value.reminderRepository.listScheduledNotifications(
    localWorkspaceId,
    reminder.value.id,
  );

  if (isErr(existing)) {
    await scheduler.cancelScheduledNotification(scheduled.value.scheduledNotificationId);
    return existing;
  }

  const targetNotification = existing.value.find(
    (notification) => notification.occurrenceLocalDate === occurrence.value.localDate,
  );

  if (targetNotification) {
    const cancelled = await scheduler.cancelScheduledNotification(targetNotification.scheduledNotificationId);

    if (isErr(cancelled)) {
      await scheduler.cancelScheduledNotification(scheduled.value.scheduledNotificationId);
      return cancelled;
    }
  }

  const retainedNotifications = existing.value.filter(
    (notification) => notification.occurrenceLocalDate !== occurrence.value.localDate,
  );
  const replaced = await access.value.reminderRepository.replaceScheduledNotifications(
    localWorkspaceId,
    reminder.value.id,
    timestamp,
    [
      ...retainedNotifications.map((notification) => ({
        createdAt: timestamp,
        deletedAt: null,
        deliveryState: notification.deliveryState,
        fireAtLocal: notification.fireAtLocal,
        id: (dependencies.createScheduledNotificationId ?? (() => defaultCreateId('reminder-notification')))(),
        occurrenceLocalDate: notification.occurrenceLocalDate,
        reminderId: notification.reminderId,
        scheduleAttemptedAt: notification.scheduleAttemptedAt,
        scheduleErrorCategory: notification.scheduleErrorCategory,
        scheduledNotificationId: notification.scheduledNotificationId,
        updatedAt: timestamp,
        workspaceId: notification.workspaceId,
      })),
      {
        createdAt: timestamp,
        deletedAt: null,
        deliveryState: 'snoozed',
        fireAtLocal: fireAtLocal.value,
        id: (dependencies.createScheduledNotificationId ?? (() => defaultCreateId('reminder-notification')))(),
        occurrenceLocalDate: occurrence.value.localDate,
        reminderId: reminder.value.id,
        scheduleAttemptedAt: timestamp,
        scheduleErrorCategory: null,
        scheduledNotificationId: scheduled.value.scheduledNotificationId,
        updatedAt: timestamp,
        workspaceId: localWorkspaceId,
      },
    ],
  );

  if (isErr(replaced)) {
    await scheduler.cancelScheduledNotification(scheduled.value.scheduledNotificationId);
    return replaced;
  }

  return updateStateAndView(permissionStatus, 'snoozed', false);
}

export async function pauseReminder(
  input: ReminderActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  return clearScheduledNotificationsForState(reminder.value, access.value, dependencies, 'paused');
}

export async function resumeReminder(
  input: ReminderActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  const scheduleResult = await scheduleReminderNotifications(reminder.value, access.value, dependencies);

  if (isErr(scheduleResult)) {
    return scheduleResult;
  }

  const updated = await applyScheduleResult(reminder.value, scheduleResult.value, access.value);

  if (isErr(updated)) {
    return updated;
  }

  return createReminderMutationResult(access.value, updated.value);
}

export async function disableReminder(
  input: ReminderActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  return clearScheduledNotificationsForState(reminder.value, access.value, dependencies, 'disabled');
}

export async function enableReminder(
  input: ReminderActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  return resumeReminder(input, dependencies);
}

export async function deleteReminder(
  input: ReminderActionRequest,
  dependencies: ReminderServiceDependencies = {},
): Promise<AppResult<ReminderMutationResult>> {
  const access = await prepareReminderAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const reminder = await getActiveReminder(access.value.reminderRepository, input.id);

  if (isErr(reminder)) {
    return reminder;
  }

  const scheduler = await resolveNotificationScheduler(dependencies);
  const cancelled = await cancelExistingScheduledNotifications(reminder.value, access.value.reminderRepository, scheduler);

  if (isErr(cancelled)) {
    return cancelled;
  }

  const timestamp = access.value.now.toISOString();
  const deleted = await access.value.reminderRepository.deleteReminder(
    localWorkspaceId,
    reminder.value.id,
    timestamp,
    timestamp,
  );

  if (isErr(deleted)) {
    return deleted;
  }

  const view = await createReminderView(access.value.reminderRepository, deleted.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({
    reminder: deleted.value,
    view: view.value,
  });
}
