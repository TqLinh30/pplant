import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createCategoryTopicRepository,
  type CategoryTopicRepository,
} from '@/data/repositories/category-topic.repository';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  asCategoryTopicName,
  createCategoryTopicDeletionImpact,
  hasActiveNameConflict,
  resolveCategoryTopicReorder,
  zeroCategoryTopicUsageSummary,
} from '@/domain/categories/schemas';
import type {
  CategoryTopicDeletionImpact,
  CategoryTopicItem,
  CategoryTopicKind,
  CategoryTopicUsageSummary,
  DeleteCategoryTopicMode,
} from '@/domain/categories/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type CategoryTopicSettingsData = {
  categories: CategoryTopicItem[];
  topics: CategoryTopicItem[];
};

export type CreateCategoryTopicItemRequest = {
  kind: CategoryTopicKind;
  name: string;
};

export type UpdateCategoryTopicItemNameRequest = {
  kind: CategoryTopicKind;
  id: string;
  name: string;
};

export type ReorderCategoryTopicItemsRequest = {
  kind: CategoryTopicKind;
  orderedIds: string[];
};

export type CategoryTopicItemRequest = {
  kind: CategoryTopicKind;
  id: string;
};

export type DeleteCategoryTopicItemRequest = CategoryTopicItemRequest & {
  mode: DeleteCategoryTopicMode;
  replacementId?: string;
};

export type DeleteCategoryTopicItemResult =
  | { action: 'archived'; item: CategoryTopicItem }
  | { action: 'cancelled' }
  | { action: 'reassigned'; item: CategoryTopicItem };

export type CategoryTopicUsageAdapter = {
  getUsageSummary(
    kind: CategoryTopicKind,
    itemId: EntityId,
  ): Promise<AppResult<CategoryTopicUsageSummary>>;
  reassignUsage(
    kind: CategoryTopicKind,
    fromItemId: EntityId,
    toItemId: EntityId,
  ): Promise<AppResult<void>>;
};

export type CategoryTopicServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createId?: (kind: CategoryTopicKind) => string;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
  usageAdapter?: CategoryTopicUsageAdapter;
};

type PreparedCategoryTopicAccess = {
  now: Date;
  repository: CategoryTopicRepository;
  usageAdapter: CategoryTopicUsageAdapter;
};

const defaultUsageAdapter: CategoryTopicUsageAdapter = {
  async getUsageSummary() {
    return ok(zeroCategoryTopicUsageSummary);
  },
  async reassignUsage() {
    return ok(undefined);
  },
};

function defaultCreateId(kind: CategoryTopicKind): string {
  return `${kind}-${Date.now().toString(36)}`;
}

async function prepareCategoryTopicAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
  usageAdapter = defaultUsageAdapter,
}: CategoryTopicServiceDependencies = {}): Promise<AppResult<PreparedCategoryTopicAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local category/topic data could not be opened. Please try again.',
        'retry',
        cause,
      ),
    );
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    now,
    repository: createCategoryTopicRepositoryDependency(database),
    usageAdapter,
  });
}

function validateItemId(id: string): AppResult<EntityId> {
  const itemId = asEntityId(id);

  if (!itemId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid category or topic.', 'edit', itemId.error));
  }

  return itemId;
}

async function getActiveItems(
  repository: CategoryTopicRepository,
  kind: CategoryTopicKind,
): Promise<AppResult<CategoryTopicItem[]>> {
  return repository.listItems(kind, localWorkspaceId);
}

async function findActiveItem(
  repository: CategoryTopicRepository,
  kind: CategoryTopicKind,
  id: EntityId,
): Promise<AppResult<CategoryTopicItem>> {
  const result = await repository.findItem(kind, localWorkspaceId, id);

  if (isErr(result)) {
    return result;
  }

  if (!result.value || result.value.archivedAt !== null) {
    return err(createAppError('not_found', 'Category or topic was not found.', 'edit'));
  }

  return ok(result.value);
}

export async function loadCategoryTopicSettings(
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<CategoryTopicSettingsData>> {
  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const categories = await access.value.repository.listItems('category', localWorkspaceId);

  if (isErr(categories)) {
    return categories;
  }

  const topics = await access.value.repository.listItems('topic', localWorkspaceId);

  if (isErr(topics)) {
    return topics;
  }

  return ok({
    categories: categories.value,
    topics: topics.value,
  });
}

export async function createCategoryTopicItem(
  input: CreateCategoryTopicItemRequest,
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<CategoryTopicItem>> {
  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const name = asCategoryTopicName(input.name);

  if (!name.ok) {
    return name;
  }

  const activeItems = await getActiveItems(access.value.repository, input.kind);

  if (isErr(activeItems)) {
    return activeItems;
  }

  if (hasActiveNameConflict(activeItems.value, name.value)) {
    return err(createAppError('conflict', 'An active item already uses that name.', 'edit'));
  }

  const id = (dependencies.createId ?? defaultCreateId)(input.kind);
  const timestamp = access.value.now.toISOString();

  return access.value.repository.createItem(input.kind, {
    archivedAt: null,
    createdAt: timestamp,
    id,
    name: name.value,
    sortOrder: activeItems.value.length,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function updateCategoryTopicItemName(
  input: UpdateCategoryTopicItemNameRequest,
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<CategoryTopicItem>> {
  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = validateItemId(input.id);
  const name = asCategoryTopicName(input.name);

  if (!id.ok) {
    return id;
  }

  if (!name.ok) {
    return name;
  }

  const activeItems = await getActiveItems(access.value.repository, input.kind);

  if (isErr(activeItems)) {
    return activeItems;
  }

  if (hasActiveNameConflict(activeItems.value, name.value, id.value)) {
    return err(createAppError('conflict', 'An active item already uses that name.', 'edit'));
  }

  return access.value.repository.updateName(
    input.kind,
    localWorkspaceId,
    id.value,
    name.value,
    { now: access.value.now },
  );
}

export async function reorderCategoryTopicItems(
  input: ReorderCategoryTopicItemsRequest,
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<CategoryTopicItem[]>> {
  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const activeItems = await getActiveItems(access.value.repository, input.kind);

  if (isErr(activeItems)) {
    return activeItems;
  }

  const assignments = resolveCategoryTopicReorder(activeItems.value, input.orderedIds);

  if (!assignments.ok) {
    return assignments;
  }

  return access.value.repository.updateSortOrders(
    input.kind,
    localWorkspaceId,
    assignments.value,
    { now: access.value.now },
  );
}

export async function getCategoryTopicDeletionImpact(
  input: CategoryTopicItemRequest,
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<CategoryTopicDeletionImpact>> {
  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = validateItemId(input.id);

  if (!id.ok) {
    return id;
  }

  const item = await findActiveItem(access.value.repository, input.kind, id.value);

  if (isErr(item)) {
    return item;
  }

  const activeItems = await getActiveItems(access.value.repository, input.kind);

  if (isErr(activeItems)) {
    return activeItems;
  }

  const usage = await access.value.usageAdapter.getUsageSummary(input.kind, id.value);

  if (isErr(usage)) {
    return usage;
  }

  const replacementOptionCount = activeItems.value.filter((candidate) => candidate.id !== id.value).length;

  return ok(createCategoryTopicDeletionImpact(item.value, usage.value, replacementOptionCount));
}

export async function deleteCategoryTopicItem(
  input: DeleteCategoryTopicItemRequest,
  dependencies: CategoryTopicServiceDependencies = {},
): Promise<AppResult<DeleteCategoryTopicItemResult>> {
  if (input.mode === 'cancel') {
    return ok({ action: 'cancelled' });
  }

  const access = await prepareCategoryTopicAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = validateItemId(input.id);

  if (!id.ok) {
    return id;
  }

  const item = await findActiveItem(access.value.repository, input.kind, id.value);

  if (isErr(item)) {
    return item;
  }

  if (input.mode === 'archive') {
    const archived = await access.value.repository.archiveItem(
      input.kind,
      localWorkspaceId,
      id.value,
      { now: access.value.now },
    );

    if (isErr(archived)) {
      return archived;
    }

    return ok({ action: 'archived', item: archived.value });
  }

  if (!input.replacementId) {
    return err(createAppError('validation_failed', 'Choose a replacement before reassigning usage.', 'edit'));
  }

  const replacementId = validateItemId(input.replacementId);

  if (!replacementId.ok) {
    return replacementId;
  }

  if (replacementId.value === id.value) {
    return err(createAppError('validation_failed', 'Choose a different replacement item.', 'edit'));
  }

  const replacement = await findActiveItem(access.value.repository, input.kind, replacementId.value);

  if (isErr(replacement)) {
    return replacement;
  }

  const reassigned = await access.value.usageAdapter.reassignUsage(input.kind, id.value, replacement.value.id);

  if (isErr(reassigned)) {
    return reassigned;
  }

  const archived = await access.value.repository.archiveItem(
    input.kind,
    localWorkspaceId,
    item.value.id,
    { now: access.value.now },
  );

  if (isErr(archived)) {
    return archived;
  }

  return ok({ action: 'reassigned', item: archived.value });
}
