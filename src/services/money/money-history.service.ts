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
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  calculateMoneyHistorySummaries,
  type MoneyHistorySummary,
} from '@/domain/money/calculations';
import { asMoneyRecordKind } from '@/domain/money/schemas';
import type {
  MoneyHistoryPage,
  MoneyHistoryQuery,
  MoneyHistorySort,
  MoneyHistorySummaryMode,
  MoneyRecord,
  MoneyRecordKind,
} from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const defaultHistoryLimit = 20;
const maxHistoryLimit = 50;
const maxSummaryRecords = 5000;

export type MoneyHistoryRequest = {
  amountMinorMax?: number | null;
  amountMinorMin?: number | null;
  categoryId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  kind?: MoneyRecordKind | null;
  limit?: number;
  merchantOrSource?: string | null;
  offset?: number;
  sort?: MoneyHistorySort;
  summaryMode?: MoneyHistorySummaryMode;
  topicId?: string | null;
};

export type MoneyHistoryData = {
  categories: CategoryTopicItem[];
  page: MoneyHistoryPage;
  preferences: UserPreferences;
  query: MoneyHistoryQuery;
  records: MoneyRecord[];
  summaries: MoneyHistorySummary[];
  summaryMode: MoneyHistorySummaryMode;
  topics: CategoryTopicItem[];
};

export type MoneyHistoryServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createMoneyRecordRepository?: (database: unknown) => MoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedMoneyHistoryAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  moneyRecordRepository: MoneyRecordRepository;
  preferences: UserPreferences;
};

async function prepareMoneyHistoryAccess({
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
}: MoneyHistoryServiceDependencies = {}): Promise<AppResult<PreparedMoneyHistoryAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local history data could not be opened. Please try again.', 'retry', cause));
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
    return err(createAppError('not_found', 'Save preferences before reviewing money history.', 'settings'));
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    moneyRecordRepository: createMoneyRecordRepositoryDependency(database),
    preferences: preferences.value,
  });
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

function validateOptionalEntityId(value: string | null | undefined): AppResult<string | null> {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return ok(null);
  }

  const entityId = asEntityId(normalized);

  if (!entityId.ok) {
    return entityId;
  }

  return ok(entityId.value);
}

function validateOptionalLocalDate(value: string | null | undefined): AppResult<string | null> {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return ok(null);
  }

  const localDate = asLocalDate(normalized);

  if (!localDate.ok) {
    return localDate;
  }

  return ok(localDate.value);
}

function validateOptionalAmount(value: number | null | undefined): AppResult<number | null> {
  if (value === null || value === undefined) {
    return ok(null);
  }

  if (!Number.isInteger(value) || value < 0) {
    return err(createAppError('validation_failed', 'History amount filters must use non-negative minor units.', 'edit'));
  }

  return ok(value);
}

function validateHistoryLimit(value: number | null | undefined): AppResult<number> {
  const limit = value ?? defaultHistoryLimit;

  if (!Number.isInteger(limit) || limit < 1) {
    return err(createAppError('validation_failed', 'History page size must be at least 1.', 'edit'));
  }

  return ok(Math.min(limit, maxHistoryLimit));
}

function validateHistoryOffset(value: number | null | undefined): AppResult<number> {
  const offset = value ?? 0;

  if (!Number.isInteger(offset) || offset < 0) {
    return err(createAppError('validation_failed', 'History offset cannot be negative.', 'edit'));
  }

  return ok(offset);
}

function validateHistorySort(value: MoneyHistorySort | null | undefined): MoneyHistorySort {
  return value ?? 'date_desc';
}

function validateSummaryMode(value: MoneyHistorySummaryMode | null | undefined): MoneyHistorySummaryMode {
  return value ?? 'day';
}

function validateHistoryQuery(input: MoneyHistoryRequest): AppResult<{
  query: MoneyHistoryQuery;
  summaryMode: MoneyHistorySummaryMode;
}> {
  const kind = input.kind ? asMoneyRecordKind(input.kind) : ok(null);
  const dateFrom = validateOptionalLocalDate(input.dateFrom);
  const dateTo = validateOptionalLocalDate(input.dateTo);
  const categoryId = validateOptionalEntityId(input.categoryId);
  const topicId = validateOptionalEntityId(input.topicId);
  const amountMinorMin = validateOptionalAmount(input.amountMinorMin);
  const amountMinorMax = validateOptionalAmount(input.amountMinorMax);
  const limit = validateHistoryLimit(input.limit);
  const offset = validateHistoryOffset(input.offset);

  if (!kind.ok) {
    return kind;
  }

  if (!dateFrom.ok) {
    return dateFrom;
  }

  if (!dateTo.ok) {
    return dateTo;
  }

  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    return err(createAppError('validation_failed', 'Start date must be on or before end date.', 'edit'));
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!topicId.ok) {
    return topicId;
  }

  if (!amountMinorMin.ok) {
    return amountMinorMin;
  }

  if (!amountMinorMax.ok) {
    return amountMinorMax;
  }

  if (
    amountMinorMin.value !== null &&
    amountMinorMax.value !== null &&
    amountMinorMin.value > amountMinorMax.value
  ) {
    return err(createAppError('validation_failed', 'Minimum amount must be less than or equal to maximum amount.', 'edit'));
  }

  if (!limit.ok) {
    return limit;
  }

  if (!offset.ok) {
    return offset;
  }

  return ok({
    query: {
      amountMinorMax: amountMinorMax.value,
      amountMinorMin: amountMinorMin.value,
      categoryId: categoryId.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      kind: kind.value,
      limit: limit.value,
      merchantOrSource: normalizeOptionalText(input.merchantOrSource),
      offset: offset.value,
      sort: validateHistorySort(input.sort),
      topicId: topicId.value,
    },
    summaryMode: validateSummaryMode(input.summaryMode),
  });
}

export async function loadMoneyHistory(
  input: MoneyHistoryRequest = {},
  dependencies: MoneyHistoryServiceDependencies = {},
): Promise<AppResult<MoneyHistoryData>> {
  const access = await prepareMoneyHistoryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = validateHistoryQuery(input);

  if (isErr(validated)) {
    return validated;
  }

  const categories = await access.value.categoryTopicRepository.listItems('category', localWorkspaceId, {
    includeArchived: true,
  });

  if (isErr(categories)) {
    return categories;
  }

  const topics = await access.value.categoryTopicRepository.listItems('topic', localWorkspaceId, {
    includeArchived: true,
  });

  if (isErr(topics)) {
    return topics;
  }

  const page = await access.value.moneyRecordRepository.listHistoryRecords(localWorkspaceId, validated.value.query);

  if (isErr(page)) {
    return page;
  }

  const summaryPage = await access.value.moneyRecordRepository.listHistoryRecords(localWorkspaceId, {
    ...validated.value.query,
    limit: maxSummaryRecords,
    offset: 0,
  });

  if (isErr(summaryPage)) {
    return summaryPage;
  }

  return ok({
    categories: categories.value,
    page: page.value,
    preferences: access.value.preferences,
    query: validated.value.query,
    records: page.value.records,
    summaries: calculateMoneyHistorySummaries(summaryPage.value.records, validated.value.summaryMode),
    summaryMode: validated.value.summaryMode,
    topics: topics.value,
  });
}
