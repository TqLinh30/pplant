import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { CategoryTopicItem } from '@/domain/categories/types';
import type { AppError } from '@/domain/common/app-error';
import { formatDateAsLocalDate } from '@/domain/common/date-rules';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import { asRecurrenceFrequency } from '@/domain/recurrence/schemas';
import type { RecurrenceFrequency } from '@/domain/recurrence/types';
import { asOptionalTaskRecurrenceLocalDate, asTaskRecurrenceKind } from '@/domain/tasks/task-recurrence';
import {
  asTaskNotes,
  asTaskPriority,
  asTaskTitle,
} from '@/domain/tasks/schemas';
import type { TaskPriority, TaskRecurrenceKind } from '@/domain/tasks/types';
import {
  completeTaskRecurrenceOccurrence,
  createTaskRecurrenceRule,
  deleteTaskRecurrenceRule,
  loadTaskRecurrenceData,
  pauseTaskRecurrenceRule,
  resumeTaskRecurrenceRule,
  skipTaskRecurrenceOccurrence,
  stopTaskRecurrenceRule,
  undoTaskRecurrenceCompletion,
  updateTaskRecurrenceRule,
  type TaskRecurrenceData,
  type TaskRecurrenceMutationResult,
  type TaskRecurrenceRuleRequest,
  type TaskRecurrenceRuleView,
} from '@/services/tasks/task-recurrence.service';

export type TaskRecurrenceStatus = 'failed' | 'loading' | 'ready' | 'saved' | 'saving';
export type TaskRecurrenceMutation =
  | 'completed'
  | 'created'
  | 'deleted'
  | 'paused'
  | 'resumed'
  | 'skipped'
  | 'stopped'
  | 'undone'
  | 'updated';

export type TaskRecurrenceDraft = {
  categoryId: string | null;
  endsOnLocalDate: string;
  frequency: RecurrenceFrequency;
  kind: TaskRecurrenceKind;
  notes: string;
  priority: TaskPriority;
  startsOnLocalDate: string;
  title: string;
  topicIds: string[];
};

export type TaskRecurrenceFieldErrors = Partial<Record<keyof TaskRecurrenceDraft, string>>;

export type TaskRecurrenceState = {
  actionError: AppError | null;
  categories: CategoryTopicItem[];
  draft: TaskRecurrenceDraft;
  editingRuleId: string | null;
  fieldErrors: TaskRecurrenceFieldErrors;
  lastMutation: TaskRecurrenceMutation | null;
  loadError: AppError | null;
  occurrenceDate: string | null;
  rules: TaskRecurrenceRuleView[];
  status: TaskRecurrenceStatus;
  topics: CategoryTopicItem[];
};

export type TaskRecurrenceAction =
  | { type: 'action_failed'; error: AppError }
  | {
      type: 'action_succeeded';
      data: TaskRecurrenceData;
      mutation: TaskRecurrenceMutation;
      nextDraft?: TaskRecurrenceDraft;
      occurrenceDate?: string;
    }
  | { type: 'action_started' }
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'edit_cancelled'; nextDraft: TaskRecurrenceDraft }
  | { type: 'edit_started'; view: TaskRecurrenceRuleView }
  | { type: 'field_changed'; field: 'endsOnLocalDate' | 'notes' | 'startsOnLocalDate' | 'title'; value: string }
  | { type: 'frequency_changed'; frequency: RecurrenceFrequency }
  | { type: 'kind_changed'; kind: TaskRecurrenceKind }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: TaskRecurrenceData }
  | { type: 'priority_changed'; priority: TaskPriority }
  | { type: 'topic_toggled'; topicId: string }
  | { type: 'validation_failed'; fieldErrors: TaskRecurrenceFieldErrors };

export type TaskRecurrenceServices = {
  completeOccurrence?: (id: string, occurrenceLocalDate: string) => Promise<AppResult<string>>;
  createRule?: (input: TaskRecurrenceRuleRequest) => Promise<AppResult<TaskRecurrenceMutationResult>>;
  deleteRule?: (id: string) => Promise<AppResult<TaskRecurrenceMutationResult>>;
  loadData?: () => Promise<AppResult<TaskRecurrenceData>>;
  now?: () => Date;
  pauseRule?: (id: string) => Promise<AppResult<TaskRecurrenceMutationResult>>;
  resumeRule?: (id: string) => Promise<AppResult<TaskRecurrenceMutationResult>>;
  skipOccurrence?: (id: string, occurrenceLocalDate?: string | null) => Promise<AppResult<string>>;
  stopRule?: (id: string) => Promise<AppResult<TaskRecurrenceMutationResult>>;
  undoCompletion?: (id: string, occurrenceLocalDate: string) => Promise<AppResult<string>>;
  updateRule?: (id: string, input: TaskRecurrenceRuleRequest) => Promise<AppResult<TaskRecurrenceMutationResult>>;
};

export function createDefaultTaskRecurrenceDraft(now = new Date()): TaskRecurrenceDraft {
  return {
    categoryId: null,
    endsOnLocalDate: '',
    frequency: 'weekly',
    kind: 'task',
    notes: '',
    priority: 'high',
    startsOnLocalDate: formatDateAsLocalDate(now),
    title: '',
    topicIds: [],
  };
}

export const initialTaskRecurrenceState: TaskRecurrenceState = {
  actionError: null,
  categories: [],
  draft: createDefaultTaskRecurrenceDraft(new Date('2026-01-01T00:00:00.000Z')),
  editingRuleId: null,
  fieldErrors: {},
  lastMutation: null,
  loadError: null,
  occurrenceDate: null,
  rules: [],
  status: 'loading',
  topics: [],
};

export function validateTaskRecurrenceDraft(
  draft: TaskRecurrenceDraft,
): AppResult<TaskRecurrenceRuleRequest> & { fieldErrors?: TaskRecurrenceFieldErrors } {
  const fieldErrors: TaskRecurrenceFieldErrors = {};
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const endsOnLocalDate = asOptionalTaskRecurrenceLocalDate(draft.endsOnLocalDate);
  const frequency = asRecurrenceFrequency(draft.frequency);
  const kind = asTaskRecurrenceKind(draft.kind);
  const notes = asTaskNotes(draft.notes);
  const priority = asTaskPriority(draft.priority);
  const startsOnLocalDate = asOptionalTaskRecurrenceLocalDate(draft.startsOnLocalDate);
  const title = asTaskTitle(draft.title);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);

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

  if (!notes.ok) {
    fieldErrors.notes = notes.error.message;
  }

  if (!priority.ok) {
    fieldErrors.priority = priority.error.message;
  }

  if (!startsOnLocalDate.ok || !startsOnLocalDate.value) {
    fieldErrors.startsOnLocalDate = !startsOnLocalDate.ok
      ? startsOnLocalDate.error.message
      : 'Start date is required.';
  }

  if (!title.ok) {
    fieldErrors.title = title.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (
    startsOnLocalDate.ok &&
    startsOnLocalDate.value &&
    endsOnLocalDate.ok &&
    endsOnLocalDate.value &&
    endsOnLocalDate.value < startsOnLocalDate.value
  ) {
    fieldErrors.endsOnLocalDate = 'End date must be on or after the start date.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted recurring task fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  if (
    !categoryId.ok ||
    !endsOnLocalDate.ok ||
    !frequency.ok ||
    !kind.ok ||
    !notes.ok ||
    !priority.ok ||
    !startsOnLocalDate.ok ||
    !startsOnLocalDate.value ||
    !title.ok ||
    !topicIds.ok
  ) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted recurring task fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  return ok({
    categoryId: categoryId.value,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: frequency.value,
    kind: kind.value,
    notes: notes.value,
    priority: priority.value,
    startsOnLocalDate: startsOnLocalDate.value,
    title: title.value,
    topicIds: topicIds.value,
  });
}

function clearFieldError(
  fieldErrors: TaskRecurrenceFieldErrors,
  field: keyof TaskRecurrenceDraft,
): TaskRecurrenceFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

function applyData(state: TaskRecurrenceState, data: TaskRecurrenceData): TaskRecurrenceState {
  return {
    ...state,
    categories: data.categories,
    loadError: null,
    rules: data.rules,
    topics: data.topics,
  };
}

export function taskRecurrenceReducer(
  state: TaskRecurrenceState,
  action: TaskRecurrenceAction,
): TaskRecurrenceState {
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
        occurrenceDate: null,
        status: 'saving',
      };
    case 'action_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        draft: action.nextDraft ?? state.draft,
        editingRuleId: null,
        fieldErrors: {},
        lastMutation: action.mutation,
        occurrenceDate: action.occurrenceDate ?? null,
        status: 'saved',
      };
    case 'category_selected':
      return {
        ...state,
        draft: { ...state.draft, categoryId: action.categoryId },
        fieldErrors: clearFieldError(state.fieldErrors, 'categoryId'),
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
          categoryId: action.view.rule.categoryId,
          endsOnLocalDate: action.view.rule.endsOnLocalDate ?? '',
          frequency: action.view.rule.frequency,
          kind: action.view.rule.kind,
          notes: action.view.rule.notes ?? '',
          priority: action.view.rule.priority,
          startsOnLocalDate: action.view.rule.startsOnLocalDate,
          title: action.view.rule.title,
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
        draft: { ...state.draft, [action.field]: action.value },
        fieldErrors: clearFieldError(state.fieldErrors, action.field),
        lastMutation: null,
      };
    case 'frequency_changed':
      return {
        ...state,
        draft: { ...state.draft, frequency: action.frequency },
        fieldErrors: clearFieldError(state.fieldErrors, 'frequency'),
        lastMutation: null,
      };
    case 'kind_changed':
      return {
        ...state,
        draft: { ...state.draft, kind: action.kind },
        fieldErrors: clearFieldError(state.fieldErrors, 'kind'),
        lastMutation: null,
      };
    case 'load_failed':
      return { ...state, loadError: action.error, status: 'failed' };
    case 'load_started':
      return { ...state, actionError: null, loadError: null, status: 'loading' };
    case 'load_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        lastMutation: null,
        occurrenceDate: null,
        status: 'ready',
      };
    case 'priority_changed':
      return {
        ...state,
        draft: { ...state.draft, priority: action.priority },
        fieldErrors: clearFieldError(state.fieldErrors, 'priority'),
        lastMutation: null,
      };
    case 'topic_toggled': {
      const topicIds = state.draft.topicIds.includes(action.topicId)
        ? state.draft.topicIds.filter((topicId) => topicId !== action.topicId)
        : [...state.draft.topicIds, action.topicId];

      return {
        ...state,
        draft: { ...state.draft, topicIds },
        fieldErrors: clearFieldError(state.fieldErrors, 'topicIds'),
        lastMutation: null,
      };
    }
    case 'validation_failed':
      return { ...state, fieldErrors: action.fieldErrors, status: 'ready' };
    default:
      return state;
  }
}

export function useTaskRecurrence(services: TaskRecurrenceServices = {}) {
  const [state, dispatch] = useReducer(taskRecurrenceReducer, {
    ...initialTaskRecurrenceState,
    draft: createDefaultTaskRecurrenceDraft(services.now?.() ?? new Date()),
  });
  const isMounted = useRef(false);
  const now = services.now;
  const loadData = services.loadData ?? loadTaskRecurrenceData;
  const createRule = services.createRule ?? createTaskRecurrenceRule;
  const updateRule = useMemo(
    () => services.updateRule ?? ((id: string, input: TaskRecurrenceRuleRequest) => updateTaskRecurrenceRule({ ...input, id })),
    [services.updateRule],
  );
  const pauseRule = useMemo(
    () => services.pauseRule ?? ((id: string) => pauseTaskRecurrenceRule({ id })),
    [services.pauseRule],
  );
  const resumeRule = useMemo(
    () => services.resumeRule ?? ((id: string) => resumeTaskRecurrenceRule({ id })),
    [services.resumeRule],
  );
  const stopRule = useMemo(
    () => services.stopRule ?? ((id: string) => stopTaskRecurrenceRule({ id })),
    [services.stopRule],
  );
  const deleteRule = useMemo(
    () => services.deleteRule ?? ((id: string) => deleteTaskRecurrenceRule({ id })),
    [services.deleteRule],
  );
  const skipOccurrence = useMemo(
    () => services.skipOccurrence ?? ((id: string, occurrenceLocalDate?: string | null) => skipTaskRecurrenceOccurrence({ id, occurrenceLocalDate })),
    [services.skipOccurrence],
  );
  const completeOccurrence = useMemo(
    () => services.completeOccurrence ?? ((id: string, occurrenceLocalDate: string) => completeTaskRecurrenceOccurrence({ id, occurrenceLocalDate })),
    [services.completeOccurrence],
  );
  const undoCompletion = useMemo(
    () => services.undoCompletion ?? ((id: string, occurrenceLocalDate: string) => undoTaskRecurrenceCompletion({ id, occurrenceLocalDate })),
    [services.undoCompletion],
  );

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

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadData]);

  const refreshAfterAction = useCallback(
    (mutation: TaskRecurrenceMutation, options: { nextDraft?: TaskRecurrenceDraft; occurrenceDate?: string } = {}) => {
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
          mutation,
          nextDraft: options.nextDraft,
          occurrenceDate: options.occurrenceDate,
          type: 'action_succeeded',
        });
      });
    },
    [loadData],
  );

  const save = useCallback(() => {
    const validation = validateTaskRecurrenceDraft(state.draft);

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
            nextDraft: createDefaultTaskRecurrenceDraft(now?.() ?? new Date()),
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
            ...createDefaultTaskRecurrenceDraft(now?.() ?? new Date()),
            frequency: state.draft.frequency,
            kind: state.draft.kind,
            startsOnLocalDate: state.draft.startsOnLocalDate,
          },
        });
        return;
      }

      dispatch({ error: result.error, type: 'action_failed' });
    });
  }, [createRule, now, refreshAfterAction, state.draft, state.editingRuleId, updateRule]);

  const runRuleAction = useCallback(
    (id: string, mutation: TaskRecurrenceMutation, action: (ruleId: string) => Promise<AppResult<unknown>>) => {
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

  const runOccurrenceAction = useCallback(
    (
      id: string,
      occurrenceLocalDate: string,
      mutation: TaskRecurrenceMutation,
      action: (ruleId: string, localDate: string) => Promise<AppResult<string>>,
    ) => {
      dispatch({ type: 'action_started' });
      void action(id, occurrenceLocalDate).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterAction(mutation, { occurrenceDate: result.value });
      });
    },
    [refreshAfterAction],
  );

  const skipNextOccurrence = useCallback(
    (id: string) => {
      dispatch({ type: 'action_started' });
      void skipOccurrence(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterAction('skipped', { occurrenceDate: result.value });
      });
    },
    [refreshAfterAction, skipOccurrence],
  );

  const startEdit = useCallback((view: TaskRecurrenceRuleView) => dispatch({ type: 'edit_started', view }), []);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    cancelEdit: () => dispatch({ nextDraft: createDefaultTaskRecurrenceDraft(now?.() ?? new Date()), type: 'edit_cancelled' }),
    completeOccurrence: (id: string, occurrenceLocalDate: string) =>
      runOccurrenceAction(id, occurrenceLocalDate, 'completed', completeOccurrence),
    deleteRule: (id: string) => runRuleAction(id, 'deleted', deleteRule),
    pauseRule: (id: string) => runRuleAction(id, 'paused', pauseRule),
    reload,
    resumeRule: (id: string) => runRuleAction(id, 'resumed', resumeRule),
    save,
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    setFrequency: (frequency: RecurrenceFrequency) => dispatch({ frequency, type: 'frequency_changed' }),
    setKind: (kind: TaskRecurrenceKind) => dispatch({ kind, type: 'kind_changed' }),
    setPriority: (priority: TaskPriority) => dispatch({ priority, type: 'priority_changed' }),
    skipNextOccurrence,
    startEdit,
    state,
    stopRule: (id: string) => runRuleAction(id, 'stopped', stopRule),
    toggleTopic: (topicId: string) => dispatch({ topicId, type: 'topic_toggled' }),
    undoCompletion: (id: string, occurrenceLocalDate: string) =>
      runOccurrenceAction(id, occurrenceLocalDate, 'undone', undoCompletion),
    updateField: (field: 'endsOnLocalDate' | 'notes' | 'startsOnLocalDate' | 'title', value: string) =>
      dispatch({ field, type: 'field_changed', value }),
  };
}
