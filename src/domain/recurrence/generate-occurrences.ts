import {
  addLocalDays,
  addLocalMonthsClamped,
  asLocalDate,
  type LocalDate,
} from '@/domain/common/date-rules';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

import { asRecurrenceFrequency } from './schemas';
import type { RecurrenceFrequency } from './types';

export type GenerateRecurrenceOccurrencesInput = {
  endsOnLocalDate?: string | null;
  frequency: RecurrenceFrequency;
  fromLocalDate?: string | null;
  maxCount: number;
  skippedLocalDates?: string[];
  startsOnLocalDate: string;
  stoppedOnLocalDate?: string | null;
  throughLocalDate: string;
};

function minLocalDate(left: LocalDate | null, right: LocalDate | null): LocalDate | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left <= right ? left : right;
}

function nextOccurrenceDate(
  frequency: RecurrenceFrequency,
  startsOnLocalDate: LocalDate,
  occurrenceIndex: number,
): AppResult<LocalDate> {
  if (frequency === 'daily') {
    return addLocalDays(startsOnLocalDate, occurrenceIndex);
  }

  if (frequency === 'weekly') {
    return addLocalDays(startsOnLocalDate, occurrenceIndex * 7);
  }

  const anchorDay = Number(startsOnLocalDate.slice(-2));

  return addLocalMonthsClamped(startsOnLocalDate, occurrenceIndex, anchorDay);
}

function validateOptionalDate(value: string | null | undefined): AppResult<LocalDate | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

export function generateRecurrenceOccurrences(
  input: GenerateRecurrenceOccurrencesInput,
): AppResult<LocalDate[]> {
  const frequency = asRecurrenceFrequency(input.frequency);
  const startsOnLocalDate = asLocalDate(input.startsOnLocalDate);
  const throughLocalDate = asLocalDate(input.throughLocalDate);
  const fromLocalDate = validateOptionalDate(input.fromLocalDate);
  const endsOnLocalDate = validateOptionalDate(input.endsOnLocalDate);
  const stoppedOnLocalDate = validateOptionalDate(input.stoppedOnLocalDate);

  if (!frequency.ok) {
    return frequency;
  }

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!throughLocalDate.ok) {
    return throughLocalDate;
  }

  if (!fromLocalDate.ok) {
    return fromLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (!stoppedOnLocalDate.ok) {
    return stoppedOnLocalDate;
  }

  if (!Number.isInteger(input.maxCount) || input.maxCount < 1 || input.maxCount > 500) {
    return err(createAppError('validation_failed', 'Recurrence preview count must be between 1 and 500.', 'edit'));
  }

  const upperBound = minLocalDate(
    minLocalDate(throughLocalDate.value, endsOnLocalDate.value),
    stoppedOnLocalDate.value,
  );
  const lowerBound = fromLocalDate.value ?? startsOnLocalDate.value;

  if (!upperBound || upperBound < startsOnLocalDate.value || upperBound < lowerBound) {
    return ok([]);
  }

  const skippedDates = new Set<string>();

  for (const skippedLocalDate of input.skippedLocalDates ?? []) {
    const parsed = asLocalDate(skippedLocalDate);

    if (!parsed.ok) {
      return parsed;
    }

    skippedDates.add(parsed.value);
  }

  const occurrences: LocalDate[] = [];
  let index = 0;
  let safety = 0;

  while (occurrences.length < input.maxCount && safety < 5000) {
    const occurrence = nextOccurrenceDate(frequency.value, startsOnLocalDate.value, index);

    if (!occurrence.ok) {
      return occurrence;
    }

    if (occurrence.value > upperBound) {
      return ok(occurrences);
    }

    if (occurrence.value >= lowerBound && !skippedDates.has(occurrence.value)) {
      occurrences.push(occurrence.value);
    }

    index += 1;
    safety += 1;
  }

  return ok(occurrences);
}

export function generateOccurrencePreview(startsOnLocalDate: string): string[] {
  const occurrences = generateRecurrenceOccurrences({
    frequency: 'daily',
    maxCount: 1,
    startsOnLocalDate,
    throughLocalDate: startsOnLocalDate,
  });

  return occurrences.ok ? occurrences.value : [];
}
