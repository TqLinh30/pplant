import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseReceiptParseJobRow,
  serializeNormalizedReceiptParseResult,
} from '@/domain/receipts/schemas';
import type {
  NormalizedReceiptParseResult,
  ReceiptParseJob,
  ReceiptParseJobRow,
  ReceiptParseJobStatus,
} from '@/domain/receipts/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type CreateReceiptParseJobInput = {
  id: EntityId;
  receiptDraftId: EntityId;
  requestedAt: string;
  workspaceId: WorkspaceId;
};

export type MarkReceiptParseJobRunningInput = {
  attemptCount: number;
  retryWindowStartedAt: string;
  startedAt: string;
};

export type MarkReceiptParseJobParsedInput = {
  completedAt: string;
  normalizedResult: NormalizedReceiptParseResult;
  status: Extract<ReceiptParseJobStatus, 'parsed' | 'low_confidence'>;
};

export type MarkReceiptParseJobFailedInput = {
  completedAt: string;
  lastErrorCategory: string;
  status: Extract<ReceiptParseJobStatus, 'failed' | 'retry_exhausted'>;
};

export type MarkReceiptParseJobSavedInput = {
  savedAt: string;
  status: Extract<ReceiptParseJobStatus, 'reviewed' | 'saved'>;
};

export type ReceiptParseJobRepository = {
  createPendingJob(input: CreateReceiptParseJobInput): Promise<AppResult<ReceiptParseJob>>;
  getJobById(workspaceId: WorkspaceId, id: EntityId): Promise<AppResult<ReceiptParseJob | null>>;
  getLatestJobForDraft(
    workspaceId: WorkspaceId,
    receiptDraftId: EntityId,
  ): Promise<AppResult<ReceiptParseJob | null>>;
  listPendingOrRetryableJobs(workspaceId: WorkspaceId): Promise<AppResult<ReceiptParseJob[]>>;
  markFailed(
    workspaceId: WorkspaceId,
    id: EntityId,
    input: MarkReceiptParseJobFailedInput,
  ): Promise<AppResult<ReceiptParseJob>>;
  markDeleted(workspaceId: WorkspaceId, id: EntityId, deletedAt: string): Promise<AppResult<ReceiptParseJob>>;
  markParsed(
    workspaceId: WorkspaceId,
    id: EntityId,
    input: MarkReceiptParseJobParsedInput,
  ): Promise<AppResult<ReceiptParseJob>>;
  markRunning(
    workspaceId: WorkspaceId,
    id: EntityId,
    input: MarkReceiptParseJobRunningInput,
  ): Promise<AppResult<ReceiptParseJob>>;
  markSaved(
    workspaceId: WorkspaceId,
    id: EntityId,
    input: MarkReceiptParseJobSavedInput,
  ): Promise<AppResult<ReceiptParseJob>>;
};

function selectReceiptParseJobColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  receipt_draft_id AS receiptDraftId,
  status,
  attempt_count AS attemptCount,
  retry_window_started_at AS retryWindowStartedAt,
  requested_at AS requestedAt,
  started_at AS startedAt,
  completed_at AS completedAt,
  last_error_category AS lastErrorCategory,
  result_json AS resultJson,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
FROM receipt_parse_jobs
`;
}

async function parseRows(rows: ReceiptParseJobRow[]): Promise<AppResult<ReceiptParseJob[]>> {
  const jobs: ReceiptParseJob[] = [];

  for (const row of rows) {
    const parsed = parseReceiptParseJobRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    jobs.push(parsed.value);
  }

  return ok(jobs);
}

async function requireJob(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
): Promise<AppResult<ReceiptParseJob>> {
  const job = await getJob(database, workspaceId, id);

  if (!job.ok) {
    return job;
  }

  if (!job.value) {
    return err(createAppError('not_found', 'Receipt parse job was not found.', 'retry'));
  }

  return ok(job.value);
}

async function getJob(
  database: PplantDatabase,
  workspaceId: WorkspaceId,
  id: EntityId,
): Promise<AppResult<ReceiptParseJob | null>> {
  try {
    const row = database.$client.getFirstSync<ReceiptParseJobRow>(
      `${selectReceiptParseJobColumnsSql()}
       WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL
       LIMIT 1`,
      workspaceId,
      id,
    );

    if (!row) {
      return ok(null);
    }

    return parseReceiptParseJobRow(row);
  } catch (cause) {
    return err(createAppError('unavailable', 'Local receipt parse job could not be loaded.', 'retry', cause));
  }
}

export function createReceiptParseJobRepository(database: PplantDatabase): ReceiptParseJobRepository {
  return {
    async createPendingJob(input) {
      try {
        database.$client.runSync(
          `INSERT INTO receipt_parse_jobs
            (id, workspace_id, receipt_draft_id, status, attempt_count, retry_window_started_at,
             requested_at, started_at, completed_at, last_error_category, result_json, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, 'pending', 0, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, NULL)`,
          input.id,
          input.workspaceId,
          input.receiptDraftId,
          input.requestedAt,
          input.requestedAt,
          input.requestedAt,
        );

        return requireJob(database, input.workspaceId, input.id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be created.', 'retry', cause));
      }
    },

    async getJobById(workspaceId, id) {
      return getJob(database, workspaceId, id);
    },

    async getLatestJobForDraft(workspaceId, receiptDraftId) {
      try {
        const row = database.$client.getFirstSync<ReceiptParseJobRow>(
          `${selectReceiptParseJobColumnsSql()}
           WHERE workspace_id = ? AND receipt_draft_id = ? AND deleted_at IS NULL
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`,
          workspaceId,
          receiptDraftId,
        );

        if (!row) {
          return ok(null);
        }

        return parseReceiptParseJobRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be loaded.', 'retry', cause));
      }
    },

    async listPendingOrRetryableJobs(workspaceId) {
      try {
        const rows = database.$client.getAllSync<ReceiptParseJobRow>(
          `${selectReceiptParseJobColumnsSql()}
           WHERE workspace_id = ? AND deleted_at IS NULL AND status IN ('pending', 'running', 'failed', 'retry_exhausted')
           ORDER BY updated_at ASC, id ASC`,
          workspaceId,
        );

        return parseRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse jobs could not be listed.', 'retry', cause));
      }
    },

    async markFailed(workspaceId, id, input) {
      try {
        database.$client.runSync(
          `UPDATE receipt_parse_jobs
           SET status = ?,
               completed_at = ?,
               last_error_category = ?,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          input.status,
          input.completedAt,
          input.lastErrorCategory,
          input.completedAt,
          workspaceId,
          id,
        );

        return requireJob(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be marked failed.', 'retry', cause));
      }
    },

    async markDeleted(workspaceId, id, deletedAt) {
      try {
        database.$client.runSync(
          `UPDATE receipt_parse_jobs
           SET deleted_at = ?,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          deletedAt,
          deletedAt,
          workspaceId,
          id,
        );

        const row = database.$client.getFirstSync<ReceiptParseJobRow>(
          `${selectReceiptParseJobColumnsSql()}
           WHERE workspace_id = ? AND id = ?
           LIMIT 1`,
          workspaceId,
          id,
        );

        if (!row) {
          return err(createAppError('not_found', 'Receipt parse job was not found.', 'retry'));
        }

        return parseReceiptParseJobRow(row);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be deleted.', 'retry', cause));
      }
    },

    async markParsed(workspaceId, id, input) {
      const resultJson = serializeNormalizedReceiptParseResult(input.normalizedResult);

      if (!resultJson.ok) {
        return resultJson;
      }

      try {
        database.$client.runSync(
          `UPDATE receipt_parse_jobs
           SET status = ?,
               completed_at = ?,
               result_json = ?,
               last_error_category = NULL,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          input.status,
          input.completedAt,
          resultJson.value,
          input.completedAt,
          workspaceId,
          id,
        );

        return requireJob(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be marked parsed.', 'retry', cause));
      }
    },

    async markRunning(workspaceId, id, input) {
      try {
        database.$client.runSync(
          `UPDATE receipt_parse_jobs
           SET status = 'running',
               attempt_count = ?,
               retry_window_started_at = ?,
               started_at = ?,
               completed_at = NULL,
               last_error_category = NULL,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          input.attemptCount,
          input.retryWindowStartedAt,
          input.startedAt,
          input.startedAt,
          workspaceId,
          id,
        );

        return requireJob(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be started.', 'retry', cause));
      }
    },

    async markSaved(workspaceId, id, input) {
      try {
        database.$client.runSync(
          `UPDATE receipt_parse_jobs
           SET status = ?,
               completed_at = COALESCE(completed_at, ?),
               last_error_category = NULL,
               updated_at = ?
           WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
          input.status,
          input.savedAt,
          input.savedAt,
          workspaceId,
          id,
        );

        return requireJob(database, workspaceId, id);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local receipt parse job could not be marked saved.', 'retry', cause));
      }
    },
  };
}
