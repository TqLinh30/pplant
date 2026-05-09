import type { MoneyRecord } from '@/domain/money/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  buildMoneyNoteCalendarMonth,
  calculateMoneyNoteTotals,
  calculateMoneyNoteDailyTotals,
  currencySuffixForCode,
  formatDong,
  formatMoneyNoteAmount,
  formatMoneyNoteAmountMagnitude,
  formatMoneyNoteAmountInput,
  formatMoneyNoteDate,
  formatMoneyNoteShortDate,
  getMonthBounds,
  parseMoneyNoteAmountInput,
  monthLabel,
  shiftLocalDate,
  shiftMonth,
} from './moneyNoteModel';

function createRecord(overrides: Partial<MoneyRecord>): MoneyRecord {
  return {
    amountMinor: 0,
    categoryId: null,
    createdAt: '2026-05-09T00:00:00.000Z',
    currencyCode: 'VND' as never,
    deletedAt: null,
    id: 'money-test' as never,
    kind: 'expense',
    localDate: '2026-05-09' as never,
    merchantOrSource: null,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: '2026-05-09T00:00:00.000Z',
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('MoneyNote model helpers', () => {
  it('formats Vietnamese calendar labels and shifts local dates', () => {
    expect(formatMoneyNoteDate('2026-05-09')).toBe('09/05/2026 (T.7)');
    expect(formatMoneyNoteShortDate('2026-05-09')).toBe('09/05 (T.7)');
    expect(shiftLocalDate('2026-05-01', -1)).toBe('2026-04-30');
    expect(monthLabel(new Date(2026, 4, 1))).toBe('05/2026');
    expect(shiftMonth(new Date(2026, 4, 9), 1)).toEqual(new Date(2026, 5, 1));
  });

  it('builds a Monday-first month grid with adjacent-month days', () => {
    const days = buildMoneyNoteCalendarMonth(new Date(2026, 4, 1), new Date(2026, 4, 9));

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ dayOfMonth: 27, inCurrentMonth: false, localDate: '2026-04-27' });
    expect(days[4]).toMatchObject({ dayOfMonth: 1, inCurrentMonth: true, localDate: '2026-05-01' });
    expect(days.find((day) => day.localDate === '2026-05-09')?.isToday).toBe(true);
    expect(getMonthBounds(new Date(2026, 4, 9))).toEqual({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    });
  });

  it('sums active income and expense records for reports', () => {
    const totals = calculateMoneyNoteTotals([
      createRecord({ amountMinor: 12000, kind: 'expense' }),
      createRecord({ amountMinor: 50000, id: 'money-income' as never, kind: 'income' }),
      createRecord({ amountMinor: 9000, deletedAt: '2026-05-10T00:00:00.000Z', id: 'deleted' as never }),
    ]);

    expect(totals).toEqual({
      expenseMinor: 12000,
      incomeMinor: 50000,
      netMinor: 38000,
    });
    expect(formatDong(totals.netMinor)).toBe('38.000đ');
    expect(formatMoneyNoteAmount(1250, { currencyCode: 'USD', locale: 'en-US' })).toBe('$12.50');
    expect(formatMoneyNoteAmountMagnitude(1250, { currencyCode: 'USD', locale: 'en-US' })).toBe('12.5');
    expect(formatMoneyNoteAmount(29100, { currencyCode: 'TWD', locale: 'zh-TW' })).toBe('NT$291');
    expect(currencySuffixForCode('VND')).toBe('đ');
    expect(currencySuffixForCode('TWD')).toBe('NT$');
  });

  it('groups active money records into daily calendar totals', () => {
    expect(
      calculateMoneyNoteDailyTotals([
        createRecord({ amountMinor: 9000, id: 'food' as never, localDate: '2026-05-09' as never }),
        createRecord({ amountMinor: 20100, id: 'train' as never, localDate: '2026-05-09' as never }),
        createRecord({
          amountMinor: 50000,
          id: 'income' as never,
          kind: 'income',
          localDate: '2026-05-10' as never,
        }),
        createRecord({
          amountMinor: 1,
          deletedAt: '2026-05-10T00:00:00.000Z',
          id: 'deleted' as never,
          localDate: '2026-05-09' as never,
        }),
      ]),
    ).toEqual({
      '2026-05-09': {
        expenseMinor: 29100,
        incomeMinor: 0,
        netMinor: -29100,
      },
      '2026-05-10': {
        expenseMinor: 0,
        incomeMinor: 50000,
        netMinor: 50000,
      },
    });
  });

  it('formats amount input with Vietnamese thousands separators without changing saved digits', () => {
    expect(parseMoneyNoteAmountInput('1.234.567đ')).toBe('1234567');
    expect(formatMoneyNoteAmountInput('1234567')).toBe('1.234.567');
    expect(formatMoneyNoteAmountInput('90.00')).toBe('90');
    expect(formatMoneyNoteAmountInput('')).toBe('');
  });
});
