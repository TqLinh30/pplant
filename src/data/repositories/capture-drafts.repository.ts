import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseCaptureDraftRow,
  serializeCaptureDraftPayload,
} from '@/domain/capture-drafts/schemas';
import type {
  CaptureDraft,
  CaptureDraftKind,
  CaptureDraftRow,
  MarkCaptureDraftSavedInput,
  SaveActiveCaptureDraftInput,
} from '@/domain/capture-drafts/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type CaptureDraftRepository = {
  discardDraft(
    workspaceId: WorkspaceId,
    id: EntityId,
    timestamp: string,
  ): Promise<AppResult<CaptureDraft>>;
  getActiveDraftByKind(
    workspaceId: WorkspaceId,
    kind: CaptureDraftKind,
  ): Promise<AppResult<CaptureDraft | null>>;
  keepDraft(
    workspaceId: WorkspaceId,
    id: EntityId,
    timestamp: string,
  ): Promise<AppResult<CaptureDraft>>;
  listActiveDrafts(workspaceId: WorkspaceId): Promise<AppResult<CaptureDraft[]>>;
  markActiveDraftSavedByKind(
    workspaceId: WorkspaceId,
    kind: CaptureDraftKind,
    input: MarkCaptureDraftSavedInput,
  ): Promise<AppResult<CaptureDraft | null>>;
  markDraftSaved(
    workspaceId: WorkspaceId,
    id: EntityId,
    input: MarkCaptureDraftSavedInput,
  ): Promise<AppResult<CaptureDraft>>;
  upsertActiveDraft(input: SaveActiveCaptureDraftInput): Promise<AppResult<CaptureDraft>>;
};

type CaptureDraftSqlClient = PplantDatabase['$client'] & {
  withTransactionSync?: (task: () => void) => void;
};

function selectCaptureDraftColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  kind,
  status,
  payload_json AS payloadJson,
  created_at AS createdAt,
  updated_at AS updatedAt,
  last_saved_at AS lastSavedAt,
  saved_at AS savedAt,
  saved_record_kind AS savedRecordKind,
  saved_record_id AS savedRecordId,
  discarded_at AS discardedAt
FROM capture_drafts
`;
}

function runAtomic(client: CaptureDraftSqlClient, task: () => void): void {
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

async function parseRows(rows: CaptureDraftRow[]): Promise<AppResult<CaptureDraft[]>> {
  const drafts: CaptureDraft[] = [];

  for (const row of rows) {
    const parsed = parseCaptureDraftRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    drafts.push(parsed.value);
  }

  return ok(drafts);
}

async function loadDraft(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
  options: { activeOnly?: boolean } = {},
): Promise<AppResult<CaptureDraft | null>> {
  try {
    const activeClause = options.activeOnly ? "AND status = 'active'" : '';
    const row = database.$client.getFirstSync<CaptureDraftRow>(
      `${selectCaptureDraftColumnsSql()}
       WHERE workspace_id = ? AND id = ? ${activeClause}
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseCaptureDraftRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local capture draft could not be loaded.', 'retry', cause));
  }
}

async function requireDraft(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
): Promise<AppResult<CaptureDraft>> {
  const draft = await loadDraft(database, workspaceId, id);

  if (!draft.ok) {
    return draft;
  }

  if (!draft.value) {
    return err(createAppError('not_found', 'Capture draft was not found.', 'edit'));
  }

  return ok(draft.value);
}

export function createCaptureDraftRepository(database: PplantDatabase): CaptureDraftRepository {
  return {
    async discardDraft(workspaceId, id, timestamp) {
      try {
        database.$client.runSync(
          `UPDATE capture_drafts
           SET status = 'discarded',
               updated_at = ?,
               discarded_at = ?,
               saved_at = NULL,
               saved_record_kind = NULL,
               saved_record_id = NULL
           WHERE workspace_id = ? AND id = ? AND status = 'active'`,
          timestamp,
          timestamp,
          workspaceId,
          id,
        );

        return requireDraft(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture draft could not be discarded.', 'retry', cause));
      }
    },

    async getActiveDraftByKind(workspaceId, kind) {
      try {
        const row = database.$client.getFirstSync<CaptureDraftRow>(
          `${selectCaptureDraftColumnsSql()}
           WHERE workspace_id = ? AND kind = ? AND status = 'active'
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`,
          workspaceId,
          kind,
        );

        if (!row) {
          return ok(null);
        }

        return parseCaptureDraftRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture draft could not be loaded.', 'retry', cause));
      }
    },

    async keepDraft(workspaceId, id, timestamp) {
      try {
        database.$client.runSync(
          `UPDATE capture_drafts
           SET updated_at = ?
           WHERE workspace_id = ? AND id = ? AND status = 'active'`,
          timestamp,
          workspaceId,
          id,
        );

        return requireDraft(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture draft could not be kept.', 'retry', cause));
      }
    },

    async listActiveDrafts(workspaceId) {
      try {
        const rows = database.$client.getAllSync<CaptureDraftRow>(
          `${selectCaptureDraftColumnsSql()}
           WHERE workspace_id = ? AND status = 'active'
           ORDER BY updated_at DESC, id DESC`,
          workspaceId,
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture drafts could not be loaded.', 'retry', cause));
      }
    },

    async markActiveDraftSavedByKind(workspaceId, kind, input) {
      const active = await this.getActiveDraftByKind(workspaceId, kind);

      if (!active.ok) {
        return active;
      }

      if (!active.value) {
        return ok(null);
      }

      const saved = await this.markDraftSaved(workspaceId, active.value.id, input);

      if (!saved.ok) {
        return saved;
      }

      return ok(saved.value);
    },

    async markDraftSaved(workspaceId, id, input) {
      try {
        database.$client.runSync(
          `UPDATE capture_drafts
           SET status = 'saved',
               updated_at = ?,
               saved_at = ?,
               saved_record_kind = ?,
               saved_record_id = ?,
               discarded_at = NULL
           WHERE workspace_id = ? AND id = ? AND status = 'active'`,
          input.savedAt,
          input.savedAt,
          input.savedRecordKind,
          input.savedRecordId,
          workspaceId,
          id,
        );

        return requireDraft(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture draft could not be marked saved.', 'retry', cause));
      }
    },

    async upsertActiveDraft(input) {
      const payloadJson = serializeCaptureDraftPayload(input.payload);

      if (!payloadJson.ok) {
        return payloadJson;
      }

      const existing = await this.getActiveDraftByKind(input.workspaceId, input.kind);

      if (!existing.ok) {
        return existing;
      }

      try {
        runAtomic(database.$client as CaptureDraftSqlClient, () => {
          if (existing.value) {
            database.$client.runSync(
              `UPDATE capture_drafts
               SET payload_json = ?,
                   updated_at = ?,
                   last_saved_at = ?
               WHERE workspace_id = ? AND id = ? AND status = 'active'`,
              payloadJson.value,
              input.timestamp,
              input.timestamp,
              input.workspaceId,
              existing.value.id,
            );
            return;
          }

          database.$client.runSync(
            `INSERT INTO capture_drafts
              (id, workspace_id, kind, status, payload_json, created_at, updated_at, last_saved_at,
               saved_at, saved_record_kind, saved_record_id, discarded_at)
             VALUES (?, ?, ?, 'active', ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
            input.id,
            input.workspaceId,
            input.kind,
            payloadJson.value,
            input.timestamp,
            input.timestamp,
            input.timestamp,
          );
        });

        const draft = await this.getActiveDraftByKind(input.workspaceId, input.kind);

        if (!draft.ok) {
          return draft;
        }

        if (!draft.value) {
          return err(createAppError('unavailable', 'Local capture draft was not saved.', 'retry'));
        }

        return ok(draft.value);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local capture draft could not be saved.', 'retry', cause));
      }
    },
  };
}
