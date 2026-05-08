import type { TodayOverviewData } from '@/services/summaries/today.service';

import {
  initialTodayOverviewState,
  todayOverviewReducer,
} from './useTodayOverview';

function createData(isEmpty = false): TodayOverviewData {
  return {
    generatedAt: '2026-05-08T10:00:00.000Z',
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
    summary: {
      isEmpty,
    } as never,
  };
}

describe('today overview state', () => {
  it('marks empty summaries separately from ready summaries', () => {
    const ready = todayOverviewReducer(initialTodayOverviewState, {
      data: createData(false),
      type: 'load_succeeded',
    });
    const empty = todayOverviewReducer(initialTodayOverviewState, {
      data: createData(true),
      type: 'load_succeeded',
    });

    expect(ready.status).toBe('ready');
    expect(empty.status).toBe('empty');
  });

  it('surfaces settings recovery as preferences_needed', () => {
    const state = todayOverviewReducer(initialTodayOverviewState, {
      error: {
        code: 'not_found',
        message: 'Save preferences first.',
        recovery: 'settings',
      },
      type: 'preferences_needed',
    });

    expect(state.status).toBe('preferences_needed');
    expect(state.loadError?.recovery).toBe('settings');
  });

  it('keeps previous data while reloading', () => {
    const withData = todayOverviewReducer(initialTodayOverviewState, {
      data: createData(false),
      type: 'load_succeeded',
    });
    const loading = todayOverviewReducer(withData, { type: 'load_started' });

    expect(loading.status).toBe('loading');
    expect(loading.data).toBe(withData.data);
  });
});
