import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { parseTaskRow, type TaskRow } from '@/domain/tasks/schemas';
import type { SaveTaskInput, Task } from '@/domain/tasks/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type TaskRepository = {
  createTask(input: SaveTaskInput): Promise<AppResult<Task>>;
  deleteTask(workspaceId: WorkspaceId, id: EntityId, options: { now: Date }): Promise<AppResult<Task>>;
  getTask(workspaceId: WorkspaceId, id: EntityId, options?: { includeDeleted?: boolean }): Promise<AppResult<Task | null>>;
  listRecentTasks(workspaceId: WorkspaceId, options?: { limit?: number }): Promise<AppResult<Task[]>>;
  listSummaryTasks(workspaceId: WorkspaceId): Promise<AppResult<Task[]>>;
  updateTask(input: SaveTaskInput): Promise<AppResult<Task>>;
};

type TaskSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectTaskColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  title,
  notes,
  state,
  priority,
  deadline_local_date AS deadlineLocalDate,
  completed_at AS completedAt,
  category_id AS categoryId,
  source,
  source_of_truth AS sourceOfTruth,
  user_corrected_at AS userCorrectedAt,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM tasks
`;
}

function runAtomic(client: TaskSqlClient, task: () => void): void {
  if (client.withTransactionSync) {
    client.withTransactionSync(task);
    return;
  }

  client.execSync('BEGIN TRANSACTION');

  try {
    task();
    client.execSync('COMMIT');
  } catch (cause) {
    client.execSync('ROLLBACK');
    throw cause;
  }
}

async function getTopicIdsForTask(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  taskId: EntityId,
): Promise<AppResult<string[]>> {
  try {
    const rows = database.$client.getAllSync<{ topicId: string }>(
      `SELECT topic_id AS topicId
       FROM task_topics
       WHERE workspace_id = ? AND task_id = ?
       ORDER BY created_at ASC, topic_id ASC`,
      workspaceId,
      taskId,
    );

    return ok(rows.map((row) => row.topicId));
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task topics could not be loaded.', 'retry', cause));
  }
}

async function parseTaskWithTopics(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  row: TaskRow,
): Promise<AppResult<Task>> {
  const topicIds = await getTopicIdsForTask(database, workspaceId, row.id as EntityId);

  if (!topicIds.ok) {
    return topicIds;
  }

  return parseTaskRow(row, topicIds.value);
}

async function loadTask(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<Task | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<TaskRow>(
      `${selectTaskColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseTaskWithTopics(database, workspaceId, row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task could not be loaded.', 'retry', cause));
  }
}

function parseInput(input: SaveTaskInput): AppResult<Task> {
  return parseTaskRow(
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
}

function insertTask(database: PplantDatabase, task: Task): void {
  database.$client.runSync(
    `INSERT INTO tasks
      (id, workspace_id, title, notes, state, priority, deadline_local_date,
       completed_at, category_id, source, source_of_truth, user_corrected_at,
       created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    task.id,
    task.workspaceId,
    task.title,
    task.notes,
    task.state,
    task.priority,
    task.deadlineLocalDate,
    task.completedAt,
    task.categoryId,
    task.source,
    task.sourceOfTruth,
    task.userCorrectedAt,
    task.createdAt,
    task.updatedAt,
    task.deletedAt,
  );
}

function insertTaskTopics(database: PplantDatabase, task: Task, createdAt: string): void {
  for (const topicId of task.topicIds) {
    database.$client.runSync(
      `INSERT INTO task_topics
        (task_id, topic_id, workspace_id, created_at)
       VALUES (?, ?, ?, ?)`,
      task.id,
      topicId,
      task.workspaceId,
      createdAt,
    );
  }
}

async function listTasksFromRows(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  rows: TaskRow[],
): Promise<AppResult<Task[]>> {
  const tasks: Task[] = [];

  for (const row of rows) {
    const parsed = await parseTaskWithTopics(database, workspaceId, row);

    if (!parsed.ok) {
      return parsed;
    }

    tasks.push(parsed.value);
  }

  return ok(tasks);
}

export function createTaskRepository(database: PplantDatabase): TaskRepository {
  return {
    async createTask(input) {
      const parsed = parseInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      const task = parsed.value;

      try {
        runAtomic(database.$client as TaskSqlClient, () => {
          insertTask(database, task);
          insertTaskTopics(database, task, task.createdAt);
        });

        return ok(task);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task could not be saved.', 'retry', cause));
      }
    },

    async deleteTask(workspaceId, id, { now }) {
      try {
        const timestamp = now.toISOString();
        database.$client.runSync(
          `UPDATE tasks
           SET deleted_at = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          timestamp,
          timestamp,
          workspaceId,
          id,
        );

        const deleted = await loadTask(database, workspaceId, id, { includeDeleted: true });

        if (!deleted.ok) {
          return deleted;
        }

        if (!deleted.value) {
          return err(createAppError('not_found', 'Task was not found.', 'edit'));
        }

        return ok(deleted.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task could not be deleted.', 'retry', cause));
      }
    },

    async getTask(workspaceId, id, options = {}) {
      return loadTask(database, workspaceId, id, options);
    },

    async listRecentTasks(workspaceId, { limit = 20 } = {}) {
      try {
        const rows = database.$client.getAllSync<TaskRow>(
          `${selectTaskColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY deadline_local_date IS NULL ASC,
                    deadline_local_date ASC,
                    state ASC,
                    updated_at DESC,
                    id DESC
           LIMIT ?`,
          workspaceId,
          limit,
        );

        return listTasksFromRows(database, workspaceId, rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local tasks could not be loaded.', 'retry', cause));
      }
    },

    async listSummaryTasks(workspaceId) {
      try {
        const rows = database.$client.getAllSync<TaskRow>(
          `${selectTaskColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY deadline_local_date ASC, updated_at DESC, id DESC`,
          workspaceId,
        );

        return listTasksFromRows(database, workspaceId, rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task summary data could not be loaded.', 'retry', cause));
      }
    },

    async updateTask(input) {
      const existing = await loadTask(database, input.workspaceId as WorkspaceId, input.id as EntityId);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Task was not found.', 'edit'));
      }

      const parsed = parseInput({
        ...input,
        createdAt: existing.value.createdAt,
        deletedAt: null,
      });

      if (!parsed.ok) {
        return parsed;
      }

      const task = parsed.value;

      try {
        runAtomic(database.$client as TaskSqlClient, () => {
          database.$client.runSync(
            `UPDATE tasks
             SET title = ?,
                 notes = ?,
                 state = ?,
                 priority = ?,
                 deadline_local_date = ?,
                 completed_at = ?,
                 category_id = ?,
                 source = ?,
                 source_of_truth = ?,
                 user_corrected_at = ?,
                 updated_at = ?,
                 deleted_at = NULL
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            task.title,
            task.notes,
            task.state,
            task.priority,
            task.deadlineLocalDate,
            task.completedAt,
            task.categoryId,
            task.source,
            task.sourceOfTruth,
            task.userCorrectedAt,
            task.updatedAt,
            task.workspaceId,
            task.id,
          );

          database.$client.runSync(
            `DELETE FROM task_topics
             WHERE workspace_id = ? AND task_id = ?`,
            task.workspaceId,
            task.id,
          );
          insertTaskTopics(database, task, task.updatedAt);
        });

        return ok(task);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task could not be updated.', 'retry', cause));
      }
    },
  };
}
