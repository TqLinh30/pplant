import type { NormalizedReceiptParseResult } from './types';

export function hasLowConfidenceFields(result: NormalizedReceiptParseResult): boolean {
  const lineItemFields = result.lineItems.flatMap((lineItem) => [lineItem.label, lineItem.amountMinor]);

  return [
    result.merchant,
    result.localDate,
    result.totalMinor,
    result.categoryId,
    result.topicIds,
    ...lineItemFields,
  ].some(
    (field) => field.confidence === 'low' || field.confidence === 'unknown',
  );
}
