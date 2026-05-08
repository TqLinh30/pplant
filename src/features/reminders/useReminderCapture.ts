import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import { asLocalDate, formatDateAsLocalDate } from '@/domain/common/date-rules';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import {
  asOptionalReminderLocalDate,
  asReminderFrequency,
  asReminderLocalTime,
  asReminderNotes,
  asReminderOwnerKind,
  asReminderTitle,
} from '@/domain/reminders/schemas';
import type {
  ReminderFrequency,
  ReminderOwnerKind,
  ReminderScheduleState,
} from '@/domain/reminders/types';
import type { Task, TaskRecurrenceRule } from '@/domain/tasks/types';
import {
  markActiveCaptureDraftSaved,
  type MarkActiveCaptureDraftSavedRequest,
  type SaveActiveCaptureDraftRequest,
} from '@/services/capture-drafts/capture-draft.service';
import {
  createReminder,
  deleteReminder as deleteReminderService,
  disableReminder as disableReminderService,
  enableReminder as enableReminderService,
  loadReminderData,
  pauseReminder as pauseReminderService,
  resumeReminder as resumeReminderService,
  skipReminderOccurrence,
  snoozeReminder as snoozeReminderService,
  updateReminder as updateReminderService,
  type ReminderData,
  type ReminderMutationResult,
  type ReminderRequest,
  type ReminderRuleView,
  type ReminderScheduleMode,
} from '@/services/reminders/reminder.service';
import {
  isReminderCaptureDraftMeaningful,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { useCaptureDraftPersistence } from '@/features/capture-drafts/useCaptureDraftPersistence';

export type ReminderCaptureStatus = 'failed' | 'loading' | 'ready' | 'saved' | 'saving';
export type ReminderCaptureMutation =
  | 'created'
  | 'deleted'
  | 'disabled'
  | 'enabled'
  | 'local_only'
  | 'paused'
  | 'resumed'
  | 'skipped'
  | 'snoozed'
  | 'updated';

export type ReminderCaptureDraft = {
  endsOnLocalDate: string;
  frequency: ReminderFrequency;
  notes: string;
  ownerKind: ReminderOwnerKind;
  reminderLocalTime: string;
  skipLocalDate: string;
  startsOnLocalDate: string;
  taskId: string | null;
  taskRecurrenceRuleId: string | null;
  title: string;
};

export type ReminderCaptureFieldErrors = Partial<Record<keyof ReminderCaptureDraft, string>>;

export type ReminderCaptureState = {
  actionError: AppError | null;
  draft: ReminderCaptureDraft;
  editingReminderId: string | null;
  fieldErrors: ReminderCaptureFieldErrors;
  lastMutation: ReminderCaptureMutation | null;
  loadError: AppError | null;
  occurrenceDate: string | null;
  recentTasks: Task[];
  reminders: ReminderRuleView[];
  savedReminder: ReminderMutationResult['reminder'] | null;
  status: ReminderCaptureStatus;
  taskRecurrenceRules: TaskRecurrenceRule[];
};

export type ReminderCaptureServices = {
  createReminder?: (input: ReminderRequest) => Promise<AppResult<ReminderMutationResult>>;
  deleteReminder?: (id: string) => Promise<AppResult<ReminderMutationResult>>;
  disableReminder?: (id: string) => Promise<AppResult<ReminderMutationResult>>;
  enableReminder?: (id: string) => Promise<AppResult<ReminderMutationResult>>;
  loadData?: () => Promise<AppResult<ReminderData>>;
  markDraftSaved?: (input: MarkActiveCaptureDraftSavedRequest) => Promise<AppResult<CaptureDraft | null>>;
  now?: () => Date;
  pauseReminder?: (id: string) => Promise<AppResult<ReminderMutationResult>>;
  resumeReminder?: (id: string) => Promise<AppResult<ReminderMutationResult>>;
  skipOccurrence?: (id: string, occurrenceLocalDate?: string | null) => Promise<AppResult<string>>;
  snoozeReminder?: (
    id: string,
    occurrenceLocalDate?: string | null,
    minutes?: number,
  ) => Promise<AppResult<ReminderMutationResult>>;
  saveDraft?: (input: SaveActiveCaptureDraftRequest) => Promise<AppResult<CaptureDraft>>;
  updateReminder?: (input: ReminderRequest & { id: string }) => Promise<AppResult<ReminderMutationResult>>;
};

type ReminderCaptureAction =
  | { type: 'action_started' }
  | { type: 'action_failed'; error: AppError }
  | { type: 'draft_applied'; draft: ReminderCaptureDraft }
  | { type: 'edit_cancelled'; nextDraft: ReminderCaptureDraft }
  | { type: 'edit_started'; view: ReminderRuleView }
  | { type: 'field_changed'; field: 'endsOnLocalDate' | 'notes' | 'reminderLocalTime' | 'skipLocalDate' | 'startsOnLocalDate' | 'title'; value: string }
  | { type: 'frequency_changed'; frequency: ReminderFrequency }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: ReminderData }
  | { type: 'mutation_succeeded'; data: ReminderData; mutation: ReminderCaptureMutation; result: ReminderMutationResult }
  | { type: 'owner_changed'; ownerKind: ReminderOwnerKind }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; data: ReminderData; mutation: ReminderCaptureMutation; nextDraft: ReminderCaptureDraft; result: ReminderMutationResult }
  | { type: 'task_owner_selected'; taskId: string | null }
  | { type: 'task_recurrence_owner_selected'; taskRecurrenceRuleId: string | null }
  | { type: 'validation_failed'; fieldErrors: ReminderCaptureFieldErrors }
  | { type: 'skip_started' }
  | { type: 'skip_succeeded'; data: ReminderData; occurrenceDate: string };

export function createDefaultReminderCaptureDraft(now = new Date()): ReminderCaptureDraft {
  return {
    endsOnLocalDate: '',
    frequency: 'once',
    notes: '',
    ownerKind: 'standalone',
    reminderLocalTime: '09:00',
    skipLocalDate: '',
    startsOnLocalDate: formatDateAsLocalDate(now),
    taskId: null,
    taskRecurrenceRuleId: null,
    title: '',
  };
}

function createReminderCaptureDraftFromView(view: ReminderRuleView): ReminderCaptureDraft {
  const reminder = view.reminder;

  return {
    endsOnLocalDate: reminder.endsOnLocalDate ?? '',
    frequency: reminder.frequency,
    notes: reminder.notes ?? '',
    ownerKind: reminder.ownerKind,
    reminderLocalTime: reminder.reminderLocalTime,
    skipLocalDate: '',
    startsOnLocalDate: reminder.startsOnLocalDate,
    taskId: reminder.taskId,
    taskRecurrenceRuleId: reminder.taskRecurrenceRuleId,
    title: reminder.title,
  };
}

export const initialReminderCaptureState: ReminderCaptureState = {
  actionError: null,
  draft: createDefaultReminderCaptureDraft(new Date('2026-01-01T00:00:00.000Z')),
  editingReminderId: null,
  fieldErrors: {},
  lastMutation: null,
  loadError: null,
  occurrenceDate: null,
  recentTasks: [],
  reminders: [],
  savedReminder: null,
  status: 'loading',
  taskRecurrenceRules: [],
};

export function validateReminderCaptureDraft(
  draft: ReminderCaptureDraft,
  scheduleMode: ReminderScheduleMode = 'request',
): AppResult<ReminderRequest> & { fieldErrors?: ReminderCaptureFieldErrors } {
  const fieldErrors: ReminderCaptureFieldErrors = {};
  const ownerKind = asReminderOwnerKind(draft.ownerKind);
  const frequency = asReminderFrequency(draft.frequency);
  const title = asReminderTitle(draft.title);
  const notes = asReminderNotes(draft.notes);
  const startsOnLocalDate = asLocalDate(draft.startsOnLocalDate);
  const endsOnLocalDate = asOptionalReminderLocalDate(draft.endsOnLocalDate);
  const reminderLocalTime = asReminderLocalTime(draft.reminderLocalTime);
  const skipLocalDate = asOptionalReminderLocalDate(draft.skipLocalDate);

  if (!ownerKind.ok) {
    fieldErrors.ownerKind = ownerKind.error.message;
  }

  if (!frequency.ok) {
    fieldErrors.frequency = frequency.error.message;
  }

  if (!title.ok) {
    fieldErrors.title = title.error.message;
  }

  if (!notes.ok) {
    fieldErrors.notes = notes.error.message;
  }

  if (!startsOnLocalDate.ok) {
    fieldErrors.startsOnLocalDate = startsOnLocalDate.error.message;
  }

  if (!endsOnLocalDate.ok) {
    fieldErrors.endsOnLocalDate = endsOnLocalDate.error.message;
  }

  if (!reminderLocalTime.ok) {
    fieldErrors.reminderLocalTime = reminderLocalTime.error.message;
  }

  if (!skipLocalDate.ok) {
    fieldErrors.skipLocalDate = skipLocalDate.error.message;
  }

  if (ownerKind.ok && ownerKind.value === 'task' && !draft.taskId) {
    fieldErrors.taskId = 'Choose a task or switch owner to standalone.';
  }

  if (ownerKind.ok && ownerKind.value === 'task_recurrence' && !draft.taskRecurrenceRuleId) {
    fieldErrors.taskRecurrenceRuleId = 'Choose a recurring task or switch owner to standalone.';
  }

  if (
    startsOnLocalDate.ok &&
    endsOnLocalDate.ok &&
    endsOnLocalDate.value &&
    endsOnLocalDate.value < startsOnLocalDate.value
  ) {
    fieldErrors.endsOnLocalDate = 'End date must be on or after the start date.';
  }

  if (frequency.ok && frequency.value === 'once' && endsOnLocalDate.ok && endsOnLocalDate.value) {
    fieldErrors.endsOnLocalDate = 'One-time reminders do not use an end date.';
  }

  if (
    startsOnLocalDate.ok &&
    skipLocalDate.ok &&
    skipLocalDate.value &&
    skipLocalDate.value < startsOnLocalDate.value
  ) {
    fieldErrors.skipLocalDate = 'Skip date must be on or after the start date.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted reminder fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  if (
    !ownerKind.ok ||
    !frequency.ok ||
    !title.ok ||
    !notes.ok ||
    !startsOnLocalDate.ok ||
    !endsOnLocalDate.ok ||
    !reminderLocalTime.ok ||
    !skipLocalDate.ok
  ) {
    return {
      ...err({
        code: 'validation_failed',
        message: 'Check the highlighted reminder fields.',
        recovery: 'edit',
      }),
      fieldErrors,
    };
  }

  return ok({
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: frequency.value,
    notes: notes.value,
    ownerKind: ownerKind.value,
    reminderLocalTime: reminderLocalTime.value,
    scheduleMode,
    skipLocalDates: skipLocalDate.value ? [skipLocalDate.value] : [],
    startsOnLocalDate: startsOnLocalDate.value,
    taskId: ownerKind.value === 'task' ? draft.taskId : null,
    taskRecurrenceRuleId: ownerKind.value === 'task_recurrence' ? draft.taskRecurrenceRuleId : null,
    title: title.value,
  });
}

function clearFieldError(
  fieldErrors: ReminderCaptureFieldErrors,
  field: keyof ReminderCaptureDraft,
): ReminderCaptureFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

function applyData(state: ReminderCaptureState, data: ReminderData): ReminderCaptureState {
  return {
    ...state,
    loadError: null,
    recentTasks: data.recentTasks,
    reminders: data.reminders,
    taskRecurrenceRules: data.taskRecurrenceRules,
  };
}

export function reminderCaptureReducer(
  state: ReminderCaptureState,
  action: ReminderCaptureAction,
): ReminderCaptureState {
  switch (action.type) {
    case 'action_started':
      return {
        ...state,
        actionError: null,
        occurrenceDate: null,
        status: 'saving',
      };
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'ready',
      };
    case 'draft_applied':
      return {
        ...state,
        actionError: null,
        draft: action.draft,
        editingReminderId: null,
        fieldErrors: {},
        lastMutation: null,
        occurrenceDate: null,
        savedReminder: null,
        status: 'ready',
      };
    case 'edit_cancelled':
      return {
        ...state,
        actionError: null,
        draft: action.nextDraft,
        editingReminderId: null,
        fieldErrors: {},
        lastMutation: null,
      };
    case 'edit_started':
      return {
        ...state,
        actionError: null,
        draft: createReminderCaptureDraftFromView(action.view),
        editingReminderId: action.view.reminder.id,
        fieldErrors: {},
        lastMutation: null,
        occurrenceDate: null,
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
    case 'mutation_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        editingReminderId: null,
        fieldErrors: {},
        lastMutation: action.mutation,
        occurrenceDate: null,
        savedReminder: action.result.reminder,
        status: 'saved',
      };
    case 'owner_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          ownerKind: action.ownerKind,
          taskId: action.ownerKind === 'task' ? state.draft.taskId : null,
          taskRecurrenceRuleId:
            action.ownerKind === 'task_recurrence' ? state.draft.taskRecurrenceRuleId : null,
        },
        fieldErrors: {},
        lastMutation: null,
      };
    case 'save_started':
    case 'skip_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        occurrenceDate: null,
        status: 'saving',
      };
    case 'save_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        draft: action.nextDraft,
        editingReminderId: null,
        fieldErrors: {},
        lastMutation: action.mutation,
        occurrenceDate: null,
        savedReminder: action.result.reminder,
        status: 'saved',
      };
    case 'skip_succeeded':
      return {
        ...applyData(state, action.data),
        actionError: null,
        fieldErrors: {},
        lastMutation: 'skipped',
        occurrenceDate: action.occurrenceDate,
        status: 'saved',
      };
    case 'task_owner_selected':
      return {
        ...state,
        draft: { ...state.draft, taskId: action.taskId },
        fieldErrors: clearFieldError(state.fieldErrors, 'taskId'),
        lastMutation: null,
      };
    case 'task_recurrence_owner_selected':
      return {
        ...state,
        draft: { ...state.draft, taskRecurrenceRuleId: action.taskRecurrenceRuleId },
        fieldErrors: clearFieldError(state.fieldErrors, 'taskRecurrenceRuleId'),
        lastMutation: null,
      };
    case 'validation_failed':
      return { ...state, fieldErrors: action.fieldErrors, status: 'ready' };
    default:
      return state;
  }
}

function mutationFromScheduleState(
  scheduleState: ReminderScheduleState,
  scheduledMutation: Extract<ReminderCaptureMutation, 'created' | 'updated'>,
): ReminderCaptureMutation {
  return scheduleState === 'local_only' ? 'local_only' : scheduledMutation;
}

export function useReminderCapture(services: ReminderCaptureServices = {}) {
  const [state, dispatch] = useReducer(reminderCaptureReducer, {
    ...initialReminderCaptureState,
    draft: createDefaultReminderCaptureDraft(services.now?.() ?? new Date()),
  });
  const isMounted = useRef(false);
  const now = services.now;
  const loadData = services.loadData ?? loadReminderData;
  const createReminderDependency = services.createReminder ?? createReminder;
  const markDraftSaved = services.markDraftSaved ?? markActiveCaptureDraftSaved;
  const defaultDraft = useMemo(
    () => createDefaultReminderCaptureDraft(now?.() ?? new Date()),
    [now],
  );
  const updateReminderDependency = services.updateReminder ?? updateReminderService;
  const deleteReminderDependency = useMemo(
    () => services.deleteReminder ?? ((id: string) => deleteReminderService({ id })),
    [services.deleteReminder],
  );
  const disableReminderDependency = useMemo(
    () => services.disableReminder ?? ((id: string) => disableReminderService({ id })),
    [services.disableReminder],
  );
  const enableReminderDependency = useMemo(
    () => services.enableReminder ?? ((id: string) => enableReminderService({ id })),
    [services.enableReminder],
  );
  const pauseReminderDependency = useMemo(
    () => services.pauseReminder ?? ((id: string) => pauseReminderService({ id })),
    [services.pauseReminder],
  );
  const resumeReminderDependency = useMemo(
    () => services.resumeReminder ?? ((id: string) => resumeReminderService({ id })),
    [services.resumeReminder],
  );
  const skipOccurrenceDependency = useMemo(
    () =>
      services.skipOccurrence ??
      ((id: string, occurrenceLocalDate?: string | null) => skipReminderOccurrence({ id, occurrenceLocalDate })),
    [services.skipOccurrence],
  );
  const snoozeReminderDependency = useMemo(
    () =>
      services.snoozeReminder ??
      ((id: string, occurrenceLocalDate?: string | null, minutes?: number) =>
        snoozeReminderService({ id, minutes, occurrenceLocalDate })),
    [services.snoozeReminder],
  );
  useCaptureDraftPersistence({
    draft: state.draft,
    enabled: state.status === 'ready' && state.editingReminderId === null,
    isMeaningful: useCallback(
      (draft: ReminderCaptureDraft) => isReminderCaptureDraftMeaningful(draft, defaultDraft),
      [defaultDraft],
    ),
    kind: 'reminder',
    saveDraft: services.saveDraft,
    toPayload: toCaptureDraftPayload,
  });

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

  const refreshAfterSkip = useCallback(
    (occurrenceDate: string) => {
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
          occurrenceDate,
          type: 'skip_succeeded',
        });
      });
    },
    [loadData],
  );

  const refreshAfterMutation = useCallback(
    (mutation: ReminderCaptureMutation, mutationResult: ReminderMutationResult) => {
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
          result: mutationResult,
          type: 'mutation_succeeded',
        });
      });
    },
    [loadData],
  );

  const save = useCallback(
    (scheduleMode: ReminderScheduleMode = 'request') => {
      const validation = validateReminderCaptureDraft(state.draft, scheduleMode);

      if (!validation.ok) {
        dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
        return;
      }

      dispatch({ type: 'save_started' });
      const editingReminderId = state.editingReminderId;
      const mutation = editingReminderId ? 'updated' : 'created';
      const request = editingReminderId
        ? updateReminderDependency({ ...validation.value, id: editingReminderId })
        : createReminderDependency(validation.value);

      void request.then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          if (!editingReminderId) {
            void markDraftSaved({
              kind: 'reminder',
              savedRecordId: result.value.reminder.id,
              savedRecordKind: 'reminder',
            });
          }
          void loadData().then((loadResult) => {
            if (!isMounted.current) {
              return;
            }

            if (isErr(loadResult)) {
              dispatch({ error: loadResult.error, type: 'action_failed' });
              return;
            }

            dispatch({
              data: loadResult.value,
              mutation: mutationFromScheduleState(result.value.reminder.scheduleState, mutation),
              nextDraft: createDefaultReminderCaptureDraft(now?.() ?? new Date()),
              result: result.value,
              type: 'save_succeeded',
            });
          });
          return;
        }

        dispatch({ error: result.error, type: 'action_failed' });
      });
    },
    [createReminderDependency, loadData, markDraftSaved, now, state.draft, state.editingReminderId, updateReminderDependency],
  );

  const skipNextOccurrence = useCallback(
    (id: string) => {
      dispatch({ type: 'skip_started' });
      void skipOccurrenceDependency(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterSkip(result.value);
      });
    },
    [refreshAfterSkip, skipOccurrenceDependency],
  );

  const runReminderMutation = useCallback(
    (
      id: string,
      mutation: ReminderCaptureMutation,
      action: (reminderId: string) => Promise<AppResult<ReminderMutationResult>>,
    ) => {
      dispatch({ type: 'action_started' });
      void action(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterMutation(mutation, result.value);
      });
    },
    [refreshAfterMutation],
  );

  const snoozeNextOccurrence = useCallback(
    (id: string) => {
      runReminderMutation(id, 'snoozed', (reminderId) => snoozeReminderDependency(reminderId, null, 30));
    },
    [runReminderMutation, snoozeReminderDependency],
  );

  const pauseReminder = useCallback(
    (id: string) => runReminderMutation(id, 'paused', pauseReminderDependency),
    [pauseReminderDependency, runReminderMutation],
  );

  const resumeReminder = useCallback(
    (id: string) => runReminderMutation(id, 'resumed', resumeReminderDependency),
    [resumeReminderDependency, runReminderMutation],
  );

  const disableReminder = useCallback(
    (id: string) => runReminderMutation(id, 'disabled', disableReminderDependency),
    [disableReminderDependency, runReminderMutation],
  );

  const enableReminder = useCallback(
    (id: string) => runReminderMutation(id, 'enabled', enableReminderDependency),
    [enableReminderDependency, runReminderMutation],
  );

  const deleteReminder = useCallback(
    (id: string) => runReminderMutation(id, 'deleted', deleteReminderDependency),
    [deleteReminderDependency, runReminderMutation],
  );

  const startEdit = useCallback((view: ReminderRuleView) => dispatch({ type: 'edit_started', view }), []);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    applyDraft: (draft: ReminderCaptureDraft) => dispatch({ draft, type: 'draft_applied' }),
    cancelEdit: () =>
      dispatch({ nextDraft: createDefaultReminderCaptureDraft(now?.() ?? new Date()), type: 'edit_cancelled' }),
    deleteReminder,
    disableReminder,
    enableReminder,
    reload,
    resumeReminder,
    pauseReminder,
    save,
    saveLocalOnly: () => save('local_only'),
    selectTaskOwner: (taskId: string | null) => dispatch({ taskId, type: 'task_owner_selected' }),
    selectTaskRecurrenceOwner: (taskRecurrenceRuleId: string | null) =>
      dispatch({ taskRecurrenceRuleId, type: 'task_recurrence_owner_selected' }),
    setFrequency: (frequency: ReminderFrequency) => dispatch({ frequency, type: 'frequency_changed' }),
    setOwnerKind: (ownerKind: ReminderOwnerKind) => dispatch({ ownerKind, type: 'owner_changed' }),
    skipNextOccurrence,
    snoozeNextOccurrence,
    startEdit,
    state,
    updateField: (
      field: 'endsOnLocalDate' | 'notes' | 'reminderLocalTime' | 'skipLocalDate' | 'startsOnLocalDate' | 'title',
      value: string,
    ) => dispatch({ field, type: 'field_changed', value }),
  };
}
