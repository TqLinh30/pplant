import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { err, ok, type AppResult } from '@/domain/common/result';
import { generateRecurrenceOccurrences } from '@/domain/recurrence/generate-occurrences';

import type {
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrence,
  TaskRecurrenceRule,
} from './types';

export type BuildTaskRecurrenceOccurrencesInput = {
  completions: TaskRecurrenceCompletion[];
  exceptions: TaskRecurrenceException[];
  fromLocalDate?: string | null;
  maxCount: number;
  rule: TaskRecurrenceRule;
  throughLocalDate: string;
};

export function asTaskRecurrenceKind(value: string): AppResult<TaskRecurrenceKind> {
  if (value === 'task' || value === 'habit') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose task or habit.', 'edit'));
}

export function asOptionalTaskRecurrenceLocalDate(value: string | null | undefined): AppResult<LocalDate | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

export function buildTaskRecurrenceOccurrences(
  input: BuildTaskRecurrenceOccurrencesInput,
): AppResult<TaskRecurrenceOccurrence[]> {
  if (input.rule.deletedAt !== null || input.rule.pausedAt !== null) {
    return ok([]);
  }

  const skippedDates = new Set<string>();

  for (const exception of input.exceptions) {
    if (exception.action === 'skip') {
      skippedDates.add(exception.occurrenceLocalDate);
    }
  }

  const activeCompletions = new Map<string, TaskRecurrenceCompletion>();

  for (const completion of input.completions) {
    if (completion.deletedAt === null) {
      activeCompletions.set(completion.occurrenceLocalDate, completion);
    }
  }

  const dates = generateRecurrenceOccurrences({
    endsOnLocalDate: input.rule.endsOnLocalDate,
    frequency: input.rule.frequency,
    fromLocalDate: input.fromLocalDate,
    maxCount: input.maxCount,
    startsOnLocalDate: input.rule.startsOnLocalDate,
    stoppedOnLocalDate: input.rule.stoppedOnLocalDate,
    throughLocalDate: input.throughLocalDate,
  });

  if (!dates.ok) {
    return dates;
  }

  return ok(
    dates.value.map((localDate) => {
      const skipped = skippedDates.has(localDate);
      const completion = activeCompletions.get(localDate) ?? null;

      return {
        completedAt: skipped ? null : completion?.completedAt ?? null,
        localDate,
        ruleId: input.rule.id,
        state: skipped ? 'skipped' : completion ? 'completed' : 'open',
      };
    }),
  );
}
