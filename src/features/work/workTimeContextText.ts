import type { MoneyRecord } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { calculateExpenseWorkTimeEquivalent } from '@/domain/work/work-time-equivalent';

export function formatWorkTimeDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function buildExpenseWorkTimeContextText(
  record: MoneyRecord,
  preferences: UserPreferences | null,
): string | null {
  if (record.kind !== 'expense') {
    return null;
  }

  if (!preferences) {
    return 'Set a default wage in Settings for work-time context';
  }

  const equivalent = calculateExpenseWorkTimeEquivalent({
    amountMinor: record.amountMinor,
    expenseCurrencyCode: record.currencyCode,
    wageCurrencyCode: preferences.defaultHourlyWage.currency,
    wageMinorPerHour: preferences.defaultHourlyWage.amountMinor,
  });

  if (!equivalent.ok) {
    return 'Work-time context is unavailable';
  }

  if (equivalent.value.status === 'available') {
    return `Approx ${formatWorkTimeDuration(equivalent.value.minutes)} work context`;
  }

  if (equivalent.value.reason === 'currency_mismatch') {
    return 'Work-time context needs matching wage currency';
  }

  return 'Set a default wage in Settings for work-time context';
}
