import { defaultWeekStartsOn, type BudgetPeriod, type LocalDate } from '@/domain/common/date-rules';

import type { WorkEntry, WorkHistorySummaryMode } from './types';

export type WorkHistorySummary = {
  earnedIncomeMinor: number;
  endDateExclusive: LocalDate;
  key: string;
  label: string;
  mode: WorkHistorySummaryMode;
  paidDurationMinutes: number;
  recordCount: number;
  startDate: LocalDate;
  totalDurationMinutes: number;
  unpaidDurationMinutes: number;
};

function parseLocalDateToUtc(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateAsLocalDate(date: Date): LocalDate {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as LocalDate;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);

  return next;
}

function historySummaryPeriod(
  localDate: LocalDate,
  mode: WorkHistorySummaryMode,
): Pick<BudgetPeriod, 'endDateExclusive' | 'startDate'> & { key: string; label: string } {
  if (mode === 'day') {
    const date = parseLocalDateToUtc(localDate);
    const endDateExclusive = formatUtcDateAsLocalDate(addUtcDays(date, 1));

    return {
      endDateExclusive,
      key: localDate,
      label: localDate,
      startDate: localDate,
    };
  }

  if (mode === 'month') {
    const [year, month] = localDate.split('-');
    const startDate = `${year}-${month}-01` as LocalDate;
    const endDateExclusive = formatUtcDateAsLocalDate(addUtcMonths(parseLocalDateToUtc(startDate), 1));

    return {
      endDateExclusive,
      key: `${year}-${month}`,
      label: `${year}-${month}`,
      startDate,
    };
  }

  const date = parseLocalDateToUtc(localDate);
  const daysFromWeekStart = (date.getUTCDay() - defaultWeekStartsOn + 7) % 7;
  const startDate = formatUtcDateAsLocalDate(addUtcDays(date, -daysFromWeekStart));
  const endDateExclusive = formatUtcDateAsLocalDate(addUtcDays(parseLocalDateToUtc(startDate), 7));

  return {
    endDateExclusive,
    key: startDate,
    label: `${startDate} week`,
    startDate,
  };
}

export function calculateWorkHistorySummaries(
  records: WorkEntry[],
  mode: WorkHistorySummaryMode,
): WorkHistorySummary[] {
  const summariesByKey = new Map<string, WorkHistorySummary>();

  for (const record of records) {
    if (record.deletedAt !== null) {
      continue;
    }

    const period = historySummaryPeriod(record.localDate, mode);
    const existing =
      summariesByKey.get(period.key) ??
      ({
        ...period,
        earnedIncomeMinor: 0,
        mode,
        paidDurationMinutes: 0,
        recordCount: 0,
        totalDurationMinutes: 0,
        unpaidDurationMinutes: 0,
      } satisfies WorkHistorySummary);

    existing.earnedIncomeMinor += record.earnedIncomeMinor;
    existing.recordCount += 1;
    existing.totalDurationMinutes += record.durationMinutes;

    if (record.paid) {
      existing.paidDurationMinutes += record.durationMinutes;
    } else {
      existing.unpaidDurationMinutes += record.durationMinutes;
    }

    summariesByKey.set(period.key, existing);
  }

  return [...summariesByKey.values()].sort((left, right) => right.startDate.localeCompare(left.startDate));
}
