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
import {
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
} from '@/domain/money/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  asLocalTime,
  asWorkEntryMode,
  asWorkEntryNote,
  validateWorkEntryDurationMinutes,
  validateWorkEntryWageMinor,
} from '@/domain/work/schemas';
import {
  calculateEarnedIncomeMinor,
  calculateShiftDurationMinutes,
} from '@/domain/work/work-time';
import type { LocalTime, WorkEntry, WorkEntryMode, WorkEntryWageSource } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type WorkEntryCaptureData = {
  categories: CategoryTopicItem[];
  preferences: UserPreferences;
  recentEntries: WorkEntry[];
  topics: CategoryTopicItem[];
};

export type WorkEntryRequest = {
  breakMinutes?: number | null;
  categoryId?: string | null;
  durationMinutes?: number | null;
  endedAtLocalDate?: string | null;
  endedAtLocalTime?: string | null;
  entryMode: WorkEntryMode;
  localDate?: string | null;
  note?: string | null;
  paid: boolean;
  startedAtLocalDate?: string | null;
  startedAtLocalTime?: string | null;
  topicIds?: string[];
  wageMinorPerHour?: number | null;
};

export type CreateWorkEntryRequest = WorkEntryRequest;

export type EditWorkEntryRequest = WorkEntryRequest & {
  id: string;
};

export type DeleteWorkEntryRequest = {
  id: string;
};

export type WorkEntryServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createId?: () => string;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  createWorkEntryRepository?: (database: unknown) => WorkEntryRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedWorkEntryAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  now: Date;
  preferences: UserPreferences;
  workEntryRepository: WorkEntryRepository;
};

type ValidatedWorkEntryRequest = {
  breakMinutes: number;
  categoryId: EntityId | null;
  durationMinutes: number;
  earnedIncomeMinor: number;
  endedAtLocalDate: LocalDate | null;
  endedAtLocalTime: LocalTime | null;
  entryMode: WorkEntryMode;
  localDate: LocalDate;
  note: WorkEntry['note'];
  paid: boolean;
  startedAtLocalDate: LocalDate | null;
  startedAtLocalTime: LocalTime | null;
  topicIds: EntityId[];
  wageCurrencyCode: string;
  wageMinorPerHour: number;
  wageSource: WorkEntryWageSource;
};

function defaultCreateWorkEntryId(): string {
  return `work-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareWorkEntryAccess({
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
}: WorkEntryServiceDependencies = {}): Promise<AppResult<PreparedWorkEntryAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local work entry data could not be opened.', 'retry', cause));
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
    return err(createAppError('not_found', 'Save preferences before adding work entries.', 'settings'));
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    now,
    preferences: preferences.value,
    workEntryRepository: createWorkEntryRepositoryDependency(database),
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

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

async function validateWorkEntryRequest(
  input: WorkEntryRequest,
  access: PreparedWorkEntryAccess,
): Promise<AppResult<ValidatedWorkEntryRequest>> {
  const entryMode = asWorkEntryMode(input.entryMode);
  const categoryId = asOptionalMoneyRecordCategoryId(input.categoryId);
  const topicIds = asMoneyRecordTopicIds(input.topicIds ?? []);
  const note = asWorkEntryNote(input.note);
  const wageOverride = input.wageMinorPerHour ?? null;
  const wageSource: WorkEntryWageSource = wageOverride === null ? 'default' : 'override';
  const wageMinorPerHour = validateWorkEntryWageMinor(
    wageOverride ?? access.preferences.defaultHourlyWage.amountMinor,
  );

  if (!entryMode.ok) {
    return entryMode;
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!topicIds.ok) {
    return topicIds;
  }

  if (!note.ok) {
    return note;
  }

  if (!wageMinorPerHour.ok) {
    return wageMinorPerHour;
  }

  const activeCategory = await validateActiveCategory(access.categoryTopicRepository, categoryId.value);

  if (isErr(activeCategory)) {
    return activeCategory;
  }

  const activeTopics = await validateActiveTopics(access.categoryTopicRepository, topicIds.value);

  if (isErr(activeTopics)) {
    return activeTopics;
  }

  if (entryMode.value === 'hours') {
    const localDate = asLocalDate(normalizeOptionalText(input.localDate) ?? '');
    const durationMinutes = validateWorkEntryDurationMinutes(input.durationMinutes ?? 0);

    if (!localDate.ok) {
      return localDate;
    }

    if (!durationMinutes.ok) {
      return durationMinutes;
    }

    const earnedIncomeMinor = calculateEarnedIncomeMinor({
      durationMinutes: durationMinutes.value,
      paid: input.paid,
      wageMinorPerHour: wageMinorPerHour.value,
    });

    if (isErr(earnedIncomeMinor)) {
      return earnedIncomeMinor;
    }

    return ok({
      breakMinutes: 0,
      categoryId: activeCategory.value,
      durationMinutes: durationMinutes.value,
      earnedIncomeMinor: earnedIncomeMinor.value,
      endedAtLocalDate: null,
      endedAtLocalTime: null,
      entryMode: entryMode.value,
      localDate: localDate.value,
      note: note.value,
      paid: input.paid,
      startedAtLocalDate: null,
      startedAtLocalTime: null,
      topicIds: activeTopics.value,
      wageCurrencyCode: access.preferences.defaultHourlyWage.currency,
      wageMinorPerHour: wageMinorPerHour.value,
      wageSource,
    });
  }

  const startedAtLocalDate = asLocalDate(normalizeOptionalText(input.startedAtLocalDate) ?? '');
  const startedAtLocalTime = asLocalTime(normalizeOptionalText(input.startedAtLocalTime) ?? '');
  const endedAtLocalDate = asLocalDate(normalizeOptionalText(input.endedAtLocalDate) ?? '');
  const endedAtLocalTime = asLocalTime(normalizeOptionalText(input.endedAtLocalTime) ?? '');

  if (!startedAtLocalDate.ok) {
    return startedAtLocalDate;
  }

  if (!startedAtLocalTime.ok) {
    return startedAtLocalTime;
  }

  if (!endedAtLocalDate.ok) {
    return endedAtLocalDate;
  }

  if (!endedAtLocalTime.ok) {
    return endedAtLocalTime;
  }

  const durationMinutes = calculateShiftDurationMinutes({
    breakMinutes: input.breakMinutes ?? 0,
    endedAtLocalDate: endedAtLocalDate.value,
    endedAtLocalTime: endedAtLocalTime.value,
    startedAtLocalDate: startedAtLocalDate.value,
    startedAtLocalTime: startedAtLocalTime.value,
  });

  if (isErr(durationMinutes)) {
    return durationMinutes;
  }

  const earnedIncomeMinor = calculateEarnedIncomeMinor({
    durationMinutes: durationMinutes.value,
    paid: input.paid,
    wageMinorPerHour: wageMinorPerHour.value,
  });

  if (isErr(earnedIncomeMinor)) {
    return earnedIncomeMinor;
  }

  return ok({
    breakMinutes: input.breakMinutes ?? 0,
    categoryId: activeCategory.value,
    durationMinutes: durationMinutes.value,
    earnedIncomeMinor: earnedIncomeMinor.value,
    endedAtLocalDate: endedAtLocalDate.value,
    endedAtLocalTime: endedAtLocalTime.value,
    entryMode: entryMode.value,
    localDate: startedAtLocalDate.value,
    note: note.value,
    paid: input.paid,
    startedAtLocalDate: startedAtLocalDate.value,
    startedAtLocalTime: startedAtLocalTime.value,
    topicIds: activeTopics.value,
    wageCurrencyCode: access.preferences.defaultHourlyWage.currency,
    wageMinorPerHour: wageMinorPerHour.value,
    wageSource,
  });
}

export async function loadWorkEntryCaptureData(
  dependencies: WorkEntryServiceDependencies = {},
): Promise<AppResult<WorkEntryCaptureData>> {
  const access = await prepareWorkEntryAccess(dependencies);

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

  const recentEntries = await access.value.workEntryRepository.listRecentEntries(localWorkspaceId);

  if (isErr(recentEntries)) {
    return recentEntries;
  }

  return ok({
    categories: categories.value,
    preferences: access.value.preferences,
    recentEntries: recentEntries.value,
    topics: topics.value,
  });
}

export async function createWorkEntry(
  input: CreateWorkEntryRequest,
  dependencies: WorkEntryServiceDependencies = {},
): Promise<AppResult<WorkEntry>> {
  const access = await prepareWorkEntryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = await validateWorkEntryRequest(input, access.value);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.workEntryRepository.createEntry({
    ...validated.value,
    createdAt: timestamp,
    deletedAt: null,
    id: (dependencies.createId ?? defaultCreateWorkEntryId)(),
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function editWorkEntry(
  input: EditWorkEntryRequest,
  dependencies: WorkEntryServiceDependencies = {},
): Promise<AppResult<WorkEntry>> {
  const access = await prepareWorkEntryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return id;
  }

  const existing = await access.value.workEntryRepository.getEntry(localWorkspaceId, id.value);

  if (isErr(existing)) {
    return existing;
  }

  if (!existing.value) {
    return err(createAppError('not_found', 'Work entry was not found.', 'edit'));
  }

  const validated = await validateWorkEntryRequest(input, access.value);

  if (isErr(validated)) {
    return validated;
  }

  return access.value.workEntryRepository.updateEntry({
    ...validated.value,
    createdAt: existing.value.createdAt,
    deletedAt: null,
    id: id.value,
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: access.value.now.toISOString(),
    workspaceId: localWorkspaceId,
  });
}

export async function deleteWorkEntry(
  input: DeleteWorkEntryRequest,
  dependencies: WorkEntryServiceDependencies = {},
): Promise<AppResult<WorkEntry>> {
  const access = await prepareWorkEntryAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return id;
  }

  return access.value.workEntryRepository.deleteEntry(localWorkspaceId, id.value, {
    now: access.value.now,
  });
}
