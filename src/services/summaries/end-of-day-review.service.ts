import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createMoneyRecordRepository,
  type MoneyRecordRepository,
} from '@/data/repositories/money-records.repository';
import {
  createPreferencesRepository,
  type PreferencesRepository,
} from '@/data/repositories/preferences.repository';
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
import {
  createWorkEntryRepository,
  type WorkEntryRepository,
} from '@/data/repositories/work-entries.repository';
import { createAppError } from '@/domain/common/app-error';
import { addLocalDays, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { isErr, ok, type AppResult } from '@/domain/common/result';
import {
  calculateEndOfDayReviewSummary,
  type EndOfDayReminderInput,
  type EndOfDayReviewSummary,
  type EndOfDayTaskRecurrenceOccurrenceInput,
} from '@/domain/summaries/end-of-day-review';
import { buildReminderOccurrences } from '@/domain/reminders/reminder-occurrences';
import { buildTaskRecurrenceOccurrences } from '@/domain/tasks/task-recurrence';
import type { Task } from '@/domain/tasks/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import {
  loadRecoveryData,
  type RecoveryData,
  type RecoveryServiceDependencies,
} from '@/services/recovery/recovery.service';

const dayWorkEntryLimit = 75;

export type EndOfDayReviewData = {
  generatedAt: string;
  preferences: UserPreferences;
  summary: EndOfDayReviewSummary;
};

type LoadRecoveryDataDependency = (
  dependencies: RecoveryServiceDependencies,
  options: { lookbackDays?: number },
) => Promise<AppResult<RecoveryData>>;

export type EndOfDayReviewServiceDependencies = {
  createMoneyRecordRepository?: (database: unknown) => MoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  createReminderRepository?: (database: unknown) => ReminderRepository;
  createTaskRecurrenceRepository?: (database: unknown) => TaskRecurrenceRepository;
  createTaskRepository?: (database: unknown) => TaskRepository;
  createWorkEntryRepository?: (database: unknown) => WorkEntryRepository;
  loadRecoveryData?: LoadRecoveryDataDependency;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedEndOfDayReviewAccess = {
  database: unknown;
  moneyRecordRepository: MoneyRecordRepository;
  now: Date;
  preferences: UserPreferences;
  reminderRepository: ReminderRepository;
  taskRecurrenceRepository: TaskRecurrenceRepository;
  taskRepository: TaskRepository;
  workEntryRepository: WorkEntryRepository;
};

async function prepareEndOfDayReviewAccess({
  createMoneyRecordRepository: createMoneyRecordRepositoryDependency = (database) =>
    createMoneyRecordRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  createReminderRepository: createReminderRepositoryDependency = (database) =>
    createReminderRepository(database as PplantDatabase),
  createTaskRecurrenceRepository: createTaskRecurrenceRepositoryDependency = (database) =>
    createTaskRecurrenceRepository(database as PplantDatabase),
  createTaskRepository: createTaskRepositoryDependency = (database) =>
    createTaskRepository(database as PplantDatabase),
  createWorkEntryRepository: createWorkEntryRepositoryDependency = (database) =>
    createWorkEntryRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: EndOfDayReviewServiceDependencies = {}): Promise<AppResult<PreparedEndOfDayReviewAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return {
      ok: false,
      error: createAppError('unavailable', 'End-of-day review could not open local data. Please try again.', 'retry', cause),
    };
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  const preferencesRepository = createPreferencesRepositoryDependency(database);
  const preferences = await preferencesRepository.loadPreferences(localWorkspaceId);

  if (isErr(preferences)) {
    return preferences;
  }

  if (!preferences.value) {
    return {
      ok: false,
      error: createAppError('not_found', 'Save preferences before opening review.', 'settings'),
    };
  }

  return ok({
    database,
    moneyRecordRepository: createMoneyRecordRepositoryDependency(database),
    now,
    preferences: preferences.value,
    reminderRepository: createReminderRepositoryDependency(database),
    taskRecurrenceRepository: createTaskRecurrenceRepositoryDependency(database),
    taskRepository: createTaskRepositoryDependency(database),
    workEntryRepository: createWorkEntryRepositoryDependency(database),
  });
}

async function loadTaskRecurrenceOccurrences(
  access: PreparedEndOfDayReviewAccess,
  localDate: LocalDate,
): Promise<AppResult<EndOfDayTaskRecurrenceOccurrenceInput[]>> {
  const rules = await access.taskRecurrenceRepository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  const occurrences: EndOfDayTaskRecurrenceOccurrenceInput[] = [];

  for (const rule of rules.value) {
    const exceptions = await access.taskRecurrenceRepository.listExceptions(localWorkspaceId, rule.id);

    if (isErr(exceptions)) {
      return exceptions;
    }

    const completions = await access.taskRecurrenceRepository.listCompletions(localWorkspaceId, rule.id);

    if (isErr(completions)) {
      return completions;
    }

    const built = buildTaskRecurrenceOccurrences({
      completions: completions.value,
      exceptions: exceptions.value,
      fromLocalDate: localDate,
      maxCount: 1,
      rule,
      throughLocalDate: localDate,
    });

    if (isErr(built)) {
      return built;
    }

    occurrences.push(
      ...built.value.map((occurrence) => ({
        kind: rule.kind,
        localDate: occurrence.localDate,
        priority: rule.priority,
        ruleId: rule.id,
        state: occurrence.state,
        title: rule.title,
      })),
    );
  }

  return ok(occurrences);
}

async function loadReminderInputs(
  access: PreparedEndOfDayReviewAccess,
  localDate: LocalDate,
): Promise<AppResult<EndOfDayReminderInput[]>> {
  const reminders = await access.reminderRepository.listReminders(localWorkspaceId);

  if (isErr(reminders)) {
    return reminders;
  }

  const items: EndOfDayReminderInput[] = [];

  for (const reminder of reminders.value) {
    const exceptions = await access.reminderRepository.listExceptions(localWorkspaceId, reminder.id);

    if (isErr(exceptions)) {
      return exceptions;
    }

    const occurrences = buildReminderOccurrences({
      exceptions: exceptions.value,
      fromLocalDate: localDate,
      maxCount: 1,
      reminder,
      throughLocalDate: localDate,
    });

    if (isErr(occurrences)) {
      return occurrences;
    }

    items.push({
      occurrences: occurrences.value,
      reminder,
    });
  }

  return ok(items);
}

async function loadEndOfDayReviewFromAccess(
  access: PreparedEndOfDayReviewAccess,
  dependencies: EndOfDayReviewServiceDependencies,
): Promise<AppResult<EndOfDayReviewData>> {
  const localDate = formatDateAsLocalDate(access.now);
  const todayEndExclusive = addLocalDays(localDate, 1);

  if (isErr(todayEndExclusive)) {
    return todayEndExclusive;
  }

  const moneyRecords = await access.moneyRecordRepository.listRecordsForPeriod(localWorkspaceId, {
    endDateExclusive: todayEndExclusive.value,
    startDate: localDate,
  });

  if (isErr(moneyRecords)) {
    return moneyRecords;
  }

  const tasks = await access.taskRepository.listSummaryTasks(localWorkspaceId);

  if (isErr(tasks)) {
    return tasks;
  }

  const taskRecurrenceOccurrences = await loadTaskRecurrenceOccurrences(access, localDate);

  if (isErr(taskRecurrenceOccurrences)) {
    return taskRecurrenceOccurrences;
  }

  const reminders = await loadReminderInputs(access, localDate);

  if (isErr(reminders)) {
    return reminders;
  }

  const recoveryLoader = dependencies.loadRecoveryData ?? loadRecoveryData;
  const recovery = await recoveryLoader(
    {
      migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
      now: () => access.now,
      openDatabase: () => access.database,
    },
    {},
  );

  if (isErr(recovery)) {
    return recovery;
  }

  const workEntries = await access.workEntryRepository.listHistoryEntries(localWorkspaceId, {
    categoryId: null,
    dateFrom: localDate,
    dateTo: localDate,
    entryMode: null,
    limit: dayWorkEntryLimit,
    noteSearch: null,
    offset: 0,
    paid: null,
    sort: 'date_desc',
    topicId: null,
  });

  if (isErr(workEntries)) {
    return workEntries;
  }

  return ok({
    generatedAt: access.now.toISOString(),
    preferences: access.preferences,
    summary: calculateEndOfDayReviewSummary({
      localDate,
      moneyRecords: moneyRecords.value,
      recoveryItems: recovery.value.items,
      reminders: reminders.value,
      taskRecurrenceOccurrences: taskRecurrenceOccurrences.value,
      tasks: tasks.value,
      workEntries: workEntries.value.records,
    }),
  });
}

async function getActiveTask(repository: TaskRepository, id: EntityId): Promise<AppResult<Task>> {
  const task = await repository.getTask(localWorkspaceId, id);

  if (isErr(task)) {
    return task;
  }

  if (!task.value) {
    return {
      ok: false,
      error: createAppError('not_found', 'Task was not found.', 'edit'),
    };
  }

  return ok(task.value);
}

export async function loadEndOfDayReview(
  dependencies: EndOfDayReviewServiceDependencies = {},
): Promise<AppResult<EndOfDayReviewData>> {
  const access = await prepareEndOfDayReviewAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return loadEndOfDayReviewFromAccess(access.value, dependencies);
}

export async function markEndOfDayTaskDone(
  input: { taskId: string },
  dependencies: EndOfDayReviewServiceDependencies = {},
): Promise<AppResult<EndOfDayReviewData>> {
  const access = await prepareEndOfDayReviewAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const taskId = asEntityId(input.taskId);

  if (isErr(taskId)) {
    return taskId;
  }

  const task = await getActiveTask(access.value.taskRepository, taskId.value);

  if (isErr(task)) {
    return task;
  }

  if (task.value.state !== 'done') {
    const timestamp = access.value.now.toISOString();
    const updated = await access.value.taskRepository.updateTask({
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

    if (isErr(updated)) {
      return updated;
    }
  }

  return loadEndOfDayReviewFromAccess(access.value, dependencies);
}
