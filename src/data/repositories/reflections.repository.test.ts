import type { ReflectionPeriod, ReflectionRow } from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createReflectionRepository } from './reflections.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

const weekPeriod: ReflectionPeriod = {
  endDateExclusive: '2026-05-11' as never,
  kind: 'week',
  startDate: '2026-05-04' as never,
};

class FakeReflectionClient {
  readonly executedSql: string[] = [];
  rows: ReflectionRow[] = [];

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO reflections')) {
      const [
        id,
        workspaceId,
        periodKind,
        periodStartDate,
        periodEndDateExclusive,
        promptId,
        promptText,
        responseText,
        state,
        sourceValue,
        sourceOfTruth,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.rows.push({
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        id: id as string,
        periodEndDateExclusive: periodEndDateExclusive as string,
        periodKind: periodKind as string,
        periodStartDate: periodStartDate as string,
        promptId: promptId as string,
        promptText: promptText as string,
        responseText: responseText as string | null,
        source: sourceValue as string,
        sourceOfTruth: sourceOfTruth as string,
        state: state as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE reflections')) {
      const [promptText, responseText, state, sourceValue, sourceOfTruth, updatedAt, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) =>
          candidate.workspaceId === workspaceId &&
          candidate.id === id &&
          candidate.deletedAt === null,
      );

      if (row) {
        row.promptText = promptText as string;
        row.responseText = responseText as string | null;
        row.source = sourceValue as string;
        row.sourceOfTruth = sourceOfTruth as string;
        row.state = state as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('prompt_id = ?')) {
      const [workspaceId, periodKind, periodStartDate, promptId] = params;

      return (
        (this.rows.find(
          (row) =>
            row.workspaceId === workspaceId &&
            row.periodKind === periodKind &&
            row.periodStartDate === periodStartDate &&
            row.promptId === promptId &&
            row.deletedAt === null,
        ) as T | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;

    return (
      (this.rows.find((row) => row.workspaceId === workspaceId && row.id === id && row.deletedAt === null) as
        | T
        | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('period_kind = ?')) {
      const [workspaceId, periodKind, periodStartDate] = params;

      return this.rows
        .filter(
          (row) =>
            row.workspaceId === workspaceId &&
            row.periodKind === periodKind &&
            row.periodStartDate === periodStartDate &&
            row.deletedAt === null,
        )
        .sort((left, right) => left.promptId.localeCompare(right.promptId))
        .map((row) => row as T);
    }

    const [workspaceId, limit] = params;

    return this.rows
      .filter((row) => row.workspaceId === workspaceId && row.deletedAt === null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
      .slice(0, limit as number)
      .map((row) => row as T);
  }
}

function saveInput(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reflection-1',
    period: weekPeriod,
    promptId: 'remember_period',
    promptText: 'What do you want to remember about this period?',
    responseText: 'The week felt clearer after I wrote it down.',
    state: 'answered',
    timestamp: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection repository', () => {
  it('saves answered reflections and lists them by period', async () => {
    const client = new FakeReflectionClient();
    const repository = createReflectionRepository({ $client: client } as never);

    const saved = await repository.saveReflection(saveInput());
    const listed = await repository.listReflectionsForPeriod(localWorkspaceId, weekPeriod);

    expect(saved.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
      expect(listed.value[0]).toMatchObject({
        promptId: 'remember_period',
        responseText: 'The week felt clearer after I wrote it down.',
        state: 'answered',
      });
    }
  });

  it('saves skipped prompts without response text', async () => {
    const client = new FakeReflectionClient();
    const repository = createReflectionRepository({ $client: client } as never);

    const skipped = await repository.saveReflection(
      saveInput({
        id: 'reflection-skip',
        responseText: null,
        state: 'skipped',
      }),
    );

    expect(skipped.ok).toBe(true);
    if (skipped.ok) {
      expect(skipped.value.responseText).toBeNull();
      expect(skipped.value.state).toBe('skipped');
    }
  });

  it('updates an existing active reflection for the same period and prompt', async () => {
    const client = new FakeReflectionClient();
    const repository = createReflectionRepository({ $client: client } as never);

    await repository.saveReflection(saveInput());
    const updated = await repository.saveReflection(
      saveInput({
        id: 'reflection-new-id',
        responseText: 'Updated note.',
        timestamp: '2026-05-08T00:05:00.000Z',
      }),
    );
    const listed = await repository.listReflectionsForPeriod(localWorkspaceId, weekPeriod);

    expect(updated.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (updated.ok && listed.ok) {
      expect(updated.value.id).toBe('reflection-1');
      expect(updated.value.responseText).toBe('Updated note.');
      expect(listed.value).toHaveLength(1);
    }
  });

  it('lists recent active reflections across periods', async () => {
    const client = new FakeReflectionClient();
    const repository = createReflectionRepository({ $client: client } as never);

    await repository.saveReflection(saveInput({ id: 'reflection-old' }));
    await repository.saveReflection(
      saveInput({
        id: 'reflection-month',
        period: {
          endDateExclusive: '2026-06-01',
          kind: 'month',
          startDate: '2026-05-01',
        },
        promptId: 'noticed_pair',
        responseText: 'Month note.',
        timestamp: '2026-05-08T00:10:00.000Z',
      }),
    );

    const recent = await repository.listRecentReflections(localWorkspaceId, { limit: 1 });

    expect(recent.ok).toBe(true);
    if (recent.ok) {
      expect(recent.value.map((reflection) => reflection.id)).toEqual(['reflection-month']);
    }
  });

  it('returns validation errors without writing invalid input', async () => {
    const client = new FakeReflectionClient();
    const repository = createReflectionRepository({ $client: client } as never);

    const invalid = await repository.saveReflection(saveInput({ responseText: '   ' }));

    expect(invalid.ok).toBe(false);
    expect(client.rows).toHaveLength(0);
  });
});
