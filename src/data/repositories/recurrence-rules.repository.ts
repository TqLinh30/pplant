import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseRecurrenceExceptionRow,
  parseRecurrenceRuleRow,
  type RecurrenceExceptionRow,
  type RecurrenceRuleRow,
} from '@/domain/recurrence/schemas';
import type {
  RecurrenceException,
  RecurrenceRule,
  SaveRecurrenceExceptionInput,
  SaveRecurringMoneyRuleInput,
} from '@/domain/recurrence/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type RecurrenceRuleRepository = {
  createRule(input: SaveRecurringMoneyRuleInput): Promise<AppResult<RecurrenceRule>>;
  updateRule(input: SaveRecurringMoneyRuleInput): Promise<AppResult<RecurrenceRule>>;
  getRule(workspaceId: WorkspaceId, id: EntityId): Promise<AppResult<RecurrenceRule | null>>;
  listRules(workspaceId: WorkspaceId): Promise<AppResult<RecurrenceRule[]>>;
  pauseRule(
    workspaceId: WorkspaceId,
    id: EntityId,
    pausedAt: string,
    updatedAt: string,
  ): Promise<AppResult<RecurrenceRule>>;
  resumeRule(
    workspaceId: WorkspaceId,
    id: EntityId,
    updatedAt: string,
  ): Promise<AppResult<RecurrenceRule>>;
  stopRule(
    workspaceId: WorkspaceId,
    id: EntityId,
    stoppedAt: string,
    updatedAt: string,
  ): Promise<AppResult<RecurrenceRule>>;
  deleteRule(
    workspaceId: WorkspaceId,
    id: EntityId,
    deletedAt: string,
    updatedAt: string,
  ): Promise<AppResult<RecurrenceRule>>;
  createException(input: SaveRecurrenceExceptionInput): Promise<AppResult<RecurrenceException>>;
  listExceptions(workspaceId: WorkspaceId, ruleId: EntityId): Promise<AppResult<RecurrenceException[]>>;
  updateLastGeneratedLocalDate(
    workspaceId: WorkspaceId,
    id: EntityId,
    lastGeneratedLocalDate: string,
    updatedAt: string,
  ): Promise<AppResult<RecurrenceRule>>;
};

type RecurrenceRuleSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectRecurrenceRuleColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  owner_kind AS ownerKind,
  frequency,
  starts_on_local_date AS startsOnLocalDate,
  ends_on_local_date AS endsOnLocalDate,
  last_generated_local_date AS lastGeneratedLocalDate,
  paused_at AS pausedAt,
  stopped_at AS stoppedAt,
  deleted_at AS deletedAt,
  money_kind AS moneyKind,
  amount_minor AS amountMinor,
  currency_code AS currencyCode,
  category_id AS categoryId,
  merchant_or_source AS merchantOrSource,
  note,
  source,
  source_of_truth AS sourceOfTruth,
  created_at AS createdAt,
  updated_at AS updatedAt
FROM recurrence_rules
`;
}

function runAtomic(client: RecurrenceRuleSqlClient, task: () => void): void {
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
  recurrenceRuleId: EntityId,
): Promise<AppResult<string[]>> {
  try {
    const rows = database.$client.getAllSync<{ topicId: string }>(
      `SELECT topic_id AS topicId
       FROM recurrence_rule_topics
       WHERE workspace_id = ? AND recurrence_rule_id = ?
       ORDER BY created_at ASC, topic_id ASC`,
      workspaceId,
      recurrenceRuleId,
    );

    return ok(rows.map((row) => row.topicId));
  } catch (cause) {
    return err(createAppError('unavailable', 'Local recurrence topics could not be loaded.', 'retry', cause));
  }
}

async function parseRuleWithTopics(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  row: RecurrenceRuleRow,
): Promise<AppResult<RecurrenceRule>> {
  const topicIds = await getTopicIdsForRule(database, workspaceId, row.id as EntityId);

  if (!topicIds.ok) {
    return topicIds;
  }

  return parseRecurrenceRuleRow(row, topicIds.value);
}

async function loadRule(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<RecurrenceRule | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<RecurrenceRuleRow>(
      `${selectRecurrenceRuleColumnsSql()}
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
    return err(createAppError('unavailable', 'Local recurrence rule could not be loaded.', 'retry', cause));
  }
}

function parseInput(input: SaveRecurringMoneyRuleInput): AppResult<RecurrenceRule> {
  return parseRecurrenceRuleRow(
    {
      amountMinor: input.amountMinor,
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      currencyCode: input.currencyCode,
      deletedAt: input.deletedAt ?? null,
      endsOnLocalDate: input.endsOnLocalDate ?? null,
      frequency: input.frequency,
      id: input.id,
      lastGeneratedLocalDate: input.lastGeneratedLocalDate ?? null,
      merchantOrSource: input.merchantOrSource ?? null,
      moneyKind: input.moneyKind,
      note: input.note ?? null,
      ownerKind: 'money',
      pausedAt: input.pausedAt ?? null,
      source: 'recurring',
      sourceOfTruth: 'manual',
      startsOnLocalDate: input.startsOnLocalDate,
      stoppedAt: input.stoppedAt ?? null,
      updatedAt: input.updatedAt,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
}

function insertRule(database: PplantDatabase, rule: RecurrenceRule): void {
  database.$client.runSync(
    `INSERT INTO recurrence_rules
      (id, workspace_id, owner_kind, frequency, starts_on_local_date, ends_on_local_date,
       last_generated_local_date, paused_at, stopped_at, deleted_at, money_kind, amount_minor,
       currency_code, category_id, merchant_or_source, note, source, source_of_truth, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    rule.id,
    rule.workspaceId,
    rule.ownerKind,
    rule.frequency,
    rule.startsOnLocalDate,
    rule.endsOnLocalDate,
    rule.lastGeneratedLocalDate,
    rule.pausedAt,
    rule.stoppedAt,
    rule.deletedAt,
    rule.moneyKind,
    rule.amountMinor,
    rule.currencyCode,
    rule.categoryId,
    rule.merchantOrSource,
    rule.note,
    rule.source,
    rule.sourceOfTruth,
    rule.createdAt,
    rule.updatedAt,
  );
}

function insertRuleTopics(database: PplantDatabase, rule: RecurrenceRule, createdAt: string): void {
  for (const topicId of rule.topicIds) {
    database.$client.runSync(
      `INSERT INTO recurrence_rule_topics
        (recurrence_rule_id, topic_id, workspace_id, created_at)
       VALUES (?, ?, ?, ?)`,
      rule.id,
      topicId,
      rule.workspaceId,
      createdAt,
    );
  }
}

export function createRecurrenceRuleRepository(database: PplantDatabase): RecurrenceRuleRepository {
  return {
    async createRule(input) {
      const parsed = parseInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      const rule = parsed.value;

      try {
        runAtomic(database.$client as RecurrenceRuleSqlClient, () => {
          insertRule(database, rule);
          insertRuleTopics(database, rule, rule.createdAt);
        });

        return ok(rule);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recurrence rule could not be saved.', 'retry', cause));
      }
    },

    async updateRule(input) {
      const existing = await loadRule(database, input.workspaceId as WorkspaceId, input.id as EntityId);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Recurring money item was not found.', 'edit'));
      }

      const parsed = parseInput({
        ...input,
        createdAt: existing.value.createdAt,
        deletedAt: existing.value.deletedAt,
        lastGeneratedLocalDate: existing.value.lastGeneratedLocalDate,
        pausedAt: existing.value.pausedAt,
        stoppedAt: existing.value.stoppedAt,
      });

      if (!parsed.ok) {
        return parsed;
      }

      const rule = parsed.value;

      try {
        runAtomic(database.$client as RecurrenceRuleSqlClient, () => {
          database.$client.runSync(
            `UPDATE recurrence_rules
             SET frequency = ?,
                 starts_on_local_date = ?,
                 ends_on_local_date = ?,
                 money_kind = ?,
                 amount_minor = ?,
                 currency_code = ?,
                 category_id = ?,
                 merchant_or_source = ?,
                 note = ?,
                 source = ?,
                 source_of_truth = ?,
                 updated_at = ?
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            rule.frequency,
            rule.startsOnLocalDate,
            rule.endsOnLocalDate,
            rule.moneyKind,
            rule.amountMinor,
            rule.currencyCode,
            rule.categoryId,
            rule.merchantOrSource,
            rule.note,
            rule.source,
            rule.sourceOfTruth,
            rule.updatedAt,
            rule.workspaceId,
            rule.id,
          );

          database.$client.runSync(
            `DELETE FROM recurrence_rule_topics
             WHERE workspace_id = ? AND recurrence_rule_id = ?`,
            rule.workspaceId,
            rule.id,
          );
          insertRuleTopics(database, rule, rule.updatedAt);
        });

        return ok(rule);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recurrence rule could not be updated.', 'retry', cause));
      }
    },

    async getRule(workspaceId, id) {
      return loadRule(database, workspaceId, id);
    },

    async listRules(workspaceId) {
      try {
        const rows = database.$client.getAllSync<RecurrenceRuleRow>(
          `${selectRecurrenceRuleColumnsSql()}
           WHERE workspace_id = ? AND owner_kind = 'money' AND deleted_at IS NULL
           ORDER BY starts_on_local_date ASC, created_at ASC, id ASC`,
          workspaceId,
        );
        const rules: RecurrenceRule[] = [];

        for (const row of rows) {
          const parsed = await parseRuleWithTopics(database, workspaceId, row);

          if (!parsed.ok) {
            return parsed;
          }

          rules.push(parsed.value);
        }

        return ok(rules);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recurrence rules could not be loaded.', 'retry', cause));
      }
    },

    async pauseRule(workspaceId, id, pausedAt, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'paused_at = ?, updated_at = ?', [pausedAt, updatedAt]);
    },

    async resumeRule(workspaceId, id, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'paused_at = NULL, updated_at = ?', [updatedAt]);
    },

    async stopRule(workspaceId, id, stoppedAt, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'stopped_at = ?, updated_at = ?', [stoppedAt, updatedAt]);
    },

    async deleteRule(workspaceId, id, deletedAt, updatedAt) {
      return updateRuleStatus(database, workspaceId, id, 'deleted_at = ?, updated_at = ?', [deletedAt, updatedAt]);
    },

    async createException(input) {
      try {
        const existing = database.$client.getFirstSync<RecurrenceExceptionRow>(
          `SELECT
             id,
             recurrence_rule_id AS recurrenceRuleId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             money_record_id AS moneyRecordId,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM recurrence_exceptions
           WHERE workspace_id = ? AND recurrence_rule_id = ? AND occurrence_local_date = ?
           LIMIT 1`,
          input.workspaceId,
          input.recurrenceRuleId,
          input.occurrenceLocalDate,
        );

        if (existing) {
          return parseRecurrenceExceptionRow(existing);
        }

        const parsed = parseRecurrenceExceptionRow({
          action: input.action,
          createdAt: input.createdAt,
          id: input.id,
          moneyRecordId: input.moneyRecordId ?? null,
          occurrenceLocalDate: input.occurrenceLocalDate,
          recurrenceRuleId: input.recurrenceRuleId,
          updatedAt: input.updatedAt,
          workspaceId: input.workspaceId,
        });

        if (!parsed.ok) {
          return parsed;
        }

        database.$client.runSync(
          `INSERT INTO recurrence_exceptions
            (id, recurrence_rule_id, workspace_id, occurrence_local_date, action, money_record_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.recurrenceRuleId,
          parsed.value.workspaceId,
          parsed.value.occurrenceLocalDate,
          parsed.value.action,
          parsed.value.moneyRecordId,
          parsed.value.createdAt,
          parsed.value.updatedAt,
        );

        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recurrence exception could not be saved.', 'retry', cause));
      }
    },

    async listExceptions(workspaceId, ruleId) {
      try {
        const rows = database.$client.getAllSync<RecurrenceExceptionRow>(
          `SELECT
             id,
             recurrence_rule_id AS recurrenceRuleId,
             workspace_id AS workspaceId,
             occurrence_local_date AS occurrenceLocalDate,
             action,
             money_record_id AS moneyRecordId,
             created_at AS createdAt,
             updated_at AS updatedAt
           FROM recurrence_exceptions
           WHERE workspace_id = ? AND recurrence_rule_id = ?
           ORDER BY occurrence_local_date ASC, created_at ASC`,
          workspaceId,
          ruleId,
        );
        const exceptions: RecurrenceException[] = [];

        for (const row of rows) {
          const parsed = parseRecurrenceExceptionRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          exceptions.push(parsed.value);
        }

        return ok(exceptions);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recurrence exceptions could not be loaded.', 'retry', cause));
      }
    },

    async updateLastGeneratedLocalDate(workspaceId, id, lastGeneratedLocalDate, updatedAt) {
      return updateRuleStatus(
        database,
        workspaceId,
        id,
        'last_generated_local_date = ?, updated_at = ?',
        [lastGeneratedLocalDate, updatedAt],
      );
    },
  };
}

async function updateRuleStatus(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  assignmentSql: string,
  params: unknown[],
): Promise<AppResult<RecurrenceRule>> {
  try {
    database.$client.runSync(
      `UPDATE recurrence_rules
       SET ${assignmentSql}
       WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
      ...(params as never[]),
      workspaceId,
      id,
    );

    const updated = await loadRule(database, workspaceId, id, {
      includeDeleted: assignmentSql.includes('deleted_at'),
    });

    if (!updated.ok) {
      return updated;
    }

    if (!updated.value) {
      return err(createAppError('not_found', 'Recurring money item was not found.', 'edit'));
    }

    return ok(updated.value);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local recurrence rule could not be updated.', 'retry', cause));
  }
}
