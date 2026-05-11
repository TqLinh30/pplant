import type { CategoryTopicRepository } from '@/data/repositories/category-topic.repository';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok } from '@/domain/common/result';
import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type {
  CategoryTopicItem,
  CategoryTopicKind,
  CategoryTopicSortOrderAssignment,
  CategoryTopicUsageSummary,
} from '@/domain/categories/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createCategoryTopicItem,
  deleteCategoryTopicItem,
  getCategoryTopicDeletionImpact,
  loadCategoryTopicSettings,
  reorderCategoryTopicItems,
  updateCategoryTopicItemName,
  type CategoryTopicUsageAdapter,
} from './category-topic.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const laterNow = new Date('2026-05-08T00:10:00.000Z');
const migrationReport = {
  applied: 0,
  appliedMigrations: [],
};

function createUsage(totalCount: number): CategoryTopicUsageSummary {
  return {
    moneyRecordCount: totalCount,
    reflectionCount: 0,
    taskCount: 0,
    totalCount,
    workEntryCount: 0,
  };
}

function createItemFixture(
  kind: CategoryTopicKind,
  overrides: Partial<CategoryTopicItem> = {},
): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id: `${kind}-${overrides.name ?? 'fixture'}`.toLocaleLowerCase('en-US'),
      name: overrides.name ?? 'Fixture',
      sortOrder: overrides.sortOrder ?? 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
      ...overrides,
    },
    kind,
  );

  if (!result.ok) {
    throw new Error('category/topic fixture failed');
  }

  return result.value;
}

function sortItems(items: CategoryTopicItem[]) {
  return [...items].sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id));
}

function createFakeRepository(initialItems: CategoryTopicItem[] = []): CategoryTopicRepository & {
  allItems(kind: CategoryTopicKind): CategoryTopicItem[];
} {
  const items: CategoryTopicItem[] = [...initialItems];

  return {
    allItems(kind) {
      return sortItems(items.filter((item) => item.kind === kind));
    },
    async archiveItem(kind, _workspaceId, id, { now }) {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);

      if (!item) {
        return err(createAppError('not_found', 'Category or topic was not found.', 'edit'));
      }

      item.archivedAt = now.toISOString();
      item.updatedAt = now.toISOString();
      return ok({ ...item });
    },
    async createItem(kind, input) {
      const parsed = parseCategoryTopicRow(input, kind);

      if (!parsed.ok) {
        return parsed;
      }

      items.push(parsed.value);
      return ok(parsed.value);
    },
    async findItem(kind, _workspaceId, id) {
      return ok(items.find((item) => item.kind === kind && item.id === id) ?? null);
    },
    async listItems(kind, _workspaceId, { includeArchived = false } = {}) {
      return ok(
        sortItems(
          items.filter((item) => item.kind === kind && (includeArchived || item.archivedAt === null)),
        ),
      );
    },
    async updateName(kind, _workspaceId, id, name, { now }) {
      const item = items.find((candidate) => candidate.kind === kind && candidate.id === id);

      if (!item) {
        return err(createAppError('not_found', 'Category or topic was not found.', 'edit'));
      }

      item.name = name;
      item.updatedAt = now.toISOString();
      return ok({ ...item });
    },
    async updateSortOrders(kind, _workspaceId, assignments, { now }) {
      for (const assignment of assignments) {
        const item = items.find(
          (candidate) => candidate.kind === kind && candidate.id === assignment.id,
        );

        if (item) {
          item.sortOrder = assignment.sortOrder;
          item.updatedAt = now.toISOString();
        }
      }

      return ok(sortItems(items.filter((item) => item.kind === kind && item.archivedAt === null)));
    },
  };
}

function createDependencies(
  repository: CategoryTopicRepository,
  options: {
    createId?: (kind: CategoryTopicKind) => string;
    now?: () => Date;
    usageAdapter?: CategoryTopicUsageAdapter;
  } = {},
) {
  return {
    createCategoryTopicRepository: () => repository,
    createId: options.createId ?? ((kind: CategoryTopicKind) => `${kind}-generated`),
    migrateDatabase: async () => ok(migrationReport),
    now: options.now ?? (() => fixedNow),
    openDatabase: () => ({}),
    usageAdapter: options.usageAdapter,
  };
}

describe('category/topic service', () => {
  it('loads empty category and topic lists for a fresh local workspace', async () => {
    const repository = createFakeRepository();

    const result = await loadCategoryTopicSettings(createDependencies(repository));

    expect(result).toEqual({
      ok: true,
      value: {
        categories: [],
        topics: [],
      },
    });
  });

  it('creates trimmed active items with stable local workspace ids and dense sort order', async () => {
    const repository = createFakeRepository();

    const result = await createCategoryTopicItem(
      { kind: 'category', name: '  School  ' },
      createDependencies(repository, { createId: () => 'category-school' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: 'category-school',
        kind: 'category',
        name: 'School',
        sortOrder: 0,
        workspaceId: localWorkspaceId,
      });
    }
  });

  it('rejects duplicate active names but allows archived historical names', async () => {
    const active = createItemFixture('topic', { id: 'topic-school' as EntityId, name: 'School' as never });
    const archived = createItemFixture('topic', {
      archivedAt: fixedNow.toISOString(),
      id: 'topic-archive' as EntityId,
      name: 'Project' as never,
    });
    const repository = createFakeRepository([active, archived]);

    const duplicate = await createCategoryTopicItem(
      { kind: 'topic', name: ' school ' },
      createDependencies(repository),
    );
    const recreatedHistorical = await createCategoryTopicItem(
      { kind: 'topic', name: ' Project ' },
      createDependencies(repository, { createId: () => 'topic-project-new' }),
    );

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error.code).toBe('conflict');
      expect(duplicate.error.recovery).toBe('edit');
    }
    expect(recreatedHistorical.ok).toBe(true);
  });

  it('updates names without changing ids', async () => {
    const item = createItemFixture('category', { id: 'category-school' as EntityId, name: 'School' as never });
    const repository = createFakeRepository([item]);

    const result = await updateCategoryTopicItemName(
      { id: item.id, kind: 'category', name: 'Classes' },
      createDependencies(repository, { now: () => laterNow }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(item.id);
      expect(result.value.name).toBe('Classes');
      expect(result.value.updatedAt).toBe(laterNow.toISOString());
    }
  });

  it('reorders active items with dense sort-order assignments', async () => {
    const first = createItemFixture('topic', { id: 'first' as EntityId, name: 'First' as never, sortOrder: 0 });
    const second = createItemFixture('topic', { id: 'second' as EntityId, name: 'Second' as never, sortOrder: 1 });
    const repository = createFakeRepository([first, second]);

    const result = await reorderCategoryTopicItems(
      { kind: 'topic', orderedIds: ['second', 'first'] },
      createDependencies(repository, { now: () => laterNow }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((item) => [item.id, item.sortOrder])).toEqual([
        ['second', 0],
        ['first', 1],
      ]);
    }
  });

  it('archives items instead of hard-deleting them when there is no usage', async () => {
    const item = createItemFixture('category', { id: 'category-life' as EntityId, name: 'Life' as never });
    const repository = createFakeRepository([item]);

    const impact = await getCategoryTopicDeletionImpact(
      { id: item.id, kind: 'category' },
      createDependencies(repository),
    );
    const deleted = await deleteCategoryTopicItem(
      { id: item.id, kind: 'category', mode: 'archive' },
      createDependencies(repository, { now: () => laterNow }),
    );

    expect(impact.ok).toBe(true);
    if (impact.ok) {
      expect(impact.value.usage.totalCount).toBe(0);
      expect(impact.value.canReassign).toBe(false);
    }
    expect(deleted.ok).toBe(true);
    expect(repository.allItems('category')).toHaveLength(1);
    expect(repository.allItems('category')[0].archivedAt).toBe(laterNow.toISOString());
  });

  it('supports injected usage impact, cancel, invalid replacement, and reassign archive path', async () => {
    const from = createItemFixture('topic', { id: 'from' as EntityId, name: 'From' as never });
    const to = createItemFixture('topic', { id: 'to' as EntityId, name: 'To' as never, sortOrder: 1 });
    const repository = createFakeRepository([from, to]);
    const reassignCalls: CategoryTopicSortOrderAssignment[] = [];
    const usageAdapter: CategoryTopicUsageAdapter = {
      async getUsageSummary() {
        return ok(createUsage(3));
      },
      async reassignUsage(_kind, fromId, toId) {
        reassignCalls.push({ id: fromId, sortOrder: toId === 'to' ? 1 : -1 });
        return ok(undefined);
      },
    };
    const dependencies = createDependencies(repository, { now: () => laterNow, usageAdapter });

    const impact = await getCategoryTopicDeletionImpact({ id: from.id, kind: 'topic' }, dependencies);
    const cancelled = await deleteCategoryTopicItem({ id: from.id, kind: 'topic', mode: 'cancel' }, dependencies);
    const invalid = await deleteCategoryTopicItem(
      { id: from.id, kind: 'topic', mode: 'reassign' },
      dependencies,
    );
    const reassigned = await deleteCategoryTopicItem(
      { id: from.id, kind: 'topic', mode: 'reassign', replacementId: to.id },
      dependencies,
    );

    expect(impact.ok).toBe(true);
    if (impact.ok) {
      expect(impact.value.canReassign).toBe(true);
      expect(impact.value.usage.totalCount).toBe(3);
    }
    expect(cancelled).toEqual({ ok: true, value: { action: 'cancelled' } });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe('validation_failed');
      expect(invalid.error.recovery).toBe('edit');
    }
    expect(reassigned.ok).toBe(true);
    expect(reassignCalls).toEqual([{ id: from.id, sortOrder: 1 }]);
    expect(repository.allItems('topic').find((item) => item.id === from.id)?.archivedAt).toBe(
      laterNow.toISOString(),
    );
  });

  it('returns retryable errors before repository access when local storage cannot open', async () => {
    const repository = createFakeRepository();

    const result = await loadCategoryTopicSettings({
      ...createDependencies(repository),
      openDatabase: () => {
        throw new Error('sqlite open failed');
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });
});
