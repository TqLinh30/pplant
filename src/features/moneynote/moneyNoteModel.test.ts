import type { MoneyRecord } from '@/domain/money/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  buildMoneyNoteCalendarMonth,
  calculateMoneyNoteTotals,
  formatDong,
  formatMoneyNoteDate,
  getMonthBounds,
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
  });
});
