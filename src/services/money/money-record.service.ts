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
import {
  createMoneyRecordRepository,
  type MoneyRecordRepository,
} from '@/data/repositories/money-records.repository';
import {
  createPreferencesRepository,
  type PreferencesRepository,
} from '@/data/repositories/preferences.repository';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  asMoneyRecordKind,
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
  validateMoneyRecordAmountMinor,
} from '@/domain/money/schemas';
import type { MoneyRecord, MoneyRecordKind } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type ManualMoneyCaptureData = {
  categories: CategoryTopicItem[];
  preferences: UserPreferences;
  recentRecords: MoneyRecord[];
  topics: CategoryTopicItem[];
};

export type CreateManualMoneyRecordRequest = {
  kind: MoneyRecordKind;
  amountMinor: number;
  localDate: string;
  categoryId?: string | null;
  topicIds?: string[];
  merchantOrSource?: string | null;
  note?: string | null;
};

export type MoneyRecordServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createId?: () => string;
  createMoneyRecordRepository?: (database: unknown) => MoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedMoneyRecordAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  moneyRecordRepository: MoneyRecordRepository;
  now: Date;
  preferences: UserPreferences;
};

function defaultCreateMoneyRecordId(): string {
  return `money-${Date.now().toString(36)}`;
}

async function prepareMoneyRecordAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createMoneyRecordRepository: createMoneyRecordRepositoryDependency = (database) =>
    createMoneyRecordRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: MoneyRecordServiceDependencies = {}): Promise<AppResult<PreparedMoneyRecordAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local money data could not be opened. Please try again.',
        'retry',
        cause,
      ),
    );
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  const preferencesRepository = createPreferencesRepositoryDependency(database);
  const preferences = await preferencesRepository.loadPreferences(localWorkspaceId);

  if (isErr(preferences)) {
    return preferences;
  }

  if (!preferences.value) {
    return err(createAppError('not_found', 'Save preferences before adding money records.', 'settings'));
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    moneyRecordRepository: createMoneyRecordRepositoryDependency(database),
    now,
    preferences: preferences.value,
  });
}

async function validateActiveCategory(
  repository: CategoryTopicRepository,
  categoryId: EntityId | null,
): Promise<AppResult<EntityId | null>> {
  if (!categoryId) {
    return ok(null);
  }

  const category = await repository.findItem('category', localWorkspaceId, categoryId);

  if (isErr(category)) {
    return category;
  }

  if (!category.value || category.value.archivedAt !== null) {
    return err(createAppError('validation_failed', 'Choose an active category or leave it blank.', 'edit'));
  }

  return ok(categoryId);
}

async function validateActiveTopics(
  repository: CategoryTopicRepository,
  topicIds: EntityId[],
): Promise<AppResult<EntityId[]>> {
  for (const topicId of topicIds) {
    const topic = await repository.findItem('topic', localWorkspaceId, topicId);

    if (isErr(topic)) {
      return topic;
    }

    if (!topic.value || topic.value.archivedAt !== null) {
      return err(createAppError('validation_failed', 'Choose active topics or leave them blank.', 'edit'));
    }
  }

  return ok(topicIds);
}

export async function loadManualMoneyCaptureData(
  dependencies: MoneyRecordServiceDependencies = {},
): Promise<AppResult<ManualMoneyCaptureData>> {
  const access = await prepareMoneyRecordAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const categories = await access.value.categoryTopicRepository.listItems('category', localWorkspaceId);

  if (isErr(categories)) {
    return categories;
  }

  const topics = await access.value.categoryTopicRepository.listItems('topic', localWorkspaceId);

  if (isErr(topics)) {
    return topics;
  }

  const recentRecords = await access.value.moneyRecordRepository.listRecentRecords(localWorkspaceId);

  if (isErr(recentRecords)) {
    return recentRecords;
  }

  return ok({
    categories: categories.value,
    preferences: access.value.preferences,
    recentRecords: recentRecords.value,
    topics: topics.value,
  });
}

export async function createManualMoneyRecord(
  input: CreateManualMoneyRecordRequest,
  dependencies: MoneyRecordServiceDependencies = {},
): Promise<AppResult<MoneyRecord>> {
  const access = await prepareMoneyRecordAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const kind = asMoneyRecordKind(input.kind);
  const amount = validateMoneyRecordAmountMinor(input.amountMinor);
  const localDate = asLocalDate(input.localDate);
  const categoryId = asOptionalMoneyRecordCategoryId(input.categoryId);
  const topicIds = asMoneyRecordTopicIds(input.topicIds ?? []);
  const merchantOrSource = asMoneyRecordMerchantOrSource(input.merchantOrSource);
  const note = asMoneyRecordNote(input.note);

  if (!kind.ok) {
    return kind;
  }

  if (!amount.ok) {
    return amount;
  }

  if (!localDate.ok) {
    return localDate;
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!topicIds.ok) {
    return topicIds;
  }

  if (!merchantOrSource.ok) {
    return merchantOrSource;
  }

  if (!note.ok) {
    return note;
  }

  const activeCategory = await validateActiveCategory(access.value.categoryTopicRepository, categoryId.value);

  if (isErr(activeCategory)) {
    return activeCategory;
  }

  const activeTopics = await validateActiveTopics(access.value.categoryTopicRepository, topicIds.value);

  if (isErr(activeTopics)) {
    return activeTopics;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.moneyRecordRepository.createManualRecord({
    amountMinor: amount.value,
    categoryId: activeCategory.value,
    createdAt: timestamp,
    currencyCode: access.value.preferences.currencyCode,
    deletedAt: null,
    id: (dependencies.createId ?? defaultCreateMoneyRecordId)(),
    kind: kind.value,
    localDate: localDate.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: activeTopics.value,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}
