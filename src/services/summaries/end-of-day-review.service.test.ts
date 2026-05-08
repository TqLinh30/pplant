import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { MoneyRecord } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import type { Task } from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import { ok } from '@/domain/common/result';

import { loadEndOfDayReview, markEndOfDayTaskDone } from './end-of-day-review.service';

const fixedNow = new Date('2026-05-08T10:00:00.000');

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
    paid: false,
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

function createBaseDependencies(overrides: Record<string, unknown> = {}) {
  return {
    createMoneyRecordRepository: () =>
      ({
        listRecordsForPeriod: jest.fn(async () => ok([createMoneyRecord()])),
      }) as never,
    createPreferencesRepository: () =>
      ({
        loadPreferences: jest.fn(async () => ok(createPreferences())),
      }) as never,
    createReminderRepository: () =>
      ({
        listReminders: jest.fn(async () => ok([])),
      }) as never,
    createTaskRecurrenceRepository: () =>
      ({
        listRules: jest.fn(async () => ok([])),
      }) as never,
    createTaskRepository: () =>
      ({
        listSummaryTasks: jest.fn(async () => ok([createTask()])),
      }) as never,
    createWorkEntryRepository: () =>
      ({
        listHistoryEntries: jest.fn(async () =>
          ok({
            hasMore: false,
            limit: 75,
            offset: 0,
            records: [createWorkEntry()],
            totalCount: 1,
          }),
        ),
      }) as never,
    loadRecoveryData: jest.fn(async () => ok({ events: [], items: [] })),
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: jest.fn(() => ({})),
    ...overrides,
  };
}

describe('loadEndOfDayReview', () => {
  it('opens local data once and loads a same-day review from existing repositories', async () => {
    const periods: BudgetPeriod[] = [];
    const workQueries: unknown[] = [];
    const openDatabase = jest.fn(() => ({}));
    const migrateDatabase = jest.fn(async () => ok({ applied: 0, appliedMigrations: [] }));
    const result = await loadEndOfDayReview(
      createBaseDependencies({
        createMoneyRecordRepository: () =>
          ({
            listRecordsForPeriod: jest.fn(async (_workspaceId, period: BudgetPeriod) => {
              periods.push(period);

              return ok([createMoneyRecord()]);
            }),
          }) as never,
        createWorkEntryRepository: () =>
          ({
            listHistoryEntries: jest.fn(async (_workspaceId, query) => {
              workQueries.push(query);

              return ok({
                hasMore: false,
                limit: 75,
                offset: 0,
                records: [createWorkEntry()],
                totalCount: 1,
              });
            }),
          }) as never,
        migrateDatabase,
        openDatabase,
      }),
    );

    expect(result.ok).toBe(true);
    expect(openDatabase).toHaveBeenCalledTimes(1);
    expect(migrateDatabase).toHaveBeenCalledTimes(1);
    expect(periods).toEqual([
      {
        endDateExclusive: '2026-05-09',
        startDate: '2026-05-08',
      },
    ]);
    expect(workQueries[0]).toMatchObject({
      dateFrom: '2026-05-08',
      dateTo: '2026-05-08',
      limit: 75,
    });

    if (result.ok) {
      expect(result.value.summary.localDate).toBe('2026-05-08');
      expect(result.value.summary.money.totalCount).toBe(1);
      expect(result.value.summary.tasks.openRelevantCount).toBe(1);
      expect(result.value.summary.work.entryCount).toBe(1);
    }
  });

  it('returns a retryable error when local data cannot open', async () => {
    const result = await loadEndOfDayReview({
      openDatabase: () => {
        throw new Error('locked');
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'unavailable',
        recovery: 'retry',
      });
    }
  });

  it('returns settings recovery when preferences are missing', async () => {
    const result = await loadEndOfDayReview({
      createPreferencesRepository: () =>
        ({
          loadPreferences: jest.fn(async () => ok(null)),
        }) as never,
      migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('settings');
    }
  });
});

describe('markEndOfDayTaskDone', () => {
  it('updates the source task and returns refreshed review data', async () => {
    let task = createTask();
    const updateTask = jest.fn(async (input) => {
      task = {
        ...task,
        completedAt: input.completedAt,
        state: input.state,
        updatedAt: input.updatedAt,
        userCorrectedAt: input.userCorrectedAt,
      };

      return ok(task);
    });

    const result = await markEndOfDayTaskDone(
      { taskId: 'task-1' },
      createBaseDependencies({
        createTaskRepository: () =>
          ({
            getTask: jest.fn(async () => ok(task)),
            listSummaryTasks: jest.fn(async () => ok([task])),
            updateTask,
          }) as never,
      }),
    );

    expect(updateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        completedAt: fixedNow.toISOString(),
        id: 'task-1',
        sourceOfTruth: 'manual',
        state: 'done',
        userCorrectedAt: fixedNow.toISOString(),
      }),
    );
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.summary.tasks.completedTodayCount).toBe(1);
      expect(result.value.summary.tasks.openRelevantCount).toBe(0);
    }
  });
});
