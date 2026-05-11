import type { PeriodReviewData } from '@/services/summaries/period-review.service';

import {
  initialPeriodReviewState,
  periodReviewReducer,
} from './usePeriodReviewSummary';

function createData(isEmpty = false): PeriodReviewData {
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

describe('period review summary state', () => {
  it('marks empty period summaries separately from ready summaries', () => {
    const ready = periodReviewReducer(initialPeriodReviewState, {
      data: createData(false),
      mode: 'week',
      type: 'load_succeeded',
    });
    const empty = periodReviewReducer(initialPeriodReviewState, {
      data: createData(true),
      mode: 'month',
      type: 'load_succeeded',
    });

    expect(ready.status).toBe('ready');
    expect(ready.mode).toBe('week');
    expect(empty.status).toBe('empty');
    expect(empty.mode).toBe('month');
  });

  it('keeps same-mode data visible while reloading and clears data when mode changes', () => {
    const withData = periodReviewReducer(initialPeriodReviewState, {
      data: createData(false),
      mode: 'week',
      type: 'load_succeeded',
    });
    const sameModeLoading = periodReviewReducer(withData, {
      mode: 'week',
      type: 'load_started',
    });
    const changedModeLoading = periodReviewReducer(withData, {
      mode: 'month',
      type: 'load_started',
    });

    expect(sameModeLoading.status).toBe('loading');
    expect(sameModeLoading.data).toBe(withData.data);
    expect(changedModeLoading.status).toBe('loading');
    expect(changedModeLoading.data).toBeNull();
  });

  it('surfaces settings recovery as preferences_needed', () => {
    const state = periodReviewReducer(initialPeriodReviewState, {
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

  it('resets to idle when period mode is disabled', () => {
    const withData = periodReviewReducer(initialPeriodReviewState, {
      data: createData(false),
      mode: 'week',
      type: 'load_succeeded',
    });
    const reset = periodReviewReducer(withData, { type: 'reset' });

    expect(reset).toEqual(initialPeriodReviewState);
  });
});
