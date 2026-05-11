import { createAppError } from '@/domain/common/app-error';
import { asCurrencyCode, type CurrencyCode } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';

export type WorkTimeEquivalentUnavailableReason = 'currency_mismatch' | 'missing_wage';

export type WorkTimeEquivalent =
  | {
      currencyCode: CurrencyCode;
      minutes: number;
      status: 'available';
      wageMinorPerHour: number;
    }
  | {
      reason: WorkTimeEquivalentUnavailableReason;
      status: 'unavailable';
    };

export type ExpenseWorkTimeEquivalentInput = {
  amountMinor: number;
  expenseCurrencyCode: string;
  wageCurrencyCode: string;
  wageMinorPerHour: number;
};

export function calculateExpenseWorkTimeEquivalent(
  input: ExpenseWorkTimeEquivalentInput,
): AppResult<WorkTimeEquivalent> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return err(createAppError('validation_failed', 'Expense amount must be a positive integer minor-unit value.', 'edit'));
  }

  if (!Number.isInteger(input.wageMinorPerHour)) {
    return err(createAppError('validation_failed', 'Hourly wage must be an integer minor-unit value.', 'edit'));
  }

  const expenseCurrency = asCurrencyCode(input.expenseCurrencyCode);

  if (!expenseCurrency.ok) {
    return expenseCurrency;
  }

  const wageCurrency = asCurrencyCode(input.wageCurrencyCode);

  if (!wageCurrency.ok) {
    return wageCurrency;
  }

  if (input.wageMinorPerHour <= 0) {
    return ok({
      reason: 'missing_wage',
      status: 'unavailable',
    });
  }

  if (expenseCurrency.value !== wageCurrency.value) {
    return ok({
      reason: 'currency_mismatch',
      status: 'unavailable',
    });
  }

  const minuteNumerator = input.amountMinor * 60;

  if (!Number.isSafeInteger(minuteNumerator)) {
    return err(createAppError('validation_failed', 'Expense amount is too large for work-time context.', 'edit'));
  }

  return ok({
    currencyCode: expenseCurrency.value,
    minutes: Math.max(1, Math.ceil(minuteNumerator / input.wageMinorPerHour)),
    status: 'available',
    wageMinorPerHour: input.wageMinorPerHour,
  });
}
