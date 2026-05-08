import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import {
  receiptParseJobStatuses,
  type NormalizedReceiptParseResult,
  type ReceiptParseJob,
  type ReceiptParseJobRow,
} from './types';

export const parsedReceiptFieldSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low', 'unknown']),
  source: z.enum(['parsed', 'manual', 'estimated', 'user_corrected']),
  value: z.unknown().optional(),
});

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

const parsedStringFieldSchema = parsedReceiptFieldSchema.extend({
  value: z.string().optional(),
});

const parsedLocalDateFieldSchema = parsedReceiptFieldSchema.extend({
  value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const parsedNullableStringFieldSchema = parsedReceiptFieldSchema.extend({
  value: z.string().min(1).nullable().optional(),
});

const parsedNumberFieldSchema = parsedReceiptFieldSchema.extend({
  value: z.number().int().nonnegative().optional(),
});

const parsedStringArrayFieldSchema = parsedReceiptFieldSchema.extend({
  value: z.array(z.string().min(1)).optional(),
});

export const normalizedReceiptParseResultSchema = z.object({
  categoryId: parsedNullableStringFieldSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  duplicateSuspected: z.boolean(),
  lineItems: z.array(
    z.object({
      amountMinor: parsedNumberFieldSchema,
      label: parsedStringFieldSchema,
    }),
  ),
  localDate: parsedLocalDateFieldSchema,
  merchant: parsedStringFieldSchema,
  topicIds: parsedStringArrayFieldSchema,
  totalMinor: parsedNumberFieldSchema,
  unknownFields: z.array(z.string().min(1)),
});

export const receiptParseJobRowSchema = z.object({
  attemptCount: z.number().int().nonnegative(),
  completedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  lastErrorCategory: z.string().min(1).nullable(),
  receiptDraftId: z.string().min(1),
  requestedAt: isoTimestampSchema,
  resultJson: z.string().min(2).nullable(),
  retryWindowStartedAt: isoTimestampSchema.nullable(),
  startedAt: isoTimestampSchema.nullable(),
  status: z.enum(receiptParseJobStatuses),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export function parseNormalizedReceiptParseResult(
  value: unknown,
): AppResult<NormalizedReceiptParseResult> {
  const parsed = normalizedReceiptParseResultSchema.safeParse(value);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Receipt parse result is invalid.', 'edit', parsed.error));
  }

  return ok(parsed.data);
}

function parseResultJson(resultJson: string | null): AppResult<NormalizedReceiptParseResult | null> {
  if (resultJson === null) {
    return ok(null);
  }

  try {
    return parseNormalizedReceiptParseResult(JSON.parse(resultJson));
  } catch (cause) {
    return err(createAppError('validation_failed', 'Receipt parse result could not be read.', 'retry', cause));
  }
}

export function serializeNormalizedReceiptParseResult(
  result: NormalizedReceiptParseResult,
): AppResult<string> {
  const parsed = parseNormalizedReceiptParseResult(result);

  if (!parsed.ok) {
    return parsed;
  }

  return ok(JSON.stringify(parsed.value));
}

export function parseReceiptParseJobRow(row: ReceiptParseJobRow): AppResult<ReceiptParseJob> {
  const parsed = receiptParseJobRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local receipt parse job data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const receiptDraftId = asEntityId(parsed.data.receiptDraftId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const normalizedResult = parseResultJson(parsed.data.resultJson);

  if (!id.ok) {
    return id;
  }

  if (!receiptDraftId.ok) {
    return receiptDraftId;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!normalizedResult.ok) {
    return normalizedResult;
  }

  if (
    (parsed.data.status === 'parsed' || parsed.data.status === 'low_confidence') &&
    normalizedResult.value === null
  ) {
    return err(createAppError('validation_failed', 'Parsed receipt job is missing result data.', 'retry'));
  }

  return ok({
    attemptCount: parsed.data.attemptCount,
    completedAt: parsed.data.completedAt,
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    lastErrorCategory: parsed.data.lastErrorCategory,
    normalizedResult: normalizedResult.value,
    receiptDraftId: receiptDraftId.value,
    requestedAt: parsed.data.requestedAt,
    retryWindowStartedAt: parsed.data.retryWindowStartedAt,
    startedAt: parsed.data.startedAt,
    status: parsed.data.status,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
