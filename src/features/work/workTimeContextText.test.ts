import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyRecord } from '@/domain/money/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { buildExpenseWorkTimeContextText, formatWorkTimeDuration } from './workTimeContextText';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createPreferences(overrides: Record<string, unknown> = {}): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow,
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 2000,
    locale: 'en-US',
    monthlyBudgetResetDay: 1,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createRecord(overrides: Record<string, unknown> = {}): MoneyRecord {
  const result = parseMoneyRecordRow({
    amountMinor: 2500,
    categoryId: null,
    createdAt: fixedNow,
    currencyCode: 'USD',
    deletedAt: null,
    id: 'money-1',
    kind: 'expense',
    localDate: '2026-05-08',
    merchantOrSource: 'Cafe',
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('record fixture failed');
  }

  return result.value;
}

describe('work-time context text', () => {
  it('formats compact durations', () => {
    expect(formatWorkTimeDuration(45)).toBe('45m');
    expect(formatWorkTimeDuration(60)).toBe('1h');
    expect(formatWorkTimeDuration(75)).toBe('1h 15m');
  });

  it('builds neutral contextual copy for expense records only', () => {
    expect(buildExpenseWorkTimeContextText(createRecord(), createPreferences())).toBe('Approx 1h 15m work context');
    expect(buildExpenseWorkTimeContextText(createRecord({ kind: 'income' }), createPreferences())).toBeNull();
  });

  it('builds neutral unavailable copy for missing wage and currency mismatch', () => {
    expect(
      buildExpenseWorkTimeContextText(
        createRecord(),
        createPreferences({ defaultHourlyWageMinor: 0 }),
      ),
    ).toBe('Set a default wage in Settings for work-time context');
    expect(
      buildExpenseWorkTimeContextText(
        createRecord(),
        createPreferences({ defaultHourlyWageCurrencyCode: 'EUR' }),
      ),
    ).toBe('Work-time context needs matching wage currency');
  });
});
