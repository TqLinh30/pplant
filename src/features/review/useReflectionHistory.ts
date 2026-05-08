import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import type { ReflectionRelationshipId } from '@/domain/summaries/reflection-relationships';
import type {
  Reflection,
  ReflectionInsightPreference,
  ReflectionInsightPreferenceAction,
  ReflectionPeriod,
} from '@/domain/reflections/types';
import {
  listReflectionHistory,
  listReflectionInsightPreferences,
  saveReflectionInsightPreference,
  type SaveInsightPreferenceRequest,
} from '@/services/reflections/reflection.service';

export type ReflectionHistoryStatus = 'failed' | 'idle' | 'loading' | 'ready' | 'saving';

export type ReflectionHistoryState = {
  actionError: AppError | null;
  history: Reflection[];
  preferences: ReflectionInsightPreference[];
  savingInsightId: ReflectionRelationshipId | null;
  status: ReflectionHistoryStatus;
};

export type ReflectionHistoryServices = {
  listHistory?: () => Promise<AppResult<Reflection[]>>;
  listPreferences?: () => Promise<AppResult<ReflectionInsightPreference[]>>;
  savePreference?: (request: SaveInsightPreferenceRequest) => Promise<AppResult<ReflectionInsightPreference>>;
};

type ReflectionHistoryAction =
  | { type: 'load_started' }
  | { error: AppError; type: 'load_failed' }
  | { history: Reflection[]; preferences: ReflectionInsightPreference[]; type: 'load_succeeded' }
  | { insightId: ReflectionRelationshipId; type: 'save_preference_started' }
  | { error: AppError; type: 'save_preference_failed' }
  | { preference: ReflectionInsightPreference; type: 'save_preference_succeeded' };

export const initialReflectionHistoryState: ReflectionHistoryState = {
  actionError: null,
  history: [],
  preferences: [],
  savingInsightId: null,
  status: 'idle',
};

function upsertPreference(
  preferences: ReflectionInsightPreference[],
  preference: ReflectionInsightPreference,
): ReflectionInsightPreference[] {
  const existingIndex = preferences.findIndex(
    (candidate) =>
      candidate.insightId === preference.insightId && candidate.scopeKey === preference.scopeKey,
  );

  if (existingIndex === -1) {
    return [...preferences, preference];
  }

  return preferences.map((candidate, index) => (index === existingIndex ? preference : candidate));
}

export function reflectionHistoryReducer(
  state: ReflectionHistoryState,
  action: ReflectionHistoryAction,
): ReflectionHistoryState {
  switch (action.type) {
    case 'load_started':
      return {
        ...state,
        actionError: null,
        savingInsightId: null,
        status: 'loading',
      };
    case 'load_failed':
      return {
        ...state,
        actionError: action.error,
        savingInsightId: null,
        status: 'failed',
      };
    case 'load_succeeded':
      return {
        actionError: null,
        history: action.history,
        preferences: action.preferences,
        savingInsightId: null,
        status: 'ready',
      };
    case 'save_preference_started':
      return {
        ...state,
        actionError: null,
        savingInsightId: action.insightId,
        status: 'saving',
      };
    case 'save_preference_failed':
      return {
        ...state,
        actionError: action.error,
        savingInsightId: null,
        status: 'failed',
      };
    case 'save_preference_succeeded':
      return {
        ...state,
        actionError: null,
        preferences: upsertPreference(state.preferences, action.preference),
        savingInsightId: null,
        status: 'ready',
      };
    default:
      return state;
  }
}

export function useReflectionHistory(services: ReflectionHistoryServices = {}) {
  const [state, dispatch] = useReducer(reflectionHistoryReducer, initialReflectionHistoryState);
  const isMounted = useRef(false);
  const requestSequence = useRef(0);
  const listHistory = useMemo(
    () => services.listHistory ?? (() => listReflectionHistory(undefined, { limit: 12 })),
    [services.listHistory],
  );
  const listPreferences = useMemo(
    () => services.listPreferences ?? listReflectionInsightPreferences,
    [services.listPreferences],
  );
  const savePreference = useMemo(
    () => services.savePreference ?? saveReflectionInsightPreference,
    [services.savePreference],
  );

  const runLoad = useCallback(() => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    dispatch({ type: 'load_started' });

    void Promise.all([listHistory(), listPreferences()]).then(([history, preferences]) => {
      if (!isMounted.current || requestSequence.current !== sequence) {
        return;
      }

      if (!history.ok) {
        dispatch({ error: history.error, type: 'load_failed' });
        return;
      }

      if (!preferences.ok) {
        dispatch({ error: preferences.error, type: 'load_failed' });
        return;
      }

      dispatch({
        history: history.value,
        preferences: preferences.value,
        type: 'load_succeeded',
      });
    });
  }, [listHistory, listPreferences]);

  useEffect(() => {
    isMounted.current = true;
    runLoad();

    return () => {
      isMounted.current = false;
    };
  }, [runLoad]);

  const saveInsightPreference = useCallback(
    (input: {
      action: ReflectionInsightPreferenceAction;
      insightId: ReflectionRelationshipId;
      period: ReflectionPeriod;
    }) => {
      dispatch({ insightId: input.insightId, type: 'save_preference_started' });

      void savePreference({
        action: input.action,
        insightId: input.insightId,
        period: input.action === 'muted' ? null : input.period,
      }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ preference: result.value, type: 'save_preference_succeeded' });
          return;
        }

        dispatch({ error: result.error, type: 'save_preference_failed' });
      });
    },
    [savePreference],
  );

  return {
    reload: runLoad,
    saveInsightPreference,
    state,
  };
}
