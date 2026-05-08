import {
  addLocalDays,
  asLocalDate,
  defaultWeekStartsOn,
  formatDateAsLocalDate,
  type BudgetPeriod,
  type LocalDate,
  type WeekStartsOn,
} from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { createAppError } from '@/domain/common/app-error';
import type { BudgetRules, BudgetStatus, SavingsGoal } from '@/domain/budgets/types';
import {
  calculateMoneyPlanningPeriodSummary,
  type SavingsGoalProgressSummary,
} from '@/domain/money/calculations';
import type { MoneyRecord } from '@/domain/money/types';
import type { RecoveryTargetKind } from '@/domain/recovery/types';
import type { Reminder, ReminderOccurrence, ReminderScheduleState } from '@/domain/reminders/types';
import type {
  Task,
  TaskPriority,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrenceState,
} from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';

export type PeriodSummaryKind = 'month' | 'week';
export type PeriodSummaryCacheStatus = 'fresh_from_source';

export type PeriodSummaryPeriod = BudgetPeriod & {
  anchorLocalDate: LocalDate;
  kind: PeriodSummaryKind;
  key: string;
  label: string;
};

export type PeriodTaskRecurrenceOccurrenceInput = {
  kind: TaskRecurrenceKind;
  localDate: LocalDate;
  priority: TaskPriority;
  ruleId: EntityId;
  state: TaskRecurrenceOccurrenceState;
  title: string;
};

export type PeriodReminderInput = {
  occurrences: ReminderOccurrence[];
  reminder: Reminder;
};

export type PeriodRecoveryItemInput = {
  occurrenceLocalDate: LocalDate | null;
  reason: string;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
  title: string;
};

export type PeriodSummaryInput = {
  asOfLocalDate: LocalDate;
  budgetPeriod: BudgetPeriod;
  budgetPeriodMoneyRecords: MoneyRecord[];
  budgetRules: BudgetRules | null;
  maxItems?: number;
  moneyRecords: MoneyRecord[];
  period: PeriodSummaryPeriod;
  recoveryItems: PeriodRecoveryItemInput[];
  reminders: PeriodReminderInput[];
  savingsGoals: SavingsGoal[];
  taskRecurrenceOccurrences: PeriodTaskRecurrenceOccurrenceInput[];
  tasks: Task[];
  workEntries: WorkEntry[];
};

export type PeriodMoneySummary = {
  expenseAmountMinor: number;
  expenseCount: number;
  incomeAmountMinor: number;
  incomeCount: number;
  netAmountMinor: number;
  recordCount: number;
  records: MoneyRecord[];
};

export type PeriodBudgetSummary = {
  budgetStatus: BudgetStatus | null;
  expenseAmountMinor: number;
  incomeAmountMinor: number;
  period: BudgetPeriod;
};

export type PeriodWorkSummary = {
  earnedIncomeMinor: number;
  entries: WorkEntry[];
  entryCount: number;
  paidEntryCount: number;
  totalDurationMinutes: number;
  unpaidEntryCount: number;
};

export type PeriodTaskSummary = {
  completedCount: number;
  directCompletedCount: number;
  directMissedCount: number;
  directOpenCount: number;
  directTotalCount: number;
  missedCount: number;
  openCount: number;
  recoveryItemCount: number;
  recurringCompletedCount: number;
  recurringMissedCount: number;
  recurringOpenCount: number;
  recurringSkippedCount: number;
  recurringTotalCount: number;
  skippedCount: number;
  totalCount: number;
};

export type PeriodReminderSummary = {
  disabledOrUnavailableCount: number;
  missedOrRecoveryCount: number;
  openOccurrenceCount: number;
  recoveryItemCount: number;
  skippedOccurrenceCount: number;
  totalCount: number;
  totalOccurrenceCount: number;
};

export type PeriodSummaryPartialStates = {
  budget: boolean;
  money: boolean;
  reminders: boolean;
  savings: boolean;
  tasks: boolean;
  work: boolean;
};

export type PeriodReviewSummary = {
  budget: PeriodBudgetSummary;
  cacheStatus: PeriodSummaryCacheStatus;
  isEmpty: boolean;
  money: PeriodMoneySummary;
  partial: PeriodSummaryPartialStates;
  period: PeriodSummaryPeriod;
  reminders: PeriodReminderSummary;
  savings: SavingsGoalProgressSummary[];
  tasks: PeriodTaskSummary;
  work: PeriodWorkSummary;
};

const defaultMaxItems = 8;
const maxAllowedItems = 24;

function normalizeMaxItems(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value)) {
    return defaultMaxItems;
  }

  return Math.min(Math.max(value, 1), maxAllowedItems);
}

function parseLocalDateToUtc(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateAsLocalDate(date: Date): LocalDate {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as LocalDate;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);

  return next;
}

function minLocalDate(left: LocalDate, right: LocalDate): LocalDate {
  return left <= right ? left : right;
}

function maxLocalDate(left: LocalDate, right: LocalDate): LocalDate {
  return left >= right ? left : right;
}

function localDateInPeriod(localDate: LocalDate, period: BudgetPeriod): boolean {
  return localDate >= period.startDate && localDate < period.endDateExclusive;
}

function timestampInPeriod(timestamp: string | null, period: BudgetPeriod): boolean {
  if (!timestamp) {
    return false;
  }

  return localDateInPeriod(formatDateAsLocalDate(new Date(timestamp)), period);
}

function isActiveMoneyRecordInPeriod(record: MoneyRecord, period: BudgetPeriod): boolean {
  return record.deletedAt === null && localDateInPeriod(record.localDate, period);
}

function isActiveWorkEntryInPeriod(entry: WorkEntry, period: BudgetPeriod): boolean {
  return entry.deletedAt === null && localDateInPeriod(entry.localDate, period);
}

function isMissedTaskDeadline(task: Task, input: { asOfLocalDate: LocalDate; period: BudgetPeriod }): boolean {
  if (task.deletedAt !== null || task.state === 'done' || task.deadlineLocalDate === null) {
    return false;
  }

  const cutoffExclusive = maxLocalDate(
    input.period.startDate,
    minLocalDate(input.asOfLocalDate, input.period.endDateExclusive),
  );

  return task.deadlineLocalDate >= input.period.startDate && task.deadlineLocalDate < cutoffExclusive;
}

function taskHasOpenDeadlineInPeriod(task: Task, period: BudgetPeriod): boolean {
  return (
    task.deletedAt === null &&
    task.state !== 'done' &&
    task.deadlineLocalDate !== null &&
    localDateInPeriod(task.deadlineLocalDate, period)
  );
}

function isMissedRecurringOccurrence(
  occurrence: PeriodTaskRecurrenceOccurrenceInput,
  input: { asOfLocalDate: LocalDate; period: BudgetPeriod },
): boolean {
  if (occurrence.state !== 'open') {
    return false;
  }

  const cutoffExclusive = maxLocalDate(
    input.period.startDate,
    minLocalDate(input.asOfLocalDate, input.period.endDateExclusive),
  );

  return occurrence.localDate >= input.period.startDate && occurrence.localDate < cutoffExclusive;
}

function reminderNeedsAttention(reminder: Reminder): boolean {
  const attentionStates = new Set<ReminderScheduleState>([
    'disabled',
    'failed',
    'local_only',
    'permission_denied',
    'snoozed',
    'unavailable',
  ]);

  return reminder.deletedAt === null && attentionStates.has(reminder.scheduleState);
}

function recoveryItemInPeriod(item: PeriodRecoveryItemInput, period: BudgetPeriod): boolean {
  return item.occurrenceLocalDate === null || localDateInPeriod(item.occurrenceLocalDate, period);
}

function calculateMoney(input: PeriodSummaryInput, maxItems: number): PeriodMoneySummary {
  const records = input.moneyRecords.filter((record) => isActiveMoneyRecordInPeriod(record, input.period));

  return records.reduce(
    (summary, record) => {
      if (record.kind === 'expense') {
        summary.expenseAmountMinor += record.amountMinor;
        summary.expenseCount += 1;
      } else {
        summary.incomeAmountMinor += record.amountMinor;
        summary.incomeCount += 1;
      }

      summary.netAmountMinor = summary.incomeAmountMinor - summary.expenseAmountMinor;
      summary.recordCount += 1;

      return summary;
    },
    {
      expenseAmountMinor: 0,
      expenseCount: 0,
      incomeAmountMinor: 0,
      incomeCount: 0,
      netAmountMinor: 0,
      recordCount: 0,
      records: records.slice(0, maxItems),
    } satisfies PeriodMoneySummary,
  );
}

function calculateWork(input: PeriodSummaryInput, maxItems: number): PeriodWorkSummary {
  const entries = input.workEntries.filter((entry) => isActiveWorkEntryInPeriod(entry, input.period));

  return entries.reduce(
    (summary, entry) => {
      summary.earnedIncomeMinor += entry.earnedIncomeMinor;
      summary.entryCount += 1;
      summary.totalDurationMinutes += entry.durationMinutes;

      if (entry.paid) {
        summary.paidEntryCount += 1;
      } else {
        summary.unpaidEntryCount += 1;
      }

      return summary;
    },
    {
      earnedIncomeMinor: 0,
      entries: entries.slice(0, maxItems),
      entryCount: 0,
      paidEntryCount: 0,
      totalDurationMinutes: 0,
      unpaidEntryCount: 0,
    } satisfies PeriodWorkSummary,
  );
}

function calculateTasks(input: PeriodSummaryInput): PeriodTaskSummary {
  const activeTasks = input.tasks.filter((task) => task.deletedAt === null);
  const directCompletedCount = activeTasks.filter((task) => timestampInPeriod(task.completedAt, input.period)).length;
  const directOpenCount = activeTasks.filter((task) => taskHasOpenDeadlineInPeriod(task, input.period)).length;
  const directMissedCount = activeTasks.filter((task) =>
    isMissedTaskDeadline(task, {
      asOfLocalDate: input.asOfLocalDate,
      period: input.period,
    }),
  ).length;
  const recurringOccurrences = input.taskRecurrenceOccurrences.filter((occurrence) =>
    localDateInPeriod(occurrence.localDate, input.period),
  );
  const recurringCompletedCount = recurringOccurrences.filter((occurrence) => occurrence.state === 'completed').length;
  const recurringOpenCount = recurringOccurrences.filter((occurrence) => occurrence.state === 'open').length;
  const recurringSkippedCount = recurringOccurrences.filter((occurrence) => occurrence.state === 'skipped').length;
  const recurringMissedCount = recurringOccurrences.filter((occurrence) =>
    isMissedRecurringOccurrence(occurrence, {
      asOfLocalDate: input.asOfLocalDate,
      period: input.period,
    }),
  ).length;
  const recoveryItemCount = input.recoveryItems.filter(
    (item) =>
      recoveryItemInPeriod(item, input.period) &&
      (item.targetKind === 'task' || item.targetKind === 'task_recurrence_occurrence'),
  ).length;
  const directTotalCount = directCompletedCount + directOpenCount;
  const recurringTotalCount = recurringOccurrences.length;
  const completedCount = directCompletedCount + recurringCompletedCount;
  const openCount = directOpenCount + recurringOpenCount;
  const missedCount = directMissedCount + recurringMissedCount;
  const skippedCount = recurringSkippedCount;

  return {
    completedCount,
    directCompletedCount,
    directMissedCount,
    directOpenCount,
    directTotalCount,
    missedCount,
    openCount,
    recoveryItemCount,
    recurringCompletedCount,
    recurringMissedCount,
    recurringOpenCount,
    recurringSkippedCount,
    recurringTotalCount,
    skippedCount,
    totalCount: directTotalCount + recurringTotalCount,
  };
}

function calculateReminders(input: PeriodSummaryInput): PeriodReminderSummary {
  const activeReminderInputs = input.reminders.filter(({ reminder }) => reminder.deletedAt === null);
  const periodOccurrences = activeReminderInputs.flatMap(({ occurrences }) =>
    occurrences.filter((occurrence) => localDateInPeriod(occurrence.localDate, input.period)),
  );
  const recoveryItemCount = input.recoveryItems.filter(
    (item) => item.targetKind === 'reminder_occurrence' && recoveryItemInPeriod(item, input.period),
  ).length;
  const disabledOrUnavailableCount = activeReminderInputs.filter(({ reminder }) => reminderNeedsAttention(reminder))
    .length;

  return {
    disabledOrUnavailableCount,
    missedOrRecoveryCount: recoveryItemCount,
    openOccurrenceCount: periodOccurrences.filter((occurrence) => occurrence.state === 'open').length,
    recoveryItemCount,
    skippedOccurrenceCount: periodOccurrences.filter((occurrence) => occurrence.state === 'skipped').length,
    totalCount: activeReminderInputs.length,
    totalOccurrenceCount: periodOccurrences.length,
  };
}

export function resolveWeeklySummaryPeriod(
  anchorLocalDate: string,
  weekStartsOn: WeekStartsOn = defaultWeekStartsOn,
): AppResult<PeriodSummaryPeriod> {
  const anchor = asLocalDate(anchorLocalDate);

  if (isErr(anchor)) {
    return anchor;
  }

  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    return err(createAppError('validation_failed', 'Week start must be a day index from 0 to 6.', 'edit'));
  }

  const anchorUtc = parseLocalDateToUtc(anchor.value);
  const daysFromWeekStart = (anchorUtc.getUTCDay() - weekStartsOn + 7) % 7;
  const startDate = formatUtcDateAsLocalDate(
    new Date(anchorUtc.getTime() - daysFromWeekStart * 24 * 60 * 60 * 1000),
  );
  const endDateExclusive = addLocalDays(startDate, 7);

  if (isErr(endDateExclusive)) {
    return endDateExclusive;
  }

  return ok({
    anchorLocalDate: anchor.value,
    endDateExclusive: endDateExclusive.value,
    key: `week:${startDate}`,
    kind: 'week',
    label: `Week of ${startDate}`,
    startDate,
  });
}

export function resolveMonthlySummaryPeriod(anchorLocalDate: string): AppResult<PeriodSummaryPeriod> {
  const anchor = asLocalDate(anchorLocalDate);

  if (isErr(anchor)) {
    return anchor;
  }

  const [year, month] = anchor.value.split('-');
  const startDate = `${year}-${month}-01` as LocalDate;
  const endDateExclusive = formatUtcDateAsLocalDate(addUtcMonths(parseLocalDateToUtc(startDate), 1));

  return ok({
    anchorLocalDate: anchor.value,
    endDateExclusive,
    key: `month:${year}-${month}`,
    kind: 'month',
    label: `${year}-${month}`,
    startDate,
  });
}

export function calculatePeriodReviewSummary(input: PeriodSummaryInput): PeriodReviewSummary {
  const maxItems = normalizeMaxItems(input.maxItems);
  const planning = calculateMoneyPlanningPeriodSummary({
    budgetRules: input.budgetRules,
    period: input.budgetPeriod,
    records: input.budgetPeriodMoneyRecords,
    savingsGoals: input.savingsGoals,
  });
  const money = calculateMoney(input, maxItems);
  const work = calculateWork(input, maxItems);
  const tasks = calculateTasks(input);
  const reminders = calculateReminders(input);
  const partial: PeriodSummaryPartialStates = {
    budget: planning.budgetStatus === null,
    money: money.recordCount === 0,
    reminders:
      reminders.totalOccurrenceCount === 0 &&
      reminders.disabledOrUnavailableCount === 0 &&
      reminders.recoveryItemCount === 0,
    savings: planning.savingsProgress.length === 0,
    tasks: tasks.totalCount === 0 && tasks.recoveryItemCount === 0,
    work: work.entryCount === 0,
  };

  return {
    budget: {
      budgetStatus: planning.budgetStatus,
      expenseAmountMinor: planning.expenseAmountMinor,
      incomeAmountMinor: planning.incomeAmountMinor,
      period: planning.period,
    },
    cacheStatus: 'fresh_from_source',
    isEmpty: Object.values(partial).every(Boolean),
    money,
    partial,
    period: input.period,
    reminders,
    savings: planning.savingsProgress,
    tasks,
    work,
  };
}
