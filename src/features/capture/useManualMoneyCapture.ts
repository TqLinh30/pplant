import { useCallback, useEffect, useReducer, useRef } from 'react';

import { asLocalDate } from '@/domain/common/date-rules';
import {
  asMoneyRecordKind,
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
  parseManualMoneyAmountInput,
} from '@/domain/money/schemas';
import type { MoneyRecord, MoneyRecordKind } from '@/domain/money/types';
import type { CategoryTopicItem } from '@/domain/categories/types';
import type { AppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  createManualMoneyRecord,
  loadManualMoneyCaptureData,
  type CreateManualMoneyRecordRequest,
  type ManualMoneyCaptureData,
} from '@/services/money/money-record.service';

export type ManualMoneyCaptureStatus = 'failed' | 'loading' | 'preferences_needed' | 'ready' | 'saved' | 'saving';

export type ManualMoneyCaptureDraft = {
  amount: string;
  categoryId: string | null;
  kind: MoneyRecordKind;
  localDate: string;
  merchantOrSource: string;
  note: string;
  topicIds: string[];
};

export type ManualMoneyCaptureFieldErrors = Partial<Record<keyof ManualMoneyCaptureDraft, string>>;

export type ManualMoneyCaptureState = {
  actionError: AppError | null;
  categories: CategoryTopicItem[];
  draft: ManualMoneyCaptureDraft;
  fieldErrors: ManualMoneyCaptureFieldErrors;
  loadError: AppError | null;
  preferences: UserPreferences | null;
  recentRecords: MoneyRecord[];
  savedRecord: MoneyRecord | null;
  status: ManualMoneyCaptureStatus;
  topics: CategoryTopicItem[];
};

export type ManualMoneyCaptureAction =
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'field_changed'; field: 'amount' | 'localDate' | 'merchantOrSource' | 'note'; value: string }
  | { type: 'kind_changed'; kind: MoneyRecordKind }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: ManualMoneyCaptureData }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; record: MoneyRecord }
  | { type: 'topic_toggled'; topicId: string }
  | { type: 'validation_failed'; fieldErrors: ManualMoneyCaptureFieldErrors };

export type ManualMoneyCaptureServices = {
  createRecord?: (input: CreateManualMoneyRecordRequest) => Promise<AppResult<MoneyRecord>>;
  loadData?: () => Promise<AppResult<ManualMoneyCaptureData>>;
  now?: () => Date;
};

export function formatTodayLocalDate(now = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function createDefaultManualMoneyCaptureDraft(now = new Date()): ManualMoneyCaptureDraft {
  return {
    amount: '',
    categoryId: null,
    kind: 'expense',
    localDate: formatTodayLocalDate(now),
    merchantOrSource: '',
    note: '',
    topicIds: [],
  };
}

export const initialManualMoneyCaptureState: ManualMoneyCaptureState = {
  actionError: null,
  categories: [],
  draft: createDefaultManualMoneyCaptureDraft(new Date('2026-01-01T00:00:00.000Z')),
  fieldErrors: {},
  loadError: null,
  preferences: null,
  recentRecords: [],
  savedRecord: null,
  status: 'loading',
  topics: [],
};

export function validateManualMoneyCaptureDraft(
  draft: ManualMoneyCaptureDraft,
  preferences: UserPreferences | null,
): AppResult<CreateManualMoneyRecordRequest> & { fieldErrors?: ManualMoneyCaptureFieldErrors } {
  if (!preferences) {
    return err({
      code: 'not_found',
      message: 'Save preferences before adding money records.',
      recovery: 'settings',
    });
  }

  const fieldErrors: ManualMoneyCaptureFieldErrors = {};
  const kind = asMoneyRecordKind(draft.kind);
  const amount = parseManualMoneyAmountInput(draft.amount, preferences.currencyCode, preferences.locale);
  const localDate = asLocalDate(draft.localDate);
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);
  const merchantOrSource = asMoneyRecordMerchantOrSource(draft.merchantOrSource);
  const note = asMoneyRecordNote(draft.note);

  if (!kind.ok) {
    fieldErrors.kind = kind.error.message;
  }

  if (!amount.ok) {
    fieldErrors.amount = amount.error.message;
  }

  if (!localDate.ok) {
    fieldErrors.localDate = localDate.error.message;
  }

  if (!categoryId.ok) {
    fieldErrors.categoryId = categoryId.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (!merchantOrSource.ok) {
    fieldErrors.merchantOrSource = merchantOrSource.error.message;
  }

  if (!note.ok) {
    fieldErrors.note = note.error.message;
  }

  if (
    !kind.ok ||
    !amount.ok ||
    !localDate.ok ||
    !categoryId.ok ||
    !topicIds.ok ||
    !merchantOrSource.ok ||
    !note.ok
  ) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted money fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  return ok({
    amountMinor: amount.value,
    categoryId: categoryId.value,
    kind: kind.value,
    localDate: localDate.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    topicIds: topicIds.value,
  });
}

function clearFieldError(
  fieldErrors: ManualMoneyCaptureFieldErrors,
  field: keyof ManualMoneyCaptureDraft,
): ManualMoneyCaptureFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

export function manualMoneyCaptureReducer(
  state: ManualMoneyCaptureState,
  action: ManualMoneyCaptureAction,
): ManualMoneyCaptureState {
  switch (action.type) {
    case 'category_selected':
      return {
        ...state,
        draft: {
          ...state.draft,
          categoryId: action.categoryId,
        },
        fieldErrors: clearFieldError(state.fieldErrors, 'categoryId'),
        savedRecord: null,
      };
    case 'field_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.field]: action.value,
        },
        fieldErrors: clearFieldError(state.fieldErrors, action.field),
        savedRecord: null,
      };
    case 'kind_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          kind: action.kind,
        },
        fieldErrors: clearFieldError(state.fieldErrors, 'kind'),
        savedRecord: null,
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
        ...state,
        categories: action.data.categories,
        loadError: null,
        preferences: action.data.preferences,
        recentRecords: action.data.recentRecords,
        status: 'ready',
        topics: action.data.topics,
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        preferences: null,
        status: 'preferences_needed',
      };
    case 'save_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'ready',
      };
    case 'save_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        status: 'saving',
      };
    case 'save_succeeded':
      return {
        ...state,
        actionError: null,
        draft: {
          ...createDefaultManualMoneyCaptureDraft(),
          kind: state.draft.kind,
          localDate: state.draft.localDate,
        },
        recentRecords: [action.record, ...state.recentRecords.filter((record) => record.id !== action.record.id)],
        savedRecord: action.record,
        status: 'saved',
      };
    case 'topic_toggled': {
      const topicIds = state.draft.topicIds.includes(action.topicId)
        ? state.draft.topicIds.filter((topicId) => topicId !== action.topicId)
        : [...state.draft.topicIds, action.topicId];

      return {
        ...state,
        draft: {
          ...state.draft,
          topicIds,
        },
        fieldErrors: clearFieldError(state.fieldErrors, 'topicIds'),
        savedRecord: null,
      };
    }
    case 'validation_failed':
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        status: 'ready',
      };
    default:
      return state;
  }
}

export function useManualMoneyCapture(services: ManualMoneyCaptureServices = {}) {
  const [state, dispatch] = useReducer(manualMoneyCaptureReducer, {
    ...initialManualMoneyCaptureState,
    draft: createDefaultManualMoneyCaptureDraft(services.now?.() ?? new Date()),
  });
  const isMounted = useRef(false);
  const loadData = services.loadData ?? loadManualMoneyCaptureData;
  const createRecord = services.createRecord ?? createManualMoneyRecord;

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadData().then((result) => {
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
  }, [loadData]);

  const save = useCallback(() => {
    const validation = validateManualMoneyCaptureDraft(state.draft, state.preferences);

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });
    void createRecord(validation.value).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ record: result.value, type: 'save_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: 'save_failed' });
    });
  }, [createRecord, state.draft, state.preferences]);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    reload,
    save,
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    setKind: (kind: MoneyRecordKind) => dispatch({ kind, type: 'kind_changed' }),
    state,
    toggleTopic: (topicId: string) => dispatch({ topicId, type: 'topic_toggled' }),
    updateField: (field: 'amount' | 'localDate' | 'merchantOrSource' | 'note', value: string) =>
      dispatch({ field, type: 'field_changed', value }),
  };
}
