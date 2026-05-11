import { useCallback, useReducer } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { ReceiptPhotoSource } from '@/services/camera/camera.service';

import {
  captureReceiptDraftFromSource,
  type ReceiptCaptureDependencies,
  type ReceiptCaptureOutcome,
} from './receipt-capture';

export type ReceiptCaptureState = {
  actionError: AppError | null;
  draft: CaptureDraft | null;
  outcome: ReceiptCaptureOutcome | null;
  status: 'canceled' | 'draft_saved' | 'failed' | 'idle' | 'permission_denied' | 'working';
};

type ReceiptCaptureAction =
  | { type: 'capture_failed'; error: AppError }
  | { type: 'capture_started' }
  | { type: 'capture_succeeded'; outcome: ReceiptCaptureOutcome }
  | { type: 'reset' };

export const initialReceiptCaptureState: ReceiptCaptureState = {
  actionError: null,
  draft: null,
  outcome: null,
  status: 'idle',
};

export function receiptCaptureReducer(
  state: ReceiptCaptureState,
  action: ReceiptCaptureAction,
): ReceiptCaptureState {
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
        status: 'working',
      };
    case 'capture_succeeded':
      return {
        actionError: null,
        draft: action.outcome.status === 'draft_saved' ? action.outcome.draft : null,
        outcome: action.outcome,
        status: action.outcome.status,
      };
    case 'reset':
      return initialReceiptCaptureState;
    default:
      action satisfies never;
      return state;
  }
}

export function useReceiptCapture(dependencies: ReceiptCaptureDependencies = {}) {
  const [state, dispatch] = useReducer(receiptCaptureReducer, initialReceiptCaptureState);

  const runCapture = useCallback(
    async (source: ReceiptPhotoSource) => {
      dispatch({ type: 'capture_started' });
      const result = await captureReceiptDraftFromSource(source, dependencies);

      if (result.ok) {
        dispatch({ outcome: result.value, type: 'capture_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: 'capture_failed' });
    },
    [dependencies],
  );

  return {
    choosePhoto: () => runCapture('library'),
    reset: () => dispatch({ type: 'reset' }),
    state,
    takePhoto: () => runCapture('camera'),
  };
}
