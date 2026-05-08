import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseMoneyRecordRow,
  type MoneyRecordRow,
} from '@/domain/money/schemas';
import type {
  MoneyHistoryPage,
  MoneyHistoryQuery,
  MoneyHistorySort,
  MoneyRecord,
  SaveManualMoneyRecordInput,
} from '@/domain/money/types';
import type { BudgetPeriod } from '@/domain/common/date-rules';
import type { WorkspaceId } from '@/domain/workspace/types';

export type MoneyRecordRepository = {
  createManualRecord(input: SaveManualMoneyRecordInput): Promise<AppResult<MoneyRecord>>;
  updateRecord(input: SaveManualMoneyRecordInput): Promise<AppResult<MoneyRecord>>;
  deleteRecord(
    workspaceId: WorkspaceId,
    id: EntityId,
    options: { now: Date },
  ): Promise<AppResult<MoneyRecord>>;
  getRecord(
    workspaceId: WorkspaceId,
    id: EntityId,
    options?: { includeDeleted?: boolean },
  ): Promise<AppResult<MoneyRecord | null>>;
  listRecentRecords(
    workspaceId: WorkspaceId,
    options?: { limit?: number },
  ): Promise<AppResult<MoneyRecord[]>>;
  listRecordsForPeriod(
    workspaceId: WorkspaceId,
    period: BudgetPeriod,
  ): Promise<AppResult<MoneyRecord[]>>;
  listHistoryRecords(
    workspaceId: WorkspaceId,
    query: MoneyHistoryQuery,
  ): Promise<AppResult<MoneyHistoryPage>>;
};

type MoneyRecordSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectMoneyRecordColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  kind,
  amount_minor AS amountMinor,
  currency_code AS currencyCode,
  local_date AS localDate,
  category_id AS categoryId,
  merchant_or_source AS merchantOrSource,
  note,
  source,
  source_of_truth AS sourceOfTruth,
  user_corrected_at AS userCorrectedAt,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM money_records
`;
}

function runAtomic(client: MoneyRecordSqlClient, task: () => void): void {
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

function parseRecord(row: MoneyRecordRow, topicIds: string[]): AppResult<MoneyRecord> {
  return parseMoneyRecordRow(row, topicIds);
}

function orderBySql(sort: MoneyHistorySort): string {
  switch (sort) {
    case 'amount_asc':
      return 'amount_minor ASC, local_date DESC, created_at DESC, id DESC';
    case 'amount_desc':
      return 'amount_minor DESC, local_date DESC, created_at DESC, id DESC';
    case 'date_asc':
      return 'local_date ASC, created_at ASC, id ASC';
    case 'date_desc':
    default:
      return 'local_date DESC, created_at DESC, id DESC';
  }
}

function buildHistoryWhereClause(workspaceId: WorkspaceId, query: MoneyHistoryQuery) {
  const clauses = ['workspace_id = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [workspaceId];

  if (query.kind) {
    clauses.push('kind = ?');
    params.push(query.kind);
  }

  if (query.dateFrom) {
    clauses.push('local_date >= ?');
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    clauses.push('local_date <= ?');
    params.push(query.dateTo);
  }

  if (query.categoryId) {
    clauses.push('category_id = ?');
    params.push(query.categoryId);
  }

  if (query.topicId) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM money_record_topics AS history_topics
      WHERE history_topics.workspace_id = money_records.workspace_id
        AND history_topics.money_record_id = money_records.id
        AND history_topics.topic_id = ?
    )`);
    params.push(query.topicId);
  }

  if (query.merchantOrSource) {
    clauses.push("LOWER(COALESCE(merchant_or_source, '')) LIKE ?");
    params.push(`%${query.merchantOrSource.toLowerCase()}%`);
  }

  if (query.amountMinorMin !== null && query.amountMinorMin !== undefined) {
    clauses.push('amount_minor >= ?');
    params.push(query.amountMinorMin);
  }

  if (query.amountMinorMax !== null && query.amountMinorMax !== undefined) {
    clauses.push('amount_minor <= ?');
    params.push(query.amountMinorMax);
  }

  return {
    params,
    sql: clauses.join(' AND '),
  };
}

async function getTopicIdsForRecord(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  moneyRecordId: EntityId,
): Promise<AppResult<string[]>> {
  try {
    const rows = database.$client.getAllSync<{ topicId: string }>(
      `SELECT topic_id AS topicId
       FROM money_record_topics
       WHERE workspace_id = ? AND money_record_id = ?
       ORDER BY created_at ASC, topic_id ASC`,
      workspaceId,
      moneyRecordId,
    );

    return ok(rows.map((row) => row.topicId));
  } catch (cause) {
    return err(createAppError('unavailable', 'Local money record topics could not be loaded.', 'retry', cause));
  }
}

async function loadRecord(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<MoneyRecord | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<MoneyRecordRow>(
      `${selectMoneyRecordColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    const topicIds = await getTopicIdsForRecord(database, workspaceId, id);

    if (!topicIds.ok) {
      return topicIds;
    }

    return parseRecord(row, topicIds.value);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local money record could not be loaded.', 'retry', cause));
  }
}

export function createMoneyRecordRepository(database: PplantDatabase): MoneyRecordRepository {
  return {
    async createManualRecord(input) {
      const parsed = parseMoneyRecordRow(
        {
          amountMinor: input.amountMinor,
          categoryId: input.categoryId ?? null,
          createdAt: input.createdAt,
          currencyCode: input.currencyCode,
          deletedAt: input.deletedAt ?? null,
          id: input.id,
          kind: input.kind,
          localDate: input.localDate,
          merchantOrSource: input.merchantOrSource ?? null,
          note: input.note ?? null,
          source: input.source,
          sourceOfTruth: input.sourceOfTruth,
          updatedAt: input.updatedAt,
          userCorrectedAt: input.userCorrectedAt ?? null,
          workspaceId: input.workspaceId,
        },
        input.topicIds,
      );

      if (!parsed.ok) {
        return parsed;
      }

      const record = parsed.value;

      try {
        runAtomic(database.$client as MoneyRecordSqlClient, () => {
          database.$client.runSync(
            `INSERT INTO money_records
              (id, workspace_id, kind, amount_minor, currency_code, local_date, category_id,
               merchant_or_source, note, source, source_of_truth, user_corrected_at, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            record.id,
            record.workspaceId,
            record.kind,
            record.amountMinor,
            record.currencyCode,
            record.localDate,
            record.categoryId,
            record.merchantOrSource,
            record.note,
            record.source,
            record.sourceOfTruth,
            record.userCorrectedAt,
            record.createdAt,
            record.updatedAt,
            record.deletedAt,
          );

          for (const topicId of record.topicIds) {
            database.$client.runSync(
              `INSERT INTO money_record_topics
                (money_record_id, topic_id, workspace_id, created_at)
               VALUES (?, ?, ?, ?)`,
              record.id,
              topicId,
              record.workspaceId,
              record.createdAt,
            );
          }
        });

        return ok(record);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money record could not be saved.', 'retry', cause));
      }
    },

    async updateRecord(input) {
      const existing = await loadRecord(database, input.workspaceId as WorkspaceId, input.id as EntityId);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Money record was not found.', 'edit'));
      }

      const parsed = parseMoneyRecordRow(
        {
          amountMinor: input.amountMinor,
          categoryId: input.categoryId ?? null,
          createdAt: existing.value.createdAt,
          currencyCode: input.currencyCode,
          deletedAt: null,
          id: input.id,
          kind: input.kind,
          localDate: input.localDate,
          merchantOrSource: input.merchantOrSource ?? null,
          note: input.note ?? null,
          source: existing.value.source,
          sourceOfTruth: 'manual',
          updatedAt: input.updatedAt,
          userCorrectedAt: input.userCorrectedAt ?? input.updatedAt,
          workspaceId: input.workspaceId,
        },
        input.topicIds,
      );

      if (!parsed.ok) {
        return parsed;
      }

      const record = parsed.value;

      try {
        runAtomic(database.$client as MoneyRecordSqlClient, () => {
          database.$client.runSync(
            `UPDATE money_records
             SET kind = ?,
                 amount_minor = ?,
                 currency_code = ?,
                 local_date = ?,
                 category_id = ?,
                 merchant_or_source = ?,
                 note = ?,
                 source = ?,
                 source_of_truth = ?,
                 user_corrected_at = ?,
                 updated_at = ?,
                 deleted_at = NULL
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            record.kind,
            record.amountMinor,
            record.currencyCode,
            record.localDate,
            record.categoryId,
            record.merchantOrSource,
            record.note,
            record.source,
            record.sourceOfTruth,
            record.userCorrectedAt,
            record.updatedAt,
            record.workspaceId,
            record.id,
          );

          database.$client.runSync(
            `DELETE FROM money_record_topics
             WHERE workspace_id = ? AND money_record_id = ?`,
            record.workspaceId,
            record.id,
          );

          for (const topicId of record.topicIds) {
            database.$client.runSync(
              `INSERT INTO money_record_topics
                (money_record_id, topic_id, workspace_id, created_at)
               VALUES (?, ?, ?, ?)`,
              record.id,
              topicId,
              record.workspaceId,
              record.updatedAt,
            );
          }
        });

        return ok(record);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money record could not be saved.', 'retry', cause));
      }
    },

    async deleteRecord(workspaceId, id, { now }) {
      const existing = await loadRecord(database, workspaceId, id);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Money record was not found.', 'edit'));
      }

      const timestamp = now.toISOString();

      try {
        database.$client.runSync(
          `UPDATE money_records
           SET deleted_at = ?,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          timestamp,
          timestamp,
          workspaceId,
          id,
        );

        return ok({
          ...existing.value,
          deletedAt: timestamp,
          updatedAt: timestamp,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money record could not be removed.', 'retry', cause));
      }
    },

    async getRecord(workspaceId, id, options) {
      return loadRecord(database, workspaceId, id, options);
    },

    async listRecentRecords(workspaceId, { limit = 20 } = {}) {
      try {
        const rows = database.$client.getAllSync<MoneyRecordRow>(
          `${selectMoneyRecordColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY local_date DESC, created_at DESC, id DESC
           LIMIT ?`,
          workspaceId,
          limit,
        );
        const records: MoneyRecord[] = [];

        for (const row of rows) {
          const recordId = row.id as EntityId;
          const topicIds = await getTopicIdsForRecord(database, workspaceId, recordId);

          if (!topicIds.ok) {
            return topicIds;
          }

          const parsed = parseRecord(row, topicIds.value);

          if (!parsed.ok) {
            return parsed;
          }

          records.push(parsed.value);
        }

        return ok(records);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money records could not be loaded.', 'retry', cause));
      }
    },

    async listRecordsForPeriod(workspaceId, period) {
      try {
        const rows = database.$client.getAllSync<MoneyRecordRow>(
          `${selectMoneyRecordColumnsSql()}
           WHERE workspace_id = ?
             AND deleted_at IS NULL
             AND local_date >= ?
             AND local_date < ?
           ORDER BY local_date ASC, created_at ASC, id ASC`,
          workspaceId,
          period.startDate,
          period.endDateExclusive,
        );
        const records: MoneyRecord[] = [];

        for (const row of rows) {
          const recordId = row.id as EntityId;
          const topicIds = await getTopicIdsForRecord(database, workspaceId, recordId);

          if (!topicIds.ok) {
            return topicIds;
          }

          const parsed = parseRecord(row, topicIds.value);

          if (!parsed.ok) {
            return parsed;
          }

          records.push(parsed.value);
        }

        return ok(records);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money records could not be loaded.', 'retry', cause));
      }
    },

    async listHistoryRecords(workspaceId, query) {
      try {
        const where = buildHistoryWhereClause(workspaceId, query);
        const countRow = database.$client.getFirstSync<{ totalCount: number }>(
          `SELECT COUNT(*) AS totalCount
           FROM money_records
           WHERE ${where.sql}`,
          ...(where.params as never[]),
        );
        const totalCount = countRow?.totalCount ?? 0;
        const rows = database.$client.getAllSync<MoneyRecordRow>(
          `${selectMoneyRecordColumnsSql()}
           WHERE ${where.sql}
           ORDER BY ${orderBySql(query.sort)}
           LIMIT ? OFFSET ?`,
          ...(where.params as never[]),
          query.limit,
          query.offset,
        );
        const records: MoneyRecord[] = [];

        for (const row of rows) {
          const recordId = row.id as EntityId;
          const topicIds = await getTopicIdsForRecord(database, workspaceId, recordId);

          if (!topicIds.ok) {
            return topicIds;
          }

          const parsed = parseRecord(row, topicIds.value);

          if (!parsed.ok) {
            return parsed;
          }

          records.push(parsed.value);
        }

        return ok({
          hasMore: query.offset + records.length < totalCount,
          limit: query.limit,
          offset: query.offset,
          records,
          totalCount,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local money history could not be loaded.', 'retry', cause));
      }
    },
  };
}
