import type { NormalizedReceiptParseResult, ReceiptParseJob } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { receiptParseNoticeFor, receiptProposalRows } from './receipt-parse-state';

const parsedResult: NormalizedReceiptParseResult = {
  categoryId: { confidence: 'medium', source: 'estimated', value: 'category-food' },
  currency: 'USD',
  duplicateSuspected: true,
  lineItems: [
    {
      amountMinor: { confidence: 'low', source: 'parsed', value: 300 },
      label: { confidence: 'high', source: 'parsed', value: 'Coffee' },
    },
  ],
  localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
  merchant: { confidence: 'high', source: 'parsed', value: 'Campus Cafe' },
  topicIds: { confidence: 'unknown', source: 'estimated', value: [] },
  totalMinor: { confidence: 'high', source: 'parsed', value: 300 },
  unknownFields: ['tax'],
};

function job(status: ReceiptParseJob['status']): ReceiptParseJob {
  return {
    attemptCount: status === 'retry_exhausted' ? 3 : 1,
    completedAt: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'job-1' as never,
    lastErrorCategory: null,
    normalizedResult: status === 'parsed' || status === 'low_confidence' ? parsedResult : null,
    receiptDraftId: 'draft-receipt' as never,
    requestedAt: '2026-05-08T00:00:00.000Z',
    retryWindowStartedAt: '2026-05-08T00:00:00.000Z',
    startedAt: null,
    status,
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
  };
}

describe('receipt parse state copy', () => {
  it('keeps manual expense visible in every visible state', () => {
    const states = [
      null,
      job('pending'),
      job('running'),
      job('parsed'),
      job('low_confidence'),
      job('failed'),
      job('retry_exhausted'),
    ];

    expect(states.map((state) => receiptParseNoticeFor(state).manualActionLabel)).toEqual([
      'Manual expense',
      'Manual expense',
      'Manual expense',
      'Manual expense',
      'Manual expense',
      'Manual expense',
      'Manual expense',
    ]);
  });

  it('labels retry states with explicit user action requirements', () => {
    expect(receiptParseNoticeFor(null).actionLabel).toBe('Start parsing');
    expect(receiptParseNoticeFor(job('pending')).actionLabel).toBe('Resume parsing');
    expect(receiptParseNoticeFor(job('failed')).actionLabel).toBe('Retry parsing');
    expect(receiptParseNoticeFor(job('retry_exhausted')).actionLabel).toBe('Retry manually');
    expect(receiptParseNoticeFor(job('retry_exhausted')).description).toContain('three attempts within 24 hours');
  });

  it('formats proposal rows with text confidence and unknown labels', () => {
    const rows = receiptProposalRows(parsedResult);

    expect(rows.map((row) => row.label)).toEqual([
      'Merchant',
      'Date',
      'Total',
      'Category',
      'Topics',
      'Possible duplicate',
      'Unknown fields',
      'Line items',
    ]);
    expect(rows.find((row) => row.label === 'Total')?.value).toBe('3.00 USD');
    expect(rows.find((row) => row.label === 'Topics')?.confidenceLabel).toContain('unknown');
    expect(rows.find((row) => row.label === 'Unknown fields')?.value).toBe('tax');
    expect(rows.find((row) => row.label === 'Possible duplicate')?.value).toContain('Yes');
  });
});
