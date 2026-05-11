import type { AppError } from '@/domain/common/app-error';
import type {
  Reflection,
  ReflectionInsightPreference,
} from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  initialReflectionHistoryState,
  reflectionHistoryReducer,
} from './useReflectionHistory';

function createReflection(): Reflection {
  return {
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'reflection-1' as never,
    period: {
      endDateExclusive: '2026-05-11' as never,
      kind: 'week',
      startDate: '2026-05-04' as never,
    },
    promptId: 'remember_period',
    promptText: 'What do you want to remember about this period?',
    responseText: 'A saved note.',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'answered',
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
  };
}

function createPreference(overrides: Partial<ReflectionInsightPreference> = {}): ReflectionInsightPreference {
  return {
    action: 'dismissed',
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'preference-1' as never,
    insightId: 'money_time',
    periodKind: 'week',
    periodStartDate: '2026-05-04' as never,
    scopeKey: 'week:2026-05-04',
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection history and insight state', () => {
  it('loads history and insight preferences together', () => {
    const loading = reflectionHistoryReducer(initialReflectionHistoryState, { type: 'load_started' });
    const ready = reflectionHistoryReducer(loading, {
      history: [createReflection()],
      preferences: [createPreference()],
      type: 'load_succeeded',
    });

    expect(ready.status).toBe('ready');
    expect(ready.history).toHaveLength(1);
    expect(ready.preferences).toHaveLength(1);
  });

  it('upserts saved preferences by insight and scope', () => {
    const state = reflectionHistoryReducer(
      {
        ...initialReflectionHistoryState,
        preferences: [createPreference()],
        status: 'ready',
      },
      {
        preference: createPreference({
          id: 'preference-1' as never,
          updatedAt: '2026-05-08T00:05:00.000Z',
        }),
        type: 'save_preference_succeeded',
      },
    );

    expect(state.preferences).toHaveLength(1);
    expect(state.preferences[0].updatedAt).toBe('2026-05-08T00:05:00.000Z');
  });

  it('keeps history visible after preference save failures', () => {
    const error: AppError = {
      code: 'unavailable',
      message: 'Local preference could not be saved.',
      recovery: 'retry',
    };
    const state = reflectionHistoryReducer(
      {
        ...initialReflectionHistoryState,
        history: [createReflection()],
        status: 'saving',
      },
      {
        error,
        type: 'save_preference_failed',
      },
    );

    expect(state.status).toBe('failed');
    expect(state.history).toHaveLength(1);
    expect(state.actionError).toBe(error);
  });
});
