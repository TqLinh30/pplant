import type { NormalizedReceiptParseResult } from './types';

export function hasLowConfidenceFields(result: NormalizedReceiptParseResult): boolean {
  return [result.merchant, result.localDate, result.totalMinor].some(
    (field) => field.confidence === 'low' || field.confidence === 'unknown',
  );
}
