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
import {
  createRecurrenceRuleRepository,
  type RecurrenceRuleRepository,
} from '@/data/repositories/recurrence-rules.repository';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import {
  addLocalDays,
  addLocalMonthsClamped,
  asLocalDate,
  formatDateAsLocalDate,
  type LocalDate,
} from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
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
import { generateRecurrenceOccurrences } from '@/domain/recurrence/generate-occurrences';
import type { RecurrenceRule, RecurrenceFrequency } from '@/domain/recurrence/types';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const defaultPreviewCount = 3;
const generationLimit = 100;

export type RecurringMoneyRuleRequest = {
  amountMinor: number;
  categoryId?: string | null;
  endsOnLocalDate?: string | null;
  frequency: RecurrenceFrequency;
  kind: MoneyRecordKind;
  merchantOrSource?: string | null;
  note?: string | null;
  startsOnLocalDate: string;
  topicIds?: string[];
};

export type RecurringMoneyRuleActionRequest = {
  id: string;
};

export type SkipRecurringMoneyOccurrenceRequest = {
  id: string;
  occurrenceLocalDate?: string | null;
};

export type GenerateDueRecurringMoneyRequest = {
  throughLocalDate?: string | null;
};

export type RecurringMoneyRuleView = {
  nextOccurrences: LocalDate[];
  rule: RecurrenceRule;
};

export type RecurringMoneyData = {
  categories: CategoryTopicItem[];
  preferences: UserPreferences;
  rules: RecurringMoneyRuleView[];
  topics: CategoryTopicItem[];
};

export type GenerateDueRecurringMoneyResult = {
  generatedRecords: MoneyRecord[];
  skippedExistingCount: number;
};

export type RecurringMoneyServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createExceptionId?: () => string;
  createMoneyRecordId?: () => string;
  createMoneyRecordRepository?: (database: unknown) => MoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  createRecurrenceRuleId?: () => string;
  createRecurrenceRuleRepository?: (database: unknown) => RecurrenceRuleRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedRecurringMoneyAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  moneyRecordRepository: MoneyRecordRepository;
  now: Date;
  preferences: UserPreferences;
  recurrenceRuleRepository: RecurrenceRuleRepository;
};

type ValidatedRecurringMoneyRuleRequest = {
  amountMinor: number;
  categoryId: EntityId | null;
  endsOnLocalDate: LocalDate | null;
  frequency: RecurrenceFrequency;
  kind: MoneyRecordKind;
  merchantOrSource: MoneyRecord['merchantOrSource'];
  note: MoneyRecord['note'];
  startsOnLocalDate: LocalDate;
  topicIds: EntityId[];
};

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

async function prepareRecurringMoneyAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createMoneyRecordRepository: createMoneyRecordRepositoryDependency = (database) =>
    createMoneyRecordRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  createRecurrenceRuleRepository: createRecurrenceRuleRepositoryDependency = (database) =>
    createRecurrenceRuleRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: RecurringMoneyServiceDependencies = {}): Promise<AppResult<PreparedRecurringMoneyAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local recurring money data could not be opened.', 'retry', cause));
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
    return err(createAppError('not_found', 'Save preferences before adding recurring money.', 'settings'));
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    moneyRecordRepository: createMoneyRecordRepositoryDependency(database),
    now,
    preferences: preferences.value,
    recurrenceRuleRepository: createRecurrenceRuleRepositoryDependency(database),
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

async function validateRecurringMoneyRuleRequest(
  input: RecurringMoneyRuleRequest,
  categoryTopicRepository: CategoryTopicRepository,
): Promise<AppResult<ValidatedRecurringMoneyRuleRequest>> {
  const kind = asMoneyRecordKind(input.kind);
  const amount = validateMoneyRecordAmountMinor(input.amountMinor);
  const startsOnLocalDate = asLocalDate(input.startsOnLocalDate);
  const endsOnLocalDateValue = normalizeOptionalText(input.endsOnLocalDate);
  const endsOnLocalDate = endsOnLocalDateValue ? asLocalDate(endsOnLocalDateValue) : ok(null);
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

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (endsOnLocalDate.value && endsOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'End date must be on or after the start date.', 'edit'));
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
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: input.frequency,
    kind: kind.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    startsOnLocalDate: startsOnLocalDate.value,
    topicIds: activeTopics.value,
  });
}

function previewThroughDate(rule: RecurrenceRule): AppResult<LocalDate> {
  if (rule.frequency === 'daily' || rule.frequency === 'weekly') {
    return addLocalDays(rule.startsOnLocalDate, 366);
  }

  return addLocalMonthsClamped(rule.startsOnLocalDate, 12);
}

async function createRuleView(
  repository: RecurrenceRuleRepository,
  rule: RecurrenceRule,
): Promise<AppResult<RecurringMoneyRuleView>> {
  const exceptions = await repository.listExceptions(localWorkspaceId, rule.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const throughLocalDate = previewThroughDate(rule);

  if (!throughLocalDate.ok) {
    return throughLocalDate;
  }

  let fromLocalDate = rule.startsOnLocalDate;

  if (rule.lastGeneratedLocalDate) {
    const nextDate = addLocalDays(rule.lastGeneratedLocalDate, 1);

    if (!nextDate.ok) {
      return nextDate;
    }

    fromLocalDate = nextDate.value;
  }

  const occurrences =
    rule.pausedAt || rule.stoppedAt
      ? ok([] as LocalDate[])
      : generateRecurrenceOccurrences({
          endsOnLocalDate: rule.endsOnLocalDate,
          frequency: rule.frequency,
          fromLocalDate,
          maxCount: defaultPreviewCount,
          skippedLocalDates: exceptions.value.map((exception) => exception.occurrenceLocalDate),
          startsOnLocalDate: rule.startsOnLocalDate,
          throughLocalDate: throughLocalDate.value,
        });

  if (!occurrences.ok) {
    return occurrences;
  }

  return ok({
    nextOccurrences: occurrences.value,
    rule,
  });
}

async function loadRecurringMoneyRuleViews(
  repository: RecurrenceRuleRepository,
): Promise<AppResult<RecurringMoneyRuleView[]>> {
  const rules = await repository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  const views: RecurringMoneyRuleView[] = [];

  for (const rule of rules.value) {
    const view = await createRuleView(repository, rule);

    if (isErr(view)) {
      return view;
    }

    views.push(view.value);
  }

  return ok(views);
}

async function getActiveRule(
  repository: RecurrenceRuleRepository,
  id: string,
): Promise<AppResult<RecurrenceRule>> {
  const entityId = asEntityId(id);

  if (!entityId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid recurring money item.', 'edit', entityId.error));
  }

  const rule = await repository.getRule(localWorkspaceId, entityId.value);

  if (isErr(rule)) {
    return rule;
  }

  if (!rule.value) {
    return err(createAppError('not_found', 'Recurring money item was not found.', 'edit'));
  }

  return ok(rule.value);
}

export async function loadRecurringMoneyData(
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurringMoneyData>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

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

  const rules = await loadRecurringMoneyRuleViews(access.value.recurrenceRuleRepository);

  if (isErr(rules)) {
    return rules;
  }

  return ok({
    categories: categories.value,
    preferences: access.value.preferences,
    rules: rules.value,
    topics: topics.value,
  });
}

export async function createRecurringMoneyRule(
  input: RecurringMoneyRuleRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = await validateRecurringMoneyRuleRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.recurrenceRuleRepository.createRule({
    amountMinor: validated.value.amountMinor,
    categoryId: validated.value.categoryId,
    createdAt: timestamp,
    currencyCode: access.value.preferences.currencyCode,
    endsOnLocalDate: validated.value.endsOnLocalDate,
    frequency: validated.value.frequency,
    id: (dependencies.createRecurrenceRuleId ?? (() => defaultCreateId('recurrence')))(),
    merchantOrSource: validated.value.merchantOrSource,
    moneyKind: validated.value.kind,
    note: validated.value.note,
    startsOnLocalDate: validated.value.startsOnLocalDate,
    topicIds: validated.value.topicIds,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function updateRecurringMoneyRule(
  input: RecurringMoneyRuleRequest & { id: string },
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const validated = await validateRecurringMoneyRuleRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.recurrenceRuleRepository.updateRule({
    amountMinor: validated.value.amountMinor,
    categoryId: validated.value.categoryId,
    createdAt: existing.value.createdAt,
    currencyCode: access.value.preferences.currencyCode,
    endsOnLocalDate: validated.value.endsOnLocalDate,
    frequency: validated.value.frequency,
    id: existing.value.id,
    merchantOrSource: validated.value.merchantOrSource,
    moneyKind: validated.value.kind,
    note: validated.value.note,
    startsOnLocalDate: validated.value.startsOnLocalDate,
    topicIds: validated.value.topicIds,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function pauseRecurringMoneyRule(
  input: RecurringMoneyRuleActionRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.recurrenceRuleRepository.pauseRule(localWorkspaceId, rule.value.id, timestamp, timestamp);
}

export async function resumeRecurringMoneyRule(
  input: RecurringMoneyRuleActionRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  return access.value.recurrenceRuleRepository.resumeRule(
    localWorkspaceId,
    rule.value.id,
    access.value.now.toISOString(),
  );
}

export async function stopRecurringMoneyRule(
  input: RecurringMoneyRuleActionRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.recurrenceRuleRepository.stopRule(localWorkspaceId, rule.value.id, timestamp, timestamp);
}

export async function deleteRecurringMoneyRule(
  input: RecurringMoneyRuleActionRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<RecurrenceRule>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const timestamp = access.value.now.toISOString();

  return access.value.recurrenceRuleRepository.deleteRule(localWorkspaceId, rule.value.id, timestamp, timestamp);
}

export async function skipRecurringMoneyOccurrence(
  input: SkipRecurringMoneyOccurrenceRequest,
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<LocalDate>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.recurrenceRuleRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const occurrenceDate = normalizeOptionalText(input.occurrenceLocalDate)
    ? asLocalDate(input.occurrenceLocalDate as string)
    : await nextSkippableOccurrence(access.value.recurrenceRuleRepository, rule.value, access.value.now);

  if (isErr(occurrenceDate)) {
    return occurrenceDate;
  }

  const timestamp = access.value.now.toISOString();
  const exception = await access.value.recurrenceRuleRepository.createException({
    action: 'skip',
    createdAt: timestamp,
    id: (dependencies.createExceptionId ?? (() => defaultCreateId('recurrence-exception')))(),
    occurrenceLocalDate: occurrenceDate.value,
    recurrenceRuleId: rule.value.id,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(exception)) {
    return exception;
  }

  return ok(exception.value.occurrenceLocalDate);
}

async function nextSkippableOccurrence(
  repository: RecurrenceRuleRepository,
  rule: RecurrenceRule,
  now: Date,
): Promise<AppResult<LocalDate>> {
  if (rule.pausedAt || rule.stoppedAt) {
    return err(createAppError('validation_failed', 'Resume the series before skipping the next occurrence.', 'edit'));
  }

  const today = formatDateAsLocalDate(now);
  const throughDate = addLocalDays(today, 366);

  if (!throughDate.ok) {
    return throughDate;
  }

  const exceptions = await repository.listExceptions(localWorkspaceId, rule.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  let fromLocalDate: LocalDate = today;

  if (rule.lastGeneratedLocalDate && rule.lastGeneratedLocalDate > today) {
    const nextDate = addLocalDays(rule.lastGeneratedLocalDate, 1);

    if (!nextDate.ok) {
      return nextDate;
    }

    fromLocalDate = nextDate.value;
  }

  const occurrences = generateRecurrenceOccurrences({
    endsOnLocalDate: rule.endsOnLocalDate,
    frequency: rule.frequency,
    fromLocalDate,
    maxCount: 1,
    skippedLocalDates: exceptions.value.map((exception) => exception.occurrenceLocalDate),
    startsOnLocalDate: rule.startsOnLocalDate,
    throughLocalDate: throughDate.value,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  if (occurrences.value.length === 0) {
    return err(createAppError('not_found', 'No upcoming occurrence is available to skip.', 'edit'));
  }

  return ok(occurrences.value[0]);
}

export async function generateDueRecurringMoneyOccurrences(
  input: GenerateDueRecurringMoneyRequest = {},
  dependencies: RecurringMoneyServiceDependencies = {},
): Promise<AppResult<GenerateDueRecurringMoneyResult>> {
  const access = await prepareRecurringMoneyAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const throughLocalDate = normalizeOptionalText(input.throughLocalDate)
    ? asLocalDate(input.throughLocalDate as string)
    : ok(formatDateAsLocalDate(access.value.now));

  if (!throughLocalDate.ok) {
    return throughLocalDate;
  }

  const rules = await access.value.recurrenceRuleRepository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  const generatedRecords: MoneyRecord[] = [];
  let skippedExistingCount = 0;

  for (const rule of rules.value) {
    if (rule.pausedAt || rule.stoppedAt) {
      continue;
    }

    const result = await generateDueForRule(
      access.value,
      rule,
      throughLocalDate.value,
      dependencies.createMoneyRecordId,
    );

    if (isErr(result)) {
      return result;
    }

    generatedRecords.push(...result.value.generatedRecords);
    skippedExistingCount += result.value.skippedExistingCount;
  }

  return ok({
    generatedRecords,
    skippedExistingCount,
  });
}

async function generateDueForRule(
  access: PreparedRecurringMoneyAccess,
  rule: RecurrenceRule,
  throughLocalDate: LocalDate,
  createMoneyRecordId: (() => string) | undefined,
): Promise<AppResult<GenerateDueRecurringMoneyResult>> {
  const exceptions = await access.recurrenceRuleRepository.listExceptions(localWorkspaceId, rule.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const fromLocalDate = rule.lastGeneratedLocalDate
    ? addLocalDays(rule.lastGeneratedLocalDate, 1)
    : ok(rule.startsOnLocalDate);

  if (!fromLocalDate.ok) {
    return fromLocalDate;
  }

  const occurrences = generateRecurrenceOccurrences({
    endsOnLocalDate: rule.endsOnLocalDate,
    frequency: rule.frequency,
    fromLocalDate: fromLocalDate.value,
    maxCount: generationLimit,
    skippedLocalDates: exceptions.value.map((exception) => exception.occurrenceLocalDate),
    startsOnLocalDate: rule.startsOnLocalDate,
    throughLocalDate,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  const generatedRecords: MoneyRecord[] = [];
  let skippedExistingCount = 0;
  let latestGeneratedLocalDate: LocalDate | null = null;

  for (const occurrenceLocalDate of occurrences.value) {
    const existing = await access.moneyRecordRepository.findByRecurrenceOccurrence(
      localWorkspaceId,
      rule.id,
      occurrenceLocalDate,
    );

    if (isErr(existing)) {
      return existing;
    }

    if (existing.value) {
      skippedExistingCount += 1;
      latestGeneratedLocalDate = occurrenceLocalDate;
      continue;
    }

    const timestamp = access.now.toISOString();
    const created = await access.moneyRecordRepository.createManualRecord({
      amountMinor: rule.amountMinor,
      categoryId: rule.categoryId,
      createdAt: timestamp,
      currencyCode: rule.currencyCode,
      deletedAt: null,
      id: (createMoneyRecordId ?? (() => defaultCreateId('money-recurring')))(),
      kind: rule.moneyKind,
      localDate: occurrenceLocalDate,
      merchantOrSource: rule.merchantOrSource,
      note: rule.note,
      recurrenceOccurrenceDate: occurrenceLocalDate,
      recurrenceRuleId: rule.id,
      source: 'recurring',
      sourceOfTruth: 'manual',
      topicIds: rule.topicIds,
      updatedAt: timestamp,
      userCorrectedAt: null,
      workspaceId: localWorkspaceId,
    });

    if (isErr(created)) {
      return created;
    }

    latestGeneratedLocalDate = occurrenceLocalDate;
    generatedRecords.push(created.value);
  }

  if (latestGeneratedLocalDate) {
    const updated = await access.recurrenceRuleRepository.updateLastGeneratedLocalDate(
      localWorkspaceId,
      rule.id,
      latestGeneratedLocalDate,
      access.now.toISOString(),
    );

    if (isErr(updated)) {
      return updated;
    }
  }

  return ok({
    generatedRecords,
    skippedExistingCount,
  });
}
