import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  CategoryTopicDeletionImpact,
  CategoryTopicItem,
  CategoryTopicKind,
  CategoryTopicName,
  CategoryTopicSortOrderAssignment,
  CategoryTopicUsageSummary,
} from './types';

export const maxCategoryTopicNameLength = 40;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const categoryTopicRowSchema = z.object({
  archivedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  id: z.string().min(1),
  name: z.string(),
  sortOrder: z.number().int().min(0),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type CategoryTopicRow = z.infer<typeof categoryTopicRowSchema>;

export function asCategoryTopicName(value: string): AppResult<CategoryTopicName> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Name cannot be empty.', 'edit'));
  }

  if (normalized.length > maxCategoryTopicNameLength) {
    return err(
      createAppError(
        'validation_failed',
        `Name must be ${maxCategoryTopicNameLength} characters or fewer.`,
        'edit',
      ),
    );
  }

  return ok(normalized as CategoryTopicName);
}

export function parseCategoryTopicRow(
  row: unknown,
  kind: CategoryTopicKind,
): AppResult<CategoryTopicItem> {
  const parsed = categoryTopicRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local category/topic data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const name = asCategoryTopicName(parsed.data.name);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!name.ok) {
    return name;
  }

  return ok({
    archivedAt: parsed.data.archivedAt,
    createdAt: parsed.data.createdAt,
    id: id.value,
    kind,
    name: name.value,
    sortOrder: parsed.data.sortOrder,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function normalizeCategoryTopicNameForComparison(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function hasActiveNameConflict(
  items: CategoryTopicItem[],
  candidateName: string,
  excludeId?: string,
): boolean {
  const normalizedCandidate = normalizeCategoryTopicNameForComparison(candidateName);

  return items.some(
    (item) =>
      item.archivedAt === null &&
      item.id !== excludeId &&
      normalizeCategoryTopicNameForComparison(item.name) === normalizedCandidate,
  );
}

export function archiveCategoryTopicItem(
  item: CategoryTopicItem,
  archivedAt: string,
): CategoryTopicItem {
  return {
    ...item,
    archivedAt,
    updatedAt: archivedAt,
  };
}

export function resolveCategoryTopicReorder(
  activeItems: CategoryTopicItem[],
  orderedIds: string[],
): AppResult<CategoryTopicSortOrderAssignment[]> {
  const activeIds = activeItems.map((item) => item.id);
  const expectedIds = new Set<string>(activeIds);
  const seenIds = new Set<string>();

  if (orderedIds.length !== activeIds.length) {
    return err(createAppError('validation_failed', 'Reorder list must include every active item once.', 'edit'));
  }

  for (const id of orderedIds) {
    if (!expectedIds.has(id) || seenIds.has(id)) {
      return err(createAppError('validation_failed', 'Reorder list must include every active item once.', 'edit'));
    }

    seenIds.add(id);
  }

  return ok(
    orderedIds.map((id, index) => ({
      id: id as CategoryTopicSortOrderAssignment['id'],
      sortOrder: index,
    })),
  );
}

export function createCategoryTopicDeletionImpact(
  item: CategoryTopicItem,
  usage: CategoryTopicUsageSummary,
  replacementOptionCount: number,
): CategoryTopicDeletionImpact {
  return {
    canKeepHistory: true,
    canReassign: usage.totalCount > 0 && replacementOptionCount > 0,
    itemId: item.id,
    itemName: item.name,
    kind: item.kind,
    usage,
  };
}

export const zeroCategoryTopicUsageSummary: CategoryTopicUsageSummary = {
  moneyRecordCount: 0,
  reflectionCount: 0,
  taskCount: 0,
  totalCount: 0,
  workEntryCount: 0,
};
