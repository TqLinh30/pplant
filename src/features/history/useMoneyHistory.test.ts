import type { MoneyHistoryData } from '@/services/money/money-history.service';

import {
  buildMoneyHistoryRequest,
  defaultMoneyHistoryFilterDraft,
  initialMoneyHistoryState,
  moneyHistoryReducer,
} from './useMoneyHistory';

function createData(overrides: Partial<MoneyHistoryData> = {}): MoneyHistoryData {
  return {
    categories: [],
    page: {
      hasMore: false,
      limit: 20,
      offset: 0,
      records: [],
      totalCount: 0,
    },
    preferences: {
      createdAt: '2026-05-08T00:00:00.000Z',
      currencyCode: 'USD' as never,
      defaultHourlyWage: {
        amountMinor: 1500,
        currency: 'USD' as never,
      },
      locale: 'en-US' as never,
      monthlyBudgetResetDay: 1 as never,
      updatedAt: '2026-05-08T00:00:00.000Z',
      workspaceId: 'local' as never,
    },
    query: {
      limit: 20,
      offset: 0,
      sort: 'date_desc',
    },
    records: [],
    summaries: [],
    summaryMode: 'day',
    topics: [],
    ...overrides,
  };
}

describe('money history state', () => {
  it('builds a service request from filter draft and sort state', () => {
    const state = {
      ...initialMoneyHistoryState,
      data: createData(),
      filterDraft: {
        ...defaultMoneyHistoryFilterDraft,
        amountMax: '25.00',
        amountMin: '10.00',
        categoryId: 'cat-food',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        kind: 'expense' as const,
        merchantOrSource: ' cafe ',
        topicId: 'topic-campus',
      },
      sort: 'amount_desc' as const,
      summaryMode: 'week' as const,
    };

    const request = buildMoneyHistoryRequest(state);

    expect(request.ok).toBe(true);
    if (request.ok) {
      expect(request.value).toMatchObject({
        amountMinorMax: 2500,
        amountMinorMin: 1000,
        categoryId: 'cat-food',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        kind: 'expense',
        merchantOrSource: ' cafe ',
        offset: 0,
        sort: 'amount_desc',
        summaryMode: 'week',
        topicId: 'topic-campus',
      });
    }
  });

  it('rejects invalid amount filter ranges', () => {
    const request = buildMoneyHistoryRequest({
      ...initialMoneyHistoryState,
      data: createData(),
      filterDraft: {
        ...defaultMoneyHistoryFilterDraft,
        amountMax: '1.00',
        amountMin: '2.00',
      },
    });

    expect(request.ok).toBe(false);
  });

  it('updates filters, appends pages, and clears filters', () => {
    const withSearch = moneyHistoryReducer(initialMoneyHistoryState, {
      field: 'merchantOrSource',
      type: 'filter_field_changed',
      value: 'cafe',
    });
    const withData = moneyHistoryReducer(withSearch, {
      append: false,
      data: createData({
        records: [{ id: 'money-1' } as never],
      }),
      type: 'load_succeeded',
    });
    const appended = moneyHistoryReducer(withData, {
      append: true,
      data: createData({
        records: [{ id: 'money-2' } as never],
      }),
      type: 'load_succeeded',
    });
    const cleared = moneyHistoryReducer(appended, { type: 'clear_filters' });

    expect(withSearch.filterDraft.merchantOrSource).toBe('cafe');
    expect(appended.data?.records.map((record) => record.id)).toEqual(['money-1', 'money-2']);
    expect(cleared.filterDraft).toEqual(defaultMoneyHistoryFilterDraft);
  });

  it('moves to preferences_needed when settings recovery is returned', () => {
    const state = moneyHistoryReducer(initialMoneyHistoryState, {
      error: {
        code: 'not_found',
        message: 'Save preferences first.',
        recovery: 'settings',
      },
      type: 'preferences_needed',
    });

    expect(state.status).toBe('preferences_needed');
  });
});
