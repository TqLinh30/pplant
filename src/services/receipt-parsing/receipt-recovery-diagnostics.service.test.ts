import { createAppError } from '@/domain/common/app-error';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { recordReceiptRecoveryFailure } from './receipt-recovery-diagnostics.service';

const failedJob: ReceiptParseJob = {
  attemptCount: 3,
  completedAt: '2026-05-08T00:00:00.000Z',
  createdAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  id: 'job-1' as never,
  lastErrorCategory: 'unavailable',
  normalizedResult: null,
  receiptDraftId: 'draft-receipt' as never,
  requestedAt: '2026-05-08T00:00:00.000Z',
  retryWindowStartedAt: '2026-05-08T00:00:00.000Z',
  startedAt: null,
  status: 'retry_exhausted',
  updatedAt: '2026-05-08T00:00:00.000Z',
  workspaceId: localWorkspaceId,
};

describe('receipt recovery diagnostics', () => {
  it('records only safe recovery failure metadata', async () => {
    const result = await recordReceiptRecoveryFailure({
      actionId: 'retry_parsing',
      error: createAppError(
        'unavailable',
        'Parsing failed for file:///private/receipts/receipt.jpg with total 12.00.',
        'retry',
      ),
      now: new Date('2026-05-08T00:00:00.000Z'),
      offline: true,
      parseJob: failedJob,
      timedOut: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        appVersion: '1.0.0',
        errorCategory: 'unavailable',
        metadata: {
          actionId: 'retry_parsing',
          jobState: 'retry_exhausted',
          offline: true,
          retryCount: 3,
          timedOut: true,
        },
        name: 'receipt_recovery_action_failed',
        occurredAt: '2026-05-08T00:00:00.000Z',
      });
      expect(JSON.stringify(result.value)).not.toContain('file:///private/receipts');
      expect(JSON.stringify(result.value)).not.toContain('12.00');
    }
  });
});
