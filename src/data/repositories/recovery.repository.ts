import type { PplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  parseRecoveryEventRow,
  type RecoveryEventRow,
} from '@/domain/recovery/schemas';
import type {
  RecoveryAction,
  RecoveryEvent,
  RecoveryTargetKind,
  SaveRecoveryEventInput,
} from '@/domain/recovery/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type RecoveryRepository = {
  createEvent(input: SaveRecoveryEventInput): Promise<AppResult<RecoveryEvent>>;
  hasResolutionEvent(
    workspaceId: WorkspaceId,
    targetKind: RecoveryTargetKind,
    targetId: EntityId,
    occurrenceLocalDate?: string | null,
  ): Promise<AppResult<boolean>>;
  listEventsForTarget(
    workspaceId: WorkspaceId,
    targetKind: RecoveryTargetKind,
    targetId: EntityId,
    occurrenceLocalDate?: string | null,
  ): Promise<AppResult<RecoveryEvent[]>>;
  listEventsSince(workspaceId: WorkspaceId, occurredAt: string): Promise<AppResult<RecoveryEvent[]>>;
};

function selectRecoveryEventColumnsSql() {
  return `
SELECT
  id,
  workspace_id AS workspaceId,
  target_kind AS targetKind,
  target_id AS targetId,
  occurrence_local_date AS occurrenceLocalDate,
  action,
  occurred_at AS occurredAt,
  created_at AS createdAt
FROM recovery_events
`;
}

function parseRecoveryEventInput(input: SaveRecoveryEventInput): AppResult<RecoveryEvent> {
  return parseRecoveryEventRow({
    action: input.action,
    createdAt: input.createdAt,
    id: input.id,
    occurredAt: input.occurredAt,
    occurrenceLocalDate: input.occurrenceLocalDate ?? null,
    targetId: input.targetId,
    targetKind: input.targetKind,
    workspaceId: input.workspaceId,
  });
}

function parseRecoveryEventRows(rows: RecoveryEventRow[]): AppResult<RecoveryEvent[]> {
  const events: RecoveryEvent[] = [];

  for (const row of rows) {
    const parsed = parseRecoveryEventRow(row);

    if (!parsed.ok) {
      return parsed;
    }

    events.push(parsed.value);
  }

  return ok(events);
}

export function createRecoveryRepository(database: PplantDatabase): RecoveryRepository {
  return {
    async createEvent(input) {
      const parsed = parseRecoveryEventInput(input);

      if (!parsed.ok) {
        return parsed;
      }

      try {
        database.$client.runSync(
          `INSERT INTO recovery_events
            (id, workspace_id, target_kind, target_id, occurrence_local_date, action, occurred_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          parsed.value.id,
          parsed.value.workspaceId,
          parsed.value.targetKind,
          parsed.value.targetId,
          parsed.value.occurrenceLocalDate,
          parsed.value.action,
          parsed.value.occurredAt,
          parsed.value.createdAt,
        );

        return parsed;
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recovery event could not be saved.', 'retry', cause));
      }
    },

    async hasResolutionEvent(workspaceId, targetKind, targetId, occurrenceLocalDate = null) {
      const events = await this.listEventsForTarget(workspaceId, targetKind, targetId, occurrenceLocalDate);

      if (!events.ok) {
        return events;
      }

      return ok(events.value.length > 0);
    },

    async listEventsForTarget(workspaceId, targetKind, targetId, occurrenceLocalDate = null) {
      try {
        const rows = database.$client.getAllSync<RecoveryEventRow>(
          `${selectRecoveryEventColumnsSql()}
           WHERE workspace_id = ?
             AND target_kind = ?
             AND target_id = ?
             AND ((? IS NULL AND occurrence_local_date IS NULL) OR occurrence_local_date = ?)
           ORDER BY occurred_at DESC, created_at DESC`,
          workspaceId,
          targetKind,
          targetId,
          occurrenceLocalDate,
          occurrenceLocalDate,
        );

        return parseRecoveryEventRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recovery events could not be loaded.', 'retry', cause));
      }
    },

    async listEventsSince(workspaceId, occurredAt) {
      try {
        const rows = database.$client.getAllSync<RecoveryEventRow>(
          `${selectRecoveryEventColumnsSql()}
           WHERE workspace_id = ? AND occurred_at >= ?
           ORDER BY occurred_at DESC, created_at DESC`,
          workspaceId,
          occurredAt,
        );

        return parseRecoveryEventRows(rows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local recovery events could not be loaded.', 'retry', cause));
      }
    },
  };
}

export function isRecoveryResolutionAction(action: RecoveryAction): boolean {
  return (
    action === 'complete' ||
    action === 'dismiss' ||
    action === 'edit' ||
    action === 'pause' ||
    action === 'reschedule' ||
    action === 'snooze'
  );
}
