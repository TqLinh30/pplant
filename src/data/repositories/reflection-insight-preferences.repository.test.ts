import type {
  ReflectionInsightPreferenceRow,
  ReflectionPeriod,
  ReflectionRow,
} from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createReflectionRepository } from './reflections.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

const weekPeriod: ReflectionPeriod = {
  endDateExclusive: '2026-05-11' as never,
  kind: 'week',
  startDate: '2026-05-04' as never,
};

class FakeReflectionInsightClient {
  preferenceRows: ReflectionInsightPreferenceRow[] = [];
  reflectionRows: ReflectionRow[] = [];

  runSync(source: string, ...params: unknown[]): unknown {
    if (source.includes('INSERT INTO reflection_insight_preferences')) {
      const [
        id,
        workspaceId,
        insightId,
        action,
        scopeKey,
        periodKind,
        periodStartDate,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.preferenceRows.push({
        action: action as string,
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        id: id as string,
        insightId: insightId as string,
        periodKind: periodKind as string | null,
        periodStartDate: periodStartDate as string | null,
        scopeKey: scopeKey as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE reflection_insight_preferences') && source.includes('SET action = ?')) {
      const [action, periodKind, periodStartDate, updatedAt, workspaceId, id] = params;
      const row = this.preferenceRows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (row) {
        row.action = action as string;
        row.periodKind = periodKind as string | null;
        row.periodStartDate = periodStartDate as string | null;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('UPDATE reflections') && source.includes('WHERE workspace_id = ? AND id = ?')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const row = this.reflectionRows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (row) {
        row.deletedAt = deletedAt as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('UPDATE reflections')) {
      const [deletedAt, updatedAt, workspaceId] = params;

      for (const row of this.reflectionRows) {
        if (row.workspaceId === workspaceId && row.deletedAt === null) {
          row.deletedAt = deletedAt as string;
          row.updatedAt = updatedAt as string;
        }
      }

      return { changes: 1 };
    }

    if (source.includes('UPDATE reflection_insight_preferences')) {
      const [deletedAt, updatedAt, workspaceId] = params;

      for (const row of this.preferenceRows) {
        if (row.workspaceId === workspaceId && row.deletedAt === null) {
          row.deletedAt = deletedAt as string;
          row.updatedAt = updatedAt as string;
        }
      }

      return { changes: 1 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('insight_id = ?')) {
      const [workspaceId, insightId, scopeKey] = params;

      return (
        (this.preferenceRows.find(
          (row) =>
            row.workspaceId === workspaceId &&
            row.insightId === insightId &&
            row.scopeKey === scopeKey &&
            row.deletedAt === null,
        ) as T | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;

    return (
      (this.preferenceRows.find((row) => row.workspaceId === workspaceId && row.id === id && row.deletedAt === null) as
        | T
        | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    const [workspaceId] = params;

    if (source.includes("state = 'answered'")) {
      const limit = params[1] as number;

      return this.reflectionRows
        .filter((row) => row.workspaceId === workspaceId && row.deletedAt === null && row.state === 'answered')
        .sort((left, right) => right.periodStartDate.localeCompare(left.periodStartDate))
        .slice(0, limit)
        .map((row) => row as T);
    }

    return this.preferenceRows
      .filter((row) => row.workspaceId === workspaceId && row.deletedAt === null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((row) => row as T);
  }
}

function preferenceInput(overrides: Record<string, unknown> = {}) {
  return {
    action: 'dismissed',
    id: 'preference-1',
    insightId: 'money_time',
    period: weekPeriod,
    timestamp: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function reflectionRow(overrides: Partial<ReflectionRow> = {}): ReflectionRow {
  return {
    createdAt: fixedNow,
    deletedAt: null,
    id: 'reflection-1',
    periodEndDateExclusive: '2026-05-11',
    periodKind: 'week',
    periodStartDate: '2026-05-04',
    promptId: 'remember_period',
    promptText: 'What do you want to remember about this period?',
    responseText: 'A saved note.',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'answered',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection insight preference repository', () => {
  it('saves and lists active dismiss and mute preferences', async () => {
    const client = new FakeReflectionInsightClient();
    const repository = createReflectionRepository({ $client: client } as never);

    await repository.saveInsightPreference(preferenceInput());
    await repository.saveInsightPreference(
      preferenceInput({
        action: 'muted',
        id: 'preference-2',
        insightId: 'work_savings',
        period: null,
      }),
    );

    const listed = await repository.listInsightPreferences(localWorkspaceId);

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.map((item) => [item.insightId, item.action, item.scopeKey])).toEqual([
        ['money_time', 'dismissed', 'week:2026-05-04'],
        ['work_savings', 'muted', 'global'],
      ]);
    }
  });

  it('updates an existing active preference for the same insight and scope', async () => {
    const client = new FakeReflectionInsightClient();
    const repository = createReflectionRepository({ $client: client } as never);

    await repository.saveInsightPreference(preferenceInput());
    const updated = await repository.saveInsightPreference(
      preferenceInput({
        action: 'dismissed',
        id: 'preference-new',
        timestamp: '2026-05-08T00:05:00.000Z',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.id).toBe('preference-1');
      expect(updated.value.updatedAt).toBe('2026-05-08T00:05:00.000Z');
    }
    expect(client.preferenceRows).toHaveLength(1);
  });

  it('lists only active answered reflections for history', async () => {
    const client = new FakeReflectionInsightClient();
    client.reflectionRows = [
      reflectionRow({ id: 'answered-old' }),
      reflectionRow({ id: 'skipped', responseText: null, state: 'skipped' }),
      reflectionRow({ deletedAt: '2026-05-08T00:03:00.000Z', id: 'deleted' }),
      reflectionRow({
        id: 'answered-new',
        periodEndDateExclusive: '2026-05-25',
        periodKind: 'week',
        periodStartDate: '2026-05-18',
      }),
    ];
    const repository = createReflectionRepository({ $client: client } as never);

    const history = await repository.listRecentAnsweredReflections(localWorkspaceId, { limit: 10 });

    expect(history.ok).toBe(true);
    if (history.ok) {
      expect(history.value.map((item) => item.id)).toEqual(['answered-new', 'answered-old']);
    }
  });

  it('soft deletes reflection data for future privacy deletion workflows', async () => {
    const client = new FakeReflectionInsightClient();
    client.reflectionRows = [reflectionRow()];
    const repository = createReflectionRepository({ $client: client } as never);
    await repository.saveInsightPreference(preferenceInput());

    const deleted = await repository.softDeleteWorkspaceReflectionData(
      localWorkspaceId,
      '2026-05-08T00:10:00.000Z',
    );

    expect(deleted.ok).toBe(true);
    expect(client.reflectionRows.every((row) => row.deletedAt === '2026-05-08T00:10:00.000Z')).toBe(true);
    expect(client.preferenceRows.every((row) => row.deletedAt === '2026-05-08T00:10:00.000Z')).toBe(true);
  });
});
