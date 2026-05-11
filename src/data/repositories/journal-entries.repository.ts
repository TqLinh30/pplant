import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { parseJournalEntryRow } from '@/domain/journal/schemas';
import type {
  JournalEntry,
  JournalEntryRow,
  SaveJournalEntryInput,
} from '@/domain/journal/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type JournalMonthRange = {
  endDateExclusive: LocalDate;
  startDate: LocalDate;
};

export type JournalEntryRepository = {
  createEntry(input: SaveJournalEntryInput): Promise<AppResult<JournalEntry>>;
  deleteEntry(workspaceId: WorkspaceId, id: EntityId, options: { now: Date }): Promise<AppResult<JournalEntry>>;
  getEntry(workspaceId: WorkspaceId, id: EntityId, options?: { includeDeleted?: boolean }): Promise<AppResult<JournalEntry | null>>;
  listEntriesForDate(workspaceId: WorkspaceId, localDate: LocalDate): Promise<AppResult<JournalEntry[]>>;
  listEntriesForMonth(workspaceId: WorkspaceId, range: JournalMonthRange): Promise<AppResult<JournalEntry[]>>;
};

function selectJournalEntryColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  local_date AS localDate,
  local_time AS localTime,
  captured_at AS capturedAt,
  mood_id AS moodId,
  note,
  photo_uri AS photoUri,
  content_type AS contentType,
  original_file_name AS originalFileName,
  size_bytes AS sizeBytes,
  storage_scope AS storageScope,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM journal_entries
`;
}

async function parseRows(rows: JournalEntryRow[]): Promise<AppResult<JournalEntry[]>> {
  const entries: JournalEntry[] = [];

  for (const row of rows) {
    const parsed = parseJournalEntryRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    entries.push(parsed.value);
  }

  return ok(entries);
}

async function loadEntry(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  options: { includeDeleted?: boolean } = {},
): Promise<AppResult<JournalEntry | null>> {
  try {
    const deletedClause = options.includeDeleted ? '' : 'AND deleted_at IS NULL';
    const row = database.$client.getFirstSync<JournalEntryRow>(
      `${selectJournalEntryColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${deletedClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseJournalEntryRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local journal entry could not be loaded.', 'retry', cause));
  }
}

async function requireEntry(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  options: { includeDeleted?: boolean } = {},
): Promise<AppResult<JournalEntry>> {
  const entry = await loadEntry(database, workspaceId, id, options);

  if (!entry.ok) {
    return entry;
  }

  if (!entry.value) {
    return err(createAppError('not_found', 'Journal entry was not found.', 'edit'));
  }

  return ok(entry.value);
}

export function createJournalEntryRepository(database: PplantDatabase): JournalEntryRepository {
  return {
    async createEntry(input) {
      const parsed = parseJournalEntryRow({
        capturedAt: input.capturedAt,
        contentType: input.contentType ?? null,
        createdAt: input.createdAt,
        deletedAt: null,
        id: input.id,
        localDate: input.localDate,
        localTime: input.localTime,
        moodId: input.moodId,
        note: input.note?.trim() ? input.note.trim() : null,
        originalFileName: input.originalFileName ?? null,
        photoUri: input.photoUri,
        sizeBytes: input.sizeBytes ?? null,
        storageScope: input.storageScope,
        updatedAt: input.updatedAt,
        workspaceId: input.workspaceId,
      });

      if (!parsed.ok) {
        return parsed;
      }

      const entry = parsed.value;

      try {
        database.$client.runSync(
          `INSERT INTO journal_entries
            (id, workspace_id, local_date, local_time, captured_at, mood_id, note, photo_uri,
             content_type, original_file_name, size_bytes, storage_scope, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          entry.id,
          entry.workspaceId,
          entry.localDate,
          entry.localTime,
          entry.capturedAt,
          entry.moodId,
          entry.note,
          entry.photoUri,
          entry.contentType,
          entry.originalFileName,
          entry.sizeBytes,
          entry.storageScope,
          entry.createdAt,
          entry.updatedAt,
        );

        return requireEntry(database, entry.workspaceId, entry.id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local journal entry could not be saved.', 'retry', cause));
      }
    },

    async deleteEntry(workspaceId, id, options) {
      const deletedAt = options.now.toISOString();

      try {
        database.$client.runSync(
          `UPDATE journal_entries
           SET deleted_at = ?,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          deletedAt,
          deletedAt,
          workspaceId,
          id,
        );

        return requireEntry(database, workspaceId, id, { includeDeleted: true });
      } catch (cause) {
        return err(createAppError('unavailable', 'Local journal entry could not be removed.', 'retry', cause));
      }
    },

    async getEntry(workspaceId, id, options) {
      return loadEntry(database, workspaceId, id, options);
    },

    async listEntriesForDate(workspaceId, localDate) {
      try {
        const rows = database.$client.getAllSync<JournalEntryRow>(
          `${selectJournalEntryColumnsSql()}
           WHERE workspace_id = ? AND local_date = ? AND deleted_at IS NULL
           ORDER BY local_time DESC, captured_at DESC, created_at DESC, id DESC`,
          workspaceId,
          localDate,
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local journal entries could not be loaded.', 'retry', cause));
      }
    },

    async listEntriesForMonth(workspaceId, range) {
      try {
        const rows = database.$client.getAllSync<JournalEntryRow>(
          `${selectJournalEntryColumnsSql()}
           WHERE workspace_id = ?
             AND local_date >= ?
             AND local_date < ?
             AND deleted_at IS NULL
           ORDER BY local_date ASC, local_time ASC, captured_at ASC, id ASC`,
          workspaceId,
          range.startDate,
          range.endDateExclusive,
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local journal month could not be loaded.', 'retry', cause));
      }
    },
  };
}
