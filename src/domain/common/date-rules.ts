import { createAppError } from './app-error';
import { err, ok, type AppResult } from './result';

export type LocalDate = string & { readonly __brand: 'LocalDate' };

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type BudgetPeriod = {
  startDate: LocalDate;
  endDateExclusive: LocalDate;
};

export const defaultWeekStartsOn: WeekStartsOn = 1;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const daysByMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysByMonth[month - 1] ?? 0;
}

function parseLocalDateParts(value: string): AppResult<{ day: number; month: number; year: number }> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return err(createAppError('validation_failed', 'Local dates must use YYYY-MM-DD format.', 'edit'));
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return err(createAppError('validation_failed', 'Local date is not a real calendar day.', 'edit'));
  }

  return ok({ day, month, year });
}

function formatLocalDate(year: number, month: number, day: number): LocalDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as LocalDate;
}

function addMonths(year: number, month: number, offset: number): { month: number; year: number } {
  const monthIndex = year * 12 + (month - 1) + offset;

  return {
    year: Math.floor(monthIndex / 12),
    month: (monthIndex % 12) + 1,
  };
}

function clampedResetDate(year: number, month: number, resetDay: number): LocalDate {
  return formatLocalDate(year, month, Math.min(resetDay, daysInMonth(year, month)));
}

export function asLocalDate(value: string): AppResult<LocalDate> {
  const parsed = parseLocalDateParts(value);

  if (!parsed.ok) {
    return parsed;
  }

  return ok(value as LocalDate);
}

export function formatDateAsLocalDate(date: Date): LocalDate {
  return formatLocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function addLocalDays(localDate: string, days: number): AppResult<LocalDate> {
  const parsed = parseLocalDateParts(localDate);

  if (!parsed.ok) {
    return parsed;
  }

  if (!Number.isInteger(days)) {
    return err(createAppError('validation_failed', 'Day offset must be an integer.', 'edit'));
  }

  const date = new Date(Date.UTC(parsed.value.year, parsed.value.month - 1, parsed.value.day));
  date.setUTCDate(date.getUTCDate() + days);

  return ok(formatLocalDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
}

export function addLocalMonthsClamped(
  localDate: string,
  months: number,
  anchorDay?: number,
): AppResult<LocalDate> {
  const parsed = parseLocalDateParts(localDate);

  if (!parsed.ok) {
    return parsed;
  }

  if (!Number.isInteger(months)) {
    return err(createAppError('validation_failed', 'Month offset must be an integer.', 'edit'));
  }

  const target = addMonths(parsed.value.year, parsed.value.month, months);
  const day = anchorDay ?? parsed.value.day;

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return err(createAppError('validation_failed', 'Month anchor day must be between 1 and 31.', 'edit'));
  }

  return ok(formatLocalDate(target.year, target.month, Math.min(day, daysInMonth(target.year, target.month))));
}

export function resolveBudgetPeriodForDate(localDate: string, resetDay: number): AppResult<BudgetPeriod> {
  const dateResult = parseLocalDateParts(localDate);

  if (!dateResult.ok) {
    return dateResult;
  }

  if (!Number.isInteger(resetDay) || resetDay < 1 || resetDay > 31) {
    return err(createAppError('validation_failed', 'Monthly budget reset day must be between 1 and 31.', 'edit'));
  }

  const { day, month, year } = dateResult.value;
  const resetDayThisMonth = Math.min(resetDay, daysInMonth(year, month));
  const startMonth = day >= resetDayThisMonth ? { month, year } : addMonths(year, month, -1);
  const endMonth = addMonths(startMonth.year, startMonth.month, 1);

  return ok({
    startDate: clampedResetDate(startMonth.year, startMonth.month, resetDay),
    endDateExclusive: clampedResetDate(endMonth.year, endMonth.month, resetDay),
  });
}
