import { formatDateAsLocalDate, type BudgetPeriod, type LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import {
  calculateMoneyPlanningPeriodSummary,
  type SavingsGoalProgressSummary,
} from '@/domain/money/calculations';
import type { BudgetRules, BudgetStatus, SavingsGoal } from '@/domain/budgets/types';
import type { MoneyRecord } from '@/domain/money/types';
import type { RecoveryTargetKind } from '@/domain/recovery/types';
import type {
  Reminder,
  ReminderOccurrence,
  ReminderScheduleState,
} from '@/domain/reminders/types';
import { calculateTaskStateSummary, type TaskStateSummary } from '@/domain/tasks/task-summary';
import type {
  Task,
  TaskPriority,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrenceState,
} from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';

const defaultMaxItems = 5;
const maxAllowedItems = 12;

export type TodayTaskRecurrenceOccurrenceInput = {
  kind: TaskRecurrenceKind;
  localDate: LocalDate;
  priority: TaskPriority;
  ruleId: EntityId;
  state: TaskRecurrenceOccurrenceState;
  title: string;
};

export type TodayReminderInput = {
  occurrences: ReminderOccurrence[];
  reminder: Reminder;
};

export type TodayRecoveryItemInput = {
  reason: string;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
  title: string;
};

export type TodaySummaryInput = {
  budgetPeriod: BudgetPeriod;
  budgetPeriodMoneyRecords: MoneyRecord[];
  budgetRules: BudgetRules | null;
  localDate: LocalDate;
  maxItems?: number;
  recoveryItems: TodayRecoveryItemInput[];
  reminders: TodayReminderInput[];
  savingsGoals: SavingsGoal[];
  taskRecurrenceOccurrences: TodayTaskRecurrenceOccurrenceInput[];
  tasks: Task[];
  todayMoneyRecords: MoneyRecord[];
  workEntries: WorkEntry[];
};

export type TodayMoneySummary = {
  expenseAmountMinor: number;
  incomeAmountMinor: number;
  netAmountMinor: number;
  recordCount: number;
  records: MoneyRecord[];
};

export type TodayBudgetSummary = {
  budgetStatus: BudgetStatus | null;
  expenseAmountMinor: number;
  incomeAmountMinor: number;
  period: BudgetPeriod;
};

export type TodayTaskItemStatus = 'due_today' | 'open' | 'overdue';

export type TodayTaskItem = {
  deadlineLocalDate: LocalDate | null;
  id: EntityId | string;
  priority: TaskPriority;
  status: TodayTaskItemStatus;
  title: string;
};

export type TodayTaskSummary = {
  items: TodayTaskItem[];
  recurringCompletedTodayCount: number;
  recurringOpenTodayCount: number;
  recurringSkippedTodayCount: number;
  summary: TaskStateSummary;
};

export type TodayReminderItem = {
  id: EntityId;
  scheduleState: ReminderScheduleState;
  title: string;
  todayOccurrenceCount: number;
};

export type TodayReminderSummary = {
  items: TodayReminderItem[];
  needsAttentionCount: number;
  recoveryItemCount: number;
  todayOccurrenceCount: number;
  totalCount: number;
};

export type TodayRecoverySummary = {
  itemCount: number;
  items: TodayRecoveryItemInput[];
};

export type TodayWorkSummary = {
  earnedIncomeMinor: number;
  entryCount: number;
  entries: WorkEntry[];
  totalDurationMinutes: number;
  unpaidEntryCount: number;
};

export type TodayRecentActivityItem = {
  amountMinor?: number;
  id: EntityId | string;
  kind: 'money' | 'task' | 'work';
  occurredAt: string;
  title: string;
};

export type TodayOverviewSummary = {
  budget: TodayBudgetSummary;
  budgetPeriod: BudgetPeriod;
  isEmpty: boolean;
  localDate: LocalDate;
  money: TodayMoneySummary;
  recentActivity: TodayRecentActivityItem[];
  recovery: TodayRecoverySummary;
  reminders: TodayReminderSummary;
  savings: SavingsGoalProgressSummary[];
  tasks: TodayTaskSummary;
  work: TodayWorkSummary;
};

function normalizeMaxItems(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined) {
    return defaultMaxItems;
  }

  return Math.min(Math.max(value, 1), maxAllowedItems);
}

function isActiveMoneyRecordForDate(record: MoneyRecord, localDate: LocalDate): boolean {
  return record.deletedAt === null && record.localDate === localDate;
}

function isActiveWorkEntryForDate(entry: WorkEntry, localDate: LocalDate): boolean {
  return entry.deletedAt === null && entry.localDate === localDate;
}

function taskItemStatus(task: Task, localDate: LocalDate): TodayTaskItemStatus {
  if (task.deadlineLocalDate && task.deadlineLocalDate < localDate) {
    return 'overdue';
  }

  if (task.deadlineLocalDate === localDate) {
    return 'due_today';
  }

  return 'open';
}

function sortTaskItems(left: TodayTaskItem, right: TodayTaskItem): number {
  const statusRank: Record<TodayTaskItemStatus, number> = {
    overdue: 0,
    due_today: 1,
    open: 2,
  };
  const priorityRank: Record<TaskPriority, number> = {
    high: 0,
    low: 1,
  };
  const status = statusRank[left.status] - statusRank[right.status];

  if (status !== 0) {
    return status;
  }

  const priority = priorityRank[left.priority] - priorityRank[right.priority];

  if (priority !== 0) {
    return priority;
  }

  return left.title.localeCompare(right.title);
}

function needsReminderAttention(reminder: Reminder): boolean {
  return (
    reminder.deletedAt === null &&
    (reminder.scheduleState === 'disabled' ||
      reminder.scheduleState === 'failed' ||
      reminder.scheduleState === 'local_only' ||
      reminder.scheduleState === 'permission_denied' ||
      reminder.scheduleState === 'snoozed' ||
      reminder.scheduleState === 'unavailable')
  );
}

function buildRecentActivity(input: {
  localDate: LocalDate;
  maxItems: number;
  moneyRecords: MoneyRecord[];
  tasks: Task[];
  workEntries: WorkEntry[];
}): TodayRecentActivityItem[] {
  const activity: TodayRecentActivityItem[] = [];

  for (const record of input.moneyRecords) {
    activity.push({
      amountMinor: record.amountMinor,
      id: record.id,
      kind: 'money',
      occurredAt: record.createdAt,
      title: record.merchantOrSource ?? (record.kind === 'expense' ? 'Expense' : 'Income'),
    });
  }

  for (const entry of input.workEntries) {
    activity.push({
      amountMinor: entry.earnedIncomeMinor,
      id: entry.id,
      kind: 'work',
      occurredAt: entry.createdAt,
      title: entry.note ?? 'Work entry',
    });
  }

  for (const task of input.tasks) {
    if (
      task.deletedAt === null &&
      task.state === 'done' &&
      task.completedAt &&
      formatDateAsLocalDate(new Date(task.completedAt)) === input.localDate
    ) {
      activity.push({
        id: task.id,
        kind: 'task',
        occurredAt: task.completedAt,
        title: task.title,
      });
    }
  }

  const kindRank: Record<TodayRecentActivityItem['kind'], number> = {
    money: 0,
    work: 1,
    task: 2,
  };

  return activity
    .sort((left, right) => {
      const time = right.occurredAt.localeCompare(left.occurredAt);

      if (time !== 0) {
        return time;
      }

      return kindRank[left.kind] - kindRank[right.kind];
    })
    .slice(0, input.maxItems);
}

export function calculateTodayOverviewSummary(input: TodaySummaryInput): TodayOverviewSummary {
  const maxItems = normalizeMaxItems(input.maxItems);
  const planning = calculateMoneyPlanningPeriodSummary({
    budgetRules: input.budgetRules,
    period: input.budgetPeriod,
    records: input.budgetPeriodMoneyRecords,
    savingsGoals: input.savingsGoals,
  });
  const moneyRecords = input.todayMoneyRecords.filter((record) =>
    isActiveMoneyRecordForDate(record, input.localDate),
  );
  const workEntries = input.workEntries.filter((entry) => isActiveWorkEntryForDate(entry, input.localDate));
  const activeTasks = input.tasks.filter((task) => task.deletedAt === null);
  const openTaskItems = activeTasks
    .filter((task) => task.state !== 'done')
    .map<TodayTaskItem>((task) => ({
      deadlineLocalDate: task.deadlineLocalDate,
      id: task.id,
      priority: task.priority,
      status: taskItemStatus(task, input.localDate),
      title: task.title,
    }))
    .sort(sortTaskItems)
    .slice(0, maxItems);
  const todayRecurringOccurrences = input.taskRecurrenceOccurrences.filter(
    (occurrence) => occurrence.localDate === input.localDate,
  );
  const reminderItems = input.reminders
    .filter(({ reminder }) => reminder.deletedAt === null)
    .map<TodayReminderItem>(({ occurrences, reminder }) => ({
      id: reminder.id,
      scheduleState: reminder.scheduleState,
      title: reminder.title,
      todayOccurrenceCount: occurrences.filter(
        (occurrence) => occurrence.localDate === input.localDate && occurrence.state === 'open',
      ).length,
    }))
    .sort((left, right) => {
      const count = right.todayOccurrenceCount - left.todayOccurrenceCount;

      return count !== 0 ? count : left.title.localeCompare(right.title);
    });
  const todayOccurrenceCount = reminderItems.reduce((total, item) => total + item.todayOccurrenceCount, 0);
  const money = moneyRecords.reduce(
    (summary, record) => {
      if (record.kind === 'expense') {
        summary.expenseAmountMinor += record.amountMinor;
      } else {
        summary.incomeAmountMinor += record.amountMinor;
      }

      summary.recordCount += 1;
      summary.netAmountMinor = summary.incomeAmountMinor - summary.expenseAmountMinor;

      return summary;
    },
    {
      expenseAmountMinor: 0,
      incomeAmountMinor: 0,
      netAmountMinor: 0,
      recordCount: 0,
      records: moneyRecords.slice(0, maxItems),
    } satisfies TodayMoneySummary,
  );
  const work = workEntries.reduce(
    (summary, entry) => {
      summary.earnedIncomeMinor += entry.earnedIncomeMinor;
      summary.entryCount += 1;
      summary.totalDurationMinutes += entry.durationMinutes;

      if (!entry.paid) {
        summary.unpaidEntryCount += 1;
      }

      return summary;
    },
    {
      earnedIncomeMinor: 0,
      entries: workEntries.slice(0, maxItems),
      entryCount: 0,
      totalDurationMinutes: 0,
      unpaidEntryCount: 0,
    } satisfies TodayWorkSummary,
  );
  const recurringOpenTodayCount = todayRecurringOccurrences.filter((occurrence) => occurrence.state === 'open').length;
  const recurringCompletedTodayCount = todayRecurringOccurrences.filter(
    (occurrence) => occurrence.state === 'completed',
  ).length;
  const recurringSkippedTodayCount = todayRecurringOccurrences.filter((occurrence) => occurrence.state === 'skipped')
    .length;
  const activeRecoveryItems = input.recoveryItems.slice(0, maxItems);

  return {
    budget: {
      budgetStatus: planning.budgetStatus,
      expenseAmountMinor: planning.expenseAmountMinor,
      incomeAmountMinor: planning.incomeAmountMinor,
      period: planning.period,
    },
    budgetPeriod: input.budgetPeriod,
    isEmpty:
      money.recordCount === 0 &&
      activeTasks.length === 0 &&
      todayRecurringOccurrences.length === 0 &&
      reminderItems.length === 0 &&
      input.recoveryItems.length === 0 &&
      work.entryCount === 0 &&
      planning.savingsProgress.length === 0 &&
      planning.budgetStatus === null,
    localDate: input.localDate,
    money,
    recentActivity: buildRecentActivity({
      localDate: input.localDate,
      maxItems,
      moneyRecords,
      tasks: activeTasks,
      workEntries,
    }),
    recovery: {
      itemCount: input.recoveryItems.length,
      items: activeRecoveryItems,
    },
    reminders: {
      items: reminderItems.slice(0, maxItems),
      needsAttentionCount:
        input.reminders.filter(({ reminder }) => needsReminderAttention(reminder)).length + input.recoveryItems.length,
      recoveryItemCount: input.recoveryItems.length,
      todayOccurrenceCount,
      totalCount: reminderItems.length,
    },
    savings: planning.savingsProgress,
    tasks: {
      items: openTaskItems,
      recurringCompletedTodayCount,
      recurringOpenTodayCount,
      recurringSkippedTodayCount,
      summary: calculateTaskStateSummary(input.tasks, input.localDate),
    },
    work,
  };
}
