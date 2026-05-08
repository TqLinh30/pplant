import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import { isErr, type AppResult } from '@/domain/common/result';
import type { RecoveryAction } from '@/domain/recovery/types';
import {
  completeRecoveryItem,
  discardRecoveryReceiptParseJob,
  dismissRecoveryItem,
  loadRecoveryData,
  pauseRecoveryReminder,
  recordRecoveryManualEntry,
  recordRecoveryHandoff,
  retryRecoveryReceiptParseJob,
  snoozeRecoveryReminder,
  type RecoveryData,
  type RecoveryItem,
  type RecoveryTargetRequest,
} from '@/services/recovery/recovery.service';

export type RecoveryStatus = 'empty' | 'failed' | 'loading' | 'ready' | 'saved' | 'saving';

export type RecoveryState = {
  actionError: AppError | null;
  editingTarget: RecoveryItem | null;
  items: RecoveryItem[];
  lastAction: RecoveryAction | null;
  loadError: AppError | null;
  status: RecoveryStatus;
};

export type RecoveryServices = {
  completeItem?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  discardReceiptParseJob?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  dismissItem?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  loadData?: () => Promise<AppResult<RecoveryData>>;
  manualEntryReceiptParseJob?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  pauseReminder?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  recordHandoff?: (
    input: RecoveryTargetRequest,
    action: Extract<RecoveryAction, 'edit' | 'reschedule'>,
  ) => Promise<AppResult<unknown>>;
  retryReceiptParseJob?: (input: RecoveryTargetRequest) => Promise<AppResult<unknown>>;
  snoozeReminder?: (input: RecoveryTargetRequest & { minutes?: number }) => Promise<AppResult<unknown>>;
};

type RecoveryHookAction =
  | { type: 'action_failed'; error: AppError }
  | { type: 'action_started' }
  | { type: 'action_succeeded'; action: RecoveryAction; data: RecoveryData }
  | {
      type: 'handoff_succeeded';
      action: Extract<RecoveryAction, 'edit' | 'manual_entry' | 'reschedule'>;
      data: RecoveryData;
      item: RecoveryItem;
    }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; data: RecoveryData };

export const initialRecoveryState: RecoveryState = {
  actionError: null,
  editingTarget: null,
  items: [],
  lastAction: null,
  loadError: null,
  status: 'loading',
};

function statusForItems(items: RecoveryItem[]): RecoveryStatus {
  return items.length > 0 ? 'ready' : 'empty';
}

export function recoveryReducer(state: RecoveryState, action: RecoveryHookAction): RecoveryState {
  switch (action.type) {
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: statusForItems(state.items),
      };
    case 'action_started':
      return {
        ...state,
        actionError: null,
        editingTarget: null,
        status: 'saving',
      };
    case 'action_succeeded':
      return {
        ...state,
        actionError: null,
        editingTarget: null,
        items: action.data.items,
        lastAction: action.action,
        loadError: null,
        status: 'saved',
      };
    case 'handoff_succeeded':
      return {
        ...state,
        actionError: null,
        editingTarget: action.item,
        items: action.data.items,
        lastAction: action.action,
        loadError: null,
        status: 'saved',
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
        items: action.data.items,
        loadError: null,
        status: statusForItems(action.data.items),
      };
    default:
      return state;
  }
}

function targetFromItem(item: RecoveryItem): RecoveryTargetRequest {
  return {
    occurrenceLocalDate: item.occurrenceLocalDate,
    targetId: item.targetId,
    targetKind: item.targetKind,
  };
}

export function useRecovery(services: RecoveryServices = {}) {
  const [state, dispatch] = useReducer(recoveryReducer, initialRecoveryState);
  const isMounted = useRef(false);
  const loadData = services.loadData ?? loadRecoveryData;
  const completeItem = services.completeItem ?? completeRecoveryItem;
  const discardReceiptParseJob = services.discardReceiptParseJob ?? discardRecoveryReceiptParseJob;
  const dismissItem = services.dismissItem ?? dismissRecoveryItem;
  const manualEntryReceiptParseJob = services.manualEntryReceiptParseJob ?? recordRecoveryManualEntry;
  const pauseReminder = services.pauseReminder ?? pauseRecoveryReminder;
  const recordHandoff = services.recordHandoff ?? recordRecoveryHandoff;
  const retryReceiptParseJob = services.retryReceiptParseJob ?? retryRecoveryReceiptParseJob;
  const snoozeReminder = services.snoozeReminder ?? snoozeRecoveryReminder;

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });
    void loadData().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (isErr(result)) {
        dispatch({ error: result.error, type: 'load_failed' });
        return;
      }

      dispatch({ data: result.value, type: 'load_succeeded' });
    });
  }, [loadData]);

  const refreshAfterAction = useCallback(
    (action: RecoveryAction, item: RecoveryItem | null = null) => {
      void loadData().then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        if (item && (action === 'edit' || action === 'manual_entry' || action === 'reschedule')) {
          dispatch({ action, data: result.value, item, type: 'handoff_succeeded' });
          return;
        }

        dispatch({ action, data: result.value, type: 'action_succeeded' });
      });
    },
    [loadData],
  );

  const runAction = useCallback(
    (item: RecoveryItem, action: RecoveryAction) => {
      const target = targetFromItem(item);

      dispatch({ type: 'action_started' });

      const request =
        action === 'complete'
          ? completeItem(target)
          : action === 'discard'
            ? discardReceiptParseJob(target)
          : action === 'dismiss'
            ? dismissItem(target)
            : action === 'manual_entry'
              ? manualEntryReceiptParseJob(target)
            : action === 'pause'
              ? pauseReminder(target)
              : action === 'retry'
                ? retryReceiptParseJob(target)
              : action === 'snooze'
                ? snoozeReminder({ ...target, minutes: 30 })
                : recordHandoff(target, action);

      void request.then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (isErr(result)) {
          dispatch({ error: result.error, type: 'action_failed' });
          return;
        }

        refreshAfterAction(
          action,
          action === 'edit' || action === 'manual_entry' || action === 'reschedule' ? item : null,
        );
      });
    },
    [
      completeItem,
      discardReceiptParseJob,
      dismissItem,
      manualEntryReceiptParseJob,
      pauseReminder,
      recordHandoff,
      refreshAfterAction,
      retryReceiptParseJob,
      snoozeReminder,
    ],
  );

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    reload,
    runAction,
    state,
  };
}
