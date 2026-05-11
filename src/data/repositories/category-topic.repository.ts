import type { PplantDatabase } from '@/data/db/client';
import type { RepositoryWriteOptions } from '@/data/repositories';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseCategoryTopicRow,
  type CategoryTopicRow,
} from '@/domain/categories/schemas';
import type {
  CategoryTopicItem,
  CategoryTopicKind,
  CategoryTopicName,
  CategoryTopicSortOrderAssignment,
  SaveCategoryTopicInput,
} from '@/domain/categories/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type CategoryTopicRepository = {
  listItems(
    kind: CategoryTopicKind,
    workspaceId: WorkspaceId,
    options?: { includeArchived?: boolean },
  ): Promise<AppResult<CategoryTopicItem[]>>;
  findItem(
    kind: CategoryTopicKind,
    workspaceId: WorkspaceId,
    id: EntityId,
  ): Promise<AppResult<CategoryTopicItem | null>>;
  createItem(
    kind: CategoryTopicKind,
    input: SaveCategoryTopicInput,
  ): Promise<AppResult<CategoryTopicItem>>;
  updateName(
    kind: CategoryTopicKind,
    workspaceId: WorkspaceId,
    id: EntityId,
    name: CategoryTopicName,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<CategoryTopicItem>>;
  updateSortOrders(
    kind: CategoryTopicKind,
    workspaceId: WorkspaceId,
    assignments: CategoryTopicSortOrderAssignment[],
    options: RepositoryWriteOptions,
  ): Promise<AppResult<CategoryTopicItem[]>>;
  archiveItem(
    kind: CategoryTopicKind,
    workspaceId: WorkspaceId,
    id: EntityId,
    options: RepositoryWriteOptions,
  ): Promise<AppResult<CategoryTopicItem>>;
};

function tableNameForKind(kind: CategoryTopicKind): 'categories' | 'topics' {
  return kind === 'category' ? 'categories' : 'topics';
}

function selectColumnsSql(tableName: 'categories' | 'topics') {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  name,
  sort_order AS sortOrder,
  created_at AS createdAt,
  updated_at AS updatedAt,
  archived_at AS archivedAt
FROM ${tableName}
`;
}

function parseRows(rows: CategoryTopicRow[], kind: CategoryTopicKind): AppResult<CategoryTopicItem[]> {
  const items: CategoryTopicItem[] = [];

  for (const row of rows) {
    const parsed = parseCategoryTopicRow(row, kind);

    if (!parsed.ok) {
      return parsed;
    }

    items.push(parsed.value);
  }

  return ok(items);
}

export function createCategoryTopicRepository(database: PplantDatabase): CategoryTopicRepository {
  return {
    async archiveItem(kind, workspaceId, id, { now }) {
      try {
        const tableName = tableNameForKind(kind);
        const timestamp = now.toISOString();

        database.$client.runSync(
          `UPDATE ${tableName}
           SET archived_at = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND archived_at IS NULL`,
          timestamp,
          timestamp,
          workspaceId,
          id,
        );

        const item = await this.findItem(kind, workspaceId, id);

        if (!item.ok) {
          return item;
        }

        if (!item.value) {
          return err(createAppError('not_found', 'Category or topic was not found.', 'edit'));
        }

        return ok(item.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic data could not be saved.', 'retry', cause));
      }
    },

    async createItem(kind, input) {
      try {
        const tableName = tableNameForKind(kind);

        database.$client.runSync(
          `INSERT INTO ${tableName}
            (id, workspace_id, name, sort_order, created_at, updated_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          input.id,
          input.workspaceId,
          input.name,
          input.sortOrder,
          input.createdAt,
          input.updatedAt,
          input.archivedAt ?? null,
        );

        return parseCategoryTopicRow(
          {
            archivedAt: input.archivedAt ?? null,
            createdAt: input.createdAt,
            id: input.id,
            name: input.name,
            sortOrder: input.sortOrder,
            updatedAt: input.updatedAt,
            workspaceId: input.workspaceId,
          },
          kind,
        );
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic data could not be saved.', 'retry', cause));
      }
    },

    async findItem(kind, workspaceId, id) {
      try {
        const tableName = tableNameForKind(kind);
        const row = database.$client.getFirstSync<CategoryTopicRow>(
          `${selectColumnsSql(tableName)}
           WHERE workspace_id = ? AND id = ?
           LIMIT 1`,
          workspaceId,
          id,
        );

        if (!row) {
          return ok(null);
        }

        return parseCategoryTopicRow(row, kind);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic data could not be loaded.', 'retry', cause));
      }
    },

    async listItems(kind, workspaceId, { includeArchived = false } = {}) {
      try {
        const tableName = tableNameForKind(kind);
        const archivedClause = includeArchived ? '' : 'AND archived_at IS NULL';
        const rows = database.$client.getAllSync<CategoryTopicRow>(
          `${selectColumnsSql(tableName)}
           WHERE workspace_id = ? ${archivedClause}
           ORDER BY sort_order ASC, created_at ASC, id ASC`,
          workspaceId,
        );

        return parseRows(rows, kind);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic data could not be loaded.', 'retry', cause));
      }
    },

    async updateName(kind, workspaceId, id, name, { now }) {
      try {
        const tableName = tableNameForKind(kind);
        const timestamp = now.toISOString();

        database.$client.runSync(
          `UPDATE ${tableName}
           SET name = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND archived_at IS NULL`,
          name,
          timestamp,
          workspaceId,
          id,
        );

        const item = await this.findItem(kind, workspaceId, id);

        if (!item.ok) {
          return item;
        }

        if (!item.value || item.value.archivedAt !== null) {
          return err(createAppError('not_found', 'Category or topic was not found.', 'edit'));
        }

        return ok(item.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic data could not be saved.', 'retry', cause));
      }
    },

    async updateSortOrders(kind, workspaceId, assignments, { now }) {
      try {
        const tableName = tableNameForKind(kind);
        const timestamp = now.toISOString();

        for (const assignment of assignments) {
          database.$client.runSync(
            `UPDATE ${tableName}
             SET sort_order = ?, updated_at = ?
             WHERE workspace_id = ? AND id = ? AND archived_at IS NULL`,
            assignment.sortOrder,
            timestamp,
            workspaceId,
            assignment.id,
          );
        }

        return this.listItems(kind, workspaceId);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local category/topic order could not be saved.', 'retry', cause));
      }
    },
  };
}
