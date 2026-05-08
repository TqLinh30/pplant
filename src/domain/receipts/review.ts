import type { EntityId } from '@/domain/common/ids';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { formatMinorUnitsForInput } from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import { createAppError } from '@/domain/common/app-error';
import {
  asMoneyRecordMerchantOrSource,
  asMoneyRecordNote,
  asMoneyRecordTopicIds,
  asOptionalMoneyRecordCategoryId,
  parseManualMoneyAmountInput,
} from '@/domain/money/schemas';
import type { MoneyRecordMerchantOrSource, MoneyRecordNote } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';

import type { NormalizedReceiptParseResult, ParsedReceiptField } from './types';

export type ReceiptReviewLineItemDraft = {
  amount: string;
  id: string;
  ignored: boolean;
  label: string;
};

export type ReceiptReviewDraft = {
  categoryId: string | null;
  currency: string;
  ignoreLineItems: boolean;
  lineItems: ReceiptReviewLineItemDraft[];
  localDate: string;
  merchant: string;
  note: string;
  topicIds: string[];
  totalAmount: string;
};

export type ReceiptReviewFieldErrors = Partial<
  Record<'categoryId' | 'lineItems' | 'localDate' | 'merchant' | 'note' | 'topicIds' | 'totalAmount', string>
>;

export type ReceiptReviewSavePayload = {
  amountMinor: number;
  categoryId: EntityId | null;
  corrected: boolean;
  ignoredLineItems: boolean;
  lineItems: {
    amountMinor: number;
    label: string;
  }[];
  localDate: LocalDate;
  merchantOrSource: MoneyRecordMerchantOrSource | null;
  note: MoneyRecordNote | null;
  topicIds: EntityId[];
};

export type ReceiptReviewFieldDescriptor = {
  label: string;
  sourceLabel: string;
  value: string;
};

function textValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function formatAmount(amountMinor: number | undefined, currency: string, locale: string): string {
  if (amountMinor === undefined) {
    return '';
  }

  const formatted = formatMinorUnitsForInput(amountMinor, currency, { locale });

  return formatted.ok ? formatted.value : String(amountMinor);
}

function confidenceLabel(field: ParsedReceiptField<unknown>): string {
  if (field.confidence === 'low') {
    return 'Parsed - low confidence, review needed';
  }

  if (field.confidence === 'unknown') {
    return 'Unknown - review needed';
  }

  return `Parsed - confidence: ${field.confidence}`;
}

function fieldCorrected<T>(
  field: ParsedReceiptField<T>,
  currentValue: T | string | null | undefined,
  normalize: (value: T | string | null | undefined) => string,
): boolean {
  return normalize(field.value) !== normalize(currentValue);
}

function normalizeStringArray(value: unknown): string {
  return Array.isArray(value) ? value.join('|') : '';
}

export function buildReceiptReviewDraft(
  result: NormalizedReceiptParseResult,
  options: { locale: string },
): ReceiptReviewDraft {
  return {
    categoryId: result.categoryId.value ?? null,
    currency: result.currency,
    ignoreLineItems: false,
    lineItems: result.lineItems.map((lineItem, index) => ({
      amount: formatAmount(lineItem.amountMinor.value, result.currency, options.locale),
      id: `line-${index + 1}`,
      ignored: false,
      label: lineItem.label.value ?? '',
    })),
    localDate: result.localDate.value ?? '',
    merchant: result.merchant.value ?? '',
    note: '',
    topicIds: result.topicIds.value ?? [],
    totalAmount: formatAmount(result.totalMinor.value, result.currency, options.locale),
  };
}

export function receiptReviewFieldDescriptors(
  result: NormalizedReceiptParseResult,
  draft: ReceiptReviewDraft,
  options: { locale?: string } = {},
): ReceiptReviewFieldDescriptor[] {
  const locale = options.locale ?? 'en-US';
  const correctedMerchant = fieldCorrected(result.merchant, draft.merchant, (value) => textValue(value as string));
  const correctedDate = fieldCorrected(result.localDate, draft.localDate, (value) => textValue(value as string));
  const parsedTotal = formatAmount(result.totalMinor.value, result.currency, locale);
  const correctedTotal = textValue(draft.totalAmount) !== textValue(parsedTotal);
  const correctedCategory = fieldCorrected(result.categoryId, draft.categoryId, (value) => textValue(value as string));
  const correctedTopics = fieldCorrected(result.topicIds, draft.topicIds, normalizeStringArray);

  return [
    {
      label: 'Merchant',
      sourceLabel: correctedMerchant ? 'Corrected by you' : confidenceLabel(result.merchant),
      value: draft.merchant || 'Unknown',
    },
    {
      label: 'Date',
      sourceLabel: correctedDate ? 'Corrected by you' : confidenceLabel(result.localDate),
      value: draft.localDate || 'Unknown',
    },
    {
      label: 'Total',
      sourceLabel: correctedTotal ? 'Corrected by you' : confidenceLabel(result.totalMinor),
      value: draft.totalAmount || 'Unknown',
    },
    {
      label: 'Category',
      sourceLabel: correctedCategory ? 'Corrected by you' : confidenceLabel(result.categoryId),
      value: draft.categoryId ?? 'Not proposed',
    },
    {
      label: 'Topics',
      sourceLabel: correctedTopics ? 'Corrected by you' : confidenceLabel(result.topicIds),
      value: draft.topicIds.length > 0 ? `${draft.topicIds.length} selected` : 'Not proposed',
    },
    {
      label: 'Line items',
      sourceLabel: draft.ignoreLineItems ? 'Ignored by you - saving total only' : 'Review optional',
      value: draft.ignoreLineItems ? 'Ignored for total-only save' : `${draft.lineItems.length} item(s)`,
    },
  ];
}

export function hasReceiptReviewCorrections(
  result: NormalizedReceiptParseResult,
  draft: ReceiptReviewDraft,
  options: { locale?: string } = {},
): boolean {
  const locale = options.locale ?? 'en-US';
  const descriptors = receiptReviewFieldDescriptors(result, draft, { locale });

  if (descriptors.some((descriptor) => descriptor.sourceLabel === 'Corrected by you')) {
    return true;
  }

  if (draft.ignoreLineItems && result.lineItems.length > 0) {
    return true;
  }

  return draft.lineItems.some((lineItem, index) => {
    const parsedLineItem = result.lineItems[index];

    if (!parsedLineItem) {
      return true;
    }

    return (
      lineItem.ignored ||
      textValue(lineItem.label) !== textValue(parsedLineItem.label.value) ||
      textValue(lineItem.amount) !== textValue(formatAmount(parsedLineItem.amountMinor.value, result.currency, locale))
    );
  });
}

function lineItemValidationError(index: number): string {
  return `Check line item ${index + 1}, or choose total-only save.`;
}

export function validateReceiptReviewDraft(
  draft: ReceiptReviewDraft,
  preferences: UserPreferences,
  originalResult: NormalizedReceiptParseResult,
): AppResult<ReceiptReviewSavePayload> & { fieldErrors?: ReceiptReviewFieldErrors } {
  const fieldErrors: ReceiptReviewFieldErrors = {};
  const amount = parseManualMoneyAmountInput(
    draft.totalAmount,
    preferences.currencyCode,
    preferences.locale,
  );
  const localDate = asLocalDate(draft.localDate);
  const categoryId = asOptionalMoneyRecordCategoryId(draft.categoryId);
  const topicIds = asMoneyRecordTopicIds(draft.topicIds);
  const merchant = asMoneyRecordMerchantOrSource(draft.merchant);
  const note = asMoneyRecordNote(draft.note);
  const lineItems: ReceiptReviewSavePayload['lineItems'] = [];

  if (!amount.ok) {
    fieldErrors.totalAmount = amount.error.message;
  }

  if (!localDate.ok) {
    fieldErrors.localDate = localDate.error.message;
  }

  if (!categoryId.ok) {
    fieldErrors.categoryId = categoryId.error.message;
  }

  if (!topicIds.ok) {
    fieldErrors.topicIds = topicIds.error.message;
  }

  if (!merchant.ok) {
    fieldErrors.merchant = merchant.error.message;
  }

  if (!note.ok) {
    fieldErrors.note = note.error.message;
  }

  if (!draft.ignoreLineItems) {
    for (const [index, lineItem] of draft.lineItems.entries()) {
      if (lineItem.ignored) {
        continue;
      }

      const lineAmount = parseManualMoneyAmountInput(
        lineItem.amount,
        preferences.currencyCode,
        preferences.locale,
      );

      if (!lineAmount.ok || lineItem.label.trim().length > 80) {
        fieldErrors.lineItems = lineItemValidationError(index);
        break;
      }

      lineItems.push({
        amountMinor: lineAmount.value,
        label: lineItem.label.trim(),
      });
    }
  }

  if (
    !amount.ok ||
    !localDate.ok ||
    !categoryId.ok ||
    !topicIds.ok ||
    !merchant.ok ||
    !note.ok ||
    fieldErrors.lineItems
  ) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted receipt fields.', 'edit')),
      fieldErrors,
    };
  }

  return ok({
    amountMinor: amount.value,
    categoryId: categoryId.value,
    corrected: hasReceiptReviewCorrections(originalResult, draft, { locale: preferences.locale }),
    ignoredLineItems: draft.ignoreLineItems,
    lineItems: draft.ignoreLineItems ? [] : lineItems,
    localDate: localDate.value,
    merchantOrSource: merchant.value,
    note: note.value,
    topicIds: topicIds.value,
  });
}
