import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseTaskRecurrenceCompletionRow,
  parseTaskRecurrenceExceptionRow,
  parseTaskRecurrenceRuleRow,
  type TaskRecurrenceCompletionRow,
  type TaskRecurrenceExceptionRow,
  type TaskRecurrenceRuleRow,
} from '@/domain/tasks/schemas';
import type {
  SaveTaskRecurrenceCompletionInput,
  SaveTaskRecurrenceExceptionInput,
  SaveTaskRecurrenceRuleInput,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type TaskRecurrenceRepository = {
  createException(input: SaveTaskRecurrenceExceptionInput): Promise<AppResult<TaskRecurrenceException>>;
  createRule(input: SaveTaskRecurrenceRuleInput): Promise<AppResult<TaskRecurrenceRule>>;
  deleteRule(workspaceId: WorkspaceId, id: EntityId, deletedAt: string, updatedAt: string): Promise<AppResult<TaskRecurrenceRule>>;
  getRule(workspaceId: WorkspaceId, id: EntityId, options?: { includeDeleted?: boolean }): Promise<AppResult<TaskRecurrenceRule | null>>;
  listCompletions(workspaceId: WorkspaceId, ruleId: EntityId): Promise<AppResult<TaskRecurrenceCompletion[]>>;
  listExceptions(workspaceId: WorkspaceId, ruleId: EntityId): Promise<AppResult<TaskRecurrenceException[]>>;
  listRules(workspaceId: WorkspaceId): Promise<AppResult<TaskRecurrenceRule[]>>;
  markCompletion(input: SaveTaskRecurrenceCompletionInput): Promise<AppResult<TaskRecurrenceCompletion>>;
  pauseRule(workspaceId: WorkspaceId, id: EntityId, pausedAt: string, updatedAt: string): Promise<AppResult<TaskRecurrenceRule>>;
  resumeRule(workspaceId: WorkspaceId, id: EntityId, updatedAt: string): Promise<AppResult<TaskRecurrenceRule>>;
  stopRule(
    workspaceId: WorkspaceId,
    id: EntityId,
    stoppedAt: string,
    stoppedOnLocalDate: string,
    updatedAt: string,
  ): Promise<AppResult<TaskRecurrenceRule>>;
  undoCompletion(
    workspaceId: WorkspaceId,
    ruleId: EntityId,
    occurrenceLocalDate: string,
    deletedAt: string,
    updatedAt: string,
  ): Promise<AppResult<TaskRecurrenceCompletion>>;
  updateRule(input: SaveTaskRecurrenceRuleInput): Promise<AppResult<TaskRecurrenceRule>>;
};

type TaskRecurrenceSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectRuleColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  kind,
  title,
  notes,
  priority,
  frequency,
  starts_on_local_date AS startsOnLocalDate,
  ends_on_local_date AS endsOnLocalDate,
  category_id AS categoryId,
  source,
  source_of_truth AS sourceOfTruth,
  user_corrected_at AS userCorrectedAt,
  paused_at AS pausedAt,
  stopped_at AS stoppedAt,
  stopped_on_local_date AS stoppedOnLocalDate,
  deleted_at AS deletedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
FROM task_recurrence_rules
`;
}

function runAtomic(client: TaskRecurrenceSqlClient, task: () => void): void {
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

async function getTopicIdsForRule(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  ruleId: EntityId,
): Promise<AppResult<string[]>> {
  try {
    const rows = database.$client.getAllSync<{ topicId: string }>(
      `SELECT topic_id AS topicId
       FROM task_recurrence_topics
       WHERE workspace_id = ? AND rule_id = ?
       ORDER BY created_at ASC, topic_id ASC`,
      workspaceId,
      ruleId,
    );

    return ok(rows.map((row) => row.topicId));
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task recurrence topics could not be loaded.', 'retry', cause));
  }
}

async function parseRuleWithTopics(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  row: TaskRecurrenceRuleRow,
): Promise<AppResult<TaskRecurrenceRule>> {
  const topicIds = await getTopicIdsForRule(database, workspaceId, row.id as EntityId);

  if (!topicIds.ok) {
    return topicIds;
  }

  return parseTaskRecurrenceRuleRow(row, topicIds.value);
}

async function loadRule(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<TaskRecurrenceRule | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<TaskRecurrenceRuleRow>(
      `${selectRuleColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseRuleWithTopics(database, workspaceId, row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task recurrence rule could not be loaded.', 'retry', cause));
  }
}

function parseRuleInput(input: SaveTaskRecurrenceRuleInput): AppResult<TaskRecurrenceRule> {
  return parseTaskRecurrenceRuleRow(
    {
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      deletedAt: input.deletedAt ?? null,
      endsOnLocalDate: input.endsOnLocalDate ?? null,
      frequency: input.frequency,
      id: input.id,
      kind: input.kind,
      notes: input.notes ?? null,
      pausedAt: input.pausedAt ?? null,
      priority: input.priority,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      startsOnLocalDate: input.startsOnLocalDate,
      stoppedAt: input.stoppedAt ?? null,
      stoppedOnLocalDate: input.stoppedOnLocalDate ?? null,
      title: input.title,
      updatedAt: input.updatedAt,
      userCorrectedAt: input.userCorrectedAt ?? null,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
}

function insertRule(database: PplantDatabase, rule: TaskRecurrenceRule): void {
  database.$client.runSync(
    `INSERT INTO task_recurrence_rules
      (id, workspace_id, kind, title, notes, priority, frequency,
       starts_on_local_date, ends_on_local_date, category_id, source,
       source_of_truth, user_corrected_at, paused_at, stopped_at,
       stopped_on_local_date, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    rule.id,
    rule.workspaceId,
    rule.kind,
    rule.title,
    rule.notes,
    rule.priority,
    rule.frequency,
    rule.startsOnLocalDate,
    rule.endsOnLocalDate,
    rule.categoryId,
    rule.source,
    rule.sourceOfTruth,
    rule.userCorrectedAt,
    rule.pausedAt,
    rule.stoppedAt,
    rule.stoppedOnLocalDate,
    rule.deletedAt,
    rule.createdAt,
    rule.updatedAt,
  );
}

function insertRuleTopics(database: PplantDatabase, rule: TaskRecurrenceRule, createdAt: string): void {
  for (const topicId of rule.topicIds) {
    database.$client.runSync(
      `INSERT INTO task_recurrence_topics
        (rule_id, topic_id, workspace_id, created_at)
       VALUES (?, ?, ?, ?)`,
      rule.id,
      topicId,
      rule.workspaceId,
      createdAt,
    );
  }
}

async function updateRuleStatus(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  assignmentSql: string,
  params: unknown[],
  includeDeleted = false,
): Promise<AppResult<TaskRecurrenceRule>> {
  try {
    database.$client.runSync(
      `UPDATE task_recurrence_rules
       SET ${assignmentSql}
       WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
      ...(params as never[]),
      workspaceId,
      id,
    );

    const updated = await loadRule(database, workspaceId, id, { includeDeleted });

    if (!updated.ok) {
      return updated;
    }

    if (!updated.value) {
      return err(createAppError('not_found', 'Recurring task or habit was not found.', 'edit'));
    }

    return ok(updated.value);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task recurrence rule could not be updated.', 'retry', cause));
  }
}

async function loadCompletionByDate(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  ruleId: EntityId,
  occurrenceLocalDate: string,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<TaskRecurrenceCompletion | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<TaskRecurrenceCompletionRow>(
      `SELECT
         id,
         rule_id AS ruleId,
         workspace_id AS workspaceId,
         occurrence_local_date AS occurrenceLocalDate,
         completed_at AS completedAt,
         created_at AS createdAt,
         updated_at AS updatedAt,
         deleted_at AS deletedAt
       FROM task_recurrence_completions
       WHERE workspace_id = ? AND rule_id = ? AND occurrence_local_date = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      ruleId,
      occurrenceLocalDate,
    );

    if (!row) {
      return ok(null);
    }

    return parseTaskRecurrenceCompletionRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local task recurrence completion could not be loaded.', 'retry', cause));
  }
}

export function createTaskRecurrenceRepository(database: PplantDatabase): TaskRecurrenceRepository {
  return {
    async createException(input) {
      try {
        const existing = database.$client.getFirstSync<TaskRecurrenceExceptionRow>(
          `SELECT
             id,
             rule_id AS ruleId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM task_recurrence_exceptions
           WHERE workspace_id = ? AND rule_id = ? AND occurrence_local_date = ? AND action = ?
           LIMIT 1`,
          input.workspaceId,
          input.ruleId,
          input.occurrenceLocalDate,
          input.action,
        );

        if (existing) {
          return parseTaskRecurrenceExceptionRow(existing);
        }

        const parsed = parseTaskRecurrenceExceptionRow({
          action: input.action,
          createdAt: input.createdAt,
          id: input.id,
          occurrenceLocalDate: input.occurrenceLocalDate,
          ruleId: input.ruleId,
          updatedAt: input.updatedAt,
          workspaceId: input.workspaceId,
        });

        if (!parsed.ok) {
          return parsed;
        }

        database.$client.runSync(
          `INSERT INTO task_recurrence_exceptions
            (id, rule_id, workspace_id, occurrence_local_date, action, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.ruleId,
          parsed.value.workspaceId,
          parsed.value.occurrenceLocalDate,
          parsed.value.action,
          parsed.value.createdAt,
          parsed.value.updatedAt,
        );

        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence exception could not be saved.', 'retry', cause));
      }
    },

    async createRule(input) {
      const parsed = parseRuleInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      const rule = parsed.value;

      try {
        runAtomic(database.$client as TaskRecurrenceSqlClient, () => {
          insertRule(database, rule);
          insertRuleTopics(database, rule, rule.createdAt);
        });

        return ok(rule);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence rule could not be saved.', 'retry', cause));
      }
    },

    async deleteRule(workspaceId, id, deletedAt, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'deleted_at = ?, updated_at = ?', [deletedAt, updatedAt], true);
    },

    async getRule(workspaceId, id, options = {}) {
      return loadRule(database, workspaceId, id, options);
    },

    async listCompletions(workspaceId, ruleId) {
      try {
        const rows = database.$client.getAllSync<TaskRecurrenceCompletionRow>(
          `SELECT
             id,
             rule_id AS ruleId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             completed_at AS completedAt,
             created_at AS createdAt,
             updated_at AS updatedAt,
             deleted_at AS deletedAt
           FROM task_recurrence_completions
           WHERE workspace_id = ? AND rule_id = ? AND deleted_at IS NULL
           ORDER BY occurrence_local_date ASC, created_at ASC`,
          workspaceId,
          ruleId,
        );
        const completions: TaskRecurrenceCompletion[] = [];

        for (const row of rows) {
          const parsed = parseTaskRecurrenceCompletionRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          completions.push(parsed.value);
        }

        return ok(completions);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence completions could not be loaded.', 'retry', cause));
      }
    },

    async listExceptions(workspaceId, ruleId) {
      try {
        const rows = database.$client.getAllSync<TaskRecurrenceExceptionRow>(
          `SELECT
             id,
             rule_id AS ruleId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM task_recurrence_exceptions
           WHERE workspace_id = ? AND rule_id = ?
           ORDER BY occurrence_local_date ASC, created_at ASC`,
          workspaceId,
          ruleId,
        );
        const exceptions: TaskRecurrenceException[] = [];

        for (const row of rows) {
          const parsed = parseTaskRecurrenceExceptionRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          exceptions.push(parsed.value);
        }

        return ok(exceptions);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence exceptions could not be loaded.', 'retry', cause));
      }
    },

    async listRules(workspaceId) {
      try {
        const rows = database.$client.getAllSync<TaskRecurrenceRuleRow>(
          `${selectRuleColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY starts_on_local_date ASC, created_at ASC, id ASC`,
          workspaceId,
        );
        const rules: TaskRecurrenceRule[] = [];

        for (const row of rows) {
          const parsed = await parseRuleWithTopics(database, workspaceId, row);

          if (!parsed.ok) {
            return parsed;
          }

          rules.push(parsed.value);
        }

        return ok(rules);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence rules could not be loaded.', 'retry', cause));
      }
    },

    async markCompletion(input) {
      const parsed = parseTaskRecurrenceCompletionRow({
        completedAt: input.completedAt,
        createdAt: input.createdAt,
        deletedAt: input.deletedAt ?? null,
        id: input.id,
        occurrenceLocalDate: input.occurrenceLocalDate,
        ruleId: input.ruleId,
        updatedAt: input.updatedAt,
        workspaceId: input.workspaceId,
      });

      if (!parsed.ok) {
        return parsed;
      }

      try {
        const existing = await loadCompletionByDate(
          database,
          parsed.value.workspaceId,
          parsed.value.ruleId,
          parsed.value.occurrenceLocalDate,
          { includeDeleted: true },
        );

        if (!existing.ok) {
          return existing;
        }

        if (existing.value) {
          database.$client.runSync(
            `UPDATE task_recurrence_completions
             SET completed_at = ?, updated_at = ?, deleted_at = NULL
             WHERE workspace_id = ? AND rule_id = ? AND occurrence_local_date = ?`,
            parsed.value.completedAt,
            parsed.value.updatedAt,
            parsed.value.workspaceId,
            parsed.value.ruleId,
            parsed.value.occurrenceLocalDate,
          );

          return loadCompletionByDate(database, parsed.value.workspaceId, parsed.value.ruleId, parsed.value.occurrenceLocalDate) as Promise<AppResult<TaskRecurrenceCompletion>>;
        }

        database.$client.runSync(
          `INSERT INTO task_recurrence_completions
            (id, rule_id, workspace_id, occurrence_local_date, completed_at, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.ruleId,
          parsed.value.workspaceId,
          parsed.value.occurrenceLocalDate,
          parsed.value.completedAt,
          parsed.value.createdAt,
          parsed.value.updatedAt,
          parsed.value.deletedAt,
        );

        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence completion could not be saved.', 'retry', cause));
      }
    },

    async pauseRule(workspaceId, id, pausedAt, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'paused_at = ?, updated_at = ?', [pausedAt, updatedAt]);
    },

    async resumeRule(workspaceId, id, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'paused_at = NULL, updated_at = ?', [updatedAt]);
    },

    async stopRule(workspaceId, id, stoppedAt, stoppedOnLocalDate, updatedAt) {
      return updateRuleStatus(
        database,
        workspaceId,
        id,
        'stopped_at = ?, stopped_on_local_date = ?, updated_at = ?',
        [stoppedAt, stoppedOnLocalDate, updatedAt],
      );
    },

    async undoCompletion(workspaceId, ruleId, occurrenceLocalDate, deletedAt, updatedAt) {
      try {
        database.$client.runSync(
          `UPDATE task_recurrence_completions
           SET deleted_at = ?, updated_at = ?
           WHERE workspace_id = ? AND rule_id = ? AND occurrence_local_date = ? AND deleted_at IS NULL`,
          deletedAt,
          updatedAt,
          workspaceId,
          ruleId,
          occurrenceLocalDate,
        );

        const completion = await loadCompletionByDate(database, workspaceId, ruleId, occurrenceLocalDate, {
          includeDeleted: true,
        });

        if (!completion.ok) {
          return completion;
        }

        if (!completion.value) {
          return err(createAppError('not_found', 'Completed occurrence was not found.', 'edit'));
        }

        return ok(completion.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence completion could not be updated.', 'retry', cause));
      }
    },

    async updateRule(input) {
      const existing = await loadRule(database, input.workspaceId as WorkspaceId, input.id as EntityId);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Recurring task or habit was not found.', 'edit'));
      }

      const parsed = parseRuleInput({
        ...input,
        createdAt: existing.value.createdAt,
        deletedAt: existing.value.deletedAt,
      });

      if (!parsed.ok) {
        return parsed;
      }

      const rule = parsed.value;

      try {
        runAtomic(database.$client as TaskRecurrenceSqlClient, () => {
          database.$client.runSync(
            `UPDATE task_recurrence_rules
             SET kind = ?,
                 title = ?,
                 notes = ?,
                 priority = ?,
                 frequency = ?,
                 starts_on_local_date = ?,
                 ends_on_local_date = ?,
                 category_id = ?,
                 source = ?,
                 source_of_truth = ?,
                 user_corrected_at = ?,
                 paused_at = ?,
                 stopped_at = ?,
                 stopped_on_local_date = ?,
                 updated_at = ?
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            rule.kind,
            rule.title,
            rule.notes,
            rule.priority,
            rule.frequency,
            rule.startsOnLocalDate,
            rule.endsOnLocalDate,
            rule.categoryId,
            rule.source,
            rule.sourceOfTruth,
            rule.userCorrectedAt,
            rule.pausedAt,
            rule.stoppedAt,
            rule.stoppedOnLocalDate,
            rule.updatedAt,
            rule.workspaceId,
            rule.id,
          );
          database.$client.runSync(
            `DELETE FROM task_recurrence_topics
             WHERE workspace_id = ? AND rule_id = ?`,
            rule.workspaceId,
            rule.id,
          );
          insertRuleTopics(database, rule, rule.updatedAt);
        });

        return ok(rule);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local task recurrence rule could not be updated.', 'retry', cause));
      }
    },
  };
}
