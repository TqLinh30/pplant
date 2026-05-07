import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseMoneyRecordRow,
  type MoneyRecordRow,
} from '@/domain/money/schemas';
import type { MoneyRecord, SaveManualMoneyRecordInput } from '@/domain/money/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type MoneyRecordRepository = {
  createManualRecord(input: SaveManualMoneyRecordInput): Promise<AppResult<MoneyRecord>>;
  getRecord(workspaceId: WorkspaceId, id: EntityId): Promise<AppResult<MoneyRecord | null>>;
  listRecentRecords(
    workspaceId: WorkspaceId,
    options?: { limit?: number },
  ): Promise<AppResult<MoneyRecord[]>>;
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
               merchant_or_source, note, source, source_of_truth, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    async getRecord(workspaceId, id) {
      try {
        const row = database.$client.getFirstSync<MoneyRecordRow>(
          `${selectMoneyRecordColumnsSql()}
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL
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
  };
}
