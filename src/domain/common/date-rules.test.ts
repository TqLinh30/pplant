import { asLocalDate, resolveBudgetPeriodForDate } from './date-rules';

describe('date rules', () => {
  it('rejects impossible local calendar dates', () => {
    const result = asLocalDate('2026-02-30');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
    }
  });

  it('uses calendar months when reset day is the first', () => {
    expect(resolveBudgetPeriodForDate('2026-05-12', 1)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2026-06-01',
        startDate: '2026-05-01',
      },
    });
  });

  it('resolves dates before and on a mid-month reset boundary', () => {
    expect(resolveBudgetPeriodForDate('2026-05-14', 15)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2026-05-15',
        startDate: '2026-04-15',
      },
    });
    expect(resolveBudgetPeriodForDate('2026-05-15', 15)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2026-06-15',
        startDate: '2026-05-15',
      },
    });
  });

  it('clamps reset day 31 to the last day of shorter months', () => {
    expect(resolveBudgetPeriodForDate('2026-02-27', 31)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2026-02-28',
        startDate: '2026-01-31',
      },
    });
    expect(resolveBudgetPeriodForDate('2026-02-28', 31)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2026-03-31',
        startDate: '2026-02-28',
      },
    });
  });

  it('handles leap day clamping deterministically', () => {
    expect(resolveBudgetPeriodForDate('2028-02-29', 31)).toEqual({
      ok: true,
      value: {
        endDateExclusive: '2028-03-31',
        startDate: '2028-02-29',
      },
    });
  });

  it('rejects reset days outside the supported range', () => {
    const result = resolveBudgetPeriodForDate('2026-05-12', 32);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('edit');
    }
  });
});
