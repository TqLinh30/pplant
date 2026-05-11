import { z } from 'zod';

import { asLocalDate } from '@/domain/common/date-rules';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import {
  journalMoodIds,
  type JournalEntry,
  type JournalEntryRow,
  type JournalMoodId,
} from './types';

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

const localTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm local time.');
const journalMoodSchema = z.enum(journalMoodIds);

export function asJournalMoodId(value: string): AppResult<JournalMoodId> {
  const parsed = journalMoodSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Choose a valid mood.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

export const journalEntryRowSchema = z.object({
  capturedAt: isoTimestampSchema,
  contentType: z.string().min(1).nullable(),
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  localDate: z.string().min(10),
  localTime: localTimeSchema,
  moodId: journalMoodSchema,
  note: z.string().nullable(),
  originalFileName: z.string().min(1).nullable(),
  photoUri: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().nullable(),
  storageScope: z.literal('app_private_documents'),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export function parseJournalEntryRow(row: JournalEntryRow): AppResult<JournalEntry> {
  const parsed = journalEntryRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local journal entry data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const localDate = asLocalDate(parsed.data.localDate);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!localDate.ok) {
    return localDate;
  }

  return ok({
    capturedAt: parsed.data.capturedAt,
    contentType: parsed.data.contentType,
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    localDate: localDate.value,
    localTime: parsed.data.localTime,
    moodId: parsed.data.moodId,
    note: parsed.data.note,
    originalFileName: parsed.data.originalFileName,
    photoUri: parsed.data.photoUri,
    sizeBytes: parsed.data.sizeBytes,
    storageScope: parsed.data.storageScope,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
