import type { PplantDatabase } from '@/data/db/client';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createCategoryTopicRepository } from './category-topic.repository';

type FakeRow = {
  archivedAt: string | null;
  createdAt: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
  workspaceId: string;
};

class FakeCategoryTopicClient {
  readonly executedSql: string[] = [];
  readonly rows: Record<'categories' | 'topics', FakeRow[]> = {
    categories: [],
    topics: [],
  };

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    this.executedSql.push(source);

    const [workspaceId] = params;
    const tableName = source.includes('FROM topics') ? 'topics' : 'categories';
    const activeOnly = source.includes('archived_at IS NULL');

    return this.rows[tableName]
      .filter((row) => row.workspaceId === workspaceId)
      .filter((row) => !activeOnly || row.archivedAt === null)
      .sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)) as T[];
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    this.executedSql.push(source);

    const [workspaceId, id] = params;
    const tableName = source.includes('FROM topics') ? 'topics' : 'categories';

    return (this.rows[tableName].find((row) => row.workspaceId === workspaceId && row.id === id) ?? null) as T | null;
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    const tableName = source.includes('topics') ? 'topics' : 'categories';

    if (source.includes('INSERT INTO')) {
      const [id, workspaceId, name, sortOrder, createdAt, updatedAt, archivedAt] = params;
      this.rows[tableName].push({
        archivedAt: (archivedAt as string | null) ?? null,
        createdAt: String(createdAt),
        id: String(id),
        name: String(name),
        sortOrder: Number(sortOrder),
        updatedAt: String(updatedAt),
        workspaceId: String(workspaceId),
      });
    }

    if (source.includes('SET name =')) {
      const [name, updatedAt, workspaceId, id] = params;
      const row = this.rows[tableName].find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id,
      );

      if (row) {
        row.name = String(name);
        row.updatedAt = String(updatedAt);
      }
    }

    if (source.includes('SET sort_order =')) {
      const [sortOrder, updatedAt, workspaceId, id] = params;
      const row = this.rows[tableName].find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id,
      );

      if (row) {
        row.sortOrder = Number(sortOrder);
        row.updatedAt = String(updatedAt);
      }
    }

    if (source.includes('SET archived_at =')) {
      const [archivedAt, updatedAt, workspaceId, id] = params;
      const row = this.rows[tableName].find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id,
      );

      if (row) {
        row.archivedAt = String(archivedAt);
        row.updatedAt = String(updatedAt);
      }
    }

    return { changes: 1 };
  }
}

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const laterNow = new Date('2026-05-08T00:10:00.000Z');

function createRepositoryWithFakeClient() {
  const client = new FakeCategoryTopicClient();
  const repository = createCategoryTopicRepository({ $client: client } as unknown as PplantDatabase);

  return { client, repository };
}

describe('category/topic repository', () => {
  it('creates and lists active category rows through bound SQLite parameters', async () => {
    const { client, repository } = createRepositoryWithFakeClient();

    const created = await repository.createItem('category', {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id: 'category-school',
      name: 'School',
      sortOrder: 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    });
    const listed = await repository.listItems('category', localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.map((item) => item.name)).toEqual(['School']);
    }
    expect(client.executedSql.join('\n')).not.toContain('DELETE');
  });

  it('updates names and dense sort order without changing ids', async () => {
    const { repository } = createRepositoryWithFakeClient();
    await repository.createItem('topic', {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id: 'first',
      name: 'First',
      sortOrder: 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    });
    await repository.createItem('topic', {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id: 'second',
      name: 'Second',
      sortOrder: 1,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    });

    const updated = await repository.updateName('topic', localWorkspaceId, 'first' as never, 'Classes' as never, {
      now: laterNow,
    });
    const reordered = await repository.updateSortOrders(
      'topic',
      localWorkspaceId,
      [
        { id: 'second' as never, sortOrder: 0 },
        { id: 'first' as never, sortOrder: 1 },
      ],
      { now: laterNow },
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.id).toBe('first');
      expect(updated.value.name).toBe('Classes');
    }
    expect(reordered.ok).toBe(true);
    if (reordered.ok) {
      expect(reordered.value.map((item) => [item.id, item.sortOrder])).toEqual([
        ['second', 0],
        ['first', 1],
      ]);
    }
  });

  it('archives rows non-destructively and can still list history', async () => {
    const { client, repository } = createRepositoryWithFakeClient();
    await repository.createItem('category', {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id: 'category-life',
      name: 'Life',
      sortOrder: 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    });

    const archived = await repository.archiveItem(
      'category',
      localWorkspaceId,
      'category-life' as never,
      { now: laterNow },
    );
    const active = await repository.listItems('category', localWorkspaceId);
    const history = await repository.listItems('category', localWorkspaceId, { includeArchived: true });

    expect(archived.ok).toBe(true);
    expect(active).toEqual({ ok: true, value: [] });
    expect(history.ok).toBe(true);
    if (history.ok) {
      expect(history.value[0].archivedAt).toBe(laterNow.toISOString());
    }
    expect(client.executedSql.join('\n')).not.toContain('DELETE');
  });
});
