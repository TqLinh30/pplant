import type { CurrencyCode, Money } from '@/domain/common/money';
import type { WorkspaceId } from '@/domain/workspace/types';

export type LocaleTag = string & { readonly __brand: 'LocaleTag' };
export type MonthlyBudgetResetDay = number & { readonly __brand: 'MonthlyBudgetResetDay' };

export type UserPreferences = {
  workspaceId: WorkspaceId;
  currencyCode: CurrencyCode;
  locale: LocaleTag;
  monthlyBudgetResetDay: MonthlyBudgetResetDay;
  defaultHourlyWage: Money;
  createdAt: string;
  updatedAt: string;
};

export type SaveUserPreferencesInput = {
  workspaceId: string;
  currencyCode: string;
  locale: string;
  monthlyBudgetResetDay: number;
  defaultHourlyWageMinor: number;
  defaultHourlyWageCurrencyCode?: string;
};
