import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import {
  captureDraftKinds,
  captureDraftSavedRecordKinds,
  captureDraftStatuses,
  type CaptureDraft,
  type CaptureDraftKind,
  type CaptureDraftPayload,
  type CaptureDraftRow,
  type CaptureDraftSavedRecordKind,
  type CaptureDraftStatus,
} from './types';

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

const captureDraftKindSchema = z.enum(captureDraftKinds);
const captureDraftStatusSchema = z.enum(captureDraftStatuses);
const captureDraftSavedRecordKindSchema = z.enum(captureDraftSavedRecordKinds);

export const captureDraftPayloadSchema = z.record(z.string(), z.unknown());

export const captureDraftRowSchema = z.object({
  createdAt: isoTimestampSchema,
  discardedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  kind: captureDraftKindSchema,
  lastSavedAt: isoTimestampSchema,
  payloadJson: z.string().min(2),
  savedAt: isoTimestampSchema.nullable(),
  savedRecordId: z.string().min(1).nullable(),
  savedRecordKind: captureDraftSavedRecordKindSchema.nullable(),
  status: captureDraftStatusSchema,
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export function asCaptureDraftKind(value: string): AppResult<CaptureDraftKind> {
  const parsed = captureDraftKindSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Choose a valid draft kind.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

export function asCaptureDraftStatus(value: string): AppResult<CaptureDraftStatus> {
  const parsed = captureDraftStatusSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Choose a valid draft status.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

export function asCaptureDraftSavedRecordKind(value: string): AppResult<CaptureDraftSavedRecordKind> {
  const parsed = captureDraftSavedRecordKindSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Choose a valid saved record kind.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

export function parseCaptureDraftPayload(value: unknown): AppResult<CaptureDraftPayload> {
  const parsed = captureDraftPayloadSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Draft payload must be a JSON object.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

function parsePayloadJson(payloadJson: string): AppResult<CaptureDraftPayload> {
  try {
    return parseCaptureDraftPayload(JSON.parse(payloadJson));
  } catch (cause) {
    return err(createAppError('validation_failed', 'Draft payload could not be read.', 'retry', cause));
  }
}

function validateLifecycle(row: z.infer<typeof captureDraftRowSchema>): AppResult<{
  savedRecordId: EntityId | null;
}> {
  if (row.status === 'active') {
    if (row.savedAt || row.savedRecordKind || row.savedRecordId || row.discardedAt) {
      return err(createAppError('validation_failed', 'Active draft lifecycle data is inconsistent.', 'retry'));
    }

    return ok({ savedRecordId: null });
  }

  if (row.status === 'saved') {
    if (!row.savedAt || !row.savedRecordKind || !row.savedRecordId || row.discardedAt) {
      return err(createAppError('validation_failed', 'Saved draft linkage is incomplete.', 'retry'));
    }

    const savedRecordId = asEntityId(row.savedRecordId);

    if (!savedRecordId.ok) {
      return savedRecordId;
    }

    return ok({ savedRecordId: savedRecordId.value });
  }

  if (!row.discardedAt || row.savedAt || row.savedRecordKind || row.savedRecordId) {
    return err(createAppError('validation_failed', 'Discarded draft lifecycle data is inconsistent.', 'retry'));
  }

  return ok({ savedRecordId: null });
}

export function parseCaptureDraftRow(row: CaptureDraftRow): AppResult<CaptureDraft> {
  const parsed = captureDraftRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local capture draft data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const payload = parsePayloadJson(parsed.data.payloadJson);
  const lifecycle = validateLifecycle(parsed.data);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!payload.ok) {
    return payload;
  }

  if (!lifecycle.ok) {
    return lifecycle;
  }

  return ok({
    createdAt: parsed.data.createdAt,
    discardedAt: parsed.data.discardedAt,
    id: id.value,
    kind: parsed.data.kind,
    lastSavedAt: parsed.data.lastSavedAt,
    payload: payload.value,
    savedAt: parsed.data.savedAt,
    savedRecordId: lifecycle.value.savedRecordId,
    savedRecordKind: parsed.data.savedRecordKind,
    status: parsed.data.status,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function serializeCaptureDraftPayload(payload: CaptureDraftPayload): AppResult<string> {
  const parsed = parseCaptureDraftPayload(payload);

  if (!parsed.ok) {
    return parsed;
  }

  return ok(JSON.stringify(parsed.value));
}
