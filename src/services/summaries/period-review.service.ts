import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createBudgetPlanningRepository,
  type BudgetPlanningRepository,
} from '@/data/repositories/budget-planning.repository';
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
import {
  addLocalDays,
  asLocalDate,
  formatDateAsLocalDate,
  resolveBudgetPeriodForDate,
  type LocalDate,
} from '@/domain/common/date-rules';
import { isErr, ok, type AppResult } from '@/domain/common/result';
import { buildReminderOccurrences } from '@/domain/reminders/reminder-occurrences';
import {
  calculatePeriodReviewSummary,
  resolveMonthlySummaryPeriod,
  resolveWeeklySummaryPeriod,
  type PeriodReminderInput,
  type PeriodReviewSummary,
  type PeriodSummaryKind,
  type PeriodSummaryPeriod,
  type PeriodTaskRecurrenceOccurrenceInput,
} from '@/domain/summaries/period-summary';
import { buildTaskRecurrenceOccurrences } from '@/domain/tasks/task-recurrence';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import {
  loadRecoveryData,
  type RecoveryData,
  type RecoveryServiceDependencies,
} from '@/services/recovery/recovery.service';

const periodWorkEntryLimit = 5000;
const periodOccurrenceMaxCount = 500;

export type PeriodReviewRequest = {
  anchorLocalDate?: string | null;
  kind: PeriodSummaryKind;
};

export type PeriodReviewData = {
  generatedAt: string;
  preferences: UserPreferences;
  summary: PeriodReviewSummary;
};

type LoadRecoveryDataDependency = (
  dependencies: RecoveryServiceDependencies,
  options: { lookbackDays?: number },
) => Promise<AppResult<RecoveryData>>;

export type PeriodReviewServiceDependencies = {
  createBudgetPlanningRepository?: (database: unknown) => BudgetPlanningRepository;
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

type PreparedPeriodReviewAccess = {
  budgetPlanningRepository: BudgetPlanningRepository;
  database: unknown;
  moneyRecordRepository: MoneyRecordRepository;
  now: Date;
  preferences: UserPreferences;
  reminderRepository: ReminderRepository;
  taskRecurrenceRepository: TaskRecurrenceRepository;
  taskRepository: TaskRepository;
  workEntryRepository: WorkEntryRepository;
};

async function preparePeriodReviewAccess({
  createBudgetPlanningRepository: createBudgetPlanningRepositoryDependency = (database) =>
    createBudgetPlanningRepository(database as PplantDatabase),
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
}: PeriodReviewServiceDependencies = {}): Promise<AppResult<PreparedPeriodReviewAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return {
      ok: false,
      error: createAppError('unavailable', 'Review summaries could not open local data. Please try again.', 'retry', cause),
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
      error: createAppError('not_found', 'Save preferences before opening review summaries.', 'settings'),
    };
  }

  return ok({
    budgetPlanningRepository: createBudgetPlanningRepositoryDependency(database),
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

function resolveReviewPeriod(kind: PeriodSummaryKind, anchorLocalDate: LocalDate): AppResult<PeriodSummaryPeriod> {
  return kind === 'week'
    ? resolveWeeklySummaryPeriod(anchorLocalDate)
    : resolveMonthlySummaryPeriod(anchorLocalDate);
}

async function loadTaskRecurrenceOccurrences(
  access: PreparedPeriodReviewAccess,
  period: PeriodSummaryPeriod,
  throughLocalDate: LocalDate,
): Promise<AppResult<PeriodTaskRecurrenceOccurrenceInput[]>> {
  const rules = await access.taskRecurrenceRepository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  const occurrences: PeriodTaskRecurrenceOccurrenceInput[] = [];

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
      fromLocalDate: period.startDate,
      maxCount: periodOccurrenceMaxCount,
      rule,
      throughLocalDate,
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
  access: PreparedPeriodReviewAccess,
  period: PeriodSummaryPeriod,
  throughLocalDate: LocalDate,
): Promise<AppResult<PeriodReminderInput[]>> {
  const reminders = await access.reminderRepository.listReminders(localWorkspaceId);

  if (isErr(reminders)) {
    return reminders;
  }

  const items: PeriodReminderInput[] = [];

  for (const reminder of reminders.value) {
    const exceptions = await access.reminderRepository.listExceptions(localWorkspaceId, reminder.id);

    if (isErr(exceptions)) {
      return exceptions;
    }

    const occurrences = buildReminderOccurrences({
      exceptions: exceptions.value,
      fromLocalDate: period.startDate,
      maxCount: periodOccurrenceMaxCount,
      reminder,
      throughLocalDate,
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

function recoveryLookbackDays(kind: PeriodSummaryKind): number {
  return kind === 'week' ? 7 : 31;
}

export async function loadPeriodReviewSummary(
  request: PeriodReviewRequest,
  dependencies: PeriodReviewServiceDependencies = {},
): Promise<AppResult<PeriodReviewData>> {
  const access = await preparePeriodReviewAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const anchorLocalDate = request.anchorLocalDate
    ? request.anchorLocalDate
    : formatDateAsLocalDate(access.value.now);
  const anchor = asLocalDate(anchorLocalDate);

  if (isErr(anchor)) {
    return anchor;
  }

  const period = resolveReviewPeriod(request.kind, anchor.value);

  if (isErr(period)) {
    return period;
  }

  const throughLocalDate = addLocalDays(period.value.endDateExclusive, -1);

  if (isErr(throughLocalDate)) {
    return throughLocalDate;
  }

  const budgetPeriod = resolveBudgetPeriodForDate(
    period.value.anchorLocalDate,
    access.value.preferences.monthlyBudgetResetDay,
  );

  if (isErr(budgetPeriod)) {
    return budgetPeriod;
  }

  const budgetRules = await access.value.budgetPlanningRepository.loadBudgetRules(localWorkspaceId);

  if (isErr(budgetRules)) {
    return budgetRules;
  }

  const savingsGoals = await access.value.budgetPlanningRepository.listSavingsGoals(localWorkspaceId);

  if (isErr(savingsGoals)) {
    return savingsGoals;
  }

  const periodMoneyRecords = await access.value.moneyRecordRepository.listRecordsForPeriod(
    localWorkspaceId,
    period.value,
  );

  if (isErr(periodMoneyRecords)) {
    return periodMoneyRecords;
  }

  const budgetPeriodMoneyRecords = await access.value.moneyRecordRepository.listRecordsForPeriod(
    localWorkspaceId,
    budgetPeriod.value,
  );

  if (isErr(budgetPeriodMoneyRecords)) {
    return budgetPeriodMoneyRecords;
  }

  const tasks = await access.value.taskRepository.listSummaryTasks(localWorkspaceId);

  if (isErr(tasks)) {
    return tasks;
  }

  const taskRecurrenceOccurrences = await loadTaskRecurrenceOccurrences(
    access.value,
    period.value,
    throughLocalDate.value,
  );

  if (isErr(taskRecurrenceOccurrences)) {
    return taskRecurrenceOccurrences;
  }

  const reminders = await loadReminderInputs(access.value, period.value, throughLocalDate.value);

  if (isErr(reminders)) {
    return reminders;
  }

  const recoveryLoader = dependencies.loadRecoveryData ?? loadRecoveryData;
  const recovery = await recoveryLoader(
    {
      migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
      now: () => access.value.now,
      openDatabase: () => access.value.database,
    },
    { lookbackDays: recoveryLookbackDays(request.kind) },
  );

  if (isErr(recovery)) {
    return recovery;
  }

  const workEntries = await access.value.workEntryRepository.listHistoryEntries(localWorkspaceId, {
    categoryId: null,
    dateFrom: period.value.startDate,
    dateTo: throughLocalDate.value,
    entryMode: null,
    limit: periodWorkEntryLimit,
    noteSearch: null,
    offset: 0,
    paid: null,
    sort: 'date_asc',
    topicId: null,
  });

  if (isErr(workEntries)) {
    return workEntries;
  }

  return ok({
    generatedAt: access.value.now.toISOString(),
    preferences: access.value.preferences,
    summary: calculatePeriodReviewSummary({
      asOfLocalDate: formatDateAsLocalDate(access.value.now),
      budgetPeriod: budgetPeriod.value,
      budgetPeriodMoneyRecords: budgetPeriodMoneyRecords.value,
      budgetRules: budgetRules.value,
      moneyRecords: periodMoneyRecords.value,
      period: period.value,
      recoveryItems: recovery.value.items,
      reminders: reminders.value,
      savingsGoals: savingsGoals.value,
      taskRecurrenceOccurrences: taskRecurrenceOccurrences.value,
      tasks: tasks.value,
      workEntries: workEntries.value.records,
    }),
  });
}
