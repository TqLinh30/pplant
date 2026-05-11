import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import type { MoneyRecord } from '@/domain/money/types';
import type { Reminder } from '@/domain/reminders/types';
import type {
  Task,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';
import type { UserPreferences } from '@/domain/preferences/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import { ok } from '@/domain/common/result';
import type { RecoveryData } from '@/services/recovery/recovery.service';

import { loadPeriodReviewSummary, type PeriodReviewServiceDependencies } from './period-review.service';

const fixedNow = new Date('2026-05-08T10:00:00.000Z');

function createPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as never,
    defaultHourlyWage: {
      amountMinor: 1500,
      currency: 'USD' as never,
    },
    locale: 'en-US' as never,
    monthlyBudgetResetDay: 20 as never,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createBudgetRules(): BudgetRules {
  return {
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as never,
    monthlyBudgetAmountMinor: 50000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

function createSavingsGoal(): SavingsGoal {
  return {
    archivedAt: null,
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as never,
    currentAmountMinor: 2000,
    id: 'goal-1' as never,
    name: 'Books' as never,
    targetAmountMinor: 10000,
    targetDate: null,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

function createMoneyRecord(overrides: Partial<MoneyRecord> = {}): MoneyRecord {
  return {
    amountMinor: 1200,
    categoryId: null,
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as never,
    deletedAt: null,
    id: 'money-1' as never,
    kind: 'expense',
    localDate: '2026-05-08' as never,
    merchantOrSource: 'Lunch' as never,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createWorkEntry(overrides: Partial<WorkEntry> = {}): WorkEntry {
  return {
    breakMinutes: 0,
    categoryId: null,
    createdAt: fixedNow.toISOString(),
    deletedAt: null,
    durationMinutes: 60,
    earnedIncomeMinor: 1500,
    endedAtLocalDate: null,
    endedAtLocalTime: null,
    entryMode: 'hours',
    id: 'work-1' as never,
    localDate: '2026-05-08' as never,
    note: 'Tutoring' as never,
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    startedAtLocalDate: null,
    startedAtLocalTime: null,
    topicIds: [],
    updatedAt: fixedNow.toISOString(),
    wageCurrencyCode: 'USD' as never,
    wageMinorPerHour: 1500,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    categoryId: null,
    completedAt: null,
    createdAt: fixedNow.toISOString(),
    deadlineLocalDate: '2026-05-08' as never,
    deletedAt: null,
    id: 'task-1' as never,
    notes: null,
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Biology homework' as never,
    topicIds: [],
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRule(): TaskRecurrenceRule {
  return {
    categoryId: null,
    createdAt: fixedNow.toISOString(),
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
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  };
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    createdAt: fixedNow.toISOString(),
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'reminder-1' as never,
    notes: null,
    ownerKind: 'standalone',
    permissionStatus: 'granted',
    reminderLocalTime: '09:00' as never,
    scheduleState: 'scheduled',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-06' as never,
    taskId: null,
    taskRecurrenceRuleId: null,
    title: 'Review slides' as never,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createBaseDependencies(overrides: Partial<PeriodReviewServiceDependencies> = {}) {
  const database = {};
  const periods: BudgetPeriod[] = [];
  const workQueries: unknown[] = [];
  const recoveryCalls: unknown[] = [];
  const completions: TaskRecurrenceCompletion[] = [
    {
      completedAt: fixedNow.toISOString(),
      createdAt: fixedNow.toISOString(),
      deletedAt: null,
      id: 'completion-1' as never,
      occurrenceLocalDate: '2026-05-08' as never,
      ruleId: 'rule-1' as never,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    },
  ];
  const exceptions: TaskRecurrenceException[] = [
    {
      action: 'skip',
      createdAt: fixedNow.toISOString(),
      id: 'exception-1' as never,
      occurrenceLocalDate: '2026-05-09' as never,
      ruleId: 'rule-1' as never,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    },
  ];
  const dependencies: PeriodReviewServiceDependencies = {
    createBudgetPlanningRepository: () =>
      ({
        listSavingsGoals: jest.fn(async () => ok([createSavingsGoal()])),
        loadBudgetRules: jest.fn(async () => ok(createBudgetRules())),
      }) as never,
    createMoneyRecordRepository: () =>
      ({
        listRecordsForPeriod: jest.fn(async (_workspaceId, period: BudgetPeriod) => {
          periods.push(period);
          return ok([createMoneyRecord()]);
        }),
      }) as never,
    createPreferencesRepository: () =>
      ({
        loadPreferences: jest.fn(async () => ok(createPreferences())),
      }) as never,
    createReminderRepository: () =>
      ({
        listExceptions: jest.fn(async () => ok([])),
        listReminders: jest.fn(async () => ok([createReminder()])),
      }) as never,
    createTaskRecurrenceRepository: () =>
      ({
        listCompletions: jest.fn(async () => ok(completions)),
        listExceptions: jest.fn(async () => ok(exceptions)),
        listRules: jest.fn(async () => ok([createRule()])),
      }) as never,
    createTaskRepository: () =>
      ({
        listSummaryTasks: jest.fn(async () => ok([createTask()])),
      }) as never,
    createWorkEntryRepository: () =>
      ({
        listHistoryEntries: jest.fn(async (_workspaceId, query) => {
          workQueries.push(query);
          return ok({
            hasMore: false,
            limit: 5000,
            offset: 0,
            records: [createWorkEntry()],
            totalCount: 1,
          });
        }),
      }) as never,
    loadRecoveryData: jest.fn(async (recoveryDependencies, options) => {
      recoveryCalls.push({ options, recoveryDependencies });
      const recoveryData: RecoveryData = {
        events: [],
        items: [
          {
            availableActions: ['dismiss'],
            createdFromState: 'missed',
            id: 'reminder-1:2026-05-07',
            occurrenceLocalDate: '2026-05-07' as never,
            reason: 'reminder_time_passed',
            targetId: 'reminder-1' as never,
            targetKind: 'reminder_occurrence',
            title: 'Review slides',
          },
        ],
      };

      return ok(recoveryData);
    }),
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: jest.fn(() => database),
    ...overrides,
  };

  return {
    database,
    dependencies,
    periods,
    recoveryCalls,
    workQueries,
  };
}

describe('loadPeriodReviewSummary', () => {
  it('loads a weekly summary from existing repositories and virtual occurrences', async () => {
    const { database, dependencies, periods, recoveryCalls, workQueries } = createBaseDependencies();
    const result = await loadPeriodReviewSummary({ kind: 'week' }, dependencies);

    expect(result.ok).toBe(true);
    expect(periods[0]).toMatchObject({
      endDateExclusive: '2026-05-11',
      startDate: '2026-05-04',
    });
    expect(periods[1]).toEqual({
      endDateExclusive: '2026-05-20',
      startDate: '2026-04-20',
    });
    expect(workQueries[0]).toMatchObject({
      dateFrom: '2026-05-04',
      dateTo: '2026-05-10',
      limit: 5000,
      sort: 'date_asc',
    });
    expect(recoveryCalls[0]).toMatchObject({
      options: { lookbackDays: 7 },
    });
    expect((recoveryCalls[0] as never as { recoveryDependencies: { openDatabase: () => unknown } }).recoveryDependencies.openDatabase()).toBe(database);

    if (result.ok) {
      expect(result.value.summary.period).toMatchObject({
        endDateExclusive: '2026-05-11',
        kind: 'week',
        startDate: '2026-05-04',
      });
      expect(result.value.summary.money.recordCount).toBe(1);
      expect(result.value.summary.tasks.recurringCompletedCount).toBe(1);
      expect(result.value.summary.tasks.recurringSkippedCount).toBe(1);
      expect(result.value.summary.reminders.totalOccurrenceCount).toBe(5);
      expect(result.value.summary.reminders.missedOrRecoveryCount).toBe(1);
      expect(result.value.summary.work.entryCount).toBe(1);
    }
  });

  it('loads month boundaries without using the budget reset day as the summary boundary', async () => {
    const { dependencies, periods, workQueries } = createBaseDependencies();
    const result = await loadPeriodReviewSummary({ kind: 'month' }, dependencies);

    expect(result.ok).toBe(true);
    expect(periods[0]).toMatchObject({
      endDateExclusive: '2026-06-01',
      startDate: '2026-05-01',
    });
    expect(periods[1]).toEqual({
      endDateExclusive: '2026-05-20',
      startDate: '2026-04-20',
    });
    expect(workQueries[0]).toMatchObject({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    });
  });

  it('recomputes from changed repository data instead of returning stale cached values', async () => {
    let amountMinor = 1200;
    const setup = createBaseDependencies({
      createMoneyRecordRepository: () =>
        ({
          listRecordsForPeriod: jest.fn(async () => ok([createMoneyRecord({ amountMinor })])),
        }) as never,
    });

    const first = await loadPeriodReviewSummary({ kind: 'week' }, setup.dependencies);
    amountMinor = 2500;
    const second = await loadPeriodReviewSummary({ kind: 'week' }, setup.dependencies);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      expect(first.value.summary.money.expenseAmountMinor).toBe(1200);
      expect(second.value.summary.money.expenseAmountMinor).toBe(2500);
      expect(second.value.summary.cacheStatus).toBe('fresh_from_source');
    }
  });

  it('returns a retryable error when local data cannot open', async () => {
    const result = await loadPeriodReviewSummary(
      { kind: 'week' },
      {
        openDatabase: () => {
          throw new Error('locked');
        },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'unavailable',
        recovery: 'retry',
      });
    }
  });

  it('returns settings recovery when preferences are missing', async () => {
    const result = await loadPeriodReviewSummary(
      { kind: 'week' },
      {
        createPreferencesRepository: () =>
          ({
            loadPreferences: jest.fn(async () => ok(null)),
          }) as never,
        migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
        now: () => fixedNow,
        openDatabase: () => ({}),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('settings');
    }
  });
});
