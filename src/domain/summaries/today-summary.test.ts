import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import type { MoneyRecord } from '@/domain/money/types';
import type { Reminder } from '@/domain/reminders/types';
import type { Task } from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { calculateTodayOverviewSummary, type TodayTaskRecurrenceOccurrenceInput } from './today-summary';

const fixedNow = '2026-05-08T10:00:00.000Z';

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

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    categoryId: null,
    completedAt: null,
    createdAt: fixedNow,
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
    note: null,
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

function createBudgetRules(): BudgetRules {
  return {
    createdAt: fixedNow,
    currencyCode: 'USD' as never,
    monthlyBudgetAmountMinor: 2000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  };
}

function createSavingsGoal(): SavingsGoal {
  return {
    archivedAt: null,
    createdAt: fixedNow,
    currencyCode: 'USD' as never,
    currentAmountMinor: 3000,
    id: 'goal-1' as never,
    name: 'Books' as never,
    targetAmountMinor: 10000,
    targetDate: null,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  };
}

describe('today overview summary', () => {
  it('returns useful empty state data for a fresh Today surface', () => {
    const summary = calculateTodayOverviewSummary({
      budgetPeriod: {
        endDateExclusive: '2026-06-01' as never,
        startDate: '2026-05-01' as never,
      },
      budgetPeriodMoneyRecords: [],
      budgetRules: null,
      localDate: '2026-05-08' as never,
      recoveryItems: [],
      reminders: [],
      savingsGoals: [],
      taskRecurrenceOccurrences: [],
      tasks: [],
      todayMoneyRecords: [],
      workEntries: [],
    });

    expect(summary.isEmpty).toBe(true);
    expect(summary.money.recordCount).toBe(0);
    expect(summary.budget.budgetStatus).toBeNull();
    expect(summary.savings).toEqual([]);
    expect(summary.tasks.summary.totalCount).toBe(0);
    expect(summary.work.entryCount).toBe(0);
    expect(summary.recentActivity).toEqual([]);
  });

  it('combines same-day money, budget, savings, tasks, reminders, recovery, and work context', () => {
    const recurrence: TodayTaskRecurrenceOccurrenceInput = {
      kind: 'habit',
      localDate: '2026-05-08' as never,
      priority: 'low',
      ruleId: 'rule-1' as never,
      state: 'open',
      title: 'Read notes',
    };
    const summary = calculateTodayOverviewSummary({
      budgetPeriod: {
        endDateExclusive: '2026-06-01' as never,
        startDate: '2026-05-01' as never,
      },
      budgetPeriodMoneyRecords: [
        createMoneyRecord({ amountMinor: 1700, id: 'period-1' as never }),
        createMoneyRecord({
          amountMinor: 900,
          id: 'period-2' as never,
          localDate: '2026-05-01' as never,
        }),
      ],
      budgetRules: createBudgetRules(),
      localDate: '2026-05-08' as never,
      recoveryItems: [
        {
          reason: 'reminder_time_passed',
          targetId: 'reminder-1' as never,
          targetKind: 'reminder_occurrence',
          title: 'Review slides',
        },
      ],
      reminders: [
        {
          occurrences: [
            {
              fireAtLocal: '2026-05-08T09:00' as never,
              localDate: '2026-05-08' as never,
              reminderId: 'reminder-1' as never,
              state: 'open',
            },
          ],
          reminder: createReminder(),
        },
        {
          occurrences: [],
          reminder: createReminder({
            id: 'reminder-2' as never,
            permissionStatus: 'denied',
            scheduleState: 'permission_denied',
            title: 'Permission reminder' as never,
          }),
        },
      ],
      savingsGoals: [createSavingsGoal()],
      taskRecurrenceOccurrences: [recurrence],
      tasks: [
        createTask(),
        createTask({
          completedAt: '2026-05-08T08:00:00.000Z',
          id: 'task-2' as never,
          state: 'done',
          title: 'Essay outline' as never,
        }),
        createTask({
          completedAt: '2026-05-07T08:00:00.000Z',
          id: 'task-4' as never,
          state: 'done',
          title: 'Old outline' as never,
        }),
        createTask({
          deadlineLocalDate: '2026-05-07' as never,
          id: 'task-3' as never,
          priority: 'low',
          title: 'Print notes' as never,
        }),
      ],
      todayMoneyRecords: [
        createMoneyRecord({ amountMinor: 1200, id: 'money-1' as never }),
        createMoneyRecord({
          amountMinor: 4000,
          id: 'money-2' as never,
          kind: 'income',
          merchantOrSource: 'Tutoring' as never,
        }),
        createMoneyRecord({
          amountMinor: 999,
          id: 'money-3' as never,
          localDate: '2026-05-07' as never,
        }),
      ],
      workEntries: [createWorkEntry(), createWorkEntry({ id: 'work-2' as never, localDate: '2026-05-07' as never })],
    });

    expect(summary.isEmpty).toBe(false);
    expect(summary.money).toMatchObject({
      expenseAmountMinor: 1200,
      incomeAmountMinor: 4000,
      netAmountMinor: 2800,
      recordCount: 2,
    });
    expect(summary.budget.budgetStatus?.state).toBe('over_budget_warning');
    expect(summary.savings[0]).toMatchObject({
      currentAmountMinor: 3000,
      progressBasisPoints: 3000,
      remainingMinor: 7000,
    });
    expect(summary.tasks.summary).toMatchObject({
      doneCount: 2,
      openCount: 2,
      overdueOpenCount: 1,
      totalCount: 4,
    });
    expect(summary.tasks.recurringOpenTodayCount).toBe(1);
    expect(summary.reminders).toMatchObject({
      needsAttentionCount: 2,
      recoveryItemCount: 1,
      todayOccurrenceCount: 1,
      totalCount: 2,
    });
    expect(summary.work).toMatchObject({
      earnedIncomeMinor: 1800,
      entryCount: 1,
      totalDurationMinutes: 90,
    });
    expect(summary.recentActivity.map((item) => item.kind)).toEqual(['money', 'money', 'work', 'task']);
  });

  it('uses saved manual-corrected receipt record values as the Today source of truth', () => {
    const correctedReceipt = createMoneyRecord({
      amountMinor: 1750,
      id: 'corrected-receipt' as never,
      merchantOrSource: 'Corrected campus store' as never,
      source: 'receipt',
      sourceOfTruth: 'manual',
      userCorrectedAt: '2026-05-08T09:00:00.000Z',
    });
    const summary = calculateTodayOverviewSummary({
      budgetPeriod: {
        endDateExclusive: '2026-06-01' as never,
        startDate: '2026-05-01' as never,
      },
      budgetPeriodMoneyRecords: [correctedReceipt],
      budgetRules: createBudgetRules(),
      localDate: '2026-05-08' as never,
      recoveryItems: [],
      reminders: [],
      savingsGoals: [],
      taskRecurrenceOccurrences: [],
      tasks: [],
      todayMoneyRecords: [correctedReceipt],
      workEntries: [],
    });

    expect(summary.money).toMatchObject({
      expenseAmountMinor: 1750,
      recordCount: 1,
    });
    expect(summary.budget.budgetStatus?.remainingMinor).toBe(250);
    expect(summary.recentActivity[0]).toMatchObject({
      id: 'corrected-receipt',
      title: 'Corrected campus store',
    });
  });

  it('caps task, reminder, recovery, and recent activity lists', () => {
    const summary = calculateTodayOverviewSummary({
      budgetPeriod: {
        endDateExclusive: '2026-06-01' as never,
        startDate: '2026-05-01' as never,
      },
      budgetPeriodMoneyRecords: [],
      budgetRules: null,
      localDate: '2026-05-08' as never,
      maxItems: 2,
      recoveryItems: [
        { reason: 'task_deadline_passed', targetId: 'r1' as never, targetKind: 'task', title: 'One' },
        { reason: 'task_deadline_passed', targetId: 'r2' as never, targetKind: 'task', title: 'Two' },
        { reason: 'task_deadline_passed', targetId: 'r3' as never, targetKind: 'task', title: 'Three' },
      ],
      reminders: [
        { occurrences: [], reminder: createReminder({ id: 'reminder-1' as never, title: 'One' as never }) },
        { occurrences: [], reminder: createReminder({ id: 'reminder-2' as never, title: 'Two' as never }) },
        { occurrences: [], reminder: createReminder({ id: 'reminder-3' as never, title: 'Three' as never }) },
      ],
      savingsGoals: [],
      taskRecurrenceOccurrences: [],
      tasks: [
        createTask({ id: 'task-1' as never, title: 'One' as never }),
        createTask({ id: 'task-2' as never, title: 'Two' as never }),
        createTask({ id: 'task-3' as never, title: 'Three' as never }),
      ],
      todayMoneyRecords: [
        createMoneyRecord({ id: 'money-1' as never }),
        createMoneyRecord({ id: 'money-2' as never }),
        createMoneyRecord({ id: 'money-3' as never }),
      ],
      workEntries: [],
    });

    expect(summary.tasks.items).toHaveLength(2);
    expect(summary.reminders.items).toHaveLength(2);
    expect(summary.recovery.items).toHaveLength(2);
    expect(summary.recentActivity).toHaveLength(2);
  });
});
