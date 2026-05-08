import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import type { MoneyRecord } from '@/domain/money/types';
import type { Reminder } from '@/domain/reminders/types';
import type { Task } from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import { standardMvpDatasetCounts } from '@/data/fixtures/standard-mvp-dataset';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  calculatePeriodReviewSummary,
  resolveMonthlySummaryPeriod,
  resolveWeeklySummaryPeriod,
  type PeriodReminderInput,
  type PeriodSummaryPeriod,
  type PeriodTaskRecurrenceOccurrenceInput,
} from './period-summary';

const fixedNow = '2026-05-08T10:00:00.000Z';
const emptyBudgetPeriod: BudgetPeriod = {
  endDateExclusive: '2026-06-01' as never,
  startDate: '2026-05-01' as never,
};

function createMoneyRecord(overrides: Partial<MoneyRecord> = {}): MoneyRecord {
  return {
    amountMinor: 1200,
    categoryId: null,
    createdAt: fixedNow,
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
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createWorkEntry(overrides: Partial<WorkEntry> = {}): WorkEntry {
  return {
    breakMinutes: 0,
    categoryId: null,
    createdAt: fixedNow,
    deletedAt: null,
    durationMinutes: 90,
    earnedIncomeMinor: 1800,
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
    updatedAt: fixedNow,
    wageCurrencyCode: 'USD' as never,
    wageMinorPerHour: 1200,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    categoryId: null,
    completedAt: null,
    createdAt: fixedNow,
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
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    createdAt: fixedNow,
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
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createBudgetRules(): BudgetRules {
  return {
    createdAt: fixedNow,
    currencyCode: 'USD' as never,
    monthlyBudgetAmountMinor: 50000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  };
}

function createSavingsGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    archivedAt: null,
    createdAt: fixedNow,
    currencyCode: 'USD' as never,
    currentAmountMinor: 2000,
    id: 'goal-1' as never,
    name: 'Books' as never,
    targetAmountMinor: 10000,
    targetDate: null,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function calculateForPeriod(
  period: PeriodSummaryPeriod,
  overrides: Partial<Parameters<typeof calculatePeriodReviewSummary>[0]> = {},
) {
  return calculatePeriodReviewSummary({
    asOfLocalDate: '2026-05-08' as never,
    budgetPeriod: emptyBudgetPeriod,
    budgetPeriodMoneyRecords: [],
    budgetRules: null,
    moneyRecords: [],
    period,
    recoveryItems: [],
    reminders: [],
    savingsGoals: [],
    taskRecurrenceOccurrences: [],
    tasks: [],
    workEntries: [],
    ...overrides,
  });
}

describe('period review summary', () => {
  it('resolves deterministic week and month boundaries', () => {
    const week = resolveWeeklySummaryPeriod('2026-05-08');
    const month = resolveMonthlySummaryPeriod('2024-02-29');

    expect(week.ok).toBe(true);
    expect(month.ok).toBe(true);

    if (week.ok) {
      expect(week.value).toMatchObject({
        endDateExclusive: '2026-05-11',
        key: 'week:2026-05-04',
        label: 'Week of 2026-05-04',
        startDate: '2026-05-04',
      });
    }

    if (month.ok) {
      expect(month.value).toMatchObject({
        endDateExclusive: '2024-03-01',
        key: 'month:2024-02',
        label: '2024-02',
        startDate: '2024-02-01',
      });
    }
  });

  it('aggregates money, work, tasks, reminders, budget, and savings without stale inputs', () => {
    const period = resolveWeeklySummaryPeriod('2026-05-08');

    expect(period.ok).toBe(true);
    if (!period.ok) {
      return;
    }

    const recurring: PeriodTaskRecurrenceOccurrenceInput[] = [
      {
        kind: 'habit',
        localDate: '2026-05-06' as never,
        priority: 'low',
        ruleId: 'rule-1' as never,
        state: 'open',
        title: 'Read notes',
      },
      {
        kind: 'habit',
        localDate: '2026-05-08' as never,
        priority: 'low',
        ruleId: 'rule-1' as never,
        state: 'completed',
        title: 'Read notes',
      },
      {
        kind: 'habit',
        localDate: '2026-05-09' as never,
        priority: 'low',
        ruleId: 'rule-1' as never,
        state: 'skipped',
        title: 'Read notes',
      },
    ];
    const reminders: PeriodReminderInput[] = [
      {
        occurrences: [
          {
            fireAtLocal: '2026-05-08T09:00' as never,
            localDate: '2026-05-08' as never,
            reminderId: 'reminder-1' as never,
            state: 'open',
          },
          {
            fireAtLocal: '2026-05-09T09:00' as never,
            localDate: '2026-05-09' as never,
            reminderId: 'reminder-1' as never,
            state: 'skipped',
          },
        ],
        reminder: createReminder(),
      },
      {
        occurrences: [],
        reminder: createReminder({
          id: 'reminder-disabled' as never,
          permissionStatus: 'denied',
          scheduleState: 'permission_denied',
        }),
      },
    ];
    const summary = calculateForPeriod(period.value, {
      budgetPeriodMoneyRecords: [
        createMoneyRecord({ amountMinor: 20000, id: 'budget-expense' as never }),
      ],
      budgetRules: createBudgetRules(),
      moneyRecords: [
        createMoneyRecord({ amountMinor: 1200, id: 'expense-1' as never, source: 'receipt' }),
        createMoneyRecord({
          amountMinor: 4000,
          id: 'income-1' as never,
          kind: 'income',
          merchantOrSource: 'Tutoring' as never,
        }),
        createMoneyRecord({ deletedAt: fixedNow, id: 'deleted' as never }),
        createMoneyRecord({ id: 'outside' as never, localDate: '2026-05-11' as never }),
      ],
      recoveryItems: [
        {
          occurrenceLocalDate: '2026-05-07' as never,
          reason: 'reminder_time_passed',
          targetId: 'reminder-1' as never,
          targetKind: 'reminder_occurrence',
          title: 'Review slides',
        },
      ],
      reminders,
      savingsGoals: [createSavingsGoal()],
      taskRecurrenceOccurrences: recurring,
      tasks: [
        createTask({
          completedAt: '2026-05-08T08:00:00.000Z',
          id: 'done-task' as never,
          state: 'done',
        }),
        createTask({ id: 'missed-task' as never }),
        createTask({ deletedAt: fixedNow, id: 'deleted-task' as never }),
      ],
      workEntries: [
        createWorkEntry(),
        createWorkEntry({ id: 'unpaid' as never, paid: false }),
        createWorkEntry({ id: 'old-work' as never, localDate: '2026-05-03' as never }),
      ],
    });

    expect(summary.cacheStatus).toBe('fresh_from_source');
    expect(summary.money).toMatchObject({
      expenseAmountMinor: 1200,
      expenseCount: 1,
      incomeAmountMinor: 4000,
      incomeCount: 1,
      netAmountMinor: 2800,
      receiptExpenseAmountMinor: 1200,
      receiptExpenseCount: 1,
      recordCount: 2,
    });
    expect(summary.work).toMatchObject({
      earnedIncomeMinor: 3600,
      entryCount: 2,
      paidEntryCount: 1,
      totalDurationMinutes: 180,
      unpaidEntryCount: 1,
    });
    expect(summary.tasks).toMatchObject({
      completedCount: 2,
      directMissedCount: 1,
      missedCount: 2,
      recurringCompletedCount: 1,
      recurringMissedCount: 1,
      recurringSkippedCount: 1,
    });
    expect(summary.reminders).toMatchObject({
      disabledOrUnavailableCount: 1,
      missedOrRecoveryCount: 1,
      openOccurrenceCount: 1,
      skippedOccurrenceCount: 1,
      totalOccurrenceCount: 2,
    });
    expect(summary.budget.budgetStatus).toMatchObject({
      isOverBudget: false,
      remainingMinor: 30000,
    });
    expect(summary.savings[0]).toMatchObject({
      currentAmountMinor: 2000,
      remainingMinor: 8000,
      targetAmountMinor: 10000,
    });
    expect(summary.partial).toEqual({
      budget: false,
      money: false,
      reminders: false,
      savings: false,
      tasks: false,
      work: false,
    });
  });

  it('returns neutral empty and partial states when no source data exists', () => {
    const period = resolveMonthlySummaryPeriod('2026-05-08');

    expect(period.ok).toBe(true);
    if (!period.ok) {
      return;
    }

    const summary = calculateForPeriod(period.value);

    expect(summary.isEmpty).toBe(true);
    expect(summary.partial).toEqual({
      budget: true,
      money: true,
      reminders: true,
      savings: true,
      tasks: true,
      work: true,
    });
  });

  it('handles the standard MVP dataset scale through the pure calculation path', () => {
    const period = resolveMonthlySummaryPeriod('2026-05-08');

    expect(period.ok).toBe(true);
    if (!period.ok) {
      return;
    }

    const moneyRecords = [
      ...Array.from({ length: standardMvpDatasetCounts.expenses }, (_, index) =>
        createMoneyRecord({ id: `expense-${index}` as never }),
      ),
      ...Array.from({ length: standardMvpDatasetCounts.incomeEntries }, (_, index) =>
        createMoneyRecord({
          amountMinor: 3000,
          id: `income-${index}` as never,
          kind: 'income',
        }),
      ),
    ];
    const workEntries = Array.from({ length: standardMvpDatasetCounts.workShifts }, (_, index) =>
      createWorkEntry({ id: `work-${index}` as never }),
    );
    const tasks = Array.from({ length: standardMvpDatasetCounts.tasks }, (_, index) =>
      createTask({
        completedAt: index % 2 === 0 ? '2026-05-08T08:00:00.000Z' : null,
        id: `task-${index}` as never,
        state: index % 2 === 0 ? 'done' : 'todo',
      }),
    );
    const reminders: PeriodReminderInput[] = Array.from({ length: standardMvpDatasetCounts.reminders }, (_, index) => ({
      occurrences: [
        {
          fireAtLocal: '2026-05-08T09:00' as never,
          localDate: '2026-05-08' as never,
          reminderId: `reminder-${index}` as never,
          state: 'open',
        },
      ],
      reminder: createReminder({ id: `reminder-${index}` as never }),
    }));
    const startedAt = Date.now();
    const summary = calculateForPeriod(period.value, {
      moneyRecords,
      reminders,
      tasks,
      workEntries,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(summary.money.recordCount).toBe(
      standardMvpDatasetCounts.expenses + standardMvpDatasetCounts.incomeEntries,
    );
    expect(summary.work.entryCount).toBe(standardMvpDatasetCounts.workShifts);
    expect(summary.tasks.directTotalCount).toBe(standardMvpDatasetCounts.tasks);
    expect(summary.reminders.totalOccurrenceCount).toBe(standardMvpDatasetCounts.reminders);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
