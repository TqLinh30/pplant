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
  createTaskRepository,
  type TaskRepository,
} from '@/data/repositories/tasks.repository';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, formatDateAsLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import {
  asOptionalTaskDeadline,
  asTaskNotes,
  asTaskPriority,
  asTaskState,
  asTaskTitle,
} from '@/domain/tasks/schemas';
import { calculateTaskStateSummary, type TaskStateSummary } from '@/domain/tasks/task-summary';
import type { Task, TaskPriority, TaskState } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type TaskCaptureData = {
  categories: CategoryTopicItem[];
  recentTasks: Task[];
  summary: TaskStateSummary;
  topics: CategoryTopicItem[];
};

export type TaskRequest = {
  categoryId?: string | null;
  deadlineLocalDate?: string | null;
  notes?: string | null;
  priority: TaskPriority;
  state: TaskState;
  title: string;
  topicIds?: string[];
};

export type CreateTaskRequest = TaskRequest;

export type EditTaskRequest = TaskRequest & {
  id: string;
};

export type DeleteTaskRequest = {
  id: string;
};

export type TaskMutationResult = {
  summary: TaskStateSummary;
  task: Task;
};

export type TaskServiceDependencies = {
  createCategoryTopicRepository?: (database: unknown) => CategoryTopicRepository;
  createId?: () => string;
  createTaskRepository?: (database: unknown) => TaskRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedTaskAccess = {
  categoryTopicRepository: CategoryTopicRepository;
  now: Date;
  taskRepository: TaskRepository;
};

type ValidatedTaskRequest = {
  categoryId: EntityId | null;
  deadlineLocalDate: LocalDate | null;
  notes: Task['notes'];
  priority: TaskPriority;
  state: TaskState;
  title: Task['title'];
  topicIds: EntityId[];
};

function defaultCreateTaskId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareTaskAccess({
  createCategoryTopicRepository: createCategoryTopicRepositoryDependency = (database) =>
    createCategoryTopicRepository(database as PplantDatabase),
  createTaskRepository: createTaskRepositoryDependency = (database) =>
    createTaskRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: TaskServiceDependencies = {}): Promise<AppResult<PreparedTaskAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    categoryTopicRepository: createCategoryTopicRepositoryDependency(database),
    now,
    taskRepository: createTaskRepositoryDependency(database),
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
    return err(createAppError('validation_failed', 'Choose an active task category or leave it blank.', 'edit'));
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
      return err(createAppError('validation_failed', 'Choose active task topics or leave them blank.', 'edit'));
    }
  }

  return ok(topicIds);
}

async function validateTaskRequest(
  input: TaskRequest,
  categoryTopicRepository: CategoryTopicRepository,
): Promise<AppResult<ValidatedTaskRequest>> {
  const title = asTaskTitle(input.title);
  const notes = asTaskNotes(input.notes);
  const state = asTaskState(input.state);
  const priority = asTaskPriority(input.priority);
  const deadlineLocalDate = asOptionalTaskDeadline(input.deadlineLocalDate);
  const categoryId = asOptionalMoneyRecordCategoryId(input.categoryId);
  const topicIds = asMoneyRecordTopicIds(input.topicIds ?? []);

  if (!title.ok) {
    return title;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!state.ok) {
    return state;
  }

  if (!priority.ok) {
    return priority;
  }

  if (!deadlineLocalDate.ok) {
    return deadlineLocalDate;
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
    deadlineLocalDate: deadlineLocalDate.value,
    notes: notes.value,
    priority: priority.value,
    state: state.value,
    title: title.value,
    topicIds: activeTopics.value,
  });
}

async function loadTaskSummary(access: PreparedTaskAccess): Promise<AppResult<TaskStateSummary>> {
  const tasks = await access.taskRepository.listSummaryTasks(localWorkspaceId);

  if (isErr(tasks)) {
    return tasks;
  }

  const today = asLocalDate(formatDateAsLocalDate(access.now));

  if (!today.ok) {
    return today;
  }

  return ok(calculateTaskStateSummary(tasks.value, today.value));
}

function resolveCompletedAt(
  existing: Task | null,
  state: TaskState,
  timestamp: string,
): string | null {
  if (state !== 'done') {
    return null;
  }

  if (existing?.state === 'done' && existing.completedAt) {
    return existing.completedAt;
  }

  return timestamp;
}

export async function loadTaskCaptureData(
  dependencies: TaskServiceDependencies = {},
): Promise<AppResult<TaskCaptureData>> {
  const access = await prepareTaskAccess(dependencies);

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

  const recentTasks = await access.value.taskRepository.listRecentTasks(localWorkspaceId);

  if (isErr(recentTasks)) {
    return recentTasks;
  }

  const summary = await loadTaskSummary(access.value);

  if (isErr(summary)) {
    return summary;
  }

  return ok({
    categories: categories.value,
    recentTasks: recentTasks.value,
    summary: summary.value,
    topics: topics.value,
  });
}

export async function createTask(
  input: CreateTaskRequest,
  dependencies: TaskServiceDependencies = {},
): Promise<AppResult<TaskMutationResult>> {
  const access = await prepareTaskAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const validated = await validateTaskRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const task = await access.value.taskRepository.createTask({
    ...validated.value,
    completedAt: resolveCompletedAt(null, validated.value.state, timestamp),
    createdAt: timestamp,
    deletedAt: null,
    id: (dependencies.createId ?? defaultCreateTaskId)(),
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: timestamp,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  });

  if (isErr(task)) {
    return task;
  }

  const summary = await loadTaskSummary(access.value);

  if (isErr(summary)) {
    return summary;
  }

  return ok({
    summary: summary.value,
    task: task.value,
  });
}

export async function editTask(
  input: EditTaskRequest,
  dependencies: TaskServiceDependencies = {},
): Promise<AppResult<TaskMutationResult>> {
  const access = await prepareTaskAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return id;
  }

  const existing = await access.value.taskRepository.getTask(localWorkspaceId, id.value);

  if (isErr(existing)) {
    return existing;
  }

  if (!existing.value) {
    return err(createAppError('not_found', 'Task was not found.', 'edit'));
  }

  const validated = await validateTaskRequest(input, access.value.categoryTopicRepository);

  if (isErr(validated)) {
    return validated;
  }

  const timestamp = access.value.now.toISOString();
  const task = await access.value.taskRepository.updateTask({
    ...validated.value,
    completedAt: resolveCompletedAt(existing.value, validated.value.state, timestamp),
    createdAt: existing.value.createdAt,
    deletedAt: null,
    id: id.value,
    source: existing.value.source,
    sourceOfTruth: 'manual',
    updatedAt: timestamp,
    userCorrectedAt: timestamp,
    workspaceId: localWorkspaceId,
  });

  if (isErr(task)) {
    return task;
  }

  const summary = await loadTaskSummary(access.value);

  if (isErr(summary)) {
    return summary;
  }

  return ok({
    summary: summary.value,
    task: task.value,
  });
}

export async function deleteTask(
  input: DeleteTaskRequest,
  dependencies: TaskServiceDependencies = {},
): Promise<AppResult<TaskMutationResult>> {
  const access = await prepareTaskAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return id;
  }

  const task = await access.value.taskRepository.deleteTask(localWorkspaceId, id.value, {
    now: access.value.now,
  });

  if (isErr(task)) {
    return task;
  }

  const summary = await loadTaskSummary(access.value);

  if (isErr(summary)) {
    return summary;
  }

  return ok({
    summary: summary.value,
    task: task.value,
  });
}
