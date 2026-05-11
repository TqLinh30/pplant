import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import { buildReflectionPrompts } from '@/domain/reflections/reflection-prompts';
import {
  reflectionPeriodFromSummaryPeriod,
} from '@/domain/reflections/schemas';
import type {
  Reflection,
  ReflectionPeriod,
  ReflectionPrompt,
  ReflectionPromptId,
} from '@/domain/reflections/types';
import type { PeriodSummaryPeriod } from '@/domain/summaries/period-summary';
import {
  listPeriodReflections,
  saveReflectionPrompt,
  type ListPeriodReflectionsRequest,
  type SaveReflectionPromptRequest,
} from '@/services/reflections/reflection.service';
import type { PeriodReviewData } from '@/services/summaries/period-review.service';

export type ReflectionPromptStatus = 'failed' | 'idle' | 'loading' | 'ready' | 'saving';

export type ReflectionPromptState = {
  actionError: AppError | null;
  periodKey: string | null;
  prompts: ReflectionPrompt[];
  reflections: Reflection[];
  savingPromptId: ReflectionPromptId | null;
  status: ReflectionPromptStatus;
};

export type ReflectionPromptServices = {
  listReflections?: (request: ListPeriodReflectionsRequest) => Promise<AppResult<Reflection[]>>;
  saveReflection?: (request: SaveReflectionPromptRequest) => Promise<AppResult<Reflection>>;
};

type ReflectionPromptAction =
  | { error: AppError; type: 'load_failed' }
  | { periodKey: string; prompts: ReflectionPrompt[]; type: 'load_started' }
  | { reflections: Reflection[]; type: 'load_succeeded' }
  | { type: 'reset' }
  | { promptId: ReflectionPromptId; type: 'save_started' }
  | { error: AppError; type: 'save_failed' }
  | { reflection: Reflection; type: 'save_succeeded' };

export const initialReflectionPromptState: ReflectionPromptState = {
  actionError: null,
  periodKey: null,
  prompts: [],
  reflections: [],
  savingPromptId: null,
  status: 'idle',
};

function upsertReflection(reflections: Reflection[], reflection: Reflection): Reflection[] {
  const existingIndex = reflections.findIndex((candidate) => candidate.promptId === reflection.promptId);

  if (existingIndex === -1) {
    return [...reflections, reflection];
  }

  return reflections.map((candidate, index) => (index === existingIndex ? reflection : candidate));
}

export function reflectionPromptReducer(
  state: ReflectionPromptState,
  action: ReflectionPromptAction,
): ReflectionPromptState {
  switch (action.type) {
    case 'load_failed':
      return {
        ...state,
        actionError: action.error,
        savingPromptId: null,
        status: 'failed',
      };
    case 'load_started':
      return {
        actionError: null,
        periodKey: action.periodKey,
        prompts: action.prompts,
        reflections: state.periodKey === action.periodKey ? state.reflections : [],
        savingPromptId: null,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        ...state,
        actionError: null,
        reflections: action.reflections,
        savingPromptId: null,
        status: 'ready',
      };
    case 'reset':
      return initialReflectionPromptState;
    case 'save_started':
      return {
        ...state,
        actionError: null,
        savingPromptId: action.promptId,
        status: 'saving',
      };
    case 'save_failed':
      return {
        ...state,
        actionError: action.error,
        savingPromptId: null,
        status: 'failed',
      };
    case 'save_succeeded':
      return {
        ...state,
        actionError: null,
        reflections: upsertReflection(state.reflections, action.reflection),
        savingPromptId: null,
        status: 'ready',
      };
    default:
      return state;
  }
}

function periodFromSummaryPeriod(period: PeriodSummaryPeriod): ReflectionPeriod {
  return reflectionPeriodFromSummaryPeriod({
    endDateExclusive: period.endDateExclusive,
    kind: period.kind,
    startDate: period.startDate,
  });
}

export function useReflectionPrompts(
  data: PeriodReviewData | null,
  services: ReflectionPromptServices = {},
) {
  const [state, dispatch] = useReducer(reflectionPromptReducer, initialReflectionPromptState);
  const isMounted = useRef(false);
  const requestSequence = useRef(0);
  const listReflections = services.listReflections ?? listPeriodReflections;
  const saveReflection = services.saveReflection ?? saveReflectionPrompt;
  const period = useMemo(() => (data ? periodFromSummaryPeriod(data.summary.period) : null), [data]);
  const prompts = useMemo(() => (data ? buildReflectionPrompts({ summary: data.summary }) : []), [data]);
  const periodKey = data?.summary.period.key ?? null;

  const runLoad = useCallback(() => {
    if (!period || !periodKey) {
      dispatch({ type: 'reset' });
      return;
    }

    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    dispatch({ periodKey, prompts, type: 'load_started' });

    void listReflections({ period }).then((result) => {
      if (!isMounted.current || requestSequence.current !== sequence) {
        return;
      }

      if (result.ok) {
        dispatch({ reflections: result.value, type: 'load_succeeded' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [listReflections, period, periodKey, prompts]);

  useEffect(() => {
    isMounted.current = true;
    runLoad();

    return () => {
      isMounted.current = false;
    };
  }, [runLoad]);

  const savePrompt = useCallback(
    (prompt: ReflectionPrompt, responseText: string) => {
      if (!period) {
        return;
      }

      dispatch({ promptId: prompt.id, type: 'save_started' });

      void saveReflection({
        period,
        promptId: prompt.id,
        promptText: prompt.text,
        responseText,
        state: 'answered',
      }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ reflection: result.value, type: 'save_succeeded' });
          return;
        }

        dispatch({ error: result.error, type: 'save_failed' });
      });
    },
    [period, saveReflection],
  );

  const skipPrompt = useCallback(
    (prompt: ReflectionPrompt) => {
      if (!period) {
        return;
      }

      dispatch({ promptId: prompt.id, type: 'save_started' });

      void saveReflection({
        period,
        promptId: prompt.id,
        promptText: prompt.text,
        responseText: null,
        state: 'skipped',
      }).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (result.ok) {
          dispatch({ reflection: result.value, type: 'save_succeeded' });
          return;
        }

        dispatch({ error: result.error, type: 'save_failed' });
      });
    },
    [period, saveReflection],
  );

  return {
    reload: runLoad,
    savePrompt,
    skipPrompt,
    state,
  };
}
