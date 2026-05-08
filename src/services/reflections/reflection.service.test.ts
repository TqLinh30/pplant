import type { ReflectionRepository } from '@/data/repositories/reflections.repository';
import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import type { Reflection, ReflectionPeriod } from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  listPeriodReflections,
  saveReflectionPrompt,
  type ReflectionServiceDependencies,
} from './reflection.service';

const fixedDate = new Date('2026-05-08T00:00:00.000Z');

const weekPeriod: ReflectionPeriod = {
  endDateExclusive: '2026-05-11' as never,
  kind: 'week',
  startDate: '2026-05-04' as never,
};

function createReflection(overrides: Partial<Reflection> = {}): Reflection {
  return {
    createdAt: fixedDate.toISOString(),
    deletedAt: null,
    id: 'reflection-generated' as never,
    period: weekPeriod,
    promptId: 'remember_period',
    promptText: 'What do you want to remember about this period?',
    responseText: 'The week felt clearer after I wrote it down.',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'answered',
    updatedAt: fixedDate.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createDependencies(repository: ReflectionRepository): ReflectionServiceDependencies {
  return {
    createId: () => 'reflection-generated',
    createRepository: () => repository,
    migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
    now: () => fixedDate,
    openDatabase: () => ({}),
  };
}

describe('reflection service', () => {
  it('saves answered prompts with generated id, local workspace, and timestamp', async () => {
    const savedInputs: unknown[] = [];
    const repository: ReflectionRepository = {
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveReflection: async (input) => {
        savedInputs.push(input);
        return ok(createReflection());
      },
    };

    const saved = await saveReflectionPrompt(
      {
        period: weekPeriod,
        promptId: 'remember_period',
        promptText: 'What do you want to remember about this period?',
        responseText: 'The week felt clearer after I wrote it down.',
        state: 'answered',
      },
      createDependencies(repository),
    );

    expect(saved.ok).toBe(true);
    expect(savedInputs).toEqual([
      {
        id: 'reflection-generated',
        period: weekPeriod,
        promptId: 'remember_period',
        promptText: 'What do you want to remember about this period?',
        responseText: 'The week felt clearer after I wrote it down.',
        state: 'answered',
        timestamp: fixedDate.toISOString(),
        workspaceId: localWorkspaceId,
      },
    ]);
  });

  it('saves skipped prompts without requiring response text', async () => {
    const repository: ReflectionRepository = {
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveReflection: async () => ok(createReflection({ responseText: null, state: 'skipped' })),
    };

    const skipped = await saveReflectionPrompt(
      {
        period: weekPeriod,
        promptId: 'noticed_pair',
        promptText: 'Which recorded pair stood out to you?',
        responseText: null,
        state: 'skipped',
      },
      createDependencies(repository),
    );

    expect(skipped.ok).toBe(true);
    if (skipped.ok) {
      expect(skipped.value.responseText).toBeNull();
      expect(skipped.value.state).toBe('skipped');
    }
  });

  it('lists period reflections through the repository boundary', async () => {
    const repository: ReflectionRepository = {
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async (workspaceId, period) => {
        expect(workspaceId).toBe(localWorkspaceId);
        expect(period).toBe(weekPeriod);
        return ok([createReflection()]);
      },
      saveReflection: async () => ok(createReflection()),
    };

    const listed = await listPeriodReflections({ period: weekPeriod }, createDependencies(repository));

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
    }
  });

  it('returns retryable errors when local data cannot be opened', async () => {
    const repository: ReflectionRepository = {
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveReflection: async () => ok(createReflection()),
    };
    const result = await listPeriodReflections(
      { period: weekPeriod },
      {
        ...createDependencies(repository),
        openDatabase: () => {
          throw new Error('sqlite unavailable');
        },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });

  it('returns migration errors before using the repository', async () => {
    const repository: ReflectionRepository = {
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveReflection: async () => ok(createReflection()),
    };
    const migrationFailure = createAppError('unavailable', 'Migration failed.', 'retry');
    const result = await listPeriodReflections(
      { period: weekPeriod },
      {
        ...createDependencies(repository),
        migrateDatabase: async (): Promise<AppResult<never>> => ({ ok: false, error: migrationFailure }),
      },
    );

    expect(result).toEqual({ ok: false, error: migrationFailure });
  });
});
