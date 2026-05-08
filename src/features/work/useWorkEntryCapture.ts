import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { CategoryTopicItem } from '@/domain/categories/types';
import type { AppError } from '@/domain/common/app-error';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import {
  formatMinorUnitsForInput,
  parseMoneyAmountInputToMinorUnits,
} from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
} from '@/domain/money/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  markActiveCaptureDraftSaved,
  type MarkActiveCaptureDraftSavedRequest,
  type SaveActiveCaptureDraftRequest,
} from '@/services/capture-drafts/capture-draft.service';
import {
  asLocalTime,
  asWorkEntryMode,
  asWorkEntryNote,
  validateWorkEntryDurationMinutes,
  validateWorkEntryWageMinor,
} from '@/domain/work/schemas';
import { calculateShiftDurationMinutes } from '@/domain/work/work-time';
import type { WorkEntry, WorkEntryMode } from '@/domain/work/types';
import {
  createWorkEntry,
  deleteWorkEntry,
  editWorkEntry,
  loadWorkEntryCaptureData,
  type CreateWorkEntryRequest,
  type WorkEntryCaptureData,
} from '@/services/work/work-entry.service';
import {
  isWorkCaptureDraftMeaningful,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { useCaptureDraftPersistence } from '@/features/capture-drafts/useCaptureDraftPersistence';

import { formatTodayLocalDate } from '@/features/capture/useManualMoneyCapture';

export type WorkEntryCaptureStatus = 'deleted' | 'failed' | 'loading' | 'preferences_needed' | 'ready' | 'saved' | 'saving';
export type WorkEntryCaptureMutation = 'created' | 'deleted' | 'updated';

export type WorkEntryDraft = {
  breakMinutes: string;
  categoryId: string | null;
  durationHours: string;
  endedAtLocalDate: string;
  endedAtLocalTime: string;
  entryMode: WorkEntryMode;
  localDate: string;
  note: string;
  paid: boolean;
  startedAtLocalDate: string;
  startedAtLocalTime: string;
  topicIds: string[];
  wageOverride: string;
};

export type WorkEntryFieldErrors = Partial<Record<keyof WorkEntryDraft, string>>;

export type WorkEntryCaptureState = {
  actionError: AppError | null;
  categories: CategoryTopicItem[];
  deletedEntry: WorkEntry | null;
  draft: WorkEntryDraft;
  editingEntryId: string | null;
  fieldErrors: WorkEntryFieldErrors;
  lastMutation: WorkEntryCaptureMutation | null;
  loadError: AppError | null;
  preferences: UserPreferences | null;
  recentEntries: WorkEntry[];
  savedEntry: WorkEntry | null;
  status: WorkEntryCaptureStatus;
  topics: CategoryTopicItem[];
};

export type WorkEntryCaptureAction =
  | { type: 'category_selected'; categoryId: string | null }
  | { type: 'delete_started' }
  | { type: 'delete_succeeded'; entry: WorkEntry; nextDraft: WorkEntryDraft }
  | { type: 'draft_applied'; draft: WorkEntryDraft }
  | { type: 'edit_cancelled'; nextDraft: WorkEntryDraft }
  | { type: 'edit_started'; draft: WorkEntryDraft; entry: WorkEntry }
  | { type: 'field_changed'; field: keyof Omit<WorkEntryDraft, 'categoryId' | 'entryMode' | 'paid' | 'topicIds'>; value: string }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: WorkEntryCaptureData }
  | { type: 'mode_changed'; entryMode: WorkEntryMode }
  | { type: 'paid_changed'; paid: boolean }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; entry: WorkEntry; mutation: 'created' | 'updated'; nextDraft: WorkEntryDraft }
  | { type: 'topic_toggled'; topicId: string }
  | { type: 'validation_failed'; fieldErrors: WorkEntryFieldErrors };

export type WorkEntryCaptureServices = {
  createEntry?: (input: CreateWorkEntryRequest) => Promise<AppResult<WorkEntry>>;
  deleteEntry?: (id: string) => Promise<AppResult<WorkEntry>>;
  loadData?: () => Promise<AppResult<WorkEntryCaptureData>>;
  markDraftSaved?: (input: MarkActiveCaptureDraftSavedRequest) => Promise<AppResult<CaptureDraft | null>>;
  now?: () => Date;
  saveDraft?: (input: SaveActiveCaptureDraftRequest) => Promise<AppResult<CaptureDraft>>;
  updateEntry?: (id: string, input: CreateWorkEntryRequest) => Promise<AppResult<WorkEntry>>;
};

export function createDefaultWorkEntryDraft(now = new Date()): WorkEntryDraft {
  const today = formatTodayLocalDate(now);

  return {
    breakMinutes: '0',
    categoryId: null,
    durationHours: '',
    endedAtLocalDate: today,
    endedAtLocalTime: '',
    entryMode: 'hours',
    localDate: today,
    note: '',
    paid: true,
    startedAtLocalDate: today,
    startedAtLocalTime: '',
    topicIds: [],
    wageOverride: '',
  };
}

export const initialWorkEntryCaptureState: WorkEntryCaptureState = {
  actionError: null,
  categories: [],
  deletedEntry: null,
  draft: createDefaultWorkEntryDraft(new Date('2026-01-01T00:00:00.000Z')),
  editingEntryId: null,
  fieldErrors: {},
  lastMutation: null,
  loadError: null,
  preferences: null,
  recentEntries: [],
  savedEntry: null,
  status: 'loading',
  topics: [],
};

function parseDurationHours(value: string): AppResult<number> {
  const normalized = value.trim();
  const parsed = Number(normalized);

  if (normalized.length === 0 || !Number.isFinite(parsed)) {
    return err(createAppError('validation_failed', 'Enter work hours.', 'edit'));
  }

  return validateWorkEntryDurationMinutes(Math.round(parsed * 60));
}

function parseBreakMinutes(value: string): AppResult<number> {
  const normalized = value.trim();
  const parsed = normalized.length === 0 ? 0 : Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return err(createAppError('validation_failed', 'Break minutes must be a whole number.', 'edit'));
  }

  return ok(parsed);
}

export function validateWorkEntryDraft(
  draft: WorkEntryDraft,
  preferences: UserPreferences | null,
): AppResult<CreateWorkEntryRequest> & { fieldErrors?: WorkEntryFieldErrors } {
  if (!preferences) {
    return err(createAppError('not_found', 'Save preferences before adding work entries.', 'settings'));
  }

  const fieldErrors: WorkEntryFieldErrors = {};
  const entryMode = asWorkEntryMode(draft.entryMode);
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);
  const note = asWorkEntryNote(draft.note);
  const wageText = draft.wageOverride.trim();
  const wageOverride =
    wageText.length === 0
      ? ok(null)
      : parseMoneyAmountInputToMinorUnits(wageText, preferences.defaultHourlyWage.currency, {
          locale: preferences.locale,
        });

  if (!entryMode.ok) {
    fieldErrors.entryMode = entryMode.error.message;
  }

  if (!categoryId.ok) {
    fieldErrors.categoryId = categoryId.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (!note.ok) {
    fieldErrors.note = note.error.message;
  }

  if (!wageOverride.ok) {
    fieldErrors.wageOverride = wageOverride.error.message;
  } else if (wageOverride.value !== null) {
    const wage = validateWorkEntryWageMinor(wageOverride.value);

    if (!wage.ok) {
      fieldErrors.wageOverride = wage.error.message;
    }
  }

  if (draft.entryMode === 'hours') {
    const localDate = asLocalDate(draft.localDate);
    const durationMinutes = parseDurationHours(draft.durationHours);

    if (!localDate.ok) {
      fieldErrors.localDate = localDate.error.message;
    }

    if (!durationMinutes.ok) {
      fieldErrors.durationHours = durationMinutes.error.message;
    }

    if (Object.keys(fieldErrors).length > 0 || !localDate.ok || !durationMinutes.ok || !wageOverride.ok) {
      return {
        ...err(createAppError('validation_failed', 'Check the highlighted work entry fields.', 'edit')),
        fieldErrors,
      };
    }

    return ok({
      categoryId: categoryId.ok ? categoryId.value : null,
      durationMinutes: durationMinutes.value,
      entryMode: 'hours',
      localDate: localDate.value,
      note: note.ok ? note.value : null,
      paid: draft.paid,
      topicIds: topicIds.ok ? topicIds.value : [],
      wageMinorPerHour: wageOverride.value,
    });
  }

  const breakMinutes = parseBreakMinutes(draft.breakMinutes);
  const startedAtLocalDate = asLocalDate(draft.startedAtLocalDate);
  const startedAtLocalTime = asLocalTime(draft.startedAtLocalTime);
  const endedAtLocalDate = asLocalDate(draft.endedAtLocalDate);
  const endedAtLocalTime = asLocalTime(draft.endedAtLocalTime);

  if (!breakMinutes.ok) {
    fieldErrors.breakMinutes = breakMinutes.error.message;
  }

  if (!startedAtLocalDate.ok) {
    fieldErrors.startedAtLocalDate = startedAtLocalDate.error.message;
  }

  if (!startedAtLocalTime.ok) {
    fieldErrors.startedAtLocalTime = startedAtLocalTime.error.message;
  }

  if (!endedAtLocalDate.ok) {
    fieldErrors.endedAtLocalDate = endedAtLocalDate.error.message;
  }

  if (!endedAtLocalTime.ok) {
    fieldErrors.endedAtLocalTime = endedAtLocalTime.error.message;
  }

  if (breakMinutes.ok && startedAtLocalDate.ok && startedAtLocalTime.ok && endedAtLocalDate.ok && endedAtLocalTime.ok) {
    const duration = calculateShiftDurationMinutes({
      breakMinutes: breakMinutes.value,
      endedAtLocalDate: endedAtLocalDate.value,
      endedAtLocalTime: endedAtLocalTime.value,
      startedAtLocalDate: startedAtLocalDate.value,
      startedAtLocalTime: startedAtLocalTime.value,
    });

    if (!duration.ok) {
      fieldErrors.endedAtLocalDate = duration.error.message;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !wageOverride.ok) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted work entry fields.', 'edit')),
      fieldErrors,
    };
  }

  return ok({
    breakMinutes: breakMinutes.ok ? breakMinutes.value : 0,
    categoryId: categoryId.ok ? categoryId.value : null,
    endedAtLocalDate: endedAtLocalDate.ok ? endedAtLocalDate.value : null,
    endedAtLocalTime: endedAtLocalTime.ok ? endedAtLocalTime.value : null,
    entryMode: 'shift',
    note: note.ok ? note.value : null,
    paid: draft.paid,
    startedAtLocalDate: startedAtLocalDate.ok ? startedAtLocalDate.value : null,
    startedAtLocalTime: startedAtLocalTime.ok ? startedAtLocalTime.value : null,
    topicIds: topicIds.ok ? topicIds.value : [],
    wageMinorPerHour: wageOverride.value,
  });
}

function clearFieldError(
  fieldErrors: WorkEntryFieldErrors,
  field: keyof WorkEntryDraft,
): WorkEntryFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;

  return nextErrors;
}

export function workEntryCaptureReducer(
  state: WorkEntryCaptureState,
  action: WorkEntryCaptureAction,
): WorkEntryCaptureState {
  switch (action.type) {
    case 'category_selected':
      return {
        ...state,
        draft: { ...state.draft, categoryId: action.categoryId },
        fieldErrors: clearFieldError(state.fieldErrors, 'categoryId'),
        lastMutation: null,
      };
    case 'delete_started':
    case 'save_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        status: 'saving',
      };
    case 'delete_succeeded':
      return {
        ...state,
        deletedEntry: action.entry,
        draft: action.nextDraft,
        editingEntryId: null,
        lastMutation: 'deleted',
        recentEntries: state.recentEntries.filter((entry) => entry.id !== action.entry.id),
        savedEntry: null,
        status: 'deleted',
      };
    case 'draft_applied':
      return {
        ...state,
        actionError: null,
        deletedEntry: null,
        draft: action.draft,
        editingEntryId: null,
        fieldErrors: {},
        lastMutation: null,
        savedEntry: null,
        status: 'ready',
      };
    case 'edit_cancelled':
      return {
        ...state,
        actionError: null,
        draft: action.nextDraft,
        editingEntryId: null,
        fieldErrors: {},
        lastMutation: null,
        status: 'ready',
      };
    case 'edit_started':
      return {
        ...state,
        actionError: null,
        deletedEntry: null,
        draft: action.draft,
        editingEntryId: action.entry.id,
        fieldErrors: {},
        lastMutation: null,
        savedEntry: null,
        status: 'ready',
      };
    case 'field_changed':
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.field]: action.value,
        },
        fieldErrors: clearFieldError(state.fieldErrors, action.field),
        lastMutation: null,
      };
    case 'load_failed':
      return { ...state, loadError: action.error, status: 'failed' };
    case 'load_started':
      return { ...state, actionError: null, loadError: null, status: 'loading' };
    case 'load_succeeded':
      return {
        ...state,
        categories: action.data.categories,
        loadError: null,
        preferences: action.data.preferences,
        recentEntries: action.data.recentEntries,
        status: 'ready',
        topics: action.data.topics,
      };
    case 'mode_changed':
      return {
        ...state,
        draft: { ...state.draft, entryMode: action.entryMode },
        fieldErrors: clearFieldError(state.fieldErrors, 'entryMode'),
        lastMutation: null,
      };
    case 'paid_changed':
      return {
        ...state,
        draft: { ...state.draft, paid: action.paid },
        lastMutation: null,
      };
    case 'preferences_needed':
      return { ...state, loadError: action.error, preferences: null, status: 'preferences_needed' };
    case 'save_failed':
      return { ...state, actionError: action.error, status: 'ready' };
    case 'save_succeeded':
      return {
        ...state,
        actionError: null,
        deletedEntry: null,
        draft: {
          ...action.nextDraft,
          entryMode: state.draft.entryMode,
          localDate: state.draft.localDate,
          paid: state.draft.paid,
          startedAtLocalDate: state.draft.startedAtLocalDate,
        },
        editingEntryId: null,
        lastMutation: action.mutation,
        recentEntries: [action.entry, ...state.recentEntries.filter((entry) => entry.id !== action.entry.id)],
        savedEntry: action.entry,
        status: 'saved',
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

function formatHoursForInput(durationMinutes: number): string {
  const hours = durationMinutes / 60;

  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
}

function draftFromEntry(entry: WorkEntry, preferences: UserPreferences | null): WorkEntryDraft {
  const wage =
    entry.wageSource === 'override' && preferences
      ? formatMinorUnitsForInput(entry.wageMinorPerHour, entry.wageCurrencyCode, {
          locale: preferences.locale,
        })
      : { ok: false as const };

  return {
    breakMinutes: String(entry.breakMinutes),
    categoryId: entry.categoryId,
    durationHours: entry.entryMode === 'hours' ? formatHoursForInput(entry.durationMinutes) : '',
    endedAtLocalDate: entry.endedAtLocalDate ?? entry.localDate,
    endedAtLocalTime: entry.endedAtLocalTime ?? '',
    entryMode: entry.entryMode,
    localDate: entry.localDate,
    note: entry.note ?? '',
    paid: entry.paid,
    startedAtLocalDate: entry.startedAtLocalDate ?? entry.localDate,
    startedAtLocalTime: entry.startedAtLocalTime ?? '',
    topicIds: entry.topicIds,
    wageOverride: entry.wageSource === 'override' ? (wage.ok ? wage.value : String(entry.wageMinorPerHour)) : '',
  };
}

export function useWorkEntryCapture(services: WorkEntryCaptureServices = {}) {
  const [state, dispatch] = useReducer(workEntryCaptureReducer, {
    ...initialWorkEntryCaptureState,
    draft: createDefaultWorkEntryDraft(services.now?.() ?? new Date()),
  });
  const isMounted = useRef(false);
  const now = services.now;
  const loadData = services.loadData ?? loadWorkEntryCaptureData;
  const createEntry = services.createEntry ?? createWorkEntry;
  const markDraftSaved = services.markDraftSaved ?? markActiveCaptureDraftSaved;
  const defaultDraft = useMemo(
    () => createDefaultWorkEntryDraft(now?.() ?? new Date()),
    [now],
  );
  const updateEntry = useMemo(
    () => services.updateEntry ?? ((id: string, input: CreateWorkEntryRequest) => editWorkEntry({ ...input, id })),
    [services.updateEntry],
  );
  const removeEntry = useMemo(
    () => services.deleteEntry ?? ((id: string) => deleteWorkEntry({ id })),
    [services.deleteEntry],
  );
  useCaptureDraftPersistence({
    draft: state.draft,
    enabled: state.status === 'ready' && state.editingEntryId === null,
    isMeaningful: useCallback(
      (draft: WorkEntryDraft) => isWorkCaptureDraftMeaningful(draft, defaultDraft),
      [defaultDraft],
    ),
    kind: 'work',
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

      if (result.error.recovery === 'settings') {
        dispatch({ error: result.error, type: 'preferences_needed' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadData]);

  const save = useCallback(() => {
    const validation = validateWorkEntryDraft(state.draft, state.preferences);

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    if (state.editingEntryId) {
      void updateEntry(state.editingEntryId, validation.value).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({
            entry: result.value,
            mutation: 'updated',
            nextDraft: createDefaultWorkEntryDraft(now?.() ?? new Date()),
            type: 'save_succeeded',
          });
          return;
        }

        dispatch({ error: result.error, type: 'save_failed' });
      });
      return;
    }

    void createEntry(validation.value).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        void markDraftSaved({
          kind: 'work',
          savedRecordId: result.value.id,
          savedRecordKind: 'work_entry',
        });
        dispatch({
          entry: result.value,
          mutation: 'created',
          nextDraft: createDefaultWorkEntryDraft(now?.() ?? new Date()),
          type: 'save_succeeded',
        });
        return;
      }

      dispatch({ error: result.error, type: 'save_failed' });
    });
  }, [createEntry, markDraftSaved, now, state.draft, state.editingEntryId, state.preferences, updateEntry]);

  const startEdit = useCallback(
    (entry: WorkEntry) => {
      dispatch({
        draft: draftFromEntry(entry, state.preferences),
        entry,
        type: 'edit_started',
      });
    },
    [state.preferences],
  );

  const cancelEdit = useCallback(() => {
    dispatch({
      nextDraft: createDefaultWorkEntryDraft(now?.() ?? new Date()),
      type: 'edit_cancelled',
    });
  }, [now]);

  const deleteEditingEntry = useCallback(() => {
    if (!state.editingEntryId) {
      return;
    }

    dispatch({ type: 'delete_started' });
    void removeEntry(state.editingEntryId).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({
          entry: result.value,
          nextDraft: createDefaultWorkEntryDraft(now?.() ?? new Date()),
          type: 'delete_succeeded',
        });
        return;
      }

      dispatch({ error: result.error, type: 'save_failed' });
    });
  }, [now, removeEntry, state.editingEntryId]);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    applyDraft: (draft: WorkEntryDraft) => dispatch({ draft, type: 'draft_applied' }),
    cancelEdit,
    deleteEditingEntry,
    reload,
    save,
    selectCategory: (categoryId: string | null) => dispatch({ categoryId, type: 'category_selected' }),
    setEntryMode: (entryMode: WorkEntryMode) => dispatch({ entryMode, type: 'mode_changed' }),
    setPaid: (paid: boolean) => dispatch({ paid, type: 'paid_changed' }),
    startEdit,
    state,
    toggleTopic: (topicId: string) => dispatch({ topicId, type: 'topic_toggled' }),
    updateField: (
      field: keyof Omit<WorkEntryDraft, 'categoryId' | 'entryMode' | 'paid' | 'topicIds'>,
      value: string,
    ) => dispatch({ field, type: 'field_changed', value }),
  };
}
