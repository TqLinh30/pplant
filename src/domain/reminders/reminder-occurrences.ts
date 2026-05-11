import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import { generateRecurrenceOccurrences } from '@/domain/recurrence/generate-occurrences';

import { combineReminderFireAtLocal } from './schemas';
import type { Reminder, ReminderException, ReminderOccurrence } from './types';

export type BuildReminderOccurrencesInput = {
  exceptions: ReminderException[];
  fromLocalDate?: string | null;
  maxCount: number;
  reminder: Reminder;
  throughLocalDate: string;
};

function shouldIncludeOnce(
  startsOnLocalDate: LocalDate,
  lowerBound: LocalDate,
  upperBound: LocalDate,
): boolean {
  return startsOnLocalDate >= lowerBound && startsOnLocalDate <= upperBound;
}

export function buildReminderOccurrences(
  input: BuildReminderOccurrencesInput,
): AppResult<ReminderOccurrence[]> {
  if (input.reminder.deletedAt !== null) {
    return ok([]);
  }

  if (!Number.isInteger(input.maxCount) || input.maxCount < 1 || input.maxCount > 500) {
    return err(createAppError('validation_failed', 'Reminder occurrence count must be between 1 and 500.', 'edit'));
  }

  const throughLocalDate = asLocalDate(input.throughLocalDate);
  const fromLocalDate = input.fromLocalDate ? asLocalDate(input.fromLocalDate) : ok(null);

  if (!throughLocalDate.ok) {
    return throughLocalDate;
  }

  if (!fromLocalDate.ok) {
    return fromLocalDate;
  }

  const skippedDates = new Set<string>();

  for (const exception of input.exceptions) {
    if (exception.action === 'skip') {
      skippedDates.add(exception.occurrenceLocalDate);
    }
  }

  const lowerBound = fromLocalDate.value ?? input.reminder.startsOnLocalDate;
  const dates =
    input.reminder.frequency === 'once'
      ? shouldIncludeOnce(input.reminder.startsOnLocalDate, lowerBound, throughLocalDate.value)
        ? ok([input.reminder.startsOnLocalDate])
        : ok([])
      : generateRecurrenceOccurrences({
          endsOnLocalDate: input.reminder.endsOnLocalDate,
          frequency: input.reminder.frequency,
          fromLocalDate: input.fromLocalDate,
          maxCount: input.maxCount,
          startsOnLocalDate: input.reminder.startsOnLocalDate,
          throughLocalDate: throughLocalDate.value,
        });

  if (!dates.ok) {
    return dates;
  }

  const occurrences: ReminderOccurrence[] = [];

  for (const localDate of dates.value.slice(0, input.maxCount)) {
    const fireAtLocal = combineReminderFireAtLocal(localDate, input.reminder.reminderLocalTime);

    if (!fireAtLocal.ok) {
      return fireAtLocal;
    }

    occurrences.push({
      fireAtLocal: fireAtLocal.value,
      localDate,
      reminderId: input.reminder.id,
      state: skippedDates.has(localDate) ? 'skipped' : 'open',
    });
  }

  return ok(occurrences);
}

export function parseReminderFireAtLocalToDate(fireAtLocal: string): AppResult<Date> {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(fireAtLocal);

  if (!match) {
    return err(createAppError('validation_failed', 'Reminder fire time must use YYYY-MM-DDTHH:mm format.', 'edit'));
  }

  const [, year, month, day, hour, minute] = match;

  return ok(new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0));
}
