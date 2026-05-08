import type { ReflectionRepository } from '@/data/repositories/reflections.repository';
import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import type { Reflection, ReflectionPeriod } from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  listPeriodReflections,
  listReflectionHistory,
  saveReflectionInsightPreference,
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
    createPreferenceId: () => 'preference-generated',
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
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveReflection: async (input) => {
        savedInputs.push(input);
        return ok(createReflection());
      },
      saveInsightPreference: async () => ok({} as never),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
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
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveInsightPreference: async () => ok({} as never),
      saveReflection: async () => ok(createReflection({ responseText: null, state: 'skipped' })),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
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
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async (workspaceId, period) => {
        expect(workspaceId).toBe(localWorkspaceId);
        expect(period).toBe(weekPeriod);
        return ok([createReflection()]);
      },
      saveInsightPreference: async () => ok({} as never),
      saveReflection: async () => ok(createReflection()),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
    };

    const listed = await listPeriodReflections({ period: weekPeriod }, createDependencies(repository));

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
    }
  });

  it('returns retryable errors when local data cannot be opened', async () => {
    const repository: ReflectionRepository = {
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveInsightPreference: async () => ok({} as never),
      saveReflection: async () => ok(createReflection()),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
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
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveInsightPreference: async () => ok({} as never),
      saveReflection: async () => ok(createReflection()),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
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

  it('lists answered reflection history through the repository boundary', async () => {
    const repository: ReflectionRepository = {
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async (workspaceId, options) => {
        expect(workspaceId).toBe(localWorkspaceId);
        expect(options?.limit).toBe(5);
        return ok([createReflection()]);
      },
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveInsightPreference: async () => ok({} as never),
      saveReflection: async () => ok(createReflection()),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
    };

    const history = await listReflectionHistory(createDependencies(repository), { limit: 5 });

    expect(history.ok).toBe(true);
    if (history.ok) {
      expect(history.value).toHaveLength(1);
    }
  });

  it('saves dismissed insight preferences with generated id and period scope', async () => {
    const savedInputs: unknown[] = [];
    const repository: ReflectionRepository = {
      listInsightPreferences: async () => ok([]),
      listRecentAnsweredReflections: async () => ok([]),
      listRecentReflections: async () => ok([]),
      listReflectionsForPeriod: async () => ok([]),
      saveInsightPreference: async (input) => {
        savedInputs.push(input);
        return ok({
          action: 'dismissed',
          createdAt: fixedDate.toISOString(),
          deletedAt: null,
          id: 'preference-generated' as never,
          insightId: 'money_time',
          periodKind: 'week',
          periodStartDate: '2026-05-04' as never,
          scopeKey: 'week:2026-05-04',
          updatedAt: fixedDate.toISOString(),
          workspaceId: localWorkspaceId,
        });
      },
      saveReflection: async () => ok(createReflection()),
      softDeleteReflection: async () => ok(undefined),
      softDeleteWorkspaceReflectionData: async () => ok(undefined),
    };

    const saved = await saveReflectionInsightPreference(
      {
        action: 'dismissed',
        insightId: 'money_time',
        period: weekPeriod,
      },
      createDependencies(repository),
    );

    expect(saved.ok).toBe(true);
    expect(savedInputs).toEqual([
      {
        action: 'dismissed',
        id: 'preference-generated',
        insightId: 'money_time',
        period: weekPeriod,
        timestamp: fixedDate.toISOString(),
        workspaceId: localWorkspaceId,
      },
    ]);
  });
});
