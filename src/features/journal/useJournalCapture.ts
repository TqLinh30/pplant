import { useCallback, useReducer } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
import type { PersistedJournalImageReference } from '@/services/files/journal-file-store';
import { saveJournalEntry } from '@/services/journal/journal.service';

import {
  captureJournalPhoto,
  type JournalPhotoCaptureDependencies,
  type JournalPhotoCaptureOutcome,
} from './journal-capture';
import { notifyJournalEntriesChanged } from './journal-entry-events';

export type JournalCaptureState = {
  actionError: AppError | null;
  fieldErrors: {
    moodId?: string;
    photo?: string;
  };
  moodId: JournalMoodId | null;
  note: string;
  outcome: JournalPhotoCaptureOutcome | null;
  photo: PersistedJournalImageReference | null;
  savedEntry: JournalEntry | null;
  status: 'canceled' | 'failed' | 'idle' | 'permission_denied' | 'photo_ready' | 'saved' | 'saving' | 'working';
};

type JournalCaptureAction =
  | { type: 'capture_failed'; error: AppError }
  | { type: 'capture_started' }
  | { type: 'capture_succeeded'; outcome: JournalPhotoCaptureOutcome }
  | { type: 'mood_changed'; moodId: JournalMoodId }
  | { type: 'note_changed'; note: string }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; entry: JournalEntry };

export const initialJournalCaptureState: JournalCaptureState = {
  actionError: null,
  fieldErrors: {},
  moodId: null,
  note: '',
  outcome: null,
  photo: null,
  savedEntry: null,
  status: 'idle',
};

export function journalCaptureReducer(
  state: JournalCaptureState,
  action: JournalCaptureAction,
): JournalCaptureState {
  switch (action.type) {
    case 'capture_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'failed',
      };
    case 'capture_started':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        outcome: null,
        status: 'working',
      };
    case 'capture_succeeded':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        outcome: action.outcome,
        photo: action.outcome.status === 'photo_saved' ? action.outcome.photo : null,
        savedEntry: null,
        status: action.outcome.status === 'photo_saved' ? 'photo_ready' : action.outcome.status,
      };
    case 'mood_changed':
      return {
        ...state,
        fieldErrors: {
          ...state.fieldErrors,
          moodId: undefined,
        },
        moodId: action.moodId,
      };
    case 'note_changed':
      return {
        ...state,
        note: action.note,
      };
    case 'save_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'failed',
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
        savedEntry: action.entry,
        status: 'saved',
      };
    default:
      action satisfies never;
      return state;
  }
}

export type JournalCaptureDependencies = JournalPhotoCaptureDependencies & {
  saveEntry?: typeof saveJournalEntry;
};

export function useJournalCapture(dependencies: JournalCaptureDependencies = {}) {
  const [state, dispatch] = useReducer(journalCaptureReducer, initialJournalCaptureState);

  const takePhoto = useCallback(async () => {
    dispatch({ type: 'capture_started' });
    const result = await captureJournalPhoto(dependencies);

    if (result.ok) {
      dispatch({ outcome: result.value, type: 'capture_succeeded' });
      return;
    }

    dispatch({ error: result.error, type: 'capture_failed' });
  }, [dependencies]);

  const save = useCallback(async () => {
    if (!state.photo || !state.moodId) {
      dispatch({
        error: {
          code: 'validation_failed',
          message: !state.photo ? 'Capture a journal photo before saving.' : 'Choose a mood before saving.',
          recovery: 'edit',
        },
        type: 'save_failed',
      });
      return;
    }

    dispatch({ type: 'save_started' });
    const result = await (dependencies.saveEntry ?? saveJournalEntry)({
      moodId: state.moodId,
      note: state.note,
      photo: state.photo,
    });

    if (result.ok) {
      notifyJournalEntriesChanged('created', result.value);
      dispatch({ entry: result.value, type: 'save_succeeded' });
      return;
    }

    dispatch({ error: result.error, type: 'save_failed' });
  }, [dependencies, state.moodId, state.note, state.photo]);

  return {
    save,
    setMood: (moodId: JournalMoodId) => dispatch({ moodId, type: 'mood_changed' }),
    setNote: (note: string) => dispatch({ note, type: 'note_changed' }),
    state,
    takePhoto,
  };
}
