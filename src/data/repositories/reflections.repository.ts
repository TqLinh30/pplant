import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseReflectionRow,
  parseSaveReflectionInput,
} from '@/domain/reflections/schemas';
import type {
  Reflection,
  ReflectionPeriod,
  ReflectionRow,
} from '@/domain/reflections/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type ReflectionRepository = {
  listRecentReflections(
    workspaceId: WorkspaceId,
    options?: { limit?: number },
  ): Promise<AppResult<Reflection[]>>;
  listReflectionsForPeriod(
    workspaceId: WorkspaceId,
    period: ReflectionPeriod,
  ): Promise<AppResult<Reflection[]>>;
  saveReflection(input: unknown): Promise<AppResult<Reflection>>;
};

const defaultRecentLimit = 20;
const maxRecentLimit = 50;

function selectReflectionColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  period_kind AS periodKind,
  period_start_date AS periodStartDate,
  period_end_date_exclusive AS periodEndDateExclusive,
  prompt_id AS promptId,
  prompt_text AS promptText,
  response_text AS responseText,
  state,
  source,
  source_of_truth AS sourceOfTruth,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM reflections
`;
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isInteger(value)) {
    return defaultRecentLimit;
  }

  return Math.min(Math.max(value ?? defaultRecentLimit, 1), maxRecentLimit);
}

function parseRows(rows: ReflectionRow[]): AppResult<Reflection[]> {
  const reflections: Reflection[] = [];

  for (const row of rows) {
    const parsed = parseReflectionRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    reflections.push(parsed.value);
  }

  return ok(reflections);
}

async function loadReflectionById(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: string,
): Promise<AppResult<Reflection>> {
  try {
    const row = database.$client.getFirstSync<ReflectionRow>(
      `${selectReflectionColumnsSql()}
       WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return err(createAppError('not_found', 'Reflection was not found.', 'edit'));
    }

    return parseReflectionRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local reflection could not be loaded.', 'retry', cause));
  }
}

export function createReflectionRepository(database: PplantDatabase): ReflectionRepository {
  return {
    async listRecentReflections(workspaceId, { limit } = {}) {
      try {
        const rows = database.$client.getAllSync<ReflectionRow>(
          `${selectReflectionColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL
           ORDER BY updated_at DESC, id DESC
           LIMIT ?`,
          workspaceId,
          normalizeLimit(limit),
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reflections could not be loaded.', 'retry', cause));
      }
    },

    async listReflectionsForPeriod(workspaceId, period) {
      try {
        const rows = database.$client.getAllSync<ReflectionRow>(
          `${selectReflectionColumnsSql()}
           WHERE workspace_id = ?
             AND period_kind = ?
             AND period_start_date = ?
             AND deleted_at IS NULL
           ORDER BY prompt_id ASC, updated_at ASC`,
          workspaceId,
          period.kind,
          period.startDate,
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reflections could not be loaded.', 'retry', cause));
      }
    },

    async saveReflection(input) {
      const parsed = parseSaveReflectionInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      try {
        const existing = database.$client.getFirstSync<ReflectionRow>(
          `${selectReflectionColumnsSql()}
           WHERE workspace_id = ?
             AND period_kind = ?
             AND period_start_date = ?
             AND prompt_id = ?
             AND deleted_at IS NULL
           LIMIT 1`,
          parsed.value.workspaceId,
          parsed.value.period.kind,
          parsed.value.period.startDate,
          parsed.value.promptId,
        );

        if (existing) {
          database.$client.runSync(
            `UPDATE reflections
             SET prompt_text = ?,
                 response_text = ?,
                 state = ?,
                 source = ?,
                 source_of_truth = ?,
                 updated_at = ?
             WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
            parsed.value.promptText,
            parsed.value.responseText,
            parsed.value.state,
            parsed.value.source,
            parsed.value.sourceOfTruth,
            parsed.value.timestamp,
            parsed.value.workspaceId,
            existing.id,
          );

          return loadReflectionById(database, parsed.value.workspaceId, existing.id);
        }

        database.$client.runSync(
          `INSERT INTO reflections
            (id, workspace_id, period_kind, period_start_date, period_end_date_exclusive,
             prompt_id, prompt_text, response_text, state, source, source_of_truth,
             created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.workspaceId,
          parsed.value.period.kind,
          parsed.value.period.startDate,
          parsed.value.period.endDateExclusive,
          parsed.value.promptId,
          parsed.value.promptText,
          parsed.value.responseText,
          parsed.value.state,
          parsed.value.source,
          parsed.value.sourceOfTruth,
          parsed.value.timestamp,
          parsed.value.timestamp,
          null,
        );

        return loadReflectionById(database, parsed.value.workspaceId, parsed.value.id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local reflection could not be saved.', 'retry', cause));
      }
    },
  };
}
