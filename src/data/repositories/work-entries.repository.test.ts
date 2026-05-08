import { localWorkspaceId } from '@/domain/workspace/types';
import type { WorkEntryRow } from '@/domain/work/schemas';
import type { SaveWorkEntryInput } from '@/domain/work/types';

import { createWorkEntryRepository } from './work-entries.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

type TopicRow = {
  createdAt: string;
  topicId: string;
  workEntryId: string;
  workspaceId: string;
};

class FakeWorkEntryClient {
  readonly executedSql: string[] = [];
  records: WorkEntryRow[] = [];
  topics: TopicRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const recordsSnapshot = this.records.map((record) => ({ ...record }));
    const topicsSnapshot = this.topics.map((topic) => ({ ...topic }));

    try {
      task();
    } catch (cause) {
      this.records = recordsSnapshot;
      this.topics = topicsSnapshot;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO work_entries')) {
      const [
        id,
        workspaceId,
        entryMode,
        localDate,
        durationMinutes,
        startedAtLocalDate,
        startedAtLocalTime,
        endedAtLocalDate,
        endedAtLocalTime,
        breakMinutes,
        paid,
        wageMinorPerHour,
        wageCurrencyCode,
        wageSource,
        earnedIncomeMinor,
        categoryId,
        note,
        sourceValue,
        sourceOfTruth,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.records.push({
        breakMinutes: breakMinutes as number,
        categoryId: categoryId as string | null,
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        durationMinutes: durationMinutes as number,
        earnedIncomeMinor: earnedIncomeMinor as number,
        endedAtLocalDate: endedAtLocalDate as string | null,
        endedAtLocalTime: endedAtLocalTime as string | null,
        entryMode: entryMode as 'hours' | 'shift',
        id: id as string,
        localDate: localDate as string,
        note: note as string | null,
        paid: Boolean(paid),
        source: sourceValue as 'manual',
        sourceOfTruth: sourceOfTruth as 'manual',
        startedAtLocalDate: startedAtLocalDate as string | null,
        startedAtLocalTime: startedAtLocalTime as string | null,
        updatedAt: updatedAt as string,
        wageCurrencyCode: wageCurrencyCode as string,
        wageMinorPerHour: wageMinorPerHour as number,
        wageSource: wageSource as 'default' | 'override',
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO work_entry_topics')) {
      const [workEntryId, topicId, workspaceId, createdAt] = params;

      this.topics.push({
        createdAt: createdAt as string,
        topicId: topicId as string,
        workEntryId: workEntryId as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE work_entries') && source.includes('deleted_at = NULL')) {
      const [
        entryMode,
        localDate,
        durationMinutes,
        startedAtLocalDate,
        startedAtLocalTime,
        endedAtLocalDate,
        endedAtLocalTime,
        breakMinutes,
        paid,
        wageMinorPerHour,
        wageCurrencyCode,
        wageSource,
        earnedIncomeMinor,
        categoryId,
        note,
        sourceValue,
        sourceOfTruth,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        Object.assign(record, {
          breakMinutes,
          categoryId,
          durationMinutes,
          earnedIncomeMinor,
          endedAtLocalDate,
          endedAtLocalTime,
          entryMode,
          localDate,
          note,
          paid: Boolean(paid),
          source: sourceValue,
          sourceOfTruth,
          startedAtLocalDate,
          startedAtLocalTime,
          updatedAt,
          wageCurrencyCode,
          wageMinorPerHour,
          wageSource,
        });
      }

      return { changes: record ? 1 : 0 };
    }

    if (source.includes('UPDATE work_entries') && source.includes('deleted_at = ?')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        record.deletedAt = deletedAt as string;
        record.updatedAt = updatedAt as string;
      }

      return { changes: record ? 1 : 0 };
    }

    if (source.includes('DELETE FROM work_entry_topics')) {
      const [workspaceId, workEntryId] = params;
      this.topics = this.topics.filter(
        (topic) => topic.workspaceId !== workspaceId || topic.workEntryId !== workEntryId,
      );

      return { changes: 1 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(_source: string, ...params: unknown[]): T | null {
    const [workspaceId, id] = params;
    const includeDeleted = !_source.includes('deleted_at IS NULL');

    return (
      (this.records.find(
        (record) =>
          record.workspaceId === workspaceId && record.id === id && (includeDeleted || record.deletedAt === null),
      ) as T | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('SELECT topic_id AS topicId')) {
      const [workspaceId, workEntryId] = params;

      return this.topics
        .filter((topic) => topic.workspaceId === workspaceId && topic.workEntryId === workEntryId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.topicId.localeCompare(right.topicId))
        .map((topic) => ({ topicId: topic.topicId }) as T);
    }

    const [workspaceId, limit] = params;

    return this.records
      .filter((record) => record.workspaceId === workspaceId && record.deletedAt === null)
      .sort((left, right) => right.localDate.localeCompare(left.localDate) || right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit as number)
      .map((record) => record as T);
  }
}

function createInput(overrides: Partial<SaveWorkEntryInput> = {}): SaveWorkEntryInput {
  return {
    breakMinutes: 0,
    categoryId: 'cat-work',
    createdAt: fixedNow,
    durationMinutes: 120,
    earnedIncomeMinor: 3000,
    entryMode: 'hours',
    id: 'work-1',
    localDate: '2026-05-08',
    note: 'Library shift',
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: ['topic-job'],
    updatedAt: fixedNow,
    wageCurrencyCode: 'USD',
    wageMinorPerHour: 1500,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('work entry repository', () => {
  it('creates and lists recent work entries with topics', async () => {
    const client = new FakeWorkEntryClient();
    const repository = createWorkEntryRepository({ $client: client } as never);

    const created = await repository.createEntry(createInput());
    const recent = await repository.listRecentEntries(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(recent.ok).toBe(true);
    if (recent.ok) {
      expect(recent.value).toHaveLength(1);
      expect(recent.value[0]).toMatchObject({
        categoryId: 'cat-work',
        topicIds: ['topic-job'],
        wageSource: 'default',
      });
    }
  });

  it('updates entries and replaces topics while preserving createdAt', async () => {
    const client = new FakeWorkEntryClient();
    const repository = createWorkEntryRepository({ $client: client } as never);

    await repository.createEntry(createInput());
    const updated = await repository.updateEntry(
      createInput({
        categoryId: null,
        durationMinutes: 90,
        earnedIncomeMinor: 3150,
        note: 'Cafe',
        topicIds: ['topic-cafe'],
        updatedAt: '2026-05-08T01:00:00.000Z',
        wageMinorPerHour: 2100,
        wageSource: 'override',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value).toMatchObject({
        createdAt: fixedNow,
        durationMinutes: 90,
        topicIds: ['topic-cafe'],
        wageSource: 'override',
      });
    }
  });

  it('soft deletes entries and hides them from recent lists', async () => {
    const client = new FakeWorkEntryClient();
    const repository = createWorkEntryRepository({ $client: client } as never);

    await repository.createEntry(createInput());
    const deleted = await repository.deleteEntry(localWorkspaceId, 'work-1' as never, {
      now: new Date('2026-05-08T02:00:00.000Z'),
    });
    const recent = await repository.listRecentEntries(localWorkspaceId);

    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.value.deletedAt).toBe('2026-05-08T02:00:00.000Z');
    }
    expect(recent).toEqual({ ok: true, value: [] });
  });
});
