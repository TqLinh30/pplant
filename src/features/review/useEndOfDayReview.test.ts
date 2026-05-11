import type { EndOfDayReviewData } from '@/services/summaries/end-of-day-review.service';

import {
  endOfDayReviewReducer,
  initialEndOfDayReviewState,
} from './useEndOfDayReview';

function createData(isEmpty = false): EndOfDayReviewData {
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

describe('end-of-day review state', () => {
  it('marks empty summaries separately from ready summaries', () => {
    const ready = endOfDayReviewReducer(initialEndOfDayReviewState, {
      data: createData(false),
      type: 'load_succeeded',
    });
    const empty = endOfDayReviewReducer(initialEndOfDayReviewState, {
      data: createData(true),
      type: 'load_succeeded',
    });

    expect(ready.status).toBe('ready');
    expect(empty.status).toBe('empty');
  });

  it('keeps previous data visible while reloading', () => {
    const withData = endOfDayReviewReducer(initialEndOfDayReviewState, {
      data: createData(false),
      type: 'load_succeeded',
    });
    const loading = endOfDayReviewReducer(withData, { type: 'load_started' });

    expect(loading.status).toBe('loading');
    expect(loading.data).toBe(withData.data);
  });

  it('stores refreshed data after task completion', () => {
    const state = endOfDayReviewReducer(initialEndOfDayReviewState, {
      data: createData(false),
      type: 'task_done_succeeded',
    });

    expect(state.status).toBe('saved');
    expect(state.data?.summary.isEmpty).toBe(false);
  });

  it('surfaces settings recovery as preferences_needed', () => {
    const state = endOfDayReviewReducer(initialEndOfDayReviewState, {
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
});
