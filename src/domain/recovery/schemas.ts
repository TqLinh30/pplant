import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  RecoveryAction,
  RecoveryEvent,
  RecoveryTargetKind,
} from './types';

export const recoveryTargetKindSchema = z.enum([
  'receipt_parse_job',
  'task',
  'task_recurrence_occurrence',
  'reminder_occurrence',
]);

export const recoveryActionSchema = z.enum([
  'complete',
  'discard',
  'snooze',
  'reschedule',
  'pause',
  'dismiss',
  'edit',
  'manual_entry',
  'retry',
]);

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const recoveryEventRowSchema = z.object({
  action: recoveryActionSchema,
  createdAt: isoTimestampSchema,
  id: z.string().min(1),
  occurredAt: isoTimestampSchema,
  occurrenceLocalDate: z.string().nullable(),
  targetId: z.string().min(1),
  targetKind: recoveryTargetKindSchema,
  workspaceId: z.string().min(1),
});

export type RecoveryEventRow = z.infer<typeof recoveryEventRowSchema>;

export function asRecoveryTargetKind(value: string): AppResult<RecoveryTargetKind> {
  const parsed = recoveryTargetKindSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Recovery target kind is invalid.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

export function asRecoveryAction(value: string): AppResult<RecoveryAction> {
  const parsed = recoveryActionSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Recovery action is invalid.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

function asOptionalOccurrenceLocalDate(value: string | null): AppResult<RecoveryEvent['occurrenceLocalDate']> {
  if (value === null) {
    return ok(null);
  }

  return asLocalDate(value);
}

export function parseRecoveryEventRow(row: unknown): AppResult<RecoveryEvent> {
  const parsed = recoveryEventRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local recovery event data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const targetId = asEntityId(parsed.data.targetId);
  const occurrenceLocalDate = asOptionalOccurrenceLocalDate(parsed.data.occurrenceLocalDate);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!targetId.ok) {
    return targetId;
  }

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  if (parsed.data.targetKind === 'task_recurrence_occurrence' && occurrenceLocalDate.value === null) {
    return err(createAppError('validation_failed', 'Recurring task recovery events need a local date.', 'edit'));
  }

  return ok({
    action: parsed.data.action,
    createdAt: parsed.data.createdAt,
    id: id.value,
    occurredAt: parsed.data.occurredAt,
    occurrenceLocalDate: occurrenceLocalDate.value,
    targetId: targetId.value,
    targetKind: parsed.data.targetKind,
    workspaceId: workspaceId.value,
  });
}
