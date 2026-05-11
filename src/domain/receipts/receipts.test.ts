import { hasLowConfidenceFields } from './normalize-parse-result';
import {
  parseNormalizedReceiptParseResult,
  parseReceiptParseJobRow,
  serializeNormalizedReceiptParseResult,
} from './schemas';
import type { NormalizedReceiptParseResult, ReceiptParseJobRow } from './types';

const parsedResult: NormalizedReceiptParseResult = {
  categoryId: {
    confidence: 'medium',
    source: 'estimated',
    value: 'category-food',
  },
  currency: 'USD',
  duplicateSuspected: false,
  lineItems: [
    {
      amountMinor: {
        confidence: 'high',
        source: 'parsed',
        value: 450,
      },
      label: {
        confidence: 'high',
        source: 'parsed',
        value: 'Sandwich',
      },
    },
  ],
  localDate: {
    confidence: 'high',
    source: 'parsed',
    value: '2026-05-08',
  },
  merchant: {
    confidence: 'high',
    source: 'parsed',
    value: 'Campus Store',
  },
  topicIds: {
    confidence: 'unknown',
    source: 'estimated',
    value: [],
  },
  totalMinor: {
    confidence: 'high',
    source: 'parsed',
    value: 450,
  },
  unknownFields: ['tax'],
};

function jobRow(overrides: Partial<ReceiptParseJobRow> = {}): ReceiptParseJobRow {
  return {
    attemptCount: 1,
    completedAt: '2026-05-08T00:01:00.000Z',
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'job-1',
    lastErrorCategory: null,
    receiptDraftId: 'draft-receipt',
    requestedAt: '2026-05-08T00:00:00.000Z',
    resultJson: JSON.stringify(parsedResult),
    retryWindowStartedAt: '2026-05-08T00:00:30.000Z',
    startedAt: '2026-05-08T00:00:30.000Z',
    status: 'parsed',
    updatedAt: '2026-05-08T00:01:00.000Z',
    workspaceId: 'local-workspace',
    ...overrides,
  };
}

describe('receipt parsing domain schemas', () => {
  it('validates normalized proposed receipt fields without saving an expense shape', () => {
    const parsed = parseNormalizedReceiptParseResult(parsedResult);
    const serialized = serializeNormalizedReceiptParseResult(parsedResult);

    expect(parsed.ok).toBe(true);
    expect(serialized.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toMatchObject({
        categoryId: { value: 'category-food' },
        duplicateSuspected: false,
        merchant: { value: 'Campus Store' },
        topicIds: { value: [] },
        totalMinor: { value: 450 },
        unknownFields: ['tax'],
      });
    }
  });

  it('rejects parsed jobs that do not contain result json', () => {
    const parsed = parseReceiptParseJobRow(jobRow({ resultJson: null, status: 'parsed' }));

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.code).toBe('validation_failed');
    }
  });

  it('detects low confidence top-level and line item fields with text labels available', () => {
    const lowConfidenceResult: NormalizedReceiptParseResult = {
      ...parsedResult,
      lineItems: [
        {
          amountMinor: { confidence: 'unknown', source: 'parsed' },
          label: { confidence: 'high', source: 'parsed', value: 'Unknown item' },
        },
      ],
      topicIds: { confidence: 'high', source: 'estimated', value: ['topic-food'] },
    };

    expect(hasLowConfidenceFields(parsedResult)).toBe(true);
    expect(hasLowConfidenceFields(lowConfidenceResult)).toBe(true);
  });
});
