import type { ReceiptParseJob } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { receiptRecoveryStateFor, type ReceiptRecoveryActionId } from './receipt-recovery-actions';

function job(status: ReceiptParseJob['status']): ReceiptParseJob {
  return {
    attemptCount: status === 'retry_exhausted' ? 3 : 1,
    completedAt: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'job-1' as never,
    lastErrorCategory: status === 'failed' ? 'unavailable' : null,
    normalizedResult:
      status === 'parsed' || status === 'low_confidence' || status === 'reviewed' || status === 'saved'
        ? ({
            categoryId: { confidence: 'unknown', source: 'estimated' },
            currency: 'USD',
            duplicateSuspected: false,
            lineItems: [],
            localDate: { confidence: 'unknown', source: 'parsed' },
            merchant: { confidence: 'unknown', source: 'parsed' },
            topicIds: { confidence: 'unknown', source: 'estimated', value: [] },
            totalMinor: { confidence: 'unknown', source: 'parsed' },
            unknownFields: ['merchant', 'total'],
          } as never)
        : null,
    receiptDraftId: 'draft-receipt' as never,
    requestedAt: '2026-05-08T00:00:00.000Z',
    retryWindowStartedAt: null,
    startedAt: null,
    status,
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
  };
}

function actionIds(status: ReceiptParseJob['status'] | null, reviewAvailable = false): ReceiptRecoveryActionId[] {
  return receiptRecoveryStateFor({
    parseJob: status ? job(status) : null,
    reviewAvailable,
  }).actions.map((action) => action.id);
}

describe('receipt recovery actions', () => {
  it('offers parsing, edit draft, manual expense, keep, and discard from a draft-only state', () => {
    const state = receiptRecoveryStateFor({ parseJob: null, reviewAvailable: false });

    expect(state.recommendedActionId).toBe('start_parsing');
    expect(state.statusLabel).toContain('manual fallback');
    expect(state.actions.map((action) => action.id)).toEqual([
      'start_parsing',
      'edit_draft',
      'manual_expense',
      'keep_draft',
      'discard_draft',
    ]);
  });

  it('keeps manual fallback and retry visible after failure and retry exhaustion', () => {
    expect(actionIds('failed')).toEqual([
      'retry_parsing',
      'edit_draft',
      'manual_expense',
      'keep_draft',
      'discard_draft',
    ]);
    expect(receiptRecoveryStateFor({ parseJob: job('retry_exhausted'), reviewAvailable: false }).actions[0]).toMatchObject({
      id: 'retry_parsing',
      label: 'Retry manually',
    });
    expect(actionIds('retry_exhausted')).toContain('manual_expense');
  });

  it('prioritizes editing review fields for low-confidence or wrong parsed data', () => {
    const state = receiptRecoveryStateFor({ parseJob: job('low_confidence'), reviewAvailable: true });

    expect(state.recommendedActionId).toBe('edit_review');
    expect(state.statusLabel).toContain('Low confidence');
    expect(state.actions.map((action) => action.id)).toEqual([
      'edit_review',
      'manual_expense',
      'keep_draft',
      'discard_draft',
    ]);
  });

  it('does not re-enable recovery actions for saved receipts', () => {
    const state = receiptRecoveryStateFor({ parseJob: job('saved'), reviewAvailable: false });

    expect(state.actions).toEqual([]);
    expect(state.recommendedActionId).toBeNull();
    expect(state.statusLabel).toContain('Saved');
  });

  it('does not offer retry while parsing is running but keeps manual fallback', () => {
    const state = receiptRecoveryStateFor({ parseJob: job('running'), reviewAvailable: false });

    expect(state.actions.map((action) => action.id)).not.toContain('retry_parsing');
    expect(state.actions.map((action) => action.id)).toContain('manual_expense');
    expect(state.statusLabel).toContain('manual fallback');
  });
});
