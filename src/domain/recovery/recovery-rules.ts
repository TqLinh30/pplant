import { addLocalDays, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { isErr, type AppResult, ok } from '@/domain/common/result';
import type { Reminder, ReminderScheduledNotification } from '@/domain/reminders/types';
import { buildTaskRecurrenceOccurrences } from '@/domain/tasks/task-recurrence';
import type {
  Task,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceOccurrence,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';

export const defaultRecoveryLookbackDays = 14;

export type ReminderRecoveryScheduleState = Extract<
  Reminder['scheduleState'],
  'disabled' | 'failed' | 'local_only' | 'permission_denied' | 'unavailable'
>;

export function isMissedDailyTask(task: Task, todayLocalDate: LocalDate): boolean {
  return task.deletedAt === null && task.state !== 'done' && task.deadlineLocalDate !== null && task.deadlineLocalDate < todayLocalDate;
}

export function isReminderRecoveryScheduleState(
  reminder: Reminder,
): reminder is Reminder & { scheduleState: ReminderRecoveryScheduleState } {
  return (
    reminder.deletedAt === null &&
    (reminder.scheduleState === 'disabled' ||
      reminder.scheduleState === 'failed' ||
      reminder.scheduleState === 'local_only' ||
      reminder.scheduleState === 'permission_denied' ||
      reminder.scheduleState === 'unavailable')
  );
}

export function isMissedReminderNotification(
  notification: ReminderScheduledNotification,
  nowFireAtLocal: string,
): boolean {
  return (
    notification.deletedAt === null &&
    (notification.deliveryState === 'scheduled' || notification.deliveryState === 'snoozed') &&
    notification.fireAtLocal < nowFireAtLocal
  );
}

export function isReminderNotificationRecoveryState(notification: ReminderScheduledNotification): boolean {
  return notification.deletedAt === null && notification.deliveryState === 'missed';
}

export function buildMissedTaskRecurrenceOccurrences(input: {
  completions: TaskRecurrenceCompletion[];
  exceptions: TaskRecurrenceException[];
  lookbackDays?: number;
  now: Date;
  rule: TaskRecurrenceRule;
}): AppResult<TaskRecurrenceOccurrence[]> {
  const today = formatDateAsLocalDate(input.now);
  const lookbackDays = input.lookbackDays ?? defaultRecoveryLookbackDays;
  const fromLocalDate = addLocalDays(today, -lookbackDays);
  const throughLocalDate = addLocalDays(today, -1);

  if (isErr(fromLocalDate)) {
    return fromLocalDate;
  }

  if (isErr(throughLocalDate)) {
    return throughLocalDate;
  }

  const occurrences = buildTaskRecurrenceOccurrences({
    completions: input.completions,
    exceptions: input.exceptions,
    fromLocalDate: fromLocalDate.value,
    maxCount: lookbackDays + 1,
    rule: input.rule,
    throughLocalDate: throughLocalDate.value,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  return ok(occurrences.value.filter((occurrence) => occurrence.state === 'open' && occurrence.localDate < today));
}
