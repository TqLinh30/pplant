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
  createBudgetPlanningRepository,
  type BudgetPlanningRepository,
} from '@/data/repositories/budget-planning.repository';
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
import {
  asLocalDate,
  resolveBudgetPeriodForDate,
  type LocalDate,
} from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  calculateMoneyPlanningPeriodSummary,
  type MoneyPlanningPeriodSummary,
} from '@/domain/money/calculations';
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

export type ManualMoneyRecordEditData = ManualMoneyCaptureData & {
  record: MoneyRecord;
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

export type EditManualMoneyRecordRequest = CreateManualMoneyRecordRequest & {
  id: string;
};

export type DeleteMoneyRecordRequest = {
  id: string;
};

export type MoneyRecordMutationResult = {
  planningSummaries: MoneyPlanningPeriodSummary[];
  record: MoneyRecord;
};

export type MoneyRecordServiceDependencies = {
  createBudgetPlanningRepository?: (database: unknown) => BudgetPlanningRepository;
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createId?: () => string;
  createMoneyRecordRepository?: (database: unknown) => MoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedMoneyRecordAccess = {
  budgetPlanningRepository: BudgetPlanningRepository;
  categoryTopicRepository: CategoryTopicRepository;
  moneyRecordRepository: MoneyRecordRepository;
  now: Date;
  preferences: UserPreferences;
};

function defaultCreateMoneyRecordId(): string {
  return `money-${Date.now().toString(36)}`;
}

async function prepareMoneyRecordAccess({
  createBudgetPlanningRepository: createBudgetPlanningRepositoryDependency = (database) =>
    createBudgetPlanningRepository(database as PplantDatabase),
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
    budgetPlanningRepository: createBudgetPlanningRepositoryDependency(database),
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

type ValidatedMoneyRecordRequest = {
  amountMinor: number;
  categoryId: EntityId | null;
  kind: MoneyRecordKind;
  localDate: LocalDate;
  merchantOrSource: MoneyRecord['merchantOrSource'];
  note: MoneyRecord['note'];
  topicIds: EntityId[];
};

async function validateMoneyRecordRequest(
  input: CreateManualMoneyRecordRequest,
  categoryTopicRepository: CategoryTopicRepository,
): Promise<AppResult<ValidatedMoneyRecordRequest>> {
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

  const activeCategory = await validateActiveCategory(categoryTopicRepository, categoryId.value);

  if (isErr(activeCategory)) {
    return activeCategory;
  }

  const activeTopics = await validateActiveTopics(categoryTopicRepository, topicIds.value);

  if (isErr(activeTopics)) {
    return activeTopics;
  }

  return ok({
    amountMinor: amount.value,
    categoryId: activeCategory.value,
    kind: kind.value,
    localDate: localDate.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    topicIds: activeTopics.value,
  });
}

async function recalculatePlanningSummaries(
  access: PreparedMoneyRecordAccess,
  localDates: LocalDate[],
): Promise<AppResult<MoneyPlanningPeriodSummary[]>> {
  const budgetRules = await access.budgetPlanningRepository.loadBudgetRules(localWorkspaceId);

  if (isErr(budgetRules)) {
    return budgetRules;
  }

  const savingsGoals = await access.budgetPlanningRepository.listSavingsGoals(localWorkspaceId);

  if (isErr(savingsGoals)) {
    return savingsGoals;
  }

  const summaries: MoneyPlanningPeriodSummary[] = [];
  const seenPeriods = new Set<string>();

  for (const localDate of localDates) {
    const period = resolveBudgetPeriodForDate(localDate, access.preferences.monthlyBudgetResetDay);

    if (!period.ok) {
      return period;
    }

    const periodKey = `${period.value.startDate}/${period.value.endDateExclusive}`;

    if (seenPeriods.has(periodKey)) {
      continue;
    }

    seenPeriods.add(periodKey);

    const records = await access.moneyRecordRepository.listRecordsForPeriod(localWorkspaceId, period.value);

    if (isErr(records)) {
      return records;
    }

    summaries.push(
      calculateMoneyPlanningPeriodSummary({
        budgetRules: budgetRules.value,
        period: period.value,
        records: records.value,
        savingsGoals: savingsGoals.value,
      }),
    );
  }

  return ok(summaries);
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

export async function loadManualMoneyRecordForEdit(
  input: { id: string },
  dependencies: MoneyRecordServiceDependencies = {},
): Promise<AppResult<ManualMoneyRecordEditData>> {
  const access = await prepareMoneyRecordAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid money record.', 'edit', id.error));
  }

  const record = await access.value.moneyRecordRepository.getRecord(localWorkspaceId, id.value);

  if (isErr(record)) {
    return record;
  }

  if (!record.value) {
    return err(createAppError('not_found', 'Money record was not found.', 'edit'));
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
    record: record.value,
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

  const validated = await validateMoneyRecordRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.moneyRecordRepository.createManualRecord({
    amountMinor: validated.value.amountMinor,
    categoryId: validated.value.categoryId,
    createdAt: timestamp,
    currencyCode: access.value.preferences.currencyCode,
    deletedAt: null,
    id: (dependencies.createId ?? defaultCreateMoneyRecordId)(),
    kind: validated.value.kind,
    localDate: validated.value.localDate,
    merchantOrSource: validated.value.merchantOrSource,
    note: validated.value.note,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: validated.value.topicIds,
    updatedAt: timestamp,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  });
}

export async function editManualMoneyRecord(
  input: EditManualMoneyRecordRequest,
  dependencies: MoneyRecordServiceDependencies = {},
): Promise<AppResult<MoneyRecordMutationResult>> {
  const access = await prepareMoneyRecordAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid money record.', 'edit', id.error));
  }

  const existing = await access.value.moneyRecordRepository.getRecord(localWorkspaceId, id.value);

  if (isErr(existing)) {
    return existing;
  }

  if (!existing.value) {
    return err(createAppError('not_found', 'Money record was not found.', 'edit'));
  }

  const validated = await validateMoneyRecordRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const updated = await access.value.moneyRecordRepository.updateRecord({
    amountMinor: validated.value.amountMinor,
    categoryId: validated.value.categoryId,
    createdAt: existing.value.createdAt,
    currencyCode: access.value.preferences.currencyCode,
    deletedAt: null,
    id: existing.value.id,
    kind: validated.value.kind,
    localDate: validated.value.localDate,
    merchantOrSource: validated.value.merchantOrSource,
    note: validated.value.note,
    source: existing.value.source,
    sourceOfTruth: 'manual',
    topicIds: validated.value.topicIds,
    updatedAt: timestamp,
    userCorrectedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(updated)) {
    return updated;
  }

  const planningSummaries = await recalculatePlanningSummaries(access.value, [
    existing.value.localDate,
    updated.value.localDate,
  ]);

  if (isErr(planningSummaries)) {
    return planningSummaries;
  }

  return ok({
    planningSummaries: planningSummaries.value,
    record: updated.value,
  });
}

export async function deleteMoneyRecord(
  input: DeleteMoneyRecordRequest,
  dependencies: MoneyRecordServiceDependencies = {},
): Promise<AppResult<MoneyRecordMutationResult>> {
  const access = await prepareMoneyRecordAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid money record.', 'edit', id.error));
  }

  const existing = await access.value.moneyRecordRepository.getRecord(localWorkspaceId, id.value);

  if (isErr(existing)) {
    return existing;
  }

  if (!existing.value) {
    return err(createAppError('not_found', 'Money record was not found.', 'edit'));
  }

  const deleted = await access.value.moneyRecordRepository.deleteRecord(localWorkspaceId, existing.value.id, {
    now: access.value.now,
  });

  if (isErr(deleted)) {
    return deleted;
  }

  const planningSummaries = await recalculatePlanningSummaries(access.value, [existing.value.localDate]);

  if (isErr(planningSummaries)) {
    return planningSummaries;
  }

  return ok({
    planningSummaries: planningSummaries.value,
    record: deleted.value,
  });
}
