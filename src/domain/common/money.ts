import { createAppError } from './app-error';
import { err, ok, type AppResult } from './result';

export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };
export type CurrencySupportChecker = (currencyCode: string) => boolean;
export type CurrencyFractionDigitsResolver = (
  currencyCode: CurrencyCode,
  locale: string,
) => AppResult<number>;

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: 'currency') => string[];
};

const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

function isSupportedCurrencyCode(currencyCode: string): boolean {
  const supportedValuesOf = (Intl as IntlWithSupportedValues).supportedValuesOf;

  if (typeof supportedValuesOf !== 'function') {
    return true;
  }

  try {
    return supportedValuesOf('currency').includes(currencyCode);
  } catch {
    return true;
  }
}

export function asCurrencyCode(
  value: string,
  isSupportedCurrency: CurrencySupportChecker = isSupportedCurrencyCode,
): AppResult<CurrencyCode> {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return err(createAppError('validation_failed', 'Currency code must be an ISO-style 3-letter code.', 'edit'));
  }

  if (!isSupportedCurrency(normalized)) {
    return err(createAppError('validation_failed', 'Currency code is not supported.', 'edit'));
  }

  return ok(normalized as CurrencyCode);
}

export function createMoney(
  amountMinor: number,
  currency: string,
  isSupportedCurrency?: CurrencySupportChecker,
): AppResult<Money> {
  if (!Number.isInteger(amountMinor)) {
    return err(createAppError('validation_failed', 'Money amounts must use integer minor units.', 'edit'));
  }

  const currencyResult = asCurrencyCode(currency, isSupportedCurrency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  return ok({
    amountMinor,
    currency: currencyResult.value,
  });
}

export function resolveCurrencyFractionDigits(
  currency: string,
  locale = 'en-US',
  isSupportedCurrency?: CurrencySupportChecker,
): AppResult<number> {
  const currencyResult = asCurrencyCode(currency, isSupportedCurrency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  try {
    const resolved = new Intl.NumberFormat(locale, {
      currency: currencyResult.value,
      style: 'currency',
    }).resolvedOptions();

    return ok(resolved.maximumFractionDigits ?? resolved.minimumFractionDigits ?? 2);
  } catch (cause) {
    if (zeroDecimalCurrencies.has(currencyResult.value)) {
      return ok(0);
    }

    return err(
      createAppError(
        'validation_failed',
        'Currency formatting rules could not be resolved.',
        'edit',
        cause,
      ),
    );
  }
}

export function parseMoneyAmountInputToMinorUnits(
  value: string,
  currency: string,
  {
    locale = 'en-US',
    resolveFractionDigits = resolveCurrencyFractionDigits,
    isSupportedCurrency,
  }: {
    locale?: string;
    resolveFractionDigits?: CurrencyFractionDigitsResolver;
    isSupportedCurrency?: CurrencySupportChecker;
  } = {},
): AppResult<number> {
  const currencyResult = asCurrencyCode(currency, isSupportedCurrency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  const trimmed = value.trim();

  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return err(createAppError('validation_failed', 'Enter a non-negative money amount.', 'edit'));
  }

  const fractionDigitsResult = resolveFractionDigits(currencyResult.value, locale);

  if (!fractionDigitsResult.ok) {
    return fractionDigitsResult;
  }

  const fractionDigits = fractionDigitsResult.value;
  const [wholePart, fractionPart = ''] = trimmed.split('.');

  if (fractionPart.length > fractionDigits) {
    return err(
      createAppError(
        'validation_failed',
        `Use no more than ${fractionDigits} decimal place${fractionDigits === 1 ? '' : 's'} for ${currencyResult.value}.`,
        'edit',
      ),
    );
  }

  if (fractionDigits === 0 && fractionPart.length > 0) {
    return err(createAppError('validation_failed', `${currencyResult.value} does not use decimal minor units.`, 'edit'));
  }

  const minorUnitsText = `${wholePart}${fractionPart.padEnd(fractionDigits, '0')}`;
  const minorUnits = Number(minorUnitsText);

  if (!Number.isSafeInteger(minorUnits)) {
    return err(createAppError('validation_failed', 'Money amount is too large.', 'edit'));
  }

  return ok(minorUnits);
}

export function formatMinorUnitsForInput(
  amountMinor: number,
  currency: string,
  {
    locale = 'en-US',
    resolveFractionDigits = resolveCurrencyFractionDigits,
    isSupportedCurrency,
  }: {
    locale?: string;
    resolveFractionDigits?: CurrencyFractionDigitsResolver;
    isSupportedCurrency?: CurrencySupportChecker;
  } = {},
): AppResult<string> {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    return err(createAppError('validation_failed', 'Money amounts must use non-negative integer minor units.', 'edit'));
  }

  const currencyResult = asCurrencyCode(currency, isSupportedCurrency);

  if (!currencyResult.ok) {
    return currencyResult;
  }

  const fractionDigitsResult = resolveFractionDigits(currencyResult.value, locale);

  if (!fractionDigitsResult.ok) {
    return fractionDigitsResult;
  }

  const fractionDigits = fractionDigitsResult.value;

  if (fractionDigits === 0) {
    return ok(String(amountMinor));
  }

  const padded = String(amountMinor).padStart(fractionDigits + 1, '0');
  const wholePart = padded.slice(0, -fractionDigits);
  const fractionPart = padded.slice(-fractionDigits);

  return ok(`${wholePart}.${fractionPart}`);
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
