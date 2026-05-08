import type { EntityId } from '@/domain/common/ids';
import type { CurrencyCode } from '@/domain/common/money';
import type { MoneyRecord, MoneyRecordMerchantOrSource } from '@/domain/money/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import type { NormalizedReceiptParseResult } from './types';
import { buildReceiptDuplicateWarning, findReceiptDuplicateMatches } from './duplicates';

const fixedNow = '2026-05-08T10:00:00.000Z';

function receiptResult(overrides: Partial<NormalizedReceiptParseResult> = {}): NormalizedReceiptParseResult {
  return {
    categoryId: { confidence: 'unknown', source: 'estimated', value: null },
    currency: 'USD',
    duplicateSuspected: false,
    lineItems: [],
    localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
    merchant: { confidence: 'high', source: 'parsed', value: 'Campus Cafe' },
    topicIds: { confidence: 'unknown', source: 'estimated', value: [] },
    totalMinor: { confidence: 'high', source: 'parsed', value: 1250 },
    unknownFields: [],
    ...overrides,
  };
}

function moneyRecord(overrides: Partial<MoneyRecord> = {}): MoneyRecord {
  return {
    amountMinor: 1250,
    categoryId: null,
    createdAt: fixedNow,
    currencyCode: 'USD' as CurrencyCode,
    deletedAt: null,
    id: 'money-1' as EntityId,
    kind: 'expense',
    localDate: '2026-05-08' as never,
    merchantOrSource: 'Campus  cafe' as MoneyRecordMerchantOrSource,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('receipt duplicate warnings', () => {
  it('matches local expense records using amount, currency, date, and normalized merchant text', () => {
    const matches = findReceiptDuplicateMatches(receiptResult(), [moneyRecord()]);

    expect(matches).toEqual([
      expect.objectContaining({
        amountMinor: 1250,
        currencyCode: 'USD',
        id: 'money-1',
        localDate: '2026-05-08',
        reasonLabels: ['Same date', 'Same amount', 'Same merchant/source'],
      }),
    ]);
  });

  it('does not match deleted records, income records, or different amounts', () => {
    const matches = findReceiptDuplicateMatches(receiptResult(), [
      moneyRecord({ deletedAt: fixedNow, id: 'deleted' as EntityId }),
      moneyRecord({ id: 'income' as EntityId, kind: 'income' }),
      moneyRecord({ amountMinor: 1300, id: 'different-amount' as EntityId }),
    ]);

    expect(matches).toEqual([]);
  });

  it('returns parser-only warnings without blocking continue actions', () => {
    const warning = buildReceiptDuplicateWarning({
      candidates: [],
      result: receiptResult({ duplicateSuspected: true }),
    });

    expect(warning).not.toBeNull();
    expect(warning?.parserFlagged).toBe(true);
    expect(warning?.matches).toEqual([]);
    expect(warning?.actions.map((action) => action.id)).toEqual([
      'continue_review',
      'edit_fields',
      'manual_expense',
      'discard_draft',
    ]);
    expect(warning?.description).toContain('will not block');
  });

  it('suppresses the current saved record when checking a saved receipt', () => {
    const warning = buildReceiptDuplicateWarning({
      candidates: [moneyRecord({ id: 'money-1' as EntityId })],
      currentSavedRecordId: 'money-1' as EntityId,
      result: receiptResult(),
    });

    expect(warning).toBeNull();
  });
});
