import { addMoney, createMoney } from './money';

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
});
