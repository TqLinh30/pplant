import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import type {
  WorkEntryMode,
  WorkHistoryPaidFilter,
  WorkHistorySort,
  WorkHistorySummaryMode,
} from '@/domain/work/types';
import {
  loadWorkHistory,
  type WorkHistoryData,
  type WorkHistoryRequest,
} from '@/services/work/work-history.service';

export type WorkHistoryStatus = 'failed' | 'loading' | 'preferences_needed' | 'ready';

export type WorkHistoryFilterDraft = {
  categoryId: string | null;
  dateFrom: string;
  dateTo: string;
  entryMode: WorkEntryMode | 'all';
  noteSearch: string;
  paid: WorkHistoryPaidFilter | 'all';
  topicId: string | null;
};

export type WorkHistoryState = {
  data: WorkHistoryData | null;
  filterDraft: WorkHistoryFilterDraft;
  filterError: AppError | null;
  loadError: AppError | null;
  sort: WorkHistorySort;
  status: WorkHistoryStatus;
  summaryMode: WorkHistorySummaryMode;
};

export type WorkHistoryServices = {
  loadHistory?: (input: WorkHistoryRequest) => Promise<AppResult<WorkHistoryData>>;
};

type WorkHistoryAction =
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'clear_filters' }
  | { type: 'entry_mode_changed'; entryMode: WorkEntryMode | 'all' }
  | { type: 'filter_field_changed'; field: 'dateFrom' | 'dateTo' | 'noteSearch'; value: string }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; append: boolean; data: WorkHistoryData }
  | { type: 'paid_changed'; paid: WorkHistoryPaidFilter | 'all' }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'sort_changed'; sort: WorkHistorySort }
  | { type: 'summary_mode_changed'; summaryMode: WorkHistorySummaryMode }
  | { type: 'topic_selected'; topicId: string | null }
  | { type: 'validation_failed'; error: AppError };

export const defaultWorkHistoryFilterDraft: WorkHistoryFilterDraft = {
  categoryId: null,
  dateFrom: '',
  dateTo: '',
  entryMode: 'all',
  noteSearch: '',
  paid: 'all',
  topicId: null,
};

export const initialWorkHistoryState: WorkHistoryState = {
  data: null,
  filterDraft: defaultWorkHistoryFilterDraft,
  filterError: null,
  loadError: null,
  sort: 'date_desc',
  status: 'loading',
  summaryMode: 'day',
};

export function buildWorkHistoryRequest(
  state: WorkHistoryState,
  { append = false }: { append?: boolean } = {},
): AppResult<WorkHistoryRequest> {
  return {
    ok: true,
    value: {
      categoryId: state.filterDraft.categoryId,
      dateFrom: state.filterDraft.dateFrom,
      dateTo: state.filterDraft.dateTo,
      entryMode: state.filterDraft.entryMode === 'all' ? null : state.filterDraft.entryMode,
      noteSearch: state.filterDraft.noteSearch,
      offset: append ? (state.data?.page.offset ?? 0) + (state.data?.records.length ?? 0) : 0,
      paid: state.filterDraft.paid === 'all' ? null : state.filterDraft.paid,
      sort: state.sort,
      summaryMode: state.summaryMode,
      topicId: state.filterDraft.topicId,
    },
  };
}

export function workHistoryReducer(state: WorkHistoryState, action: WorkHistoryAction): WorkHistoryState {
  switch (action.type) {
    case 'category_selected':
      return {
        ...state,
        filterDraft: { ...state.filterDraft, categoryId: action.categoryId },
        filterError: null,
      };
    case 'clear_filters':
      return {
        ...state,
        filterDraft: defaultWorkHistoryFilterDraft,
        filterError: null,
      };
    case 'entry_mode_changed':
      return {
        ...state,
        filterDraft: { ...state.filterDraft, entryMode: action.entryMode },
        filterError: null,
      };
    case 'filter_field_changed':
      return {
        ...state,
        filterDraft: { ...state.filterDraft, [action.field]: action.value },
        filterError: null,
      };
    case 'load_failed':
      return { ...state, loadError: action.error, status: 'failed' };
    case 'load_started':
      return { ...state, filterError: null, loadError: null, status: 'loading' };
    case 'load_succeeded':
      return {
        ...state,
        data:
          action.append && state.data
            ? {
                ...action.data,
                records: [...state.data.records, ...action.data.records],
              }
            : action.data,
        filterError: null,
        loadError: null,
        status: 'ready',
      };
    case 'paid_changed':
      return {
        ...state,
        filterDraft: { ...state.filterDraft, paid: action.paid },
        filterError: null,
      };
    case 'preferences_needed':
      return { ...state, loadError: action.error, status: 'preferences_needed' };
    case 'sort_changed':
      return { ...state, sort: action.sort };
    case 'summary_mode_changed':
      return { ...state, summaryMode: action.summaryMode };
    case 'topic_selected':
      return {
        ...state,
        filterDraft: { ...state.filterDraft, topicId: action.topicId },
        filterError: null,
      };
    case 'validation_failed':
      return { ...state, filterError: action.error, status: 'ready' };
    default:
      return state;
  }
}

export function useWorkHistory(services: WorkHistoryServices = {}) {
  const [state, dispatch] = useReducer(workHistoryReducer, initialWorkHistoryState);
  const isMounted = useRef(false);
  const loadHistory = services.loadHistory ?? loadWorkHistory;

  const runLoad = useCallback(
    ({ append = false }: { append?: boolean } = {}) => {
      const request = buildWorkHistoryRequest(state, { append });

      if (!request.ok) {
        dispatch({ error: request.error, type: 'validation_failed' });
        return;
      }

      dispatch({ type: 'load_started' });
      void loadHistory(request.value).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ append, data: result.value, type: 'load_succeeded' });
          return;
        }

        dispatch({ error: result.error, type: result.error.recovery === 'settings' ? 'preferences_needed' : 'load_failed' });
      });
    },
    [loadHistory, state],
  );

  const applyFilters = useCallback(() => runLoad(), [runLoad]);
  const loadMore = useCallback(() => runLoad({ append: true }), [runLoad]);
  const clearFilters = useCallback(() => {
    dispatch({ type: 'clear_filters' });
    dispatch({ type: 'load_started' });
    void loadHistory({
      sort: state.sort,
      summaryMode: state.summaryMode,
    }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ append: false, data: result.value, type: 'load_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: result.error.recovery === 'settings' ? 'preferences_needed' : 'load_failed' });
    });
  }, [loadHistory, state.sort, state.summaryMode]);

  useEffect(() => {
    isMounted.current = true;
    dispatch({ type: 'load_started' });
    void loadHistory({
      sort: initialWorkHistoryState.sort,
      summaryMode: initialWorkHistoryState.summaryMode,
    }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ append: false, data: result.value, type: 'load_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: result.error.recovery === 'settings' ? 'preferences_needed' : 'load_failed' });
    });

    return () => {
      isMounted.current = false;
    };
  }, [loadHistory]);

  return {
    applyFilters,
    clearFilters,
    loadMore,
    reload: () => runLoad(),
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    selectTopic: (topicId: string | null) => dispatch({ topicId, type: 'topic_selected' }),
    setEntryMode: (entryMode: WorkEntryMode | 'all') => dispatch({ entryMode, type: 'entry_mode_changed' }),
    setPaid: (paid: WorkHistoryPaidFilter | 'all') => dispatch({ paid, type: 'paid_changed' }),
    setSort: (sort: WorkHistorySort) => dispatch({ sort, type: 'sort_changed' }),
    setSummaryMode: (summaryMode: WorkHistorySummaryMode) => dispatch({ summaryMode, type: 'summary_mode_changed' }),
    state,
    updateFilterField: (field: 'dateFrom' | 'dateTo' | 'noteSearch', value: string) =>
      dispatch({ field, type: 'filter_field_changed', value }),
  };
}
