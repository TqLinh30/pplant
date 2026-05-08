import { calculateExpenseWorkTimeEquivalent } from './work-time-equivalent';

describe('expense work-time equivalent', () => {
  it('calculates deterministic rounded-up minutes from expense and hourly wage minor units', () => {
    const result = calculateExpenseWorkTimeEquivalent({
      amountMinor: 2500,
      expenseCurrencyCode: 'USD',
      wageCurrencyCode: 'USD',
      wageMinorPerHour: 2000,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        currencyCode: 'USD',
        minutes: 75,
        status: 'available',
        wageMinorPerHour: 2000,
      },
    });
  });

  it('keeps positive expenses visible as at least one minute of context', () => {
    const result = calculateExpenseWorkTimeEquivalent({
      amountMinor: 1,
      expenseCurrencyCode: 'USD',
      wageCurrencyCode: 'USD',
      wageMinorPerHour: 2000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ minutes: 1, status: 'available' });
    }
  });

  it('returns unavailable context for zero wage and currency mismatch', () => {
    const missingWage = calculateExpenseWorkTimeEquivalent({
      amountMinor: 2500,
      expenseCurrencyCode: 'USD',
      wageCurrencyCode: 'USD',
      wageMinorPerHour: 0,
    });
    const mismatch = calculateExpenseWorkTimeEquivalent({
      amountMinor: 2500,
      expenseCurrencyCode: 'USD',
      wageCurrencyCode: 'EUR',
      wageMinorPerHour: 2000,
    });

    expect(missingWage).toEqual({ ok: true, value: { reason: 'missing_wage', status: 'unavailable' } });
    expect(mismatch).toEqual({ ok: true, value: { reason: 'currency_mismatch', status: 'unavailable' } });
  });

  it('rejects invalid expense and wage inputs', () => {
    expect(
      calculateExpenseWorkTimeEquivalent({
        amountMinor: 0,
        expenseCurrencyCode: 'USD',
        wageCurrencyCode: 'USD',
        wageMinorPerHour: 2000,
      }).ok,
    ).toBe(false);
    expect(
      calculateExpenseWorkTimeEquivalent({
        amountMinor: 2500,
        expenseCurrencyCode: 'USD',
        wageCurrencyCode: 'USD',
        wageMinorPerHour: 12.5,
      }).ok,
    ).toBe(false);
  });
});
