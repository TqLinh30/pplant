import { useCallback, useEffect, useReducer, useRef } from 'react';

import { parseManualMoneyAmountInput } from '@/domain/money/schemas';
import type { MoneyHistorySort, MoneyHistorySummaryMode, MoneyRecordKind } from '@/domain/money/types';
import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import {
  loadMoneyHistory,
  type MoneyHistoryData,
  type MoneyHistoryRequest,
} from '@/services/money/money-history.service';

export type MoneyHistoryStatus = 'failed' | 'loading' | 'preferences_needed' | 'ready';

export type MoneyHistoryFilterDraft = {
  amountMax: string;
  amountMin: string;
  categoryId: string | null;
  dateFrom: string;
  dateTo: string;
  kind: MoneyRecordKind | 'all';
  merchantOrSource: string;
  topicId: string | null;
};

export type MoneyHistoryState = {
  data: MoneyHistoryData | null;
  filterDraft: MoneyHistoryFilterDraft;
  filterError: AppError | null;
  loadError: AppError | null;
  sort: MoneyHistorySort;
  status: MoneyHistoryStatus;
  summaryMode: MoneyHistorySummaryMode;
};

export type MoneyHistoryServices = {
  loadHistory?: (input: MoneyHistoryRequest) => Promise<AppResult<MoneyHistoryData>>;
};

type MoneyHistoryAction =
  | { type: 'filter_field_changed'; field: 'amountMax' | 'amountMin' | 'dateFrom' | 'dateTo' | 'merchantOrSource'; value: string }
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'clear_filters' }
  | { type: 'kind_changed'; kind: MoneyRecordKind | 'all' }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: MoneyHistoryData; append: boolean }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'summary_mode_changed'; summaryMode: MoneyHistorySummaryMode }
  | { type: 'sort_changed'; sort: MoneyHistorySort }
  | { type: 'topic_selected'; topicId: string | null }
  | { type: 'validation_failed'; error: AppError };

export const defaultMoneyHistoryFilterDraft: MoneyHistoryFilterDraft = {
  amountMax: '',
  amountMin: '',
  categoryId: null,
  dateFrom: '',
  dateTo: '',
  kind: 'all',
  merchantOrSource: '',
  topicId: null,
};

export const initialMoneyHistoryState: MoneyHistoryState = {
  data: null,
  filterDraft: defaultMoneyHistoryFilterDraft,
  filterError: null,
  loadError: null,
  sort: 'date_desc',
  status: 'loading',
  summaryMode: 'day',
};

function parseOptionalAmountInput(value: string, data: MoneyHistoryData | null): AppResult<number | null> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return { ok: true, value: null };
  }

  if (!data) {
    return {
      ok: false,
      error: {
        code: 'not_found',
        message: 'Load preferences before filtering by amount.',
        recovery: 'settings',
      },
    };
  }

  return parseManualMoneyAmountInput(normalized, data.preferences.currencyCode, data.preferences.locale);
}

export function buildMoneyHistoryRequest(
  state: MoneyHistoryState,
  { append = false }: { append?: boolean } = {},
): AppResult<MoneyHistoryRequest> {
  const amountMinorMin = parseOptionalAmountInput(state.filterDraft.amountMin, state.data);
  const amountMinorMax = parseOptionalAmountInput(state.filterDraft.amountMax, state.data);

  if (!amountMinorMin.ok) {
    return amountMinorMin;
  }

  if (!amountMinorMax.ok) {
    return amountMinorMax;
  }

  if (
    amountMinorMin.value !== null &&
    amountMinorMax.value !== null &&
    amountMinorMin.value > amountMinorMax.value
  ) {
    return {
      ok: false,
      error: {
        code: 'validation_failed',
        message: 'Minimum amount must be less than or equal to maximum amount.',
        recovery: 'edit',
      },
    };
  }

  return {
    ok: true,
    value: {
      amountMinorMax: amountMinorMax.value,
      amountMinorMin: amountMinorMin.value,
      categoryId: state.filterDraft.categoryId,
      dateFrom: state.filterDraft.dateFrom,
      dateTo: state.filterDraft.dateTo,
      kind: state.filterDraft.kind === 'all' ? null : state.filterDraft.kind,
      merchantOrSource: state.filterDraft.merchantOrSource,
      offset: append ? (state.data?.page.offset ?? 0) + (state.data?.records.length ?? 0) : 0,
      sort: state.sort,
      summaryMode: state.summaryMode,
      topicId: state.filterDraft.topicId,
    },
  };
}

export function moneyHistoryReducer(state: MoneyHistoryState, action: MoneyHistoryAction): MoneyHistoryState {
  switch (action.type) {
    case 'category_selected':
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          categoryId: action.categoryId,
        },
        filterError: null,
      };
    case 'clear_filters':
      return {
        ...state,
        filterDraft: defaultMoneyHistoryFilterDraft,
        filterError: null,
      };
    case 'filter_field_changed':
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          [action.field]: action.value,
        },
        filterError: null,
      };
    case 'kind_changed':
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          kind: action.kind,
        },
        filterError: null,
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
        filterError: null,
        loadError: null,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        ...state,
        data: action.append && state.data
          ? {
              ...action.data,
              records: [...state.data.records, ...action.data.records],
            }
          : action.data,
        filterError: null,
        loadError: null,
        status: 'ready',
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        status: 'preferences_needed',
      };
    case 'summary_mode_changed':
      return {
        ...state,
        summaryMode: action.summaryMode,
      };
    case 'sort_changed':
      return {
        ...state,
        sort: action.sort,
      };
    case 'topic_selected':
      return {
        ...state,
        filterDraft: {
          ...state.filterDraft,
          topicId: action.topicId,
        },
        filterError: null,
      };
    case 'validation_failed':
      return {
        ...state,
        filterError: action.error,
        status: 'ready',
      };
    default:
      return state;
  }
}

export function useMoneyHistory(services: MoneyHistoryServices = {}) {
  const [state, dispatch] = useReducer(moneyHistoryReducer, initialMoneyHistoryState);
  const isMounted = useRef(false);
  const loadHistory = services.loadHistory ?? loadMoneyHistory;

  const runLoad = useCallback(
    ({ append = false }: { append?: boolean } = {}) => {
      const request = buildMoneyHistoryRequest(state, { append });

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

        if (result.error.recovery === 'settings') {
          dispatch({ error: result.error, type: 'preferences_needed' });
          return;
        }

        dispatch({ error: result.error, type: 'load_failed' });
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
      sort: initialMoneyHistoryState.sort,
      summaryMode: initialMoneyHistoryState.summaryMode,
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
    setKind: (kind: MoneyRecordKind | 'all') => dispatch({ kind, type: 'kind_changed' }),
    setSort: (sort: MoneyHistorySort) => dispatch({ sort, type: 'sort_changed' }),
    setSummaryMode: (summaryMode: MoneyHistorySummaryMode) => dispatch({ summaryMode, type: 'summary_mode_changed' }),
    state,
    updateFilterField: (
      field: 'amountMax' | 'amountMin' | 'dateFrom' | 'dateTo' | 'merchantOrSource',
      value: string,
    ) => dispatch({ field, type: 'filter_field_changed', value }),
  };
}
