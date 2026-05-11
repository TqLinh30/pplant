import type { NormalizedReceiptParseResult } from './types';
import {
  buildReceiptReviewDraft,
  hasReceiptReviewCorrections,
  receiptReviewFieldDescriptors,
  validateReceiptReviewDraft,
  type ReceiptReviewDraft,
} from './review';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { UserPreferences } from '@/domain/preferences/types';

const preferences: UserPreferences = {
  createdAt: '2026-05-08T00:00:00.000Z',
  currencyCode: 'USD' as never,
  defaultHourlyWage: {
    amountMinor: 1500,
    currency: 'USD' as never,
  },
  locale: 'en-US' as never,
  monthlyBudgetResetDay: 1 as never,
  updatedAt: '2026-05-08T00:00:00.000Z',
  workspaceId: localWorkspaceId,
};

function parsedReceipt(overrides: Partial<NormalizedReceiptParseResult> = {}): NormalizedReceiptParseResult {
  return {
    categoryId: { confidence: 'medium', source: 'estimated', value: 'category-food' },
    currency: 'USD',
    duplicateSuspected: false,
    lineItems: [
      {
        amountMinor: { confidence: 'high', source: 'parsed', value: 700 },
        label: { confidence: 'high', source: 'parsed', value: 'Notebook' },
      },
      {
        amountMinor: { confidence: 'low', source: 'parsed', value: 500 },
        label: { confidence: 'low', source: 'parsed', value: 'Pens' },
      },
    ],
    localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
    merchant: { confidence: 'high', source: 'parsed', value: 'Campus Store' },
    topicIds: { confidence: 'unknown', source: 'estimated', value: [] },
    totalMinor: { confidence: 'high', source: 'parsed', value: 1200 },
    unknownFields: ['tax'],
    ...overrides,
  };
}

describe('receipt review domain', () => {
  it('derives an editable review draft from normalized parsed fields', () => {
    const draft = buildReceiptReviewDraft(parsedReceipt(), { locale: 'en-US' });
    const descriptors = receiptReviewFieldDescriptors(parsedReceipt(), draft, { locale: 'en-US' });

    expect(draft).toMatchObject({
      categoryId: 'category-food',
      localDate: '2026-05-08',
      merchant: 'Campus Store',
      totalAmount: '12.00',
    });
    expect(draft.lineItems).toHaveLength(2);
    expect(descriptors.find((descriptor) => descriptor.label === 'Topics')?.sourceLabel).toContain('Unknown');
    expect(descriptors.find((descriptor) => descriptor.label === 'Line items')?.sourceLabel).toBe('Review optional');
  });

  it('labels corrected fields and validates the corrected receipt save payload', () => {
    const result = parsedReceipt();
    const draft: ReceiptReviewDraft = {
      ...buildReceiptReviewDraft(result, { locale: 'en-US' }),
      categoryId: null,
      merchant: 'Campus Bookshop',
      topicIds: ['topic-school'],
      totalAmount: '13.25',
    };
    const descriptors = receiptReviewFieldDescriptors(result, draft, { locale: 'en-US' });
    const payload = validateReceiptReviewDraft(draft, preferences, result);

    expect(descriptors.find((descriptor) => descriptor.label === 'Merchant')?.sourceLabel).toBe('Corrected by you');
    expect(descriptors.find((descriptor) => descriptor.label === 'Total')?.sourceLabel).toBe('Corrected by you');
    expect(hasReceiptReviewCorrections(result, draft, { locale: 'en-US' })).toBe(true);
    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.value).toMatchObject({
        amountMinor: 1325,
        categoryId: null,
        corrected: true,
        ignoredLineItems: false,
        localDate: '2026-05-08',
        merchantOrSource: 'Campus Bookshop',
        topicIds: ['topic-school'],
      });
      expect(payload.value.lineItems).toHaveLength(2);
    }
  });

  it('allows total-only save when line items are ignored', () => {
    const result = parsedReceipt();
    const draft: ReceiptReviewDraft = {
      ...buildReceiptReviewDraft(result, { locale: 'en-US' }),
      ignoreLineItems: true,
      lineItems: [
        {
          amount: 'not a number',
          id: 'line-1',
          ignored: false,
          label: 'A very rough item',
        },
      ],
    };
    const payload = validateReceiptReviewDraft(draft, preferences, result);
    const descriptors = receiptReviewFieldDescriptors(result, draft, { locale: 'en-US' });

    expect(payload.ok).toBe(true);
    if (payload.ok) {
      expect(payload.value.ignoredLineItems).toBe(true);
      expect(payload.value.lineItems).toEqual([]);
    }
    expect(descriptors.find((descriptor) => descriptor.label === 'Line items')?.sourceLabel).toContain('Ignored');
  });

  it('blocks invalid totals and invalid non-ignored line items with field errors', () => {
    const result = parsedReceipt();
    const draft: ReceiptReviewDraft = {
      ...buildReceiptReviewDraft(result, { locale: 'en-US' }),
      lineItems: [
        {
          amount: 'not a number',
          id: 'line-1',
          ignored: false,
          label: 'Notebook',
        },
      ],
      totalAmount: '',
    };
    const payload = validateReceiptReviewDraft(draft, preferences, result);

    expect(payload.ok).toBe(false);
    if (!payload.ok) {
      expect(payload.fieldErrors?.totalAmount).toBeTruthy();
      expect(payload.fieldErrors?.lineItems).toContain('Check line item 1');
    }
  });
});
