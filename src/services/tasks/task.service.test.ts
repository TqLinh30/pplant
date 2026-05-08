import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { ok } from '@/domain/common/result';
import { parseTaskRow } from '@/domain/tasks/schemas';
import type { SaveTaskInput, Task } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createTask,
  deleteTask,
  editTask,
  loadTaskCaptureData,
  type TaskServiceDependencies,
} from './task.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function createCategoryTopic(kind: CategoryTopicKind, id: string, name: string): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: id.includes('archived') ? fixedNow.toISOString() : null,
      createdAt: fixedNow.toISOString(),
      id,
      name,
      sortOrder: 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    },
    kind,
  );

  if (!result.ok) {
    throw new Error('category/topic fixture failed');
  }

  return result.value;
}

function createTaskFixture(input: SaveTaskInput): Task {
  const result = parseTaskRow(
    {
      categoryId: input.categoryId ?? null,
      completedAt: input.completedAt ?? null,
      createdAt: input.createdAt,
      deadlineLocalDate: input.deadlineLocalDate ?? null,
      deletedAt: input.deletedAt ?? null,
      id: input.id,
      notes: input.notes ?? null,
      priority: input.priority,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      state: input.state,
      title: input.title,
      updatedAt: input.updatedAt,
      userCorrectedAt: input.userCorrectedAt ?? null,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );

  if (!result.ok) {
    throw new Error('task fixture failed');
  }

  return result.value;
}

function createDependencies({
  categories = [createCategoryTopic('category', 'cat-study', 'Study')],
  topics = [createCategoryTopic('topic', 'topic-class', 'Class')],
}: {
  categories?: CategoryTopicItem[];
  topics?: CategoryTopicItem[];
} = {}) {
  const tasks: Task[] = [];
  const categoryTopicRepository = {
    archiveItem: jest.fn(),
    createItem: jest.fn(),
    findItem: jest.fn(async (kind: CategoryTopicKind, _workspaceId: string, id: string) => {
      const items = kind === 'category' ? categories : topics;

      return ok(items.find((item) => item.id === id) ?? null);
    }),
    listItems: jest.fn(async (kind: CategoryTopicKind) => ok(kind === 'category' ? categories : topics)),
    updateName: jest.fn(),
    updateSortOrders: jest.fn(),
  };
  const taskRepository = {
    createTask: jest.fn(async (input: SaveTaskInput) => {
      const task = createTaskFixture(input);
      tasks.push(task);
      return ok(task);
    }),
    deleteTask: jest.fn(async (_workspaceId: string, id: string, { now }: { now: Date }) => {
      const index = tasks.findIndex((task) => task.id === id && task.deletedAt === null);

      if (index < 0) {
        return { ok: false as const, error: createAppError('not_found', 'Missing task.', 'edit') };
      }

      tasks[index] = {
        ...tasks[index],
        deletedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      return ok(tasks[index]);
    }),
    getTask: jest.fn(async (_workspaceId: string, id: string) =>
      ok(tasks.find((task) => task.id === id && task.deletedAt === null) ?? null),
    ),
    listRecentTasks: jest.fn(async () => ok(tasks.filter((task) => task.deletedAt === null))),
    listSummaryTasks: jest.fn(async () => ok(tasks.filter((task) => task.deletedAt === null))),
    updateTask: jest.fn(async (input: SaveTaskInput) => {
      const index = tasks.findIndex((task) => task.id === input.id && task.deletedAt === null);

      if (index < 0) {
        return { ok: false as const, error: createAppError('not_found', 'Missing task.', 'edit') };
      }

      const updated = createTaskFixture({
        ...input,
        createdAt: tasks[index].createdAt,
      });
      tasks[index] = updated;

      return ok(updated);
    }),
  };
  const dependencies: TaskServiceDependencies = {
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createId: () => `task-${tasks.length + 1}`,
    createTaskRepository: () => taskRepository as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    dependencies,
    taskRepository,
    tasks,
  };
}

describe('task service', () => {
  it('loads task capture data with categories, topics, recent tasks, and summary', async () => {
    const { dependencies, tasks } = createDependencies();
    tasks.push(
      createTaskFixture({
        categoryId: 'cat-study',
        completedAt: null,
        createdAt: fixedNow.toISOString(),
        deadlineLocalDate: '2026-05-07',
        deletedAt: null,
        id: 'task-existing',
        notes: null,
        priority: 'high',
        source: 'manual',
        sourceOfTruth: 'manual',
        state: 'todo',
        title: 'Read notes',
        topicIds: ['topic-class'],
        updatedAt: fixedNow.toISOString(),
        userCorrectedAt: null,
        workspaceId: localWorkspaceId,
      }),
    );

    const result = await loadTaskCaptureData(dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categories).toHaveLength(1);
      expect(result.value.topics).toHaveLength(1);
      expect(result.value.recentTasks).toHaveLength(1);
      expect(result.value.summary.overdueOpenCount).toBe(1);
    }
  });

  it('creates done tasks with completion timestamps and summary updates', async () => {
    const { dependencies, tasks } = createDependencies();

    const result = await createTask(
      {
        categoryId: 'cat-study',
        deadlineLocalDate: '2026-05-08',
        notes: 'Finish before class',
        priority: 'high',
        state: 'done',
        title: 'Submit lab',
        topicIds: ['topic-class'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(tasks).toHaveLength(1);
    if (result.ok) {
      expect(result.value.task).toMatchObject({
        completedAt: fixedNow.toISOString(),
        source: 'manual',
        sourceOfTruth: 'manual',
        state: 'done',
      });
      expect(result.value.summary.doneCount).toBe(1);
    }
  });

  it('rejects archived categories and topics', async () => {
    const { dependencies } = createDependencies({
      categories: [createCategoryTopic('category', 'cat-archived', 'Old category')],
      topics: [createCategoryTopic('topic', 'topic-archived', 'Old topic')],
    });

    const archivedCategory = await createTask(
      {
        categoryId: 'cat-archived',
        priority: 'high',
        state: 'todo',
        title: 'Plan essay',
      },
      dependencies,
    );
    const archivedTopic = await createTask(
      {
        priority: 'high',
        state: 'todo',
        title: 'Plan essay',
        topicIds: ['topic-archived'],
      },
      dependencies,
    );

    expect(archivedCategory.ok).toBe(false);
    expect(archivedTopic.ok).toBe(false);
  });

  it('edits tasks with manual correction timestamps and clears completion when reopened', async () => {
    const { dependencies } = createDependencies();
    const created = await createTask(
      {
        priority: 'high',
        state: 'done',
        title: 'Finish quiz',
      },
      dependencies,
    );

    if (!created.ok) {
      throw new Error('create failed');
    }

    const edited = await editTask(
      {
        id: created.value.task.id,
        priority: 'low',
        state: 'doing',
        title: 'Review quiz',
      },
      dependencies,
    );

    expect(edited.ok).toBe(true);
    if (edited.ok) {
      expect(edited.value.task.completedAt).toBeNull();
      expect(edited.value.task.userCorrectedAt).toBe(fixedNow.toISOString());
      expect(edited.value.summary.doingCount).toBe(1);
    }
  });

  it('soft deletes tasks and recalculates active summaries', async () => {
    const { dependencies, tasks } = createDependencies();
    const created = await createTask(
      {
        deadlineLocalDate: '2026-05-07',
        priority: 'high',
        state: 'todo',
        title: 'Read article',
      },
      dependencies,
    );

    if (!created.ok) {
      throw new Error('create failed');
    }

    const deleted = await deleteTask({ id: created.value.task.id }, dependencies);

    expect(deleted.ok).toBe(true);
    expect(tasks[0].deletedAt).toBe(fixedNow.toISOString());
    if (deleted.ok) {
      expect(deleted.value.summary.totalCount).toBe(0);
    }
  });
});
