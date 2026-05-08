import type { EntityId } from '@/domain/common/ids';
import type { CurrencyCode } from '@/domain/common/money';
import type { LocalDate } from '@/domain/common/date-rules';
import type { MoneyRecord } from '@/domain/money/types';
import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';
import type { Reflection } from '@/domain/reflections/types';
import type { Reminder } from '@/domain/reminders/types';
import type { Task } from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type StandardMvpDatasetCounts = {
  expenses: number;
  receiptBasedExpenses: number;
  incomeEntries: number;
  workShifts: number;
  tasks: number;
  reminders: number;
  savingsGoalEvents: number;
  reflections: number;
};

export const standardMvpDatasetCounts: StandardMvpDatasetCounts = {
  expenses: 1500,
  receiptBasedExpenses: 150,
  incomeEntries: 250,
  workShifts: 250,
  tasks: 1000,
  reminders: 300,
  savingsGoalEvents: 50,
  reflections: 100,
};

export type StandardMvpSavingsGoalEvent = {
  amountMinor: number;
  currencyCode: CurrencyCode;
  id: EntityId;
  localDate: LocalDate;
  source: 'fixture';
};

export type StandardMvpDatasetFixture = {
  expenses: MoneyRecord[];
  incomeEntries: MoneyRecord[];
  receiptBasedExpenses: MoneyRecord[];
  receiptParseResults: NormalizedReceiptParseResult[];
  reflections: Reflection[];
  reminders: Reminder[];
  savingsGoalEvents: StandardMvpSavingsGoalEvent[];
  tasks: Task[];
  workShifts: WorkEntry[];
};

function pad(index: number): string {
  return String(index + 1).padStart(4, '0');
}

function cycleLocalDate(index: number): LocalDate {
  const year = index < 730 ? 2025 : 2026;
  const dayOfYear = index % 365;
  const date = new Date(Date.UTC(year, 0, 1 + dayOfYear));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as LocalDate;
}

function timestampFor(index: number): string {
  return `${cycleLocalDate(index)}T12:00:00.000Z`;
}

function createExpense(index: number): MoneyRecord {
  const receiptBased = index < standardMvpDatasetCounts.receiptBasedExpenses;

  return {
    amountMinor: 500 + (index % 75) * 10,
    categoryId: null,
    createdAt: timestampFor(index),
    currencyCode: 'USD' as CurrencyCode,
    deletedAt: null,
    id: `fixture-expense-${pad(index)}` as EntityId,
    kind: 'expense',
    localDate: cycleLocalDate(index),
    merchantOrSource: `fixture-expense-source-${pad(index)}` as never,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: receiptBased ? 'receipt' : 'manual',
    sourceOfTruth: receiptBased && index % 3 === 0 ? 'parsed' : 'manual',
    topicIds: [],
    updatedAt: timestampFor(index),
    userCorrectedAt: receiptBased && index % 3 !== 0 ? timestampFor(index) : null,
    workspaceId: localWorkspaceId,
  };
}

function createIncome(index: number): MoneyRecord {
  return {
    amountMinor: 2500 + (index % 40) * 25,
    categoryId: null,
    createdAt: timestampFor(index),
    currencyCode: 'USD' as CurrencyCode,
    deletedAt: null,
    id: `fixture-income-${pad(index)}` as EntityId,
    kind: 'income',
    localDate: cycleLocalDate(index),
    merchantOrSource: `fixture-income-source-${pad(index)}` as never,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: timestampFor(index),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  };
}

function createWorkShift(index: number): WorkEntry {
  return {
    breakMinutes: index % 2 === 0 ? 15 : 0,
    categoryId: null,
    createdAt: timestampFor(index),
    deletedAt: null,
    durationMinutes: 90 + (index % 5) * 30,
    earnedIncomeMinor: 1800 + (index % 5) * 600,
    endedAtLocalDate: cycleLocalDate(index),
    endedAtLocalTime: '12:00' as never,
    entryMode: 'shift',
    id: `fixture-work-${pad(index)}` as EntityId,
    localDate: cycleLocalDate(index),
    note: null,
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    startedAtLocalDate: cycleLocalDate(index),
    startedAtLocalTime: '09:00' as never,
    topicIds: [],
    updatedAt: timestampFor(index),
    wageCurrencyCode: 'USD' as CurrencyCode,
    wageMinorPerHour: 1200,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
  };
}

function createTask(index: number): Task {
  const done = index % 4 === 0;

  return {
    categoryId: null,
    completedAt: done ? timestampFor(index) : null,
    createdAt: timestampFor(index),
    deadlineLocalDate: cycleLocalDate(index),
    deletedAt: null,
    id: `fixture-task-${pad(index)}` as EntityId,
    notes: null,
    priority: index % 3 === 0 ? 'high' : 'low',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: done ? 'done' : index % 2 === 0 ? 'doing' : 'todo',
    title: `fixture-task-${pad(index)}` as never,
    topicIds: [],
    updatedAt: timestampFor(index),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  };
}

function createReminder(index: number): Reminder {
  return {
    createdAt: timestampFor(index),
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: index % 2 === 0 ? 'weekly' : 'once',
    id: `fixture-reminder-${pad(index)}` as EntityId,
    notes: null,
    ownerKind: 'standalone',
    permissionStatus: 'granted',
    reminderLocalTime: '09:00' as never,
    scheduleState: 'scheduled',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: cycleLocalDate(index),
    taskId: null,
    taskRecurrenceRuleId: null,
    title: `fixture-reminder-${pad(index)}` as never,
    updatedAt: timestampFor(index),
    workspaceId: localWorkspaceId,
  };
}

function createSavingsGoalEvent(index: number): StandardMvpSavingsGoalEvent {
  return {
    amountMinor: 1000 + index * 10,
    currencyCode: 'USD' as CurrencyCode,
    id: `fixture-savings-event-${pad(index)}` as EntityId,
    localDate: cycleLocalDate(index),
    source: 'fixture',
  };
}

function createReflection(index: number): Reflection {
  const startDate = cycleLocalDate(index);

  return {
    createdAt: timestampFor(index),
    deletedAt: null,
    id: `fixture-reflection-${pad(index)}` as EntityId,
    period: {
      endDateExclusive: cycleLocalDate(index + 7),
      kind: index % 2 === 0 ? 'week' : 'month',
      startDate,
    },
    promptId: 'remember_period',
    promptText: `fixture-prompt-${pad(index)}`,
    responseText: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'skipped',
    updatedAt: timestampFor(index),
    workspaceId: localWorkspaceId,
  };
}

function createReceiptParseResult(index: number): NormalizedReceiptParseResult {
  return {
    categoryId: { confidence: 'medium', source: 'estimated', value: null },
    currency: 'USD',
    duplicateSuspected: false,
    lineItems: [
      {
        amountMinor: { confidence: 'high', source: 'parsed', value: 500 + index },
        label: { confidence: 'high', source: 'parsed', value: `fixture-line-item-${pad(index)}` },
      },
    ],
    localDate: { confidence: 'high', source: 'parsed', value: cycleLocalDate(index) },
    merchant: { confidence: 'high', source: 'parsed', value: `fixture-receipt-source-${pad(index)}` },
    topicIds: { confidence: 'medium', source: 'estimated', value: [] },
    totalMinor: { confidence: 'high', source: 'parsed', value: 500 + index },
    unknownFields: [],
  };
}

export function createStandardMvpDatasetFixture(): StandardMvpDatasetFixture {
  const expenses = Array.from({ length: standardMvpDatasetCounts.expenses }, (_, index) =>
    createExpense(index),
  );

  return {
    expenses,
    incomeEntries: Array.from({ length: standardMvpDatasetCounts.incomeEntries }, (_, index) =>
      createIncome(index),
    ),
    receiptBasedExpenses: expenses.filter((record) => record.source === 'receipt'),
    receiptParseResults: Array.from(
      { length: standardMvpDatasetCounts.receiptBasedExpenses },
      (_, index) => createReceiptParseResult(index),
    ),
    reflections: Array.from({ length: standardMvpDatasetCounts.reflections }, (_, index) =>
      createReflection(index),
    ),
    reminders: Array.from({ length: standardMvpDatasetCounts.reminders }, (_, index) =>
      createReminder(index),
    ),
    savingsGoalEvents: Array.from({ length: standardMvpDatasetCounts.savingsGoalEvents }, (_, index) =>
      createSavingsGoalEvent(index),
    ),
    tasks: Array.from({ length: standardMvpDatasetCounts.tasks }, (_, index) =>
      createTask(index),
    ),
    workShifts: Array.from({ length: standardMvpDatasetCounts.workShifts }, (_, index) =>
      createWorkShift(index),
    ),
  };
}

export function standardMvpDatasetFixtureCounts(fixture: StandardMvpDatasetFixture): StandardMvpDatasetCounts {
  return {
    expenses: fixture.expenses.length,
    incomeEntries: fixture.incomeEntries.length,
    receiptBasedExpenses: fixture.receiptBasedExpenses.length,
    reflections: fixture.reflections.length,
    reminders: fixture.reminders.length,
    savingsGoalEvents: fixture.savingsGoalEvents.length,
    tasks: fixture.tasks.length,
    workShifts: fixture.workShifts.length,
  };
}
