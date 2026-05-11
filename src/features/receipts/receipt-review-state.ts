import type { UserPreferences } from '@/domain/preferences/types';
import {
  receiptReviewFieldDescriptors,
  validateReceiptReviewDraft,
  type ReceiptReviewDraft,
} from '@/domain/receipts/review';
import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';

export type ReceiptReviewDeskCopy = {
  labels: string[];
  manualFallbackLabel: 'Manual expense';
  saveDisabledReason: string | null;
  saveLabel: 'Save corrected receipt' | 'Save total-only expense';
};

export function receiptReviewDeskCopyFor(
  result: NormalizedReceiptParseResult,
  draft: ReceiptReviewDraft,
  preferences: UserPreferences,
  options: { saving?: boolean } = {},
): ReceiptReviewDeskCopy {
  const validation = validateReceiptReviewDraft(draft, preferences, result);
  const descriptors = receiptReviewFieldDescriptors(result, draft, { locale: preferences.locale });
  const lineItemLabel = draft.ignoreLineItems
    ? 'Line items ignored; saving total only.'
    : 'Line items require review or can be ignored.';

  return {
    labels: [
      'Receipt Review Desk',
      'Merchant',
      'Date',
      'Total',
      'Category',
      'Topics',
      'Line items',
      lineItemLabel,
      ...descriptors.flatMap((descriptor) => [descriptor.label, descriptor.sourceLabel]),
    ],
    manualFallbackLabel: 'Manual expense',
    saveDisabledReason: options.saving
      ? 'Saving reviewed receipt expense.'
      : validation.ok
        ? null
        : 'Check highlighted receipt fields before saving.',
    saveLabel: draft.ignoreLineItems ? 'Save total-only expense' : 'Save corrected receipt',
  };
}
