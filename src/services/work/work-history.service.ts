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
  createPreferencesRepository,
  type PreferencesRepository,
} from '@/data/repositories/preferences.repository';
import {
  createWorkEntryRepository,
  type WorkEntryRepository,
} from '@/data/repositories/work-entries.repository';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { UserPreferences } from '@/domain/preferences/types';
import { asWorkEntryMode } from '@/domain/work/schemas';
import {
  calculateWorkHistorySummaries,
  type WorkHistorySummary,
} from '@/domain/work/work-history';
import type {
  WorkEntry,
  WorkHistoryPage,
  WorkHistoryPaidFilter,
  WorkHistoryQuery,
  WorkHistorySort,
  WorkHistorySummaryMode,
} from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const defaultHistoryLimit = 20;
const maxHistoryLimit = 50;
const maxSummaryRecords = 5000;

export type WorkHistoryRequest = {
  categoryId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  entryMode?: 'hours' | 'shift' | null;
  limit?: number;
  noteSearch?: string | null;
  offset?: number;
  paid?: WorkHistoryPaidFilter | null;
  sort?: WorkHistorySort;
  summaryMode?: WorkHistorySummaryMode;
  topicId?: string | null;
};

export type WorkHistoryData = {
  categories: CategoryTopicItem[];
  page: WorkHistoryPage;
  preferences: UserPreferences;
  query: WorkHistoryQuery;
  records: WorkEntry[];
  summaries: WorkHistorySummary[];
  summaryMode: WorkHistorySummaryMode;
  topics: CategoryTopicItem[];
};

export type WorkHistoryServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  createWorkEntryRepository?: (database: unknown) => WorkEntryRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedWorkHistoryAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  preferences: UserPreferences;
  workEntryRepository: WorkEntryRepository;
};

async function prepareWorkHistoryAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  createWorkEntryRepository: createWorkEntryRepositoryDependency = (database) =>
    createWorkEntryRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: WorkHistoryServiceDependencies = {}): Promise<AppResult<PreparedWorkHistoryAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local work history data could not be opened.', 'retry', cause));
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
    return err(createAppError('not_found', 'Save preferences before reviewing work history.', 'settings'));
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    preferences: preferences.value,
    workEntryRepository: createWorkEntryRepositoryDependency(database),
  });
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

function validateOptionalEntityId(value: string | null | undefined): AppResult<EntityId | null> {
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

function validateOptionalLocalDate(value: string | null | undefined): AppResult<LocalDate | null> {
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

function validateHistoryLimit(value: number | null | undefined): AppResult<number> {
  const limit = value ?? defaultHistoryLimit;

  if (!Number.isInteger(limit) || limit < 1) {
    return err(createAppError('validation_failed', 'Work history page size must be at least 1.', 'edit'));
  }

  return ok(Math.min(limit, maxHistoryLimit));
}

function validateHistoryOffset(value: number | null | undefined): AppResult<number> {
  const offset = value ?? 0;

  if (!Number.isInteger(offset) || offset < 0) {
    return err(createAppError('validation_failed', 'Work history offset cannot be negative.', 'edit'));
  }

  return ok(offset);
}

function validatePaidFilter(value: WorkHistoryPaidFilter | null | undefined): AppResult<WorkHistoryPaidFilter | null> {
  if (value === null || value === undefined) {
    return ok(null);
  }

  if (value === 'paid' || value === 'unpaid') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose paid or unpaid work.', 'edit'));
}

function validateHistorySort(value: WorkHistorySort | null | undefined): WorkHistorySort {
  return value ?? 'date_desc';
}

function validateSummaryMode(value: WorkHistorySummaryMode | null | undefined): WorkHistorySummaryMode {
  return value ?? 'day';
}

function validateHistoryQuery(input: WorkHistoryRequest): AppResult<{
  query: WorkHistoryQuery;
  summaryMode: WorkHistorySummaryMode;
}> {
  const entryMode = input.entryMode ? asWorkEntryMode(input.entryMode) : ok(null);
  const paid = validatePaidFilter(input.paid);
  const dateFrom = validateOptionalLocalDate(input.dateFrom);
  const dateTo = validateOptionalLocalDate(input.dateTo);
  const categoryId = validateOptionalEntityId(input.categoryId);
  const topicId = validateOptionalEntityId(input.topicId);
  const limit = validateHistoryLimit(input.limit);
  const offset = validateHistoryOffset(input.offset);

  if (!entryMode.ok) {
    return entryMode;
  }

  if (!paid.ok) {
    return paid;
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

  if (!limit.ok) {
    return limit;
  }

  if (!offset.ok) {
    return offset;
  }

  return ok({
    query: {
      categoryId: categoryId.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      entryMode: entryMode.value,
      limit: limit.value,
      noteSearch: normalizeOptionalText(input.noteSearch),
      offset: offset.value,
      paid: paid.value,
      sort: validateHistorySort(input.sort),
      topicId: topicId.value,
    },
    summaryMode: validateSummaryMode(input.summaryMode),
  });
}

export async function loadWorkHistory(
  input: WorkHistoryRequest = {},
  dependencies: WorkHistoryServiceDependencies = {},
): Promise<AppResult<WorkHistoryData>> {
  const access = await prepareWorkHistoryAccess(dependencies);

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

  const page = await access.value.workEntryRepository.listHistoryEntries(localWorkspaceId, validated.value.query);

  if (isErr(page)) {
    return page;
  }

  const summaryPage = await access.value.workEntryRepository.listHistoryEntries(localWorkspaceId, {
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
    summaries: calculateWorkHistorySummaries(summaryPage.value.records, validated.value.summaryMode),
    summaryMode: validated.value.summaryMode,
    topics: topics.value,
  });
}
