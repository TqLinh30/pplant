import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { parseWorkEntryRow, type WorkEntryRow } from '@/domain/work/schemas';
import type { SaveWorkEntryInput, WorkEntry, WorkHistoryPage, WorkHistoryQuery, WorkHistorySort } from '@/domain/work/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type WorkEntryRepository = {
  createEntry(input: SaveWorkEntryInput): Promise<AppResult<WorkEntry>>;
  deleteEntry(workspaceId: WorkspaceId, id: EntityId, options: { now: Date }): Promise<AppResult<WorkEntry>>;
  getEntry(workspaceId: WorkspaceId, id: EntityId, options?: { includeDeleted?: boolean }): Promise<AppResult<WorkEntry | null>>;
  listHistoryEntries(workspaceId: WorkspaceId, query: WorkHistoryQuery): Promise<AppResult<WorkHistoryPage>>;
  listRecentEntries(workspaceId: WorkspaceId, options?: { limit?: number }): Promise<AppResult<WorkEntry[]>>;
  updateEntry(input: SaveWorkEntryInput): Promise<AppResult<WorkEntry>>;
};

type WorkEntrySqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectWorkEntryColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  entry_mode AS entryMode,
  local_date AS localDate,
  duration_minutes AS durationMinutes,
  started_at_local_date AS startedAtLocalDate,
  started_at_local_time AS startedAtLocalTime,
  ended_at_local_date AS endedAtLocalDate,
  ended_at_local_time AS endedAtLocalTime,
  break_minutes AS breakMinutes,
  paid,
  wage_minor_per_hour AS wageMinorPerHour,
  wage_currency_code AS wageCurrencyCode,
  wage_source AS wageSource,
  earned_income_minor AS earnedIncomeMinor,
  category_id AS categoryId,
  note,
  source,
  source_of_truth AS sourceOfTruth,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM work_entries
`;
}

function runAtomic(client: WorkEntrySqlClient, task: () => void): void {
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

async function getTopicIdsForEntry(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  workEntryId: EntityId,
): Promise<AppResult<string[]>> {
  try {
    const rows = database.$client.getAllSync<{ topicId: string }>(
      `SELECT topic_id AS topicId
       FROM work_entry_topics
       WHERE workspace_id = ? AND work_entry_id = ?
       ORDER BY created_at ASC, topic_id ASC`,
      workspaceId,
      workEntryId,
    );

    return ok(rows.map((row) => row.topicId));
  } catch (cause) {
    return err(createAppError('unavailable', 'Local work entry topics could not be loaded.', 'retry', cause));
  }
}

async function parseEntryWithTopics(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  row: WorkEntryRow,
): Promise<AppResult<WorkEntry>> {
  const topicIds = await getTopicIdsForEntry(database, workspaceId, row.id as EntityId);

  if (!topicIds.ok) {
    return topicIds;
  }

  return parseWorkEntryRow(
    {
      ...row,
      paid: Boolean(row.paid),
    },
    topicIds.value,
  );
}

async function loadEntry(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<AppResult<WorkEntry | null>> {
  try {
    const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<WorkEntryRow>(
      `${selectWorkEntryColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseEntryWithTopics(database, workspaceId, row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local work entry could not be loaded.', 'retry', cause));
  }
}

function orderBySql(sort: WorkHistorySort): string {
  switch (sort) {
    case 'date_asc':
      return 'local_date ASC, created_at ASC, id ASC';
    case 'duration_asc':
      return 'duration_minutes ASC, local_date DESC, created_at DESC, id DESC';
    case 'duration_desc':
      return 'duration_minutes DESC, local_date DESC, created_at DESC, id DESC';
    case 'earned_asc':
      return 'earned_income_minor ASC, local_date DESC, created_at DESC, id DESC';
    case 'earned_desc':
      return 'earned_income_minor DESC, local_date DESC, created_at DESC, id DESC';
    case 'date_desc':
    default:
      return 'local_date DESC, created_at DESC, id DESC';
  }
}

function buildHistoryWhereClause(workspaceId: WorkspaceId, query: WorkHistoryQuery) {
  const clauses = ['workspace_id = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [workspaceId];

  if (query.entryMode) {
    clauses.push('entry_mode = ?');
    params.push(query.entryMode);
  }

  if (query.paid) {
    clauses.push('paid = ?');
    params.push(query.paid === 'paid' ? 1 : 0);
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
      FROM work_entry_topics AS history_topics
      WHERE history_topics.workspace_id = work_entries.workspace_id
        AND history_topics.work_entry_id = work_entries.id
        AND history_topics.topic_id = ?
    )`);
    params.push(query.topicId);
  }

  if (query.noteSearch) {
    clauses.push("LOWER(COALESCE(note, '')) LIKE ?");
    params.push(`%${query.noteSearch.toLowerCase()}%`);
  }

  return {
    params,
    sql: clauses.join(' AND '),
  };
}

function parseInput(input: SaveWorkEntryInput): AppResult<WorkEntry> {
  return parseWorkEntryRow(
    {
      breakMinutes: input.breakMinutes,
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      deletedAt: input.deletedAt ?? null,
      durationMinutes: input.durationMinutes,
      earnedIncomeMinor: input.earnedIncomeMinor,
      endedAtLocalDate: input.endedAtLocalDate ?? null,
      endedAtLocalTime: input.endedAtLocalTime ?? null,
      entryMode: input.entryMode,
      id: input.id,
      localDate: input.localDate,
      note: input.note ?? null,
      paid: input.paid,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      startedAtLocalDate: input.startedAtLocalDate ?? null,
      startedAtLocalTime: input.startedAtLocalTime ?? null,
      updatedAt: input.updatedAt,
      wageCurrencyCode: input.wageCurrencyCode,
      wageMinorPerHour: input.wageMinorPerHour,
      wageSource: input.wageSource,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
}

function insertEntry(database: PplantDatabase, entry: WorkEntry): void {
  database.$client.runSync(
    `INSERT INTO work_entries
      (id, workspace_id, entry_mode, local_date, duration_minutes, started_at_local_date,
       started_at_local_time, ended_at_local_date, ended_at_local_time, break_minutes, paid,
       wage_minor_per_hour, wage_currency_code, wage_source, earned_income_minor, category_id,
       note, source, source_of_truth, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.workspaceId,
    entry.entryMode,
    entry.localDate,
    entry.durationMinutes,
    entry.startedAtLocalDate,
    entry.startedAtLocalTime,
    entry.endedAtLocalDate,
    entry.endedAtLocalTime,
    entry.breakMinutes,
    entry.paid ? 1 : 0,
    entry.wageMinorPerHour,
    entry.wageCurrencyCode,
    entry.wageSource,
    entry.earnedIncomeMinor,
    entry.categoryId,
    entry.note,
    entry.source,
    entry.sourceOfTruth,
    entry.createdAt,
    entry.updatedAt,
    entry.deletedAt,
  );
}

function insertEntryTopics(database: PplantDatabase, entry: WorkEntry, createdAt: string): void {
  for (const topicId of entry.topicIds) {
    database.$client.runSync(
      `INSERT INTO work_entry_topics
        (work_entry_id, topic_id, workspace_id, created_at)
       VALUES (?, ?, ?, ?)`,
      entry.id,
      topicId,
      entry.workspaceId,
      createdAt,
    );
  }
}

export function createWorkEntryRepository(database: PplantDatabase): WorkEntryRepository {
  return {
    async createEntry(input) {
      const parsed = parseInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      const entry = parsed.value;

      try {
        runAtomic(database.$client as WorkEntrySqlClient, () => {
          insertEntry(database, entry);
          insertEntryTopics(database, entry, entry.createdAt);
        });

        return ok(entry);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local work entry could not be saved.', 'retry', cause));
      }
    },

    async deleteEntry(workspaceId, id, { now }) {
      try {
        const timestamp = now.toISOString();
        database.$client.runSync(
          `UPDATE work_entries
           SET deleted_at = ?, updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          timestamp,
          timestamp,
          workspaceId,
          id,
        );

        const deleted = await loadEntry(database, workspaceId, id, { includeDeleted: true });

        if (!deleted.ok) {
          return deleted;
        }

        if (!deleted.value) {
          return err(createAppError('not_found', 'Work entry was not found.', 'edit'));
        }

        return ok(deleted.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local work entry could not be deleted.', 'retry', cause));
      }
    },

    async getEntry(workspaceId, id, options = {}) {
      return loadEntry(database, workspaceId, id, options);
    },

    async listHistoryEntries(workspaceId, query) {
      try {
        const where = buildHistoryWhereClause(workspaceId, query);
        const countRow = database.$client.getFirstSync<{ totalCount: number }>(
          `SELECT COUNT(*) AS totalCount
           FROM work_entries
           WHERE ${where.sql}`,
          ...(where.params as never[]),
        );
        const rows = database.$client.getAllSync<WorkEntryRow>(
          `${selectWorkEntryColumnsSql()}
           WHERE ${where.sql}
           ORDER BY ${orderBySql(query.sort)}
           LIMIT ? OFFSET ?`,
          ...(where.params as never[]),
          query.limit,
          query.offset,
        );
        const records: WorkEntry[] = [];

        for (const row of rows) {
          const parsed = await parseEntryWithTopics(database, workspaceId, row);

          if (!parsed.ok) {
            return parsed;
          }

          records.push(parsed.value);
        }

        const totalCount = countRow?.totalCount ?? 0;

        return ok({
          hasMore: query.offset + records.length < totalCount,
          limit: query.limit,
          offset: query.offset,
          records,
          totalCount,
        });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local work history could not be loaded.', 'retry', cause));
      }
    },

    async listRecentEntries(workspaceId, { limit = 10 } = {}) {
      try {
        const rows = database.$client.getAllSync<WorkEntryRow>(
          `${selectWorkEntryColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY local_date DESC, created_at DESC, id DESC
           LIMIT ?`,
          workspaceId,
          limit,
        );
        const entries: WorkEntry[] = [];

        for (const row of rows) {
          const parsed = await parseEntryWithTopics(database, workspaceId, row);

          if (!parsed.ok) {
            return parsed;
          }

          entries.push(parsed.value);
        }

        return ok(entries);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local work entries could not be loaded.', 'retry', cause));
      }
    },

    async updateEntry(input) {
      const existing = await loadEntry(database, input.workspaceId as WorkspaceId, input.id as EntityId);

      if (!existing.ok) {
        return existing;
      }

      if (!existing.value) {
        return err(createAppError('not_found', 'Work entry was not found.', 'edit'));
      }

      const parsed = parseInput({
        ...input,
        createdAt: existing.value.createdAt,
        deletedAt: null,
      });

      if (!parsed.ok) {
        return parsed;
      }

      const entry = parsed.value;

      try {
        runAtomic(database.$client as WorkEntrySqlClient, () => {
          database.$client.runSync(
            `UPDATE work_entries
             SET entry_mode = ?,
                 local_date = ?,
                 duration_minutes = ?,
                 started_at_local_date = ?,
                 started_at_local_time = ?,
                 ended_at_local_date = ?,
                 ended_at_local_time = ?,
                 break_minutes = ?,
                 paid = ?,
                 wage_minor_per_hour = ?,
                 wage_currency_code = ?,
                 wage_source = ?,
                 earned_income_minor = ?,
                 category_id = ?,
                 note = ?,
                 source = ?,
                 source_of_truth = ?,
                 updated_at = ?,
                 deleted_at = NULL
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            entry.entryMode,
            entry.localDate,
            entry.durationMinutes,
            entry.startedAtLocalDate,
            entry.startedAtLocalTime,
            entry.endedAtLocalDate,
            entry.endedAtLocalTime,
            entry.breakMinutes,
            entry.paid ? 1 : 0,
            entry.wageMinorPerHour,
            entry.wageCurrencyCode,
            entry.wageSource,
            entry.earnedIncomeMinor,
            entry.categoryId,
            entry.note,
            entry.source,
            entry.sourceOfTruth,
            entry.updatedAt,
            entry.workspaceId,
            entry.id,
          );

          database.$client.runSync(
            `DELETE FROM work_entry_topics
             WHERE workspace_id = ? AND work_entry_id = ?`,
            entry.workspaceId,
            entry.id,
          );
          insertEntryTopics(database, entry, entry.updatedAt);
        });

        return ok(entry);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local work entry could not be updated.', 'retry', cause));
      }
    },
  };
}
