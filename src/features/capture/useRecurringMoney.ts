import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { CategoryTopicItem } from '@/domain/categories/types';
import type { AppError } from '@/domain/common/app-error';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { formatMinorUnitsForInput } from '@/domain/common/money';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  asMoneyRecordKind,
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
  parseManualMoneyAmountInput,
} from '@/domain/money/schemas';
import type { MoneyRecordKind } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { asRecurrenceFrequency } from '@/domain/recurrence/schemas';
import type { RecurrenceFrequency, RecurrenceRule } from '@/domain/recurrence/types';
import {
  createRecurringMoneyRule,
  deleteRecurringMoneyRule,
  generateDueRecurringMoneyOccurrences,
  loadRecurringMoneyData,
  pauseRecurringMoneyRule,
  resumeRecurringMoneyRule,
  skipRecurringMoneyOccurrence,
  stopRecurringMoneyRule,
  updateRecurringMoneyRule,
  type GenerateDueRecurringMoneyResult,
  type RecurringMoneyData,
  type RecurringMoneyRuleRequest,
  type RecurringMoneyRuleView,
} from '@/services/money/recurring-money.service';

import { formatTodayLocalDate } from './useManualMoneyCapture';

export type RecurringMoneyStatus = 'failed' | 'loading' | 'preferences_needed' | 'ready' | 'saved' | 'saving';
export type RecurringMoneyMutation =
  | 'created'
  | 'deleted'
  | 'generated'
  | 'paused'
  | 'resumed'
  | 'skipped'
  | 'stopped'
  | 'updated';

export type RecurringMoneyDraft = {
  amount: string;
  categoryId: string | null;
  endsOnLocalDate: string;
  frequency: RecurrenceFrequency;
  kind: MoneyRecordKind;
  merchantOrSource: string;
  note: string;
  startsOnLocalDate: string;
  topicIds: string[];
};

export type RecurringMoneyFieldErrors = Partial<Record<keyof RecurringMoneyDraft, string>>;

export type RecurringMoneyState = {
  actionError: AppError | null;
  categories: CategoryTopicItem[];
  draft: RecurringMoneyDraft;
  editingRuleId: string | null;
  fieldErrors: RecurringMoneyFieldErrors;
  generatedCount: number | null;
  lastMutation: RecurringMoneyMutation | null;
  loadError: AppError | null;
  preferences: UserPreferences | null;
  rules: RecurringMoneyRuleView[];
  skippedDate: string | null;
  skippedExistingCount: number | null;
  status: RecurringMoneyStatus;
  topics: CategoryTopicItem[];
};

export type RecurringMoneyAction =
  | { type: 'action_failed'; error: AppError }
  | {
      type: 'action_succeeded';
      data: RecurringMoneyData;
      generatedCount?: number;
      mutation: RecurringMoneyMutation;
      nextDraft?: RecurringMoneyDraft;
      skippedDate?: string;
      skippedExistingCount?: number;
    }
  | { type: 'action_started' }
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'edit_cancelled'; nextDraft: RecurringMoneyDraft }
  | { type: 'edit_started'; amount: string; view: RecurringMoneyRuleView }
  | {
      type: 'field_changed';
      field: 'amount' | 'endsOnLocalDate' | 'merchantOrSource' | 'note' | 'startsOnLocalDate';
      value: string;
    }
  | { type: 'frequency_changed'; frequency: RecurrenceFrequency }
  | { type: 'kind_changed'; kind: MoneyRecordKind }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: RecurringMoneyData }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'topic_toggled'; topicId: string }
  | { type: 'validation_failed'; fieldErrors: RecurringMoneyFieldErrors };

export type RecurringMoneyServices = {
  createRule?: (input: RecurringMoneyRuleRequest) => Promise<AppResult<RecurrenceRule>>;
  deleteRule?: (id: string) => Promise<AppResult<RecurrenceRule>>;
  generateDue?: () => Promise<AppResult<GenerateDueRecurringMoneyResult>>;
  loadData?: () => Promise<AppResult<RecurringMoneyData>>;
  now?: () => Date;
  pauseRule?: (id: string) => Promise<AppResult<RecurrenceRule>>;
  resumeRule?: (id: string) => Promise<AppResult<RecurrenceRule>>;
  skipNext?: (id: string) => Promise<AppResult<string>>;
  stopRule?: (id: string) => Promise<AppResult<RecurrenceRule>>;
  updateRule?: (id: string, input: RecurringMoneyRuleRequest) => Promise<AppResult<RecurrenceRule>>;
};

export function createDefaultRecurringMoneyDraft(now = new Date()): RecurringMoneyDraft {
  return {
    amount: '',
    categoryId: null,
    endsOnLocalDate: '',
    frequency: 'monthly',
    kind: 'expense',
    merchantOrSource: '',
    note: '',
    startsOnLocalDate: formatTodayLocalDate(now),
    topicIds: [],
  };
}

export const initialRecurringMoneyState: RecurringMoneyState = {
  actionError: null,
  categories: [],
  draft: createDefaultRecurringMoneyDraft(new Date('2026-01-01T00:00:00.000Z')),
  editingRuleId: null,
  fieldErrors: {},
  generatedCount: null,
  lastMutation: null,
  loadError: null,
  preferences: null,
  rules: [],
  skippedDate: null,
  skippedExistingCount: null,
  status: 'loading',
  topics: [],
};

export function validateRecurringMoneyDraft(
  draft: RecurringMoneyDraft,
  preferences: UserPreferences | null,
): AppResult<RecurringMoneyRuleRequest> & { fieldErrors?: RecurringMoneyFieldErrors } {
  if (!preferences) {
    return err(createAppError('not_found', 'Save preferences before adding recurring money.', 'settings'));
  }

  const fieldErrors: RecurringMoneyFieldErrors = {};
  const amount = parseManualMoneyAmountInput(draft.amount, preferences.currencyCode, preferences.locale);
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const endsOnText = draft.endsOnLocalDate.trim();
  const endsOnLocalDate = endsOnText.length > 0 ? asLocalDate(endsOnText) : ok(null);
  const frequency = asRecurrenceFrequency(draft.frequency);
  const kind = asMoneyRecordKind(draft.kind);
  const merchantOrSource = asMoneyRecordMerchantOrSource(draft.merchantOrSource);
  const note = asMoneyRecordNote(draft.note);
  const startsOnLocalDate = asLocalDate(draft.startsOnLocalDate);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);

  if (!amount.ok) {
    fieldErrors.amount = amount.error.message;
  }

  if (!categoryId.ok) {
    fieldErrors.categoryId = categoryId.error.message;
  }

  if (!endsOnLocalDate.ok) {
    fieldErrors.endsOnLocalDate = endsOnLocalDate.error.message;
  }

  if (!frequency.ok) {
    fieldErrors.frequency = frequency.error.message;
  }

  if (!kind.ok) {
    fieldErrors.kind = kind.error.message;
  }

  if (!merchantOrSource.ok) {
    fieldErrors.merchantOrSource = merchantOrSource.error.message;
  }

  if (!note.ok) {
    fieldErrors.note = note.error.message;
  }

  if (!startsOnLocalDate.ok) {
    fieldErrors.startsOnLocalDate = startsOnLocalDate.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (
    startsOnLocalDate.ok &&
    endsOnLocalDate.ok &&
    endsOnLocalDate.value &&
    endsOnLocalDate.value < startsOnLocalDate.value
  ) {
    fieldErrors.endsOnLocalDate = 'End date must be on or after the start date.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted recurring money fields.', 'edit')),
      fieldErrors,
    };
  }

  if (
    !amount.ok ||
    !categoryId.ok ||
    !endsOnLocalDate.ok ||
    !frequency.ok ||
    !kind.ok ||
    !merchantOrSource.ok ||
    !note.ok ||
    !startsOnLocalDate.ok ||
    !topicIds.ok
  ) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted recurring money fields.', 'edit')),
      fieldErrors,
    };
  }

  return ok({
    amountMinor: amount.value,
    categoryId: categoryId.value,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: frequency.value,
    kind: kind.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    startsOnLocalDate: startsOnLocalDate.value,
    topicIds: topicIds.value,
  });
}

function removeFieldError(
  fieldErrors: RecurringMoneyFieldErrors,
  field: keyof RecurringMoneyDraft,
): RecurringMoneyFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

function applyData(state: RecurringMoneyState, data: RecurringMoneyData): RecurringMoneyState {
  return {
    ...state,
    categories: data.categories,
    loadError: null,
    preferences: data.preferences,
    rules: data.rules,
    topics: data.topics,
  };
}

export function recurringMoneyReducer(
  state: RecurringMoneyState,
  action: RecurringMoneyAction,
): RecurringMoneyState {
  switch (action.type) {
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'ready',
      };
    case 'action_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        generatedCount: null,
        skippedDate: null,
        skippedExistingCount: null,
        status: 'saving',
      };
    case 'action_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        draft: action.nextDraft ?? state.draft,
        editingRuleId: null,
        fieldErrors: {},
        generatedCount: action.generatedCount ?? null,
        lastMutation: action.mutation,
        skippedDate: action.skippedDate ?? null,
        skippedExistingCount: action.skippedExistingCount ?? null,
        status: 'saved',
      };
    case 'category_selected':
      return {
        ...state,
        draft: {
          ...state.draft,
          categoryId: action.categoryId,
        },
        fieldErrors: removeFieldError(state.fieldErrors, 'categoryId'),
        lastMutation: null,
      };
    case 'edit_cancelled':
      return {
        ...state,
        actionError: null,
        draft: action.nextDraft,
        editingRuleId: null,
        fieldErrors: {},
        lastMutation: null,
        status: 'ready',
      };
    case 'edit_started':
      return {
        ...state,
        actionError: null,
        draft: {
          amount: action.amount,
          categoryId: action.view.rule.categoryId,
          endsOnLocalDate: action.view.rule.endsOnLocalDate ?? '',
          frequency: action.view.rule.frequency,
          kind: action.view.rule.moneyKind,
          merchantOrSource: action.view.rule.merchantOrSource ?? '',
          note: action.view.rule.note ?? '',
          startsOnLocalDate: action.view.rule.startsOnLocalDate,
          topicIds: action.view.rule.topicIds,
        },
        editingRuleId: action.view.rule.id,
        fieldErrors: {},
        lastMutation: null,
        status: 'ready',
      };
    case 'field_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.field]: action.value,
        },
        fieldErrors: removeFieldError(state.fieldErrors, action.field),
        lastMutation: null,
      };
    case 'frequency_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          frequency: action.frequency,
        },
        fieldErrors: removeFieldError(state.fieldErrors, 'frequency'),
        lastMutation: null,
      };
    case 'kind_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          kind: action.kind,
        },
        fieldErrors: removeFieldError(state.fieldErrors, 'kind'),
        lastMutation: null,
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
        ...applyData(state, action.data),
        actionError: null,
        generatedCount: null,
        lastMutation: null,
        skippedDate: null,
        skippedExistingCount: null,
        status: 'ready',
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        preferences: null,
        status: 'preferences_needed',
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
        fieldErrors: removeFieldError(state.fieldErrors, 'topicIds'),
        lastMutation: null,
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

function formatRuleAmount(rule: RecurrenceRule, preferences: UserPreferences | null): string {
  if (!preferences) {
    return String(rule.amountMinor);
  }

  const formatted = formatMinorUnitsForInput(rule.amountMinor, rule.currencyCode, {
    locale: preferences.locale,
  });

  return formatted.ok ? formatted.value : String(rule.amountMinor);
}

export function useRecurringMoney(services: RecurringMoneyServices = {}) {
  const [state, dispatch] = useReducer(recurringMoneyReducer, {
    ...initialRecurringMoneyState,
    draft: createDefaultRecurringMoneyDraft(services.now?.() ?? new Date()),
  });
  const isMounted = useRef(false);
  const now = services.now;
  const loadData = services.loadData ?? loadRecurringMoneyData;
  const createRule = services.createRule ?? createRecurringMoneyRule;
  const updateRule = useMemo(
    () =>
      services.updateRule ??
      ((id: string, input: RecurringMoneyRuleRequest) => updateRecurringMoneyRule({ ...input, id })),
    [services.updateRule],
  );
  const pauseRule = useMemo(
    () => services.pauseRule ?? ((id: string) => pauseRecurringMoneyRule({ id })),
    [services.pauseRule],
  );
  const resumeRule = useMemo(
    () => services.resumeRule ?? ((id: string) => resumeRecurringMoneyRule({ id })),
    [services.resumeRule],
  );
  const skipNext = useMemo(
    () => services.skipNext ?? ((id: string) => skipRecurringMoneyOccurrence({ id })),
    [services.skipNext],
  );
  const stopRule = useMemo(
    () => services.stopRule ?? ((id: string) => stopRecurringMoneyRule({ id })),
    [services.stopRule],
  );
  const deleteRule = useMemo(
    () => services.deleteRule ?? ((id: string) => deleteRecurringMoneyRule({ id })),
    [services.deleteRule],
  );
  const generateDue = useMemo(
    () => services.generateDue ?? (() => generateDueRecurringMoneyOccurrences({})),
    [services.generateDue],
  );

  const dispatchLoadedData = useCallback((result: AppResult<RecurringMoneyData>) => {
    if (result.ok) {
      dispatch({ data: result.value, type: 'load_succeeded' });
      return;
    }

    if (result.error.recovery === 'settings') {
      dispatch({ error: result.error, type: 'preferences_needed' });
      return;
    }

    dispatch({ error: result.error, type: 'load_failed' });
  }, []);

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadData().then((result) => {
      if (!isMounted.current) {
        return;
      }

      dispatchLoadedData(result);
    });
  }, [dispatchLoadedData, loadData]);

  const refreshAfterAction = useCallback(
    (
      mutation: RecurringMoneyMutation,
      options: {
        generatedCount?: number;
        nextDraft?: RecurringMoneyDraft;
        skippedDate?: string;
        skippedExistingCount?: number;
      } = {},
    ) => {
      void loadData().then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        dispatch({
          data: result.value,
          generatedCount: options.generatedCount,
          mutation,
          nextDraft: options.nextDraft,
          skippedDate: options.skippedDate,
          skippedExistingCount: options.skippedExistingCount,
          type: 'action_succeeded',
        });
      });
    },
    [loadData],
  );

  const save = useCallback(() => {
    const validation = validateRecurringMoneyDraft(state.draft, state.preferences);

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'action_started' });

    if (state.editingRuleId) {
      void updateRule(state.editingRuleId, validation.value).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          refreshAfterAction('updated', {
            nextDraft: createDefaultRecurringMoneyDraft(now?.() ?? new Date()),
          });
          return;
        }

        dispatch({ error: result.error, type: 'action_failed' });
      });
      return;
    }

    void createRule(validation.value).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        refreshAfterAction('created', {
          nextDraft: {
            ...createDefaultRecurringMoneyDraft(now?.() ?? new Date()),
            frequency: state.draft.frequency,
            kind: state.draft.kind,
            startsOnLocalDate: state.draft.startsOnLocalDate,
          },
        });
        return;
      }

      dispatch({ error: result.error, type: 'action_failed' });
    });
  }, [createRule, now, refreshAfterAction, state.draft, state.editingRuleId, state.preferences, updateRule]);

  const startEdit = useCallback(
    (view: RecurringMoneyRuleView) => {
      dispatch({
        amount: formatRuleAmount(view.rule, state.preferences),
        type: 'edit_started',
        view,
      });
    },
    [state.preferences],
  );

  const cancelEdit = useCallback(() => {
    dispatch({
      nextDraft: createDefaultRecurringMoneyDraft(now?.() ?? new Date()),
      type: 'edit_cancelled',
    });
  }, [now]);

  const runRuleAction = useCallback(
    (id: string, mutation: RecurringMoneyMutation, action: (ruleId: string) => Promise<AppResult<unknown>>) => {
      dispatch({ type: 'action_started' });
      void action(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterAction(mutation);
      });
    },
    [refreshAfterAction],
  );

  const skipNextOccurrence = useCallback(
    (id: string) => {
      dispatch({ type: 'action_started' });
      void skipNext(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterAction('skipped', { skippedDate: result.value });
      });
    },
    [refreshAfterAction, skipNext],
  );

  const generateDueOccurrences = useCallback(() => {
    dispatch({ type: 'action_started' });
    void generateDue().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (isErr(result)) {
        dispatch({ error: result.error, type: 'action_failed' });
        return;
      }

      refreshAfterAction('generated', {
        generatedCount: result.value.generatedRecords.length,
        skippedExistingCount: result.value.skippedExistingCount,
      });
    });
  }, [generateDue, refreshAfterAction]);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    cancelEdit,
    deleteRule: (id: string) => runRuleAction(id, 'deleted', deleteRule),
    generateDueOccurrences,
    pauseRule: (id: string) => runRuleAction(id, 'paused', pauseRule),
    reload,
    resumeRule: (id: string) => runRuleAction(id, 'resumed', resumeRule),
    save,
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    setFrequency: (frequency: RecurrenceFrequency) => dispatch({ frequency, type: 'frequency_changed' }),
    setKind: (kind: MoneyRecordKind) => dispatch({ kind, type: 'kind_changed' }),
    skipNextOccurrence,
    startEdit,
    state,
    stopRule: (id: string) => runRuleAction(id, 'stopped', stopRule),
    toggleTopic: (topicId: string) => dispatch({ topicId, type: 'topic_toggled' }),
    updateField: (
      field: 'amount' | 'endsOnLocalDate' | 'merchantOrSource' | 'note' | 'startsOnLocalDate',
      value: string,
    ) => dispatch({ field, type: 'field_changed', value }),
  };
}
