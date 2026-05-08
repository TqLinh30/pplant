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
  createTaskRecurrenceRepository,
  type TaskRecurrenceRepository,
} from '@/data/repositories/task-recurrence.repository';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { addLocalDays, asLocalDate, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import { asRecurrenceFrequency } from '@/domain/recurrence/schemas';
import type { RecurrenceFrequency } from '@/domain/recurrence/types';
import {
  asOptionalTaskRecurrenceLocalDate,
  asTaskRecurrenceKind,
  buildTaskRecurrenceOccurrences,
} from '@/domain/tasks/task-recurrence';
import {
  asTaskNotes,
  asTaskPriority,
  asTaskTitle,
} from '@/domain/tasks/schemas';
import type {
  Task,
  TaskPriority,
  TaskRecurrenceKind,
  TaskRecurrenceOccurrence,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const defaultPreviewCount = 6;

export type TaskRecurrenceRuleRequest = {
  categoryId?: string | null;
  endsOnLocalDate?: string | null;
  frequency: RecurrenceFrequency;
  kind: TaskRecurrenceKind;
  notes?: string | null;
  priority: TaskPriority;
  startsOnLocalDate: string;
  title: string;
  topicIds?: string[];
};

export type TaskRecurrenceRuleActionRequest = {
  id: string;
};

export type TaskRecurrenceOccurrenceActionRequest = {
  id: string;
  occurrenceLocalDate?: string | null;
};

export type TaskRecurrenceDatedOccurrenceActionRequest = {
  id: string;
  occurrenceLocalDate: string;
};

export type TaskRecurrenceRuleView = {
  occurrences: TaskRecurrenceOccurrence[];
  rule: TaskRecurrenceRule;
};

export type TaskRecurrenceData = {
  categories: CategoryTopicItem[];
  rules: TaskRecurrenceRuleView[];
  topics: CategoryTopicItem[];
};

export type TaskRecurrenceMutationResult = {
  rule: TaskRecurrenceRule;
  view: TaskRecurrenceRuleView;
};

export type TaskRecurrenceServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createCompletionId?: () => string;
  createExceptionId?: () => string;
  createRuleId?: () => string;
  createTaskRecurrenceRepository?: (database: unknown) => TaskRecurrenceRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedTaskRecurrenceAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  now: Date;
  taskRecurrenceRepository: TaskRecurrenceRepository;
};

type ValidatedTaskRecurrenceRuleRequest = {
  categoryId: EntityId | null;
  endsOnLocalDate: LocalDate | null;
  frequency: RecurrenceFrequency;
  kind: TaskRecurrenceKind;
  notes: Task['notes'];
  priority: TaskPriority;
  startsOnLocalDate: LocalDate;
  title: Task['title'];
  topicIds: EntityId[];
};

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareTaskRecurrenceAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createTaskRecurrenceRepository: createTaskRecurrenceRepositoryDependency = (database) =>
    createTaskRecurrenceRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: TaskRecurrenceServiceDependencies = {}): Promise<AppResult<PreparedTaskRecurrenceAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task recurrence data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    now,
    taskRecurrenceRepository: createTaskRecurrenceRepositoryDependency(database),
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
    return err(createAppError('validation_failed', 'Choose an active recurring task category or leave it blank.', 'edit'));
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
      return err(createAppError('validation_failed', 'Choose active recurring task topics or leave them blank.', 'edit'));
    }
  }

  return ok(topicIds);
}

async function validateRuleRequest(
  input: TaskRecurrenceRuleRequest,
  categoryTopicRepository: CategoryTopicRepository,
): Promise<AppResult<ValidatedTaskRecurrenceRuleRequest>> {
  const kind = asTaskRecurrenceKind(input.kind);
  const title = asTaskTitle(input.title);
  const notes = asTaskNotes(input.notes);
  const priority = asTaskPriority(input.priority);
  const frequency = asRecurrenceFrequency(input.frequency);
  const startsOnLocalDate = asLocalDate(input.startsOnLocalDate);
  const endsOnLocalDate = asOptionalTaskRecurrenceLocalDate(input.endsOnLocalDate);
  const categoryId = asOptionalMoneyRecordCategoryId(input.categoryId);
  const topicIds = asMoneyRecordTopicIds(input.topicIds ?? []);

  if (!kind.ok) {
    return kind;
  }

  if (!title.ok) {
    return title;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!priority.ok) {
    return priority;
  }

  if (!frequency.ok) {
    return frequency;
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

  const activeCategory = await validateActiveCategory(categoryTopicRepository, categoryId.value);

  if (isErr(activeCategory)) {
    return activeCategory;
  }

  const activeTopics = await validateActiveTopics(categoryTopicRepository, topicIds.value);

  if (isErr(activeTopics)) {
    return activeTopics;
  }

  return ok({
    categoryId: activeCategory.value,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: frequency.value,
    kind: kind.value,
    notes: notes.value,
    priority: priority.value,
    startsOnLocalDate: startsOnLocalDate.value,
    title: title.value,
    topicIds: activeTopics.value,
  });
}

async function createRuleView(
  repository: TaskRecurrenceRepository,
  rule: TaskRecurrenceRule,
  now: Date,
): Promise<AppResult<TaskRecurrenceRuleView>> {
  const exceptions = await repository.listExceptions(localWorkspaceId, rule.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const completions = await repository.listCompletions(localWorkspaceId, rule.id);

  if (isErr(completions)) {
    return completions;
  }

  const today = formatDateAsLocalDate(now);
  const through = addLocalDays(today, 366);

  if (!through.ok) {
    return through;
  }

  const occurrences = buildTaskRecurrenceOccurrences({
    completions: completions.value,
    exceptions: exceptions.value,
    fromLocalDate: today,
    maxCount: defaultPreviewCount,
    rule,
    throughLocalDate: through.value,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  return ok({
    occurrences: occurrences.value,
    rule,
  });
}

async function loadRuleViews(access: PreparedTaskRecurrenceAccess): Promise<AppResult<TaskRecurrenceRuleView[]>> {
  const rules = await access.taskRecurrenceRepository.listRules(localWorkspaceId);

  if (isErr(rules)) {
    return rules;
  }

  const views: TaskRecurrenceRuleView[] = [];

  for (const rule of rules.value) {
    const view = await createRuleView(access.taskRecurrenceRepository, rule, access.now);

    if (isErr(view)) {
      return view;
    }

    views.push(view.value);
  }

  return ok(views);
}

async function getActiveRule(
  repository: TaskRecurrenceRepository,
  id: string,
): Promise<AppResult<TaskRecurrenceRule>> {
  const entityId = asEntityId(id);

  if (!entityId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid recurring task or habit.', 'edit', entityId.error));
  }

  const rule = await repository.getRule(localWorkspaceId, entityId.value);

  if (isErr(rule)) {
    return rule;
  }

  if (!rule.value) {
    return err(createAppError('not_found', 'Recurring task or habit was not found.', 'edit'));
  }

  return ok(rule.value);
}

async function validateGeneratedOccurrence(
  repository: TaskRecurrenceRepository,
  rule: TaskRecurrenceRule,
  occurrenceLocalDate: string,
): Promise<AppResult<TaskRecurrenceOccurrence>> {
  const parsedDate = asLocalDate(occurrenceLocalDate);

  if (!parsedDate.ok) {
    return parsedDate;
  }

  const exceptions = await repository.listExceptions(localWorkspaceId, rule.id);

  if (isErr(exceptions)) {
    return exceptions;
  }

  const completions = await repository.listCompletions(localWorkspaceId, rule.id);

  if (isErr(completions)) {
    return completions;
  }

  const occurrences = buildTaskRecurrenceOccurrences({
    completions: completions.value,
    exceptions: exceptions.value,
    fromLocalDate: parsedDate.value,
    maxCount: 1,
    rule,
    throughLocalDate: parsedDate.value,
  });

  if (isErr(occurrences)) {
    return occurrences;
  }

  const occurrence = occurrences.value.find((candidate) => candidate.localDate === parsedDate.value);

  if (!occurrence) {
    return err(createAppError('validation_failed', 'Choose a generated occurrence for this series.', 'edit'));
  }

  return ok(occurrence);
}

async function nextOpenOccurrence(
  repository: TaskRecurrenceRepository,
  rule: TaskRecurrenceRule,
  now: Date,
): Promise<AppResult<LocalDate>> {
  const view = await createRuleView(repository, rule, now);

  if (isErr(view)) {
    return view;
  }

  const occurrence = view.value.occurrences.find((candidate) => candidate.state === 'open');

  if (!occurrence) {
    return err(createAppError('not_found', 'No upcoming occurrence is available.', 'edit'));
  }

  return ok(occurrence.localDate);
}

export async function loadTaskRecurrenceData(
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceData>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

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

  const rules = await loadRuleViews(access.value);

  if (isErr(rules)) {
    return rules;
  }

  return ok({
    categories: categories.value,
    rules: rules.value,
    topics: topics.value,
  });
}

export async function createTaskRecurrenceRule(
  input: TaskRecurrenceRuleRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = await validateRuleRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const rule = await access.value.taskRecurrenceRepository.createRule({
    ...validated.value,
    createdAt: timestamp,
    deletedAt: null,
    id: (dependencies.createRuleId ?? (() => defaultCreateId('task-recurrence')))(),
    pausedAt: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    stoppedAt: null,
    stoppedOnLocalDate: null,
    updatedAt: timestamp,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  });

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({
    rule: rule.value,
    view: view.value,
  });
}

export async function updateTaskRecurrenceRule(
  input: TaskRecurrenceRuleRequest & { id: string },
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const validated = await validateRuleRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const rule = await access.value.taskRecurrenceRepository.updateRule({
    ...validated.value,
    createdAt: existing.value.createdAt,
    deletedAt: existing.value.deletedAt,
    id: existing.value.id,
    pausedAt: existing.value.pausedAt,
    source: existing.value.source,
    sourceOfTruth: 'manual',
    stoppedAt: existing.value.stoppedAt,
    stoppedOnLocalDate: existing.value.stoppedOnLocalDate,
    updatedAt: timestamp,
    userCorrectedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({
    rule: rule.value,
    view: view.value,
  });
}

export async function pauseTaskRecurrenceRule(
  input: TaskRecurrenceRuleActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const timestamp = access.value.now.toISOString();
  const rule = await access.value.taskRecurrenceRepository.pauseRule(localWorkspaceId, existing.value.id, timestamp, timestamp);

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({ rule: rule.value, view: view.value });
}

export async function resumeTaskRecurrenceRule(
  input: TaskRecurrenceRuleActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const rule = await access.value.taskRecurrenceRepository.resumeRule(
    localWorkspaceId,
    existing.value.id,
    access.value.now.toISOString(),
  );

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({ rule: rule.value, view: view.value });
}

export async function stopTaskRecurrenceRule(
  input: TaskRecurrenceRuleActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const timestamp = access.value.now.toISOString();
  const stoppedOnLocalDate = formatDateAsLocalDate(access.value.now);
  const rule = await access.value.taskRecurrenceRepository.stopRule(
    localWorkspaceId,
    existing.value.id,
    timestamp,
    stoppedOnLocalDate,
    timestamp,
  );

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({ rule: rule.value, view: view.value });
}

export async function deleteTaskRecurrenceRule(
  input: TaskRecurrenceRuleActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<TaskRecurrenceMutationResult>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const existing = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(existing)) {
    return existing;
  }

  const timestamp = access.value.now.toISOString();
  const rule = await access.value.taskRecurrenceRepository.deleteRule(localWorkspaceId, existing.value.id, timestamp, timestamp);

  if (isErr(rule)) {
    return rule;
  }

  const view = await createRuleView(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(view)) {
    return view;
  }

  return ok({ rule: rule.value, view: view.value });
}

export async function skipTaskRecurrenceOccurrence(
  input: TaskRecurrenceOccurrenceActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<LocalDate>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const occurrenceLocalDate = input.occurrenceLocalDate
    ? asLocalDate(input.occurrenceLocalDate)
    : await nextOpenOccurrence(access.value.taskRecurrenceRepository, rule.value, access.value.now);

  if (isErr(occurrenceLocalDate)) {
    return occurrenceLocalDate;
  }

  const occurrence = await validateGeneratedOccurrence(
    access.value.taskRecurrenceRepository,
    rule.value,
    occurrenceLocalDate.value,
  );

  if (isErr(occurrence)) {
    return occurrence;
  }

  if (occurrence.value.state === 'completed') {
    return err(createAppError('validation_failed', 'Undo completion before skipping this occurrence.', 'edit'));
  }

  const timestamp = access.value.now.toISOString();
  const exception = await access.value.taskRecurrenceRepository.createException({
    action: 'skip',
    createdAt: timestamp,
    id: (dependencies.createExceptionId ?? (() => defaultCreateId('task-recurrence-exception')))(),
    occurrenceLocalDate: occurrenceLocalDate.value,
    ruleId: rule.value.id,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(exception)) {
    return exception;
  }

  return ok(exception.value.occurrenceLocalDate);
}

export async function completeTaskRecurrenceOccurrence(
  input: TaskRecurrenceDatedOccurrenceActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<LocalDate>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const occurrence = await validateGeneratedOccurrence(
    access.value.taskRecurrenceRepository,
    rule.value,
    input.occurrenceLocalDate,
  );

  if (isErr(occurrence)) {
    return occurrence;
  }

  if (occurrence.value.state === 'skipped') {
    return err(createAppError('validation_failed', 'Skipped occurrences cannot be completed.', 'edit'));
  }

  const timestamp = access.value.now.toISOString();
  const completion = await access.value.taskRecurrenceRepository.markCompletion({
    completedAt: timestamp,
    createdAt: timestamp,
    id: (dependencies.createCompletionId ?? (() => defaultCreateId('task-recurrence-completion')))(),
    occurrenceLocalDate: occurrence.value.localDate,
    ruleId: rule.value.id,
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(completion)) {
    return completion;
  }

  return ok(completion.value.occurrenceLocalDate);
}

export async function undoTaskRecurrenceCompletion(
  input: TaskRecurrenceDatedOccurrenceActionRequest,
  dependencies: TaskRecurrenceServiceDependencies = {},
): Promise<AppResult<LocalDate>> {
  const access = await prepareTaskRecurrenceAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const rule = await getActiveRule(access.value.taskRecurrenceRepository, input.id);

  if (isErr(rule)) {
    return rule;
  }

  const occurrenceLocalDate = asLocalDate(input.occurrenceLocalDate);

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  const completion = await access.value.taskRecurrenceRepository.undoCompletion(
    localWorkspaceId,
    rule.value.id,
    occurrenceLocalDate.value,
    access.value.now.toISOString(),
    access.value.now.toISOString(),
  );

  if (isErr(completion)) {
    return completion;
  }

  return ok(completion.value.occurrenceLocalDate);
}
