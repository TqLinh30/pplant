import type { BudgetRules } from '@/domain/budgets/types';
import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { MoneyRecord } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import { ok } from '@/domain/common/result';

import { loadTodayOverview } from './today.service';

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

function createBudgetRules(): BudgetRules {
  return {
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as never,
    monthlyBudgetAmountMinor: 5000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
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

function createWorkEntry(): WorkEntry {
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
  };
}

describe('loadTodayOverview', () => {
  it('opens local data once and summarizes today with the preferences reset day', async () => {
    const database = {};
    const periods: BudgetPeriod[] = [];
    const openDatabase = jest.fn(() => database);
    const migrateDatabase = jest.fn(async () => ok({ applied: 0, appliedMigrations: [] }));
    const todayRecord = createMoneyRecord();
    const budgetRecord = createMoneyRecord({
      amountMinor: 2100,
      id: 'period-money' as never,
      localDate: '2026-04-20' as never,
    });

    const result = await loadTodayOverview({
      createBudgetPlanningRepository: () =>
        ({
          listSavingsGoals: jest.fn(async () => ok([])),
          loadBudgetRules: jest.fn(async () => ok(createBudgetRules())),
        }) as never,
      createMoneyRecordRepository: () =>
        ({
          listRecordsForPeriod: jest.fn(async (_workspaceId, period: BudgetPeriod) => {
            periods.push(period);

            return ok(period.startDate === '2026-05-08' ? [todayRecord] : [budgetRecord]);
          }),
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
          listSummaryTasks: jest.fn(async () => ok([])),
        }) as never,
      createWorkEntryRepository: () =>
        ({
          listHistoryEntries: jest.fn(async () =>
            ok({
              hasMore: false,
              limit: 50,
              offset: 0,
              records: [createWorkEntry()],
              totalCount: 1,
            }),
          ),
        }) as never,
      loadRecoveryData: jest.fn(async () => ok({ events: [], items: [] })),
      migrateDatabase,
      now: () => fixedNow,
      openDatabase,
    });

    expect(result.ok).toBe(true);
    expect(openDatabase).toHaveBeenCalledTimes(1);
    expect(migrateDatabase).toHaveBeenCalledTimes(1);
    expect(periods).toEqual([
      {
        endDateExclusive: '2026-05-20',
        startDate: '2026-04-20',
      },
      {
        endDateExclusive: '2026-05-09',
        startDate: '2026-05-08',
      },
    ]);

    if (result.ok) {
      expect(result.value.summary.localDate).toBe('2026-05-08');
      expect(result.value.summary.budget.budgetStatus?.remainingMinor).toBe(2900);
      expect(result.value.summary.money.expenseAmountMinor).toBe(1200);
      expect(result.value.summary.work).toMatchObject({
        earnedIncomeMinor: 1500,
        entryCount: 1,
        unpaidEntryCount: 1,
      });
    }
  });

  it('returns a retryable error when the database cannot open', async () => {
    const result = await loadTodayOverview({
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
    const result = await loadTodayOverview({
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
