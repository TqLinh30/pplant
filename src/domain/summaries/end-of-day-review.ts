import { formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { MoneyRecord } from '@/domain/money/types';
import type { Reminder, ReminderOccurrence, ReminderScheduleState } from '@/domain/reminders/types';
import type {
  Task,
  TaskPriority,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrenceState,
} from '@/domain/tasks/types';
import type { WorkEntry } from '@/domain/work/types';
import type { RecoveryTargetKind } from '@/domain/recovery/types';

const defaultMaxItems = 8;
const maxAllowedItems = 16;

export type EndOfDayTaskRecurrenceOccurrenceInput = {
  kind: TaskRecurrenceKind;
  localDate: LocalDate;
  priority: TaskPriority;
  ruleId: EntityId;
  state: TaskRecurrenceOccurrenceState;
  title: string;
};

export type EndOfDayReminderInput = {
  occurrences: ReminderOccurrence[];
  reminder: Reminder;
};

export type EndOfDayRecoveryItemInput = {
  occurrenceLocalDate: LocalDate | null;
  reason: string;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
  title: string;
};

export type EndOfDayReviewInput = {
  localDate: LocalDate;
  maxItems?: number;
  moneyRecords: MoneyRecord[];
  recoveryItems: EndOfDayRecoveryItemInput[];
  reminders: EndOfDayReminderInput[];
  taskRecurrenceOccurrences: EndOfDayTaskRecurrenceOccurrenceInput[];
  tasks: Task[];
  workEntries: WorkEntry[];
};

export type EndOfDayMoneySummary = {
  expenseAmountMinor: number;
  expenseCount: number;
  incomeAmountMinor: number;
  incomeCount: number;
  netAmountMinor: number;
  records: MoneyRecord[];
  totalCount: number;
};

export type EndOfDayTaskItemStatus = 'completed_today' | 'due_today' | 'open' | 'overdue';

export type EndOfDayTaskItem = {
  completedAt: string | null;
  deadlineLocalDate: LocalDate | null;
  id: EntityId;
  priority: TaskPriority;
  state: Task['state'];
  status: EndOfDayTaskItemStatus;
  title: string;
};

export type EndOfDayTaskRecurrenceItem = {
  id: EntityId;
  kind: TaskRecurrenceKind;
  priority: TaskPriority;
  state: TaskRecurrenceOccurrenceState;
  title: string;
};

export type EndOfDayTaskSummary = {
  completedTodayCount: number;
  items: EndOfDayTaskItem[];
  openRelevantCount: number;
  overdueOpenCount: number;
  recurringCompletedTodayCount: number;
  recurringItems: EndOfDayTaskRecurrenceItem[];
  recurringOpenTodayCount: number;
  recurringSkippedTodayCount: number;
};

export type EndOfDayReminderItem = {
  id: EntityId;
  scheduleState: ReminderScheduleState;
  title: string;
  todayOccurrenceCount: number;
};

export type EndOfDayReminderSummary = {
  items: EndOfDayReminderItem[];
  needsReviewCount: number;
  recoveryItems: EndOfDayRecoveryItemInput[];
  todayOccurrenceCount: number;
  totalCount: number;
};

export type EndOfDayWorkSummary = {
  earnedIncomeMinor: number;
  entries: WorkEntry[];
  entryCount: number;
  totalDurationMinutes: number;
  unpaidEntryCount: number;
};

export type EndOfDayActivityItem = {
  amountMinor?: number;
  id: EntityId | string;
  kind: 'money' | 'reminder' | 'task' | 'task_recurrence' | 'work';
  occurredAt: string;
  title: string;
};

export type EndOfDayPartialStates = {
  money: boolean;
  reminders: boolean;
  tasks: boolean;
  work: boolean;
};

export type EndOfDayReviewSummary = {
  activity: EndOfDayActivityItem[];
  isEmpty: boolean;
  localDate: LocalDate;
  money: EndOfDayMoneySummary;
  partial: EndOfDayPartialStates;
  reminders: EndOfDayReminderSummary;
  tasks: EndOfDayTaskSummary;
  work: EndOfDayWorkSummary;
};

function normalizeMaxItems(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value)) {
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

function completedOnLocalDate(task: Task, localDate: LocalDate): boolean {
  return task.completedAt !== null && formatDateAsLocalDate(new Date(task.completedAt)) === localDate;
}

function taskItemStatus(task: Task, localDate: LocalDate): EndOfDayTaskItemStatus {
  if (completedOnLocalDate(task, localDate)) {
    return 'completed_today';
  }

  if (task.deadlineLocalDate && task.deadlineLocalDate < localDate) {
    return 'overdue';
  }

  if (task.deadlineLocalDate === localDate) {
    return 'due_today';
  }

  return 'open';
}

function taskIsRelevantToReview(task: Task, localDate: LocalDate): boolean {
  if (task.deletedAt !== null) {
    return false;
  }

  if (completedOnLocalDate(task, localDate)) {
    return true;
  }

  return task.state !== 'done';
}

function sortTaskItems(left: EndOfDayTaskItem, right: EndOfDayTaskItem): number {
  const statusRank: Record<EndOfDayTaskItemStatus, number> = {
    overdue: 0,
    due_today: 1,
    open: 2,
    completed_today: 3,
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

function needsReminderReview(reminder: Reminder): boolean {
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

function buildActivity(input: {
  localDate: LocalDate;
  maxItems: number;
  moneyRecords: MoneyRecord[];
  reminders: EndOfDayReminderInput[];
  taskItems: EndOfDayTaskItem[];
  taskRecurrenceItems: EndOfDayTaskRecurrenceItem[];
  workEntries: WorkEntry[];
}): EndOfDayActivityItem[] {
  const activity: EndOfDayActivityItem[] = [];

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

  for (const task of input.taskItems) {
    if (task.status === 'completed_today' && task.completedAt) {
      activity.push({
        id: task.id,
        kind: 'task',
        occurredAt: task.completedAt,
        title: task.title,
      });
    }
  }

  for (const occurrence of input.taskRecurrenceItems) {
    if (occurrence.state === 'completed') {
      activity.push({
        id: `${occurrence.id}:${input.localDate}`,
        kind: 'task_recurrence',
        occurredAt: input.localDate,
        title: occurrence.title,
      });
    }
  }

  for (const reminder of input.reminders) {
    for (const occurrence of reminder.occurrences) {
      if (occurrence.localDate !== input.localDate || occurrence.state !== 'open') {
        continue;
      }

      activity.push({
        id: `${reminder.reminder.id}:${occurrence.fireAtLocal}`,
        kind: 'reminder',
        occurredAt: occurrence.fireAtLocal,
        title: reminder.reminder.title,
      });
    }
  }

  const kindRank: Record<EndOfDayActivityItem['kind'], number> = {
    money: 0,
    work: 1,
    task: 2,
    task_recurrence: 3,
    reminder: 4,
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

export function calculateEndOfDayReviewSummary(input: EndOfDayReviewInput): EndOfDayReviewSummary {
  const maxItems = normalizeMaxItems(input.maxItems);
  const moneyRecords = input.moneyRecords.filter((record) =>
    isActiveMoneyRecordForDate(record, input.localDate),
  );
  const workEntries = input.workEntries.filter((entry) => isActiveWorkEntryForDate(entry, input.localDate));
  const taskItems = input.tasks
    .filter((task) => taskIsRelevantToReview(task, input.localDate))
    .map<EndOfDayTaskItem>((task) => ({
      completedAt: task.completedAt,
      deadlineLocalDate: task.deadlineLocalDate,
      id: task.id,
      priority: task.priority,
      state: task.state,
      status: taskItemStatus(task, input.localDate),
      title: task.title,
    }))
    .sort(sortTaskItems);
  const taskRecurrenceItems = input.taskRecurrenceOccurrences
    .filter((occurrence) => occurrence.localDate === input.localDate)
    .map<EndOfDayTaskRecurrenceItem>((occurrence) => ({
      id: occurrence.ruleId,
      kind: occurrence.kind,
      priority: occurrence.priority,
      state: occurrence.state,
      title: occurrence.title,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
  const reminderItems = input.reminders
    .filter(({ reminder }) => reminder.deletedAt === null)
    .map<EndOfDayReminderItem>(({ occurrences, reminder }) => ({
      id: reminder.id,
      scheduleState: reminder.scheduleState,
      title: reminder.title,
      todayOccurrenceCount: occurrences.filter(
        (occurrence) => occurrence.localDate === input.localDate && occurrence.state === 'open',
      ).length,
    }))
    .filter((item) => item.todayOccurrenceCount > 0 || item.scheduleState !== 'scheduled')
    .sort((left, right) => {
      const count = right.todayOccurrenceCount - left.todayOccurrenceCount;

      return count !== 0 ? count : left.title.localeCompare(right.title);
    });
  const money = moneyRecords.reduce(
    (summary, record) => {
      if (record.kind === 'expense') {
        summary.expenseAmountMinor += record.amountMinor;
        summary.expenseCount += 1;
      } else {
        summary.incomeAmountMinor += record.amountMinor;
        summary.incomeCount += 1;
      }

      summary.netAmountMinor = summary.incomeAmountMinor - summary.expenseAmountMinor;
      summary.totalCount += 1;

      return summary;
    },
    {
      expenseAmountMinor: 0,
      expenseCount: 0,
      incomeAmountMinor: 0,
      incomeCount: 0,
      netAmountMinor: 0,
      records: moneyRecords.slice(0, maxItems),
      totalCount: 0,
    } satisfies EndOfDayMoneySummary,
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
    } satisfies EndOfDayWorkSummary,
  );
  const recoveryItems = input.recoveryItems.slice(0, maxItems);
  const todayOccurrenceCount = reminderItems.reduce((total, item) => total + item.todayOccurrenceCount, 0);
  const recurringCompletedTodayCount = taskRecurrenceItems.filter((item) => item.state === 'completed').length;
  const recurringOpenTodayCount = taskRecurrenceItems.filter((item) => item.state === 'open').length;
  const recurringSkippedTodayCount = taskRecurrenceItems.filter((item) => item.state === 'skipped').length;
  const completedTodayCount = taskItems.filter((item) => item.status === 'completed_today').length;
  const openRelevantCount = taskItems.filter((item) => item.status !== 'completed_today').length;
  const overdueOpenCount = taskItems.filter((item) => item.status === 'overdue').length;

  return {
    activity: buildActivity({
      localDate: input.localDate,
      maxItems,
      moneyRecords,
      reminders: input.reminders,
      taskItems,
      taskRecurrenceItems,
      workEntries,
    }),
    isEmpty:
      money.totalCount === 0 &&
      taskItems.length === 0 &&
      taskRecurrenceItems.length === 0 &&
      reminderItems.length === 0 &&
      recoveryItems.length === 0 &&
      work.entryCount === 0,
    localDate: input.localDate,
    money,
    partial: {
      money: money.totalCount === 0,
      reminders: reminderItems.length === 0 && recoveryItems.length === 0,
      tasks: taskItems.length === 0 && taskRecurrenceItems.length === 0,
      work: work.entryCount === 0,
    },
    reminders: {
      items: reminderItems.slice(0, maxItems),
      needsReviewCount: input.reminders.filter(({ reminder }) => needsReminderReview(reminder)).length + input.recoveryItems.length,
      recoveryItems,
      todayOccurrenceCount,
      totalCount: reminderItems.length,
    },
    tasks: {
      completedTodayCount,
      items: taskItems.slice(0, maxItems),
      openRelevantCount,
      overdueOpenCount,
      recurringCompletedTodayCount,
      recurringItems: taskRecurrenceItems.slice(0, maxItems),
      recurringOpenTodayCount,
      recurringSkippedTodayCount,
    },
    work,
  };
}
