import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createCaptureDraftRepository,
  type CaptureDraftRepository,
} from '@/data/repositories/capture-drafts.repository';
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
  createReceiptParseJobRepository,
  type ReceiptParseJobRepository,
} from '@/data/repositories/receipt-parse-jobs.repository';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { MoneyRecord } from '@/domain/money/types';
import { resolveReceiptReviewMoneyProvenance } from '@/domain/money/provenance';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  type ReceiptReviewDraft,
  type ReceiptReviewFieldErrors,
  buildReceiptReviewDraft,
  validateReceiptReviewDraft,
} from '@/domain/receipts/review';
import type { NormalizedReceiptParseResult, ReceiptParseJob } from '@/domain/receipts/types';
import {
  isReceiptCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId } from '@/domain/workspace/types';

export type LoadReceiptReviewDataRequest = {
  receiptDraftId: string;
};

export type SaveCorrectedReceiptExpenseRequest = {
  parseJobId: string;
  receiptDraftId: string;
  reviewDraft: ReceiptReviewDraft;
};

export type ReceiptReviewData = {
  categories: CategoryTopicItem[];
  draft: CaptureDraft;
  parseJob: ReceiptParseJob;
  preferences: UserPreferences;
  reviewDraft: ReceiptReviewDraft;
  topics: CategoryTopicItem[];
};

export type SaveCorrectedReceiptExpenseResult = {
  draft: CaptureDraft;
  ignoredLineItems: boolean;
  parseJob: ReceiptParseJob;
  record: MoneyRecord;
};

type ReceiptReviewCaptureDraftRepository = Pick<
  CaptureDraftRepository,
  'listActiveDrafts' | 'markDraftSaved'
>;
type ReceiptReviewCategoryTopicRepository = Pick<
  CategoryTopicRepository,
  'findItem' | 'listItems'
>;
type ReceiptReviewMoneyRecordRepository = Pick<
  MoneyRecordRepository,
  'createManualRecord'
>;
type ReceiptReviewPreferencesRepository = Pick<PreferencesRepository, 'loadPreferences'>;

export type ReceiptReviewServiceDependencies = {
  captureDraftRepository?: ReceiptReviewCaptureDraftRepository;
  categoryTopicRepository?: ReceiptReviewCategoryTopicRepository;
  createCaptureDraftRepository?: (database: unknown) => ReceiptReviewCaptureDraftRepository;
  createCategoryTopicRepository?: (database: unknown) => ReceiptReviewCategoryTopicRepository;
  createMoneyRecordId?: (receiptDraftId: EntityId) => string;
  createMoneyRecordRepository?: (database: unknown) => ReceiptReviewMoneyRecordRepository;
  createPreferencesRepository?: (database: unknown) => ReceiptReviewPreferencesRepository;
  createReceiptParseJobRepository?: (database: unknown) => ReceiptParseJobRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  moneyRecordRepository?: ReceiptReviewMoneyRecordRepository;
  now?: () => Date;
  openDatabase?: () => unknown;
  preferencesRepository?: ReceiptReviewPreferencesRepository;
  receiptParseJobRepository?: ReceiptParseJobRepository;
};

type PreparedReceiptReviewAccess = {
  captureDraftRepository: ReceiptReviewCaptureDraftRepository;
  categoryTopicRepository: ReceiptReviewCategoryTopicRepository;
  moneyRecordRepository: ReceiptReviewMoneyRecordRepository;
  now: Date;
  preferencesRepository: ReceiptReviewPreferencesRepository;
  receiptParseJobRepository: ReceiptParseJobRepository;
};

type ReceiptReviewSaveResult =
  AppResult<SaveCorrectedReceiptExpenseResult> & { fieldErrors?: ReceiptReviewFieldErrors };
type ReviewableReceiptParseJob = ReceiptParseJob & {
  normalizedResult: NormalizedReceiptParseResult;
};

function defaultCreateMoneyRecordId(receiptDraftId: EntityId): string {
  return `money-receipt-${receiptDraftId}`;
}

async function prepareReceiptReviewAccess({
  captureDraftRepository,
  categoryTopicRepository,
  createCaptureDraftRepository: createCaptureDraftRepositoryDependency = (database) =>
    createCaptureDraftRepository(database as PplantDatabase),
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createMoneyRecordRepository: createMoneyRecordRepositoryDependency = (database) =>
    createMoneyRecordRepository(database as PplantDatabase),
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  createReceiptParseJobRepository: createReceiptParseJobRepositoryDependency = (database) =>
    createReceiptParseJobRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  moneyRecordRepository,
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
  preferencesRepository,
  receiptParseJobRepository,
}: ReceiptReviewServiceDependencies = {}): Promise<AppResult<PreparedReceiptReviewAccess>> {
  const now = nowDependency();

  if (
    captureDraftRepository &&
    categoryTopicRepository &&
    moneyRecordRepository &&
    preferencesRepository &&
    receiptParseJobRepository
  ) {
    return ok({
      captureDraftRepository,
      categoryTopicRepository,
      moneyRecordRepository,
      now,
      preferencesRepository,
      receiptParseJobRepository,
    });
  }

  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local receipt review data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    captureDraftRepository: captureDraftRepository ?? createCaptureDraftRepositoryDependency(database),
    categoryTopicRepository: categoryTopicRepository ?? createCategoryTopicRepositoryDependency(database),
    moneyRecordRepository: moneyRecordRepository ?? createMoneyRecordRepositoryDependency(database),
    now,
    preferencesRepository: preferencesRepository ?? createPreferencesRepositoryDependency(database),
    receiptParseJobRepository:
      receiptParseJobRepository ?? createReceiptParseJobRepositoryDependency(database),
  });
}

async function loadPreferences(
  repository: ReceiptReviewPreferencesRepository,
): Promise<AppResult<UserPreferences>> {
  const preferences = await repository.loadPreferences(localWorkspaceId);

  if (isErr(preferences)) {
    return preferences;
  }

  if (!preferences.value) {
    return err(createAppError('not_found', 'Save preferences before reviewing receipt expenses.', 'settings'));
  }

  return ok(preferences.value);
}

async function findActiveReceiptDraft(
  repository: ReceiptReviewCaptureDraftRepository,
  receiptDraftId: string,
): Promise<AppResult<CaptureDraft>> {
  const parsedId = asEntityId(receiptDraftId);

  if (!parsedId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt draft.', 'edit', parsedId.error));
  }

  const activeDrafts = await repository.listActiveDrafts(localWorkspaceId);

  if (isErr(activeDrafts)) {
    return activeDrafts;
  }

  const draft = activeDrafts.value.find(
    (candidate) => candidate.id === parsedId.value && candidate.kind === 'expense',
  );

  if (!draft || !isReceiptCaptureDraftPayload(draft.payload)) {
    return err(createAppError('not_found', 'Receipt draft is no longer active.', 'manual_entry'));
  }

  const payload = parseReceiptCaptureDraftPayload(draft.payload);

  if (isErr(payload)) {
    return payload;
  }

  return ok(draft);
}

function isReviewableParseJob(job: ReceiptParseJob): job is ReviewableReceiptParseJob {
  return (
    (job.status === 'parsed' || job.status === 'low_confidence' || job.status === 'reviewed') &&
    job.normalizedResult !== null
  );
}

function requireReviewableParseJob(job: ReceiptParseJob | null): AppResult<ReviewableReceiptParseJob> {
  if (!job) {
    return err(createAppError('not_found', 'Receipt parse results are not available yet.', 'retry'));
  }

  if (!isReviewableParseJob(job)) {
    return err(createAppError('validation_failed', 'Review a parsed receipt before saving.', 'manual_entry'));
  }

  return ok(job);
}

async function validateActiveCategory(
  repository: ReceiptReviewCategoryTopicRepository,
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
  repository: ReceiptReviewCategoryTopicRepository,
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

export async function loadReceiptReviewData(
  input: LoadReceiptReviewDataRequest,
  dependencies: ReceiptReviewServiceDependencies = {},
): Promise<AppResult<ReceiptReviewData>> {
  const access = await prepareReceiptReviewAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const draft = await findActiveReceiptDraft(access.value.captureDraftRepository, input.receiptDraftId);

  if (isErr(draft)) {
    return draft;
  }

  const parseJob = await access.value.receiptParseJobRepository.getLatestJobForDraft(
    localWorkspaceId,
    draft.value.id,
  );

  if (isErr(parseJob)) {
    return parseJob;
  }

  const reviewableJob = requireReviewableParseJob(parseJob.value);

  if (isErr(reviewableJob)) {
    return reviewableJob;
  }

  const preferences = await loadPreferences(access.value.preferencesRepository);

  if (isErr(preferences)) {
    return preferences;
  }

  const categories = await access.value.categoryTopicRepository.listItems('category', localWorkspaceId);

  if (isErr(categories)) {
    return categories;
  }

  const topics = await access.value.categoryTopicRepository.listItems('topic', localWorkspaceId);

  if (isErr(topics)) {
    return topics;
  }

  return ok({
    categories: categories.value,
    draft: draft.value,
    parseJob: reviewableJob.value,
    preferences: preferences.value,
    reviewDraft: buildReceiptReviewDraft(reviewableJob.value.normalizedResult, {
      locale: preferences.value.locale,
    }),
    topics: topics.value,
  });
}

export async function saveCorrectedReceiptExpense(
  input: SaveCorrectedReceiptExpenseRequest,
  dependencies: ReceiptReviewServiceDependencies = {},
): Promise<ReceiptReviewSaveResult> {
  const access = await prepareReceiptReviewAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const draft = await findActiveReceiptDraft(access.value.captureDraftRepository, input.receiptDraftId);

  if (isErr(draft)) {
    return draft;
  }

  const parseJobId = asEntityId(input.parseJobId);

  if (!parseJobId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt parse result.', 'edit', parseJobId.error));
  }

  const parseJob = await access.value.receiptParseJobRepository.getJobById(
    localWorkspaceId,
    parseJobId.value,
  );

  if (isErr(parseJob)) {
    return parseJob;
  }

  const reviewableJob = requireReviewableParseJob(parseJob.value);

  if (isErr(reviewableJob)) {
    return reviewableJob;
  }

  if (reviewableJob.value.receiptDraftId !== draft.value.id) {
    return err(createAppError('validation_failed', 'Receipt parse result does not match this draft.', 'retry'));
  }

  const preferences = await loadPreferences(access.value.preferencesRepository);

  if (isErr(preferences)) {
    return preferences;
  }

  const validated = validateReceiptReviewDraft(
    input.reviewDraft,
    preferences.value,
    reviewableJob.value.normalizedResult,
  );

  if (isErr(validated)) {
    return {
      ...err(validated.error),
      fieldErrors: validated.fieldErrors,
    };
  }

  const activeCategory = await validateActiveCategory(
    access.value.categoryTopicRepository,
    validated.value.categoryId,
  );

  if (isErr(activeCategory)) {
    return activeCategory;
  }

  const activeTopics = await validateActiveTopics(
    access.value.categoryTopicRepository,
    validated.value.topicIds,
  );

  if (isErr(activeTopics)) {
    return activeTopics;
  }

  const timestamp = access.value.now.toISOString();
  const moneyRecordId = (dependencies.createMoneyRecordId ?? defaultCreateMoneyRecordId)(draft.value.id);
  const provenance = resolveReceiptReviewMoneyProvenance({
    corrected: validated.value.corrected,
    timestamp,
  });
  const record = await access.value.moneyRecordRepository.createManualRecord({
    amountMinor: validated.value.amountMinor,
    categoryId: activeCategory.value,
    createdAt: timestamp,
    currencyCode: preferences.value.currencyCode,
    deletedAt: null,
    id: moneyRecordId,
    kind: 'expense',
    localDate: validated.value.localDate,
    merchantOrSource: validated.value.merchantOrSource,
    note: validated.value.note,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'receipt',
    sourceOfTruth: provenance.sourceOfTruth,
    topicIds: activeTopics.value,
    updatedAt: timestamp,
    userCorrectedAt: provenance.userCorrectedAt,
    workspaceId: localWorkspaceId,
  });

  if (isErr(record)) {
    return record;
  }

  const savedDraft = await access.value.captureDraftRepository.markDraftSaved(localWorkspaceId, draft.value.id, {
    savedAt: timestamp,
    savedRecordId: record.value.id,
    savedRecordKind: 'money_record',
  });

  if (isErr(savedDraft)) {
    return savedDraft;
  }

  const savedJob = await access.value.receiptParseJobRepository.markSaved(
    localWorkspaceId,
    reviewableJob.value.id,
    {
      savedAt: timestamp,
      status: 'saved',
    },
  );

  if (isErr(savedJob)) {
    return savedJob;
  }

  return ok({
    draft: savedDraft.value,
    ignoredLineItems: validated.value.ignoredLineItems,
    parseJob: savedJob.value,
    record: record.value,
  });
}
