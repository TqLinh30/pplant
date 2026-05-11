import { useCallback, useReducer } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
import {
  persistJournalImageReference,
  type PersistedJournalImageReference,
} from '@/services/files/journal-file-store';
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
  previewUri: string | null;
  savedEntry: JournalEntry | null;
  status:
    | 'canceled'
    | 'failed'
    | 'idle'
    | 'permission_denied'
    | 'photo_pending'
    | 'photo_ready'
    | 'saved'
    | 'saving'
    | 'working';
};

type JournalCaptureAction =
  | { type: 'capture_failed'; error: AppError }
  | { type: 'capture_started' }
  | { type: 'capture_succeeded'; outcome: JournalPhotoCaptureOutcome }
  | { type: 'mood_changed'; moodId: JournalMoodId }
  | { type: 'note_changed'; note: string }
  | { type: 'photo_persist_failed'; error: AppError }
  | { type: 'photo_persist_succeeded'; photo: PersistedJournalImageReference }
  | { type: 'photo_preview_ready'; previewUri: string }
  | { type: 'photo_reset' }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; entry: JournalEntry };

export type JournalInlinePhotoAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export const initialJournalCaptureState: JournalCaptureState = {
  actionError: null,
  fieldErrors: {},
  moodId: null,
  note: '',
  outcome: null,
  photo: null,
  previewUri: null,
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
        previewUri:
          action.outcome.status === 'photo_saved'
            ? action.outcome.photo.photoUri
            : state.previewUri,
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
    case 'photo_persist_failed':
      return {
        ...state,
        actionError: action.error,
        photo: null,
        status: 'failed',
      };
    case 'photo_persist_succeeded':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        outcome: {
          photo: action.photo,
          status: 'photo_saved',
        },
        photo: action.photo,
        savedEntry: null,
        status: 'photo_ready',
      };
    case 'photo_preview_ready':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        outcome: null,
        photo: null,
        previewUri: action.previewUri,
        savedEntry: null,
        status: 'photo_pending',
      };
    case 'photo_reset':
      return {
        ...state,
        actionError: null,
        fieldErrors: {},
        outcome: null,
        photo: null,
        previewUri: null,
        savedEntry: null,
        status: 'idle',
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

  const acceptInlinePhoto = useCallback(
    async (asset: JournalInlinePhotoAsset) => {
      dispatch({ previewUri: asset.uri, type: 'photo_preview_ready' });

      const capturedAt = (dependencies.now ?? (() => new Date()))().toISOString();
      const result = await (dependencies.persistImage ?? persistJournalImageReference)({
        capturedAt,
        contentType: asset.mimeType ?? null,
        originalFileName: asset.fileName ?? null,
        sourceUri: asset.uri,
      });

      if (result.ok) {
        dispatch({ photo: result.value, type: 'photo_persist_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: 'photo_persist_failed' });
    },
    [dependencies],
  );

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
          message: !state.photo
            ? 'Capture a journal photo before saving.'
            : 'Choose a mood before saving.',
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
    acceptInlinePhoto,
    save,
    setMood: (moodId: JournalMoodId) => dispatch({ moodId, type: 'mood_changed' }),
    setNote: (note: string) => dispatch({ note, type: 'note_changed' }),
    state,
    takePhoto,
    retakePhoto: () => dispatch({ type: 'photo_reset' }),
  };
}
