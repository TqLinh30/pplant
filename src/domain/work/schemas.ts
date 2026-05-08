import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { asCurrencyCode, type CurrencyCode } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  LocalTime,
  WorkEntry,
  WorkEntryMode,
  WorkEntryNote,
  WorkEntryWageSource,
} from './types';

export const maxWorkEntryNoteLength = 240;
export const maxWorkEntryDurationMinutes = 24 * 60;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const workEntryRowSchema = z.object({
  breakMinutes: z.number().int().nonnegative(),
  categoryId: z.string().nullable(),
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  durationMinutes: z.number().int().positive(),
  earnedIncomeMinor: z.number().int().nonnegative(),
  endedAtLocalDate: z.string().nullable(),
  endedAtLocalTime: z.string().nullable(),
  entryMode: z.enum(['hours', 'shift']),
  id: z.string().min(1),
  localDate: z.string(),
  note: z.string().nullable(),
  paid: z.boolean(),
  source: z.literal('manual'),
  sourceOfTruth: z.literal('manual'),
  startedAtLocalDate: z.string().nullable(),
  startedAtLocalTime: z.string().nullable(),
  updatedAt: isoTimestampSchema,
  wageCurrencyCode: z.string(),
  wageMinorPerHour: z.number().int().nonnegative(),
  wageSource: z.enum(['default', 'override']),
  workspaceId: z.string().min(1),
});

export type WorkEntryRow = z.infer<typeof workEntryRowSchema>;

export function asWorkEntryMode(value: string): AppResult<WorkEntryMode> {
  if (value === 'hours' || value === 'shift') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose hours or shift.', 'edit'));
}

export function asWorkEntryWageSource(value: string): AppResult<WorkEntryWageSource> {
  if (value === 'default' || value === 'override') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose a valid wage source.', 'edit'));
}

export function asLocalTime(value: string): AppResult<LocalTime> {
  const normalized = value.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);

  if (!match) {
    return err(createAppError('validation_failed', 'Time must use HH:MM.', 'edit'));
  }

  return ok(normalized as LocalTime);
}

export function validateWorkEntryDurationMinutes(value: number): AppResult<number> {
  if (!Number.isInteger(value) || value <= 0 || value > maxWorkEntryDurationMinutes) {
    return err(createAppError('validation_failed', 'Work duration must be between 1 minute and 24 hours.', 'edit'));
  }

  return ok(value);
}

export function validateWorkEntryBreakMinutes(value: number): AppResult<number> {
  if (!Number.isInteger(value) || value < 0 || value >= maxWorkEntryDurationMinutes) {
    return err(createAppError('validation_failed', 'Break minutes must be between 0 and 1439.', 'edit'));
  }

  return ok(value);
}

export function validateWorkEntryWageMinor(value: number): AppResult<number> {
  if (!Number.isInteger(value) || value < 0) {
    return err(createAppError('validation_failed', 'Hourly wage cannot be negative.', 'edit'));
  }

  return ok(value);
}

export function asWorkEntryNote(value: string | null | undefined): AppResult<WorkEntryNote | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  if (normalized.length > maxWorkEntryNoteLength) {
    return err(
      createAppError('validation_failed', `Note must be ${maxWorkEntryNoteLength} characters or fewer.`, 'edit'),
    );
  }

  return ok(normalized as WorkEntryNote);
}

function validateOptionalLocalDate(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

function validateOptionalLocalTime(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalTime(normalized);
}

export function parseWorkEntryRow(row: unknown, topicIds: string[] = []): AppResult<WorkEntry> {
  const parsed = workEntryRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local work entry data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const localDate = asLocalDate(parsed.data.localDate);
  const startedAtLocalDate = validateOptionalLocalDate(parsed.data.startedAtLocalDate);
  const startedAtLocalTime = validateOptionalLocalTime(parsed.data.startedAtLocalTime);
  const endedAtLocalDate = validateOptionalLocalDate(parsed.data.endedAtLocalDate);
  const endedAtLocalTime = validateOptionalLocalTime(parsed.data.endedAtLocalTime);
  const durationMinutes = validateWorkEntryDurationMinutes(parsed.data.durationMinutes);
  const breakMinutes = validateWorkEntryBreakMinutes(parsed.data.breakMinutes);
  const wageMinorPerHour = validateWorkEntryWageMinor(parsed.data.wageMinorPerHour);
  const wageCurrencyCode = asCurrencyCode(parsed.data.wageCurrencyCode);
  const categoryId = asOptionalMoneyRecordCategoryId(parsed.data.categoryId);
  const parsedTopicIds = asMoneyRecordTopicIds(topicIds);
  const note = asWorkEntryNote(parsed.data.note);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!localDate.ok) {
    return localDate;
  }

  if (!startedAtLocalDate.ok) {
    return startedAtLocalDate;
  }

  if (!startedAtLocalTime.ok) {
    return startedAtLocalTime;
  }

  if (!endedAtLocalDate.ok) {
    return endedAtLocalDate;
  }

  if (!endedAtLocalTime.ok) {
    return endedAtLocalTime;
  }

  if (!durationMinutes.ok) {
    return durationMinutes;
  }

  if (!breakMinutes.ok) {
    return breakMinutes;
  }

  if (!wageMinorPerHour.ok) {
    return wageMinorPerHour;
  }

  if (!wageCurrencyCode.ok) {
    return wageCurrencyCode;
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!parsedTopicIds.ok) {
    return parsedTopicIds;
  }

  if (!note.ok) {
    return note;
  }

  if (parsed.data.entryMode === 'hours') {
    if (
      startedAtLocalDate.value ||
      startedAtLocalTime.value ||
      endedAtLocalDate.value ||
      endedAtLocalTime.value ||
      parsed.data.breakMinutes !== 0
    ) {
      return err(createAppError('validation_failed', 'Direct hour entries cannot include shift times.', 'edit'));
    }
  }

  if (parsed.data.entryMode === 'shift') {
    if (!startedAtLocalDate.value || !startedAtLocalTime.value || !endedAtLocalDate.value || !endedAtLocalTime.value) {
      return err(createAppError('validation_failed', 'Shift entries need start and end date/time values.', 'edit'));
    }

    if (breakMinutes.value >= durationMinutes.value) {
      return err(createAppError('validation_failed', 'Break must be shorter than the shift.', 'edit'));
    }
  }

  return ok({
    breakMinutes: breakMinutes.value,
    categoryId: categoryId.value,
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    durationMinutes: durationMinutes.value,
    earnedIncomeMinor: parsed.data.earnedIncomeMinor,
    endedAtLocalDate: endedAtLocalDate.value,
    endedAtLocalTime: endedAtLocalTime.value,
    entryMode: parsed.data.entryMode,
    id: id.value,
    localDate: localDate.value,
    note: note.value,
    paid: parsed.data.paid,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    startedAtLocalDate: startedAtLocalDate.value,
    startedAtLocalTime: startedAtLocalTime.value,
    topicIds: parsedTopicIds.value as EntityId[],
    updatedAt: parsed.data.updatedAt,
    wageCurrencyCode: wageCurrencyCode.value as CurrencyCode,
    wageMinorPerHour: wageMinorPerHour.value,
    wageSource: parsed.data.wageSource,
    workspaceId: workspaceId.value,
  });
}
