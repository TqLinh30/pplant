import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { asCurrencyCode, type CurrencyCode } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';
import {
  asMoneyRecordKind,
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
  validateMoneyRecordAmountMinor,
} from '@/domain/money/schemas';

import type {
  RecurrenceException,
  RecurrenceFrequency,
  RecurrenceRule,
} from './types';

export const recurrenceRuleDraftSchema = z.object({
  endsOnLocalDate: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startsOnLocalDate: z.string(),
});

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const recurrenceRuleRowSchema = z.object({
  amountMinor: z.number().int().positive(),
  categoryId: z.string().nullable(),
  createdAt: isoTimestampSchema,
  currencyCode: z.string(),
  deletedAt: isoTimestampSchema.nullable(),
  endsOnLocalDate: z.string().nullable(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  id: z.string().min(1),
  lastGeneratedLocalDate: z.string().nullable(),
  merchantOrSource: z.string().nullable(),
  moneyKind: z.enum(['expense', 'income']),
  note: z.string().nullable(),
  ownerKind: z.literal('money'),
  pausedAt: isoTimestampSchema.nullable(),
  source: z.literal('recurring'),
  sourceOfTruth: z.literal('manual'),
  startsOnLocalDate: z.string(),
  stoppedAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export const recurrenceExceptionRowSchema = z.object({
  action: z.enum(['skip']),
  createdAt: isoTimestampSchema,
  id: z.string().min(1),
  moneyRecordId: z.string().nullable(),
  occurrenceLocalDate: z.string(),
  recurrenceRuleId: z.string().min(1),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type RecurrenceRuleRow = z.infer<typeof recurrenceRuleRowSchema>;
export type RecurrenceExceptionRow = z.infer<typeof recurrenceExceptionRowSchema>;

export function asRecurrenceFrequency(value: string): AppResult<RecurrenceFrequency> {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose daily, weekly, or monthly recurrence.', 'edit'));
}

function validateOptionalLocalDate(value: string | null | undefined): AppResult<LocalDate | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

export function parseRecurrenceRuleRow(row: unknown, topicIds: string[] = []): AppResult<RecurrenceRule> {
  const parsed = recurrenceRuleRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local recurrence rule data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const startsOnLocalDate = asLocalDate(parsed.data.startsOnLocalDate);
  const endsOnLocalDate = validateOptionalLocalDate(parsed.data.endsOnLocalDate);
  const lastGeneratedLocalDate = validateOptionalLocalDate(parsed.data.lastGeneratedLocalDate);
  const moneyKind = asMoneyRecordKind(parsed.data.moneyKind);
  const amountMinor = validateMoneyRecordAmountMinor(parsed.data.amountMinor);
  const currencyCode = asCurrencyCode(parsed.data.currencyCode);
  const categoryId = asOptionalMoneyRecordCategoryId(parsed.data.categoryId);
  const parsedTopicIds = asMoneyRecordTopicIds(topicIds);
  const merchantOrSource = asMoneyRecordMerchantOrSource(parsed.data.merchantOrSource);
  const note = asMoneyRecordNote(parsed.data.note);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (!lastGeneratedLocalDate.ok) {
    return lastGeneratedLocalDate;
  }

  if (endsOnLocalDate.value && endsOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'Recurrence end date must be on or after the start date.', 'edit'));
  }

  if (!moneyKind.ok) {
    return moneyKind;
  }

  if (!amountMinor.ok) {
    return amountMinor;
  }

  if (!currencyCode.ok) {
    return currencyCode;
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!parsedTopicIds.ok) {
    return parsedTopicIds;
  }

  if (!merchantOrSource.ok) {
    return merchantOrSource;
  }

  if (!note.ok) {
    return note;
  }

  return ok({
    amountMinor: amountMinor.value,
    categoryId: categoryId.value,
    createdAt: parsed.data.createdAt,
    currencyCode: currencyCode.value as CurrencyCode,
    deletedAt: parsed.data.deletedAt,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: parsed.data.frequency,
    id: id.value,
    lastGeneratedLocalDate: lastGeneratedLocalDate.value,
    merchantOrSource: merchantOrSource.value,
    moneyKind: moneyKind.value,
    note: note.value,
    ownerKind: parsed.data.ownerKind,
    pausedAt: parsed.data.pausedAt,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    startsOnLocalDate: startsOnLocalDate.value,
    stoppedAt: parsed.data.stoppedAt,
    topicIds: parsedTopicIds.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseRecurrenceExceptionRow(row: unknown): AppResult<RecurrenceException> {
  const parsed = recurrenceExceptionRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local recurrence exception data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const recurrenceRuleId = asEntityId(parsed.data.recurrenceRuleId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const occurrenceLocalDate = asLocalDate(parsed.data.occurrenceLocalDate);
  const moneyRecordId = parsed.data.moneyRecordId ? asEntityId(parsed.data.moneyRecordId) : ok(null as EntityId | null);

  if (!id.ok) {
    return id;
  }

  if (!recurrenceRuleId.ok) {
    return recurrenceRuleId;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  if (!moneyRecordId.ok) {
    return moneyRecordId;
  }

  return ok({
    action: parsed.data.action,
    createdAt: parsed.data.createdAt,
    id: id.value,
    moneyRecordId: moneyRecordId.value,
    occurrenceLocalDate: occurrenceLocalDate.value,
    recurrenceRuleId: recurrenceRuleId.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
