import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import type { PeriodSummaryKind } from '@/domain/summaries/period-summary';
import {
  loadPeriodReviewSummary,
  type PeriodReviewData,
  type PeriodReviewRequest,
} from '@/services/summaries/period-review.service';

export type PeriodReviewStatus = 'empty' | 'failed' | 'idle' | 'loading' | 'preferences_needed' | 'ready';

export type PeriodReviewState = {
  data: PeriodReviewData | null;
  loadError: AppError | null;
  mode: PeriodSummaryKind | null;
  status: PeriodReviewStatus;
};

export type PeriodReviewServices = {
  loadReview?: (request: PeriodReviewRequest) => Promise<AppResult<PeriodReviewData>>;
};

type PeriodReviewAction =
  | { type: 'load_failed'; error: AppError }
  | { mode: PeriodSummaryKind; type: 'load_started' }
  | { data: PeriodReviewData; mode: PeriodSummaryKind; type: 'load_succeeded' }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'reset' };

export const initialPeriodReviewState: PeriodReviewState = {
  data: null,
  loadError: null,
  mode: null,
  status: 'idle',
};

function statusForData(data: PeriodReviewData): PeriodReviewStatus {
  return data.summary.isEmpty ? 'empty' : 'ready';
}

export function periodReviewReducer(
  state: PeriodReviewState,
  action: PeriodReviewAction,
): PeriodReviewState {
  switch (action.type) {
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: 'failed',
      };
    case 'load_started':
      return {
        data: state.mode === action.mode ? state.data : null,
        loadError: null,
        mode: action.mode,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        data: action.data,
        loadError: null,
        mode: action.mode,
        status: statusForData(action.data),
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        status: 'preferences_needed',
      };
    case 'reset':
      return initialPeriodReviewState;
    default:
      return state;
  }
}

export function usePeriodReviewSummary(
  mode: PeriodSummaryKind | null,
  services: PeriodReviewServices = {},
) {
  const [state, dispatch] = useReducer(periodReviewReducer, initialPeriodReviewState);
  const isMounted = useRef(false);
  const requestSequence = useRef(0);
  const loadReview = services.loadReview ?? loadPeriodReviewSummary;

  const runLoad = useCallback(() => {
    if (mode === null) {
      dispatch({ type: 'reset' });
      return;
    }

    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    dispatch({ mode, type: 'load_started' });

    void loadReview({ kind: mode }).then((result) => {
      if (!isMounted.current || requestSequence.current !== sequence) {
        return;
      }

      if (result.ok) {
        dispatch({ data: result.value, mode, type: 'load_succeeded' });
        return;
      }

      if (result.error.recovery === 'settings') {
        dispatch({ error: result.error, type: 'preferences_needed' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadReview, mode]);

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
