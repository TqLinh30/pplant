import type { AppError } from '@/domain/common/app-error';
import type { Reflection } from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  initialReflectionPromptState,
  reflectionPromptReducer,
} from './useReflectionPrompts';

const prompt = {
  helperText: 'A short note is enough.',
  id: 'remember_period' as const,
  optional: true as const,
  text: 'What do you want to remember about this period?',
};

function createReflection(overrides: Partial<Reflection> = {}): Reflection {
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
    promptText: prompt.text,
    responseText: 'The week felt clearer.',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'answered',
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection prompt state', () => {
  it('loads prompts and existing reflections for a period', () => {
    const state = reflectionPromptReducer(initialReflectionPromptState, {
      periodKey: 'week:2026-05-04',
      prompts: [prompt],
      type: 'load_started',
    });
    const loaded = reflectionPromptReducer(state, {
      reflections: [createReflection()],
      type: 'load_succeeded',
    });

    expect(loaded.status).toBe('ready');
    expect(loaded.prompts).toEqual([prompt]);
    expect(loaded.reflections).toHaveLength(1);
  });

  it('replaces saved reflection state for the same prompt', () => {
    const loaded = reflectionPromptReducer(
      {
        ...initialReflectionPromptState,
        periodKey: 'week:2026-05-04',
        prompts: [prompt],
        reflections: [createReflection()],
        status: 'ready',
      },
      {
        reflection: createReflection({
          id: 'reflection-1' as never,
          responseText: null,
          state: 'skipped',
          updatedAt: '2026-05-08T00:05:00.000Z',
        }),
        type: 'save_succeeded',
      },
    );

    expect(loaded.status).toBe('ready');
    expect(loaded.reflections).toHaveLength(1);
    expect(loaded.reflections[0].state).toBe('skipped');
    expect(loaded.reflections[0].responseText).toBeNull();
  });

  it('keeps prompts available after save failures', () => {
    const error: AppError = {
      code: 'unavailable',
      message: 'Local reflection could not be saved.',
      recovery: 'retry',
    };
    const state = reflectionPromptReducer(
      {
        ...initialReflectionPromptState,
        periodKey: 'week:2026-05-04',
        prompts: [prompt],
        status: 'saving',
      },
      {
        error,
        type: 'save_failed',
      },
    );

    expect(state.status).toBe('failed');
    expect(state.prompts).toEqual([prompt]);
    expect(state.actionError).toBe(error);
  });
});
