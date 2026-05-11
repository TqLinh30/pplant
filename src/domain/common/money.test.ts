import {
  addMoney,
  asCurrencyCode,
  createMoney,
  formatMinorUnitsForInput,
  parseMoneyAmountInputToMinorUnits,
} from './money';
import { ok } from './result';

describe('money foundation', () => {
  it('creates money with integer minor units and normalized currency codes', () => {
    const result = createMoney(1250, 'usd');

    expect(result).toEqual({
      ok: true,
      value: {
        amountMinor: 1250,
        currency: 'USD',
      },
    });
  });

  it('rejects floating-point money amounts', () => {
    const result = createMoney(12.5, 'USD');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
    }
  });

  it('does not add money across currencies', () => {
    const usd = createMoney(100, 'USD');
    const twd = createMoney(100, 'TWD');

    expect(usd.ok).toBe(true);
    expect(twd.ok).toBe(true);

    if (usd.ok && twd.ok) {
      const result = addMoney(usd.value, twd.value);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects unsupported currency codes when support data is available', () => {
    const result = asCurrencyCode('ZZZ', () => false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('parses decimal input into integer minor units', () => {
    const result = parseMoneyAmountInputToMinorUnits('12.50', 'usd', {
      resolveFractionDigits: () => ok(2),
    });

    expect(result).toEqual({
      ok: true,
      value: 1250,
    });
  });

  it('rejects decimal precision that the currency cannot store', () => {
    const result = parseMoneyAmountInputToMinorUnits('12.345', 'USD', {
      resolveFractionDigits: () => ok(2),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.error.recovery).toBe('edit');
    }
  });

  it('formats integer minor units for editable inputs', () => {
    const result = formatMinorUnitsForInput(1250, 'USD', {
      resolveFractionDigits: () => ok(2),
    });

    expect(result).toEqual({
      ok: true,
      value: '12.50',
    });
  });
});
