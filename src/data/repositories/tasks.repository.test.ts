import type { TaskRow } from '@/domain/tasks/schemas';
import type { SaveTaskInput } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createTaskRepository } from './tasks.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

type TopicRow = {
  createdAt: string;
  taskId: string;
  topicId: string;
  workspaceId: string;
};

class FakeTaskClient {
  readonly executedSql: string[] = [];
  failOnTopicInsert = false;
  records: TaskRow[] = [];
  topics: TopicRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const recordsSnapshot = this.records.map((record) => ({ ...record }));
    const topicsSnapshot = this.topics.map((topic) => ({ ...topic }));

    try {
      task();
    } catch (cause) {
      this.records = recordsSnapshot;
      this.topics = topicsSnapshot;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO tasks')) {
      const [
        id,
        workspaceId,
        title,
        notes,
        state,
        priority,
        deadlineLocalDate,
        completedAt,
        categoryId,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.records.push({
        categoryId: categoryId as string | null,
        completedAt: completedAt as string | null,
        createdAt: createdAt as string,
        deadlineLocalDate: deadlineLocalDate as string | null,
        deletedAt: deletedAt as string | null,
        id: id as string,
        notes: notes as string | null,
        priority: priority as 'high' | 'low',
        source: sourceValue as 'manual',
        sourceOfTruth: sourceOfTruth as 'manual',
        state: state as 'todo' | 'doing' | 'done',
        title: title as string,
        updatedAt: updatedAt as string,
        userCorrectedAt: userCorrectedAt as string | null,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO task_topics')) {
      if (this.failOnTopicInsert) {
        throw new Error('topic insert failed');
      }

      const [taskId, topicId, workspaceId, createdAt] = params;

      this.topics.push({
        createdAt: createdAt as string,
        taskId: taskId as string,
        topicId: topicId as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE tasks') && source.includes('deleted_at = NULL')) {
      const [
        title,
        notes,
        state,
        priority,
        deadlineLocalDate,
        completedAt,
        categoryId,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        Object.assign(record, {
          categoryId,
          completedAt,
          deadlineLocalDate,
          notes,
          priority,
          source: sourceValue,
          sourceOfTruth,
          state,
          title,
          updatedAt,
          userCorrectedAt,
        });
      }

      return { changes: record ? 1 : 0 };
    }

    if (source.includes('UPDATE tasks') && source.includes('deleted_at = ?')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        record.deletedAt = deletedAt as string;
        record.updatedAt = updatedAt as string;
      }

      return { changes: record ? 1 : 0 };
    }

    if (source.includes('DELETE FROM task_topics')) {
      const [workspaceId, taskId] = params;
      this.topics = this.topics.filter((topic) => topic.workspaceId !== workspaceId || topic.taskId !== taskId);

      return { changes: 1 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    const [workspaceId, id] = params;
    const includeDeleted = !source.includes('deleted_at IS NULL');

    return (
      (this.records.find(
        (record) =>
          record.workspaceId === workspaceId && record.id === id && (includeDeleted || record.deletedAt === null),
      ) as T | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('SELECT topic_id AS topicId')) {
      const [workspaceId, taskId] = params;

      return this.topics
        .filter((topic) => topic.workspaceId === workspaceId && topic.taskId === taskId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.topicId.localeCompare(right.topicId))
        .map((topic) => ({ topicId: topic.topicId }) as T);
    }

    const [workspaceId] = params;
    let rows = this.records.filter((record) => record.workspaceId === workspaceId && record.deletedAt === null);

    rows = rows.sort(
      (left, right) =>
        Number(left.deadlineLocalDate === null) - Number(right.deadlineLocalDate === null) ||
        (left.deadlineLocalDate ?? '').localeCompare(right.deadlineLocalDate ?? '') ||
        left.state.localeCompare(right.state) ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        right.id.localeCompare(left.id),
    );

    if (source.includes('LIMIT ?')) {
      rows = rows.slice(0, params[1] as number);
    }

    return rows.map((record) => ({ ...record }) as T);
  }
}

function createInput(overrides: Partial<SaveTaskInput> = {}): SaveTaskInput {
  return {
    categoryId: 'cat-study',
    completedAt: null,
    createdAt: fixedNow,
    deadlineLocalDate: '2026-05-09',
    deletedAt: null,
    id: 'task-1',
    notes: 'Read chapter 4',
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    state: 'todo',
    title: 'Biology homework',
    topicIds: ['topic-class'],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('task repository', () => {
  it('creates and lists recent tasks with topics', async () => {
    const client = new FakeTaskClient();
    const repository = createTaskRepository({ $client: client } as never);

    const created = await repository.createTask(createInput());
    const recent = await repository.listRecentTasks(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(recent.ok).toBe(true);
    if (recent.ok) {
      expect(recent.value).toHaveLength(1);
      expect(recent.value[0]).toMatchObject({
        categoryId: 'cat-study',
        state: 'todo',
        topicIds: ['topic-class'],
      });
    }
  });

  it('updates tasks and replaces topics while preserving createdAt', async () => {
    const client = new FakeTaskClient();
    const repository = createTaskRepository({ $client: client } as never);

    await repository.createTask(createInput({ topicIds: ['topic-old'] }));
    const updated = await repository.updateTask(
      createInput({
        categoryId: null,
        deadlineLocalDate: null,
        notes: 'Draft intro',
        priority: 'low',
        state: 'doing',
        title: 'Essay draft',
        topicIds: ['topic-writing'],
        updatedAt: '2026-05-08T01:00:00.000Z',
        userCorrectedAt: '2026-05-08T01:00:00.000Z',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value).toMatchObject({
        categoryId: null,
        createdAt: fixedNow,
        deadlineLocalDate: null,
        priority: 'low',
        state: 'doing',
        topicIds: ['topic-writing'],
      });
    }
    expect(client.topics.map((topic) => topic.topicId)).toEqual(['topic-writing']);
  });

  it('soft deletes tasks and hides them from active lists', async () => {
    const client = new FakeTaskClient();
    const repository = createTaskRepository({ $client: client } as never);

    await repository.createTask(createInput());
    const deleted = await repository.deleteTask(localWorkspaceId, 'task-1' as never, {
      now: new Date('2026-05-08T02:00:00.000Z'),
    });
    const active = await repository.getTask(localWorkspaceId, 'task-1' as never);
    const recent = await repository.listRecentTasks(localWorkspaceId);

    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.value.deletedAt).toBe('2026-05-08T02:00:00.000Z');
    }
    expect(active).toEqual({ ok: true, value: null });
    expect(recent).toEqual({ ok: true, value: [] });
  });

  it('rolls back task updates when replacement topic writes fail', async () => {
    const client = new FakeTaskClient();
    const repository = createTaskRepository({ $client: client } as never);

    await repository.createTask(createInput({ topicIds: ['topic-old'] }));
    client.failOnTopicInsert = true;

    const result = await repository.updateTask(createInput({ title: 'Updated title', topicIds: ['topic-new'] }));

    expect(result.ok).toBe(false);
    expect(client.records[0].title).toBe('Biology homework');
    expect(client.topics.map((topic) => topic.topicId)).toEqual(['topic-old']);
  });
});
