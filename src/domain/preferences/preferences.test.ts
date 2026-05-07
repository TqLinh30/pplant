import { localWorkspaceId } from '@/domain/workspace/types';

import {
  asMonthlyBudgetResetDay,
  canonicalizeLocaleTag,
  parseUserPreferencesRow,
} from './schemas';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: fixedNow,
    currencyCode: 'usd',
    defaultHourlyWageCurrencyCode: 'usd',
    defaultHourlyWageMinor: 1250,
    locale: 'en-us',
    monthlyBudgetResetDay: 15,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('preferences domain', () => {
  it('parses and normalizes persisted preferences rows', () => {
    const result = parseUserPreferencesRow(createRow());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currencyCode).toBe('USD');
      expect(result.value.defaultHourlyWage).toEqual({
        amountMinor: 1250,
        currency: 'USD',
      });
      expect(result.value.locale).toBe('en-US');
      expect(result.value.monthlyBudgetResetDay).toBe(15);
    }
  });

  it('rejects invalid locale tags with edit recovery', () => {
    const result = canonicalizeLocaleTag('not a locale');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('rejects reset days outside 1 through 31', () => {
    const result = asMonthlyBudgetResetDay(0);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('rejects negative default wage values', () => {
    const result = parseUserPreferencesRow(createRow({ defaultHourlyWageMinor: -1 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('rejects unsupported currency codes when support data is available', () => {
    const result = parseUserPreferencesRow(createRow({ currencyCode: 'ZZZ' }), {
      isSupportedCurrency: (currencyCode) => currencyCode !== 'ZZZ',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('edit');
    }
  });
});
