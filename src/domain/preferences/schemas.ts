import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { createMoney, asCurrencyCode, type CurrencySupportChecker } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type { LocaleTag, MonthlyBudgetResetDay, UserPreferences } from './types';

export type LocaleCanonicalizer = (value: string) => string;

type IntlWithCanonicalLocales = typeof Intl & {
  getCanonicalLocales?: (locales?: string | string[]) => string[];
};

const fallbackLocalePattern = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const userPreferencesRowSchema = z.object({
  createdAt: isoTimestampSchema,
  currencyCode: z.string().min(1),
  defaultHourlyWageCurrencyCode: z.string().min(1),
  defaultHourlyWageMinor: z.number().int(),
  locale: z.string().min(1),
  monthlyBudgetResetDay: z.number().int(),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type UserPreferencesRow = z.infer<typeof userPreferencesRowSchema>;

export function canonicalizeLocaleTag(value: string): AppResult<LocaleTag> {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return err(createAppError('validation_failed', 'Locale cannot be empty.', 'edit'));
  }

  const getCanonicalLocales = (Intl as IntlWithCanonicalLocales).getCanonicalLocales;

  if (typeof getCanonicalLocales === 'function') {
    try {
      const [canonical] = getCanonicalLocales(trimmed);

      if (canonical) {
        return ok(canonical as LocaleTag);
      }
    } catch (cause) {
      return err(createAppError('validation_failed', 'Locale must be a valid BCP 47 tag.', 'edit', cause));
    }
  }

  if (!fallbackLocalePattern.test(trimmed)) {
    return err(createAppError('validation_failed', 'Locale must be a valid BCP 47 tag.', 'edit'));
  }

  return ok(trimmed as LocaleTag);
}

export function asMonthlyBudgetResetDay(value: number): AppResult<MonthlyBudgetResetDay> {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    return err(createAppError('validation_failed', 'Monthly budget reset day must be between 1 and 31.', 'edit'));
  }

  return ok(value as MonthlyBudgetResetDay);
}

export function parseUserPreferencesRow(
  row: unknown,
  {
    canonicalizeLocale = canonicalizeLocaleTag,
    isSupportedCurrency,
  }: {
    canonicalizeLocale?: (value: string) => AppResult<LocaleTag>;
    isSupportedCurrency?: CurrencySupportChecker;
  } = {},
): AppResult<UserPreferences> {
  const parsed = userPreferencesRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local preferences data is invalid.', 'retry', parsed.error));
  }

  const workspaceId = asWorkspaceId(parsed.data.workspaceId);

  if (!workspaceId.ok) {
    return workspaceId;
  }

  const currencyCode = asCurrencyCode(parsed.data.currencyCode, isSupportedCurrency);

  if (!currencyCode.ok) {
    return currencyCode;
  }

  const locale = canonicalizeLocale(parsed.data.locale);

  if (!locale.ok) {
    return locale;
  }

  const resetDay = asMonthlyBudgetResetDay(parsed.data.monthlyBudgetResetDay);

  if (!resetDay.ok) {
    return resetDay;
  }

  const defaultHourlyWage = createMoney(
    parsed.data.defaultHourlyWageMinor,
    parsed.data.defaultHourlyWageCurrencyCode,
    isSupportedCurrency,
  );

  if (!defaultHourlyWage.ok) {
    return defaultHourlyWage;
  }

  if (defaultHourlyWage.value.amountMinor < 0) {
    return err(createAppError('validation_failed', 'Default hourly wage cannot be negative.', 'edit'));
  }

  return ok({
    createdAt: parsed.data.createdAt,
    currencyCode: currencyCode.value,
    defaultHourlyWage: defaultHourlyWage.value,
    locale: locale.value,
    monthlyBudgetResetDay: resetDay.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
