import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';

import { asLocalTime, validateWorkEntryBreakMinutes, validateWorkEntryDurationMinutes, validateWorkEntryWageMinor } from './schemas';
import type { LocalTime } from './types';

export type ShiftDurationInput = {
  breakMinutes: number;
  endedAtLocalDate: string;
  endedAtLocalTime: string;
  startedAtLocalDate: string;
  startedAtLocalTime: string;
};

export type EarnedIncomeInput = {
  durationMinutes: number;
  paid: boolean;
  wageMinorPerHour: number;
};

function localDateDayIndex(localDate: LocalDate): number {
  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7)) - 1;
  const day = Number(localDate.slice(8, 10));

  return Math.floor(Date.UTC(year, month, day) / 86_400_000);
}

function localTimeMinutes(localTime: LocalTime): number {
  const [hours, minutes] = localTime.split(':').map(Number);

  return hours * 60 + minutes;
}

function localDateTimeMinuteIndex(localDate: LocalDate, localTime: LocalTime): number {
  return localDateDayIndex(localDate) * 24 * 60 + localTimeMinutes(localTime);
}

export function calculateShiftDurationMinutes(input: ShiftDurationInput): AppResult<number> {
  const startedAtLocalDate = asLocalDate(input.startedAtLocalDate);
  const startedAtLocalTime = asLocalTime(input.startedAtLocalTime);
  const endedAtLocalDate = asLocalDate(input.endedAtLocalDate);
  const endedAtLocalTime = asLocalTime(input.endedAtLocalTime);
  const breakMinutes = validateWorkEntryBreakMinutes(input.breakMinutes);

  if (isErr(startedAtLocalDate)) {
    return startedAtLocalDate;
  }

  if (isErr(startedAtLocalTime)) {
    return startedAtLocalTime;
  }

  if (isErr(endedAtLocalDate)) {
    return endedAtLocalDate;
  }

  if (isErr(endedAtLocalTime)) {
    return endedAtLocalTime;
  }

  if (isErr(breakMinutes)) {
    return breakMinutes;
  }

  const startedMinute = localDateTimeMinuteIndex(startedAtLocalDate.value, startedAtLocalTime.value);
  const endedMinute = localDateTimeMinuteIndex(endedAtLocalDate.value, endedAtLocalTime.value);
  const grossMinutes = endedMinute - startedMinute;

  if (grossMinutes <= 0) {
    return err(createAppError('validation_failed', 'Shift end must be after shift start.', 'edit'));
  }

  if (breakMinutes.value >= grossMinutes) {
    return err(createAppError('validation_failed', 'Break must be shorter than the shift.', 'edit'));
  }

  return validateWorkEntryDurationMinutes(grossMinutes - breakMinutes.value);
}

export function calculateEarnedIncomeMinor(input: EarnedIncomeInput): AppResult<number> {
  const durationMinutes = validateWorkEntryDurationMinutes(input.durationMinutes);
  const wageMinorPerHour = validateWorkEntryWageMinor(input.wageMinorPerHour);

  if (isErr(durationMinutes)) {
    return durationMinutes;
  }

  if (isErr(wageMinorPerHour)) {
    return wageMinorPerHour;
  }

  if (!input.paid) {
    return ok(0);
  }

  return ok(Math.round((durationMinutes.value * wageMinorPerHour.value) / 60));
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}
