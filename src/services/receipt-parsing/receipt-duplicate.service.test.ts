import type { CurrencyCode } from '@/domain/common/money';
import type { EntityId } from '@/domain/common/ids';
import type { MoneyRecord, MoneyRecordMerchantOrSource } from '@/domain/money/types';
import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';
import { ok } from '@/domain/common/result';
import { localWorkspaceId } from '@/domain/workspace/types';

import { loadReceiptDuplicateWarning } from './receipt-duplicate.service';

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
    createdAt: '2026-05-08T10:00:00.000Z',
    currencyCode: 'USD' as CurrencyCode,
    deletedAt: null,
    id: 'money-1' as EntityId,
    kind: 'expense',
    localDate: '2026-05-08' as never,
    merchantOrSource: 'Campus Cafe' as MoneyRecordMerchantOrSource,
    note: null,
    recurrenceOccurrenceDate: null,
    recurrenceRuleId: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: [],
    updatedAt: '2026-05-08T10:00:00.000Z',
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('receipt duplicate service', () => {
  it('loads local same-date and same-amount candidates before building warning copy', async () => {
    const listHistoryRecords = jest.fn(async () =>
      ok({
        hasMore: false,
        limit: 20,
        offset: 0,
        records: [moneyRecord()],
        totalCount: 1,
      }),
    );

    const result = await loadReceiptDuplicateWarning({ result: receiptResult() }, {
      moneyRecordRepository: { listHistoryRecords },
    });

    expect(result.ok).toBe(true);
    expect(listHistoryRecords).toHaveBeenCalledWith(localWorkspaceId, {
      amountMinorMax: 1250,
      amountMinorMin: 1250,
      dateFrom: '2026-05-08',
      dateTo: '2026-05-08',
      kind: 'expense',
      limit: 20,
      offset: 0,
      sort: 'date_desc',
    });
    if (result.ok) {
      expect(result.value?.matches).toHaveLength(1);
      expect(result.value?.actions.some((action) => action.id === 'continue_review')).toBe(true);
    }
  });

  it('returns parser-only duplicate warnings when parsed amount is incomplete', async () => {
    const result = await loadReceiptDuplicateWarning(
      {
        result: receiptResult({
          duplicateSuspected: true,
          totalMinor: { confidence: 'unknown', source: 'parsed' },
        }),
      },
      {
        moneyRecordRepository: {
          async listHistoryRecords() {
            throw new Error('should not query without amount');
          },
        },
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.parserFlagged).toBe(true);
      expect(result.value?.matches).toEqual([]);
    }
  });
});
