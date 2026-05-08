import type { EntityId } from '@/domain/common/ids';
import type { MoneyRecord } from '@/domain/money/types';

import type { NormalizedReceiptParseResult } from './types';

export type ReceiptDuplicateMatch = {
  amountMinor: number;
  currencyCode: string;
  id: EntityId;
  localDate: string;
  merchantOrSource: string | null;
  reasonLabels: string[];
};

export type ReceiptDuplicateWarningActionId =
  | 'continue_review'
  | 'discard_draft'
  | 'edit_fields'
  | 'manual_expense';

export type ReceiptDuplicateWarningAction = {
  description: string;
  id: ReceiptDuplicateWarningActionId;
  label: string;
  variant: 'danger' | 'primary' | 'secondary';
};

export type ReceiptDuplicateWarning = {
  actions: ReceiptDuplicateWarningAction[];
  description: string;
  matches: ReceiptDuplicateMatch[];
  parserFlagged: boolean;
  title: string;
};

export type BuildReceiptDuplicateWarningInput = {
  candidates: MoneyRecord[];
  currentSavedRecordId?: EntityId | null;
  result: NormalizedReceiptParseResult;
};

function normalizedText(value: string | null | undefined): string | null {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\W_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.length > 0 ? normalized : null;
}

function parsedReceiptValues(result: NormalizedReceiptParseResult) {
  return {
    amountMinor: result.totalMinor.value,
    currencyCode: result.currency,
    localDate: result.localDate.value,
    merchant: normalizedText(result.merchant.value),
  };
}

export function findReceiptDuplicateMatches(
  result: NormalizedReceiptParseResult,
  candidates: MoneyRecord[],
  options: { currentSavedRecordId?: EntityId | null } = {},
): ReceiptDuplicateMatch[] {
  const parsed = parsedReceiptValues(result);

  if (
    parsed.amountMinor === undefined ||
    parsed.localDate === undefined ||
    parsed.currencyCode.trim().length === 0 ||
    parsed.merchant === null
  ) {
    return [];
  }

  return candidates
    .filter((candidate) => {
      if (options.currentSavedRecordId && candidate.id === options.currentSavedRecordId) {
        return false;
      }

      return (
        candidate.kind === 'expense' &&
        candidate.deletedAt === null &&
        candidate.amountMinor === parsed.amountMinor &&
        candidate.currencyCode === parsed.currencyCode &&
        candidate.localDate === parsed.localDate &&
        normalizedText(candidate.merchantOrSource) === parsed.merchant
      );
    })
    .map((candidate) => ({
      amountMinor: candidate.amountMinor,
      currencyCode: candidate.currencyCode,
      id: candidate.id,
      localDate: candidate.localDate,
      merchantOrSource: candidate.merchantOrSource,
      reasonLabels: ['Same date', 'Same amount', 'Same merchant/source'],
    }));
}

export function buildReceiptDuplicateWarning({
  candidates,
  currentSavedRecordId = null,
  result,
}: BuildReceiptDuplicateWarningInput): ReceiptDuplicateWarning | null {
  const matches = findReceiptDuplicateMatches(result, candidates, { currentSavedRecordId });
  const parserFlagged = result.duplicateSuspected;

  if (!parserFlagged && matches.length === 0) {
    return null;
  }

  const context =
    matches.length > 0
      ? `Found ${matches.length} similar saved expense${matches.length === 1 ? '' : 's'} using local data.`
      : 'The parser marked this receipt as similar to another receipt.';

  return {
    actions: [
      {
        description: 'Keep reviewing or save if this is a separate purchase.',
        id: 'continue_review',
        label: 'Continue review',
        variant: 'primary',
      },
      {
        description: 'Adjust merchant, date, total, category, topics, or line items before saving.',
        id: 'edit_fields',
        label: 'Edit fields',
        variant: 'secondary',
      },
      {
        description: 'Enter the expense manually while keeping control of this receipt draft.',
        id: 'manual_expense',
        label: 'Manual expense',
        variant: 'secondary',
      },
      {
        description: 'Discard this draft if it repeats a receipt already saved.',
        id: 'discard_draft',
        label: 'Discard draft',
        variant: 'danger',
      },
    ],
    description: `${context} Review before saving; Pplant will not block you if this is a real separate expense.`,
    matches,
    parserFlagged,
    title: 'Possible duplicate receipt',
  };
}
