import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import {
  loadTodayOverview,
  type TodayOverviewData,
} from '@/services/summaries/today.service';

export type TodayOverviewStatus = 'empty' | 'failed' | 'loading' | 'preferences_needed' | 'ready' | 'stale';

export type TodayOverviewState = {
  data: TodayOverviewData | null;
  loadError: AppError | null;
  status: TodayOverviewStatus;
};

export type TodayOverviewServices = {
  loadOverview?: () => Promise<AppResult<TodayOverviewData>>;
};

type TodayOverviewAction =
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: TodayOverviewData }
  | { type: 'preferences_needed'; error: AppError };

export const initialTodayOverviewState: TodayOverviewState = {
  data: null,
  loadError: null,
  status: 'loading',
};

export function todayOverviewReducer(
  state: TodayOverviewState,
  action: TodayOverviewAction,
): TodayOverviewState {
  switch (action.type) {
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: state.data ? 'stale' : 'failed',
      };
    case 'load_started':
      return {
        ...state,
        loadError: null,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        data: action.data,
        loadError: null,
        status: action.data.summary.isEmpty ? 'empty' : 'ready',
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        status: 'preferences_needed',
      };
    default:
      return state;
  }
}

export function useTodayOverview(services: TodayOverviewServices = {}) {
  const [state, dispatch] = useReducer(todayOverviewReducer, initialTodayOverviewState);
  const isMounted = useRef(false);
  const loadOverview = services.loadOverview ?? loadTodayOverview;

  const runLoad = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadOverview().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ data: result.value, type: 'load_succeeded' });
        return;
      }

      if (result.error.recovery === 'settings') {
        dispatch({ error: result.error, type: 'preferences_needed' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadOverview]);

  useEffect(() => {
    isMounted.current = true;
    runLoad();

    return () => {
      isMounted.current = false;
    };
  }, [runLoad]);

  return {
    reload: runLoad,
    state,
  };
}
