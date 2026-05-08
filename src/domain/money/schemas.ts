import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import {
  asCurrencyCode,
  parseMoneyAmountInputToMinorUnits,
  type CurrencyCode,
} from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  MoneyRecord,
  MoneyRecordKind,
  MoneyRecordMerchantOrSource,
  MoneyRecordNote,
} from './types';

export const moneyRecordDraftSchema = z.object({
  amountMinor: z.number().int(),
  categoryId: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  kind: z.enum(['expense', 'income']),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchantOrSource: z.string().optional(),
  note: z.string().optional(),
  topicIds: z.array(z.string()).default([]),
});

export const maxMerchantOrSourceLength = 80;
export const maxMoneyRecordNoteLength = 240;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const moneyRecordRowSchema = z.object({
  amountMinor: z.number().int().positive(),
  categoryId: z.string().nullable(),
  createdAt: isoTimestampSchema,
  currencyCode: z.string(),
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  kind: z.enum(['expense', 'income']),
  localDate: z.string(),
  merchantOrSource: z.string().nullable(),
  note: z.string().nullable(),
  source: z.enum(['manual', 'receipt']),
  sourceOfTruth: z.enum(['manual', 'parsed']),
  updatedAt: isoTimestampSchema,
  userCorrectedAt: isoTimestampSchema.nullable(),
  workspaceId: z.string().min(1),
});

export type MoneyRecordRow = z.infer<typeof moneyRecordRowSchema>;

export function asMoneyRecordKind(value: string): AppResult<MoneyRecordKind> {
  if (value === 'expense' || value === 'income') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose expense or income.', 'edit'));
}

export function validateMoneyRecordAmountMinor(amountMinor: number): AppResult<number> {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return err(createAppError('validation_failed', 'Money amount must be greater than zero.', 'edit'));
  }

  return ok(amountMinor);
}

export function parseManualMoneyAmountInput(
  value: string,
  currency: string,
  locale: string,
): AppResult<number> {
  const parsed = parseMoneyAmountInputToMinorUnits(value, currency, { locale });

  if (!parsed.ok) {
    return parsed;
  }

  return validateMoneyRecordAmountMinor(parsed.value);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';

  return normalized.length > 0 ? normalized : null;
}

export function asMoneyRecordMerchantOrSource(
  value: string | null | undefined,
): AppResult<MoneyRecordMerchantOrSource | null> {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return ok(null);
  }

  if (normalized.length > maxMerchantOrSourceLength) {
    return err(
      createAppError(
        'validation_failed',
        `Merchant or source must be ${maxMerchantOrSourceLength} characters or fewer.`,
        'edit',
      ),
    );
  }

  return ok(normalized as MoneyRecordMerchantOrSource);
}

export function asMoneyRecordNote(value: string | null | undefined): AppResult<MoneyRecordNote | null> {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return ok(null);
  }

  if (normalized.length > maxMoneyRecordNoteLength) {
    return err(
      createAppError(
        'validation_failed',
        `Note must be ${maxMoneyRecordNoteLength} characters or fewer.`,
        'edit',
      ),
    );
  }

  return ok(normalized as MoneyRecordNote);
}

export function asOptionalMoneyRecordCategoryId(value: string | null | undefined): AppResult<EntityId | null> {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return ok(null);
  }

  return asEntityId(normalized);
}

export function asMoneyRecordTopicIds(values: string[]): AppResult<EntityId[]> {
  const topicIds: EntityId[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const topicId = asEntityId(value);

    if (!topicId.ok) {
      return err(createAppError('validation_failed', 'Choose valid topics.', 'edit', topicId.error));
    }

    if (seen.has(topicId.value)) {
      return err(createAppError('validation_failed', 'Choose each topic only once.', 'edit'));
    }

    seen.add(topicId.value);
    topicIds.push(topicId.value);
  }

  return ok(topicIds);
}

export function parseMoneyRecordRow(row: unknown, topicIds: string[] = []): AppResult<MoneyRecord> {
  const parsed = moneyRecordRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local money record data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const currencyCode = asCurrencyCode(parsed.data.currencyCode);
  const localDate = asLocalDate(parsed.data.localDate);
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

  if (!currencyCode.ok) {
    return currencyCode;
  }

  if (!localDate.ok) {
    return localDate;
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
    amountMinor: parsed.data.amountMinor,
    categoryId: categoryId.value,
    createdAt: parsed.data.createdAt,
    currencyCode: currencyCode.value as CurrencyCode,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    kind: parsed.data.kind,
    localDate: localDate.value,
    merchantOrSource: merchantOrSource.value,
    note: note.value,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    topicIds: parsedTopicIds.value,
    updatedAt: parsed.data.updatedAt,
    userCorrectedAt: parsed.data.userCorrectedAt,
    workspaceId: workspaceId.value,
  });
}
