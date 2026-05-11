import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import {
  loadEndOfDayReview,
  markEndOfDayTaskDone,
  type EndOfDayReviewData,
} from '@/services/summaries/end-of-day-review.service';

export type EndOfDayReviewStatus =
  | 'empty'
  | 'failed'
  | 'loading'
  | 'preferences_needed'
  | 'ready'
  | 'saved'
  | 'saving';

export type EndOfDayReviewState = {
  actionError: AppError | null;
  data: EndOfDayReviewData | null;
  loadError: AppError | null;
  status: EndOfDayReviewStatus;
};

export type EndOfDayReviewServices = {
  loadReview?: () => Promise<AppResult<EndOfDayReviewData>>;
  markTaskDone?: (taskId: string) => Promise<AppResult<EndOfDayReviewData>>;
};

type EndOfDayReviewAction =
  | { type: 'action_failed'; error: AppError }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: EndOfDayReviewData }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'task_done_started' }
  | { type: 'task_done_succeeded'; data: EndOfDayReviewData };

export const initialEndOfDayReviewState: EndOfDayReviewState = {
  actionError: null,
  data: null,
  loadError: null,
  status: 'loading',
};

function statusForData(data: EndOfDayReviewData): EndOfDayReviewStatus {
  return data.summary.isEmpty ? 'empty' : 'ready';
}

export function endOfDayReviewReducer(
  state: EndOfDayReviewState,
  action: EndOfDayReviewAction,
): EndOfDayReviewState {
  switch (action.type) {
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: state.data ? statusForData(state.data) : 'failed',
      };
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: 'failed',
      };
    case 'load_started':
      return {
        ...state,
        actionError: null,
        loadError: null,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        actionError: null,
        data: action.data,
        loadError: null,
        status: statusForData(action.data),
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        status: 'preferences_needed',
      };
    case 'task_done_started':
      return {
        ...state,
        actionError: null,
        status: 'saving',
      };
    case 'task_done_succeeded':
      return {
        actionError: null,
        data: action.data,
        loadError: null,
        status: action.data.summary.isEmpty ? 'empty' : 'saved',
      };
    default:
      return state;
  }
}

export function useEndOfDayReview(services: EndOfDayReviewServices = {}) {
  const [state, dispatch] = useReducer(endOfDayReviewReducer, initialEndOfDayReviewState);
  const isMounted = useRef(false);
  const loadReview = services.loadReview ?? loadEndOfDayReview;
  const completeTask = useMemo(
    () => services.markTaskDone ?? ((taskId: string) => markEndOfDayTaskDone({ taskId })),
    [services.markTaskDone],
  );

  const runLoad = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadReview().then((result) => {
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
  }, [loadReview]);

  const markTaskDone = useCallback(
    (taskId: string) => {
      dispatch({ type: 'task_done_started' });
      void completeTask(taskId).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ data: result.value, type: 'task_done_succeeded' });
          return;
        }

        dispatch({ error: result.error, type: 'action_failed' });
      });
    },
    [completeTask],
  );

  useEffect(() => {
    isMounted.current = true;
    runLoad();

    return () => {
      isMounted.current = false;
    };
  }, [runLoad]);

  return {
    markTaskDone,
    reload: runLoad,
    state,
  };
}
