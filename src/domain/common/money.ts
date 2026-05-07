import { createAppError } from './app-error';
import { err, ok, type AppResult } from './result';

export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

export function asCurrencyCode(value: string): AppResult<CurrencyCode> {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return err(createAppError('validation_failed', 'Currency code must be an ISO-style 3-letter code.'));
  }

  return ok(normalized as CurrencyCode);
}

export function createMoney(amountMinor: number, currency: string): AppResult<Money> {
  if (!Number.isInteger(amountMinor)) {
    return err(createAppError('validation_failed', 'Money amounts must use integer minor units.'));
  }

  const currencyResult = asCurrencyCode(currency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  return ok({
    amountMinor,
    currency: currencyResult.value,
  });
}

export function addMoney(left: Money, right: Money): AppResult<Money> {
  if (left.currency !== right.currency) {
    return err(createAppError('validation_failed', 'Cannot add money values with different currencies.'));
  }

  return ok({
    amountMinor: left.amountMinor + right.amountMinor,
    currency: left.currency,
  });
}
