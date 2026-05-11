import type { CurrencyCode } from '@/domain/common/money';
import type { UserPreferences } from '@/domain/preferences/types';
import { buildReceiptReviewDraft } from '@/domain/receipts/review';
import type { NormalizedReceiptParseResult } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { receiptReviewDeskCopyFor } from './receipt-review-state';

const preferences: UserPreferences = {
  createdAt: '2026-05-08T00:00:00.000Z',
  currencyCode: 'USD' as CurrencyCode,
  defaultHourlyWage: {
    amountMinor: 1500,
    currency: 'USD' as CurrencyCode,
  },
  locale: 'en-US' as never,
  monthlyBudgetResetDay: 1 as never,
  updatedAt: '2026-05-08T00:00:00.000Z',
  workspaceId: localWorkspaceId,
};

const result: NormalizedReceiptParseResult = {
  categoryId: { confidence: 'unknown', source: 'estimated' },
  currency: 'USD',
  duplicateSuspected: false,
  lineItems: [
    {
      amountMinor: { confidence: 'low', source: 'parsed', value: 400 },
      label: { confidence: 'high', source: 'parsed', value: 'Coffee' },
    },
  ],
  localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
  merchant: { confidence: 'low', source: 'parsed', value: 'Campus Cafe' },
  topicIds: { confidence: 'unknown', source: 'estimated', value: [] },
  totalMinor: { confidence: 'high', source: 'parsed', value: 400 },
  unknownFields: ['category'],
};

describe('receipt review desk copy', () => {
  it('exposes text labels for low confidence fields and manual fallback', () => {
    const draft = buildReceiptReviewDraft(result, { locale: preferences.locale });
    const copy = receiptReviewDeskCopyFor(result, draft, preferences);

    expect(copy.manualFallbackLabel).toBe('Manual expense');
    expect(copy.saveLabel).toBe('Save corrected receipt');
    expect(copy.labels).toContain('Parsed - low confidence, review needed');
    expect(copy.labels).toContain('Unknown - review needed');
  });

  it('shows save disabled copy for invalid review values', () => {
    const draft = {
      ...buildReceiptReviewDraft(result, { locale: preferences.locale }),
      totalAmount: '0',
    };

    expect(receiptReviewDeskCopyFor(result, draft, preferences).saveDisabledReason).toBe(
      'Check highlighted receipt fields before saving.',
    );
  });

  it('switches to total-only copy when line items are ignored', () => {
    const draft = {
      ...buildReceiptReviewDraft(result, { locale: preferences.locale }),
      ignoreLineItems: true,
    };
    const copy = receiptReviewDeskCopyFor(result, draft, preferences);

    expect(copy.saveLabel).toBe('Save total-only expense');
    expect(copy.labels).toContain('Line items ignored; saving total only.');
  });
});
