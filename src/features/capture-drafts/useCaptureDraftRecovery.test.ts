import { createAppError } from '@/domain/common/app-error';
import { err, ok } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { buildReceiptCaptureDraftPayload } from './captureDraftPayloads';
import { describeCaptureDraft } from './capture-draft-recovery';
import { loadCaptureDraftRecoveryItems } from './useCaptureDraftRecovery';

const timestamp = '2026-05-08T00:00:00.000Z';

function draftFixture(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    createdAt: timestamp,
    discardedAt: null,
    id: 'draft-expense' as never,
    kind: 'expense',
    lastSavedAt: timestamp,
    payload: {
      amount: '12',
      kind: 'expense',
    },
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function receiptDraftFixture(): CaptureDraft {
  return draftFixture({
    id: 'draft-receipt' as never,
    payload: buildReceiptCaptureDraftPayload({
      capturedAt: timestamp,
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      source: 'camera',
    }),
  });
}

function receiptJobFixture(): ReceiptParseJob {
  return {
    attemptCount: 1,
    completedAt: null,
    createdAt: timestamp,
    deletedAt: null,
    id: 'receipt-job-1' as never,
    lastErrorCategory: null,
    normalizedResult: null,
    receiptDraftId: 'draft-receipt' as never,
    requestedAt: timestamp,
    retryWindowStartedAt: null,
    startedAt: null,
    status: 'pending',
    updatedAt: timestamp,
    workspaceId: localWorkspaceId,
  };
}

describe('loadCaptureDraftRecoveryItems', () => {
  it('labels ordinary drafts as locally saved without loading receipt parse status', async () => {
    const loadReceiptParseJob = jest.fn();
    const result = await loadCaptureDraftRecoveryItems({
      listDrafts: jest.fn(async () => ok([draftFixture({ kind: 'task' })])),
      loadReceiptParseJob,
    });

    expect(result.ok).toBe(true);
    expect(loadReceiptParseJob).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.value[0].receiptParseStatus).toBe('not_applicable');
      expect(describeCaptureDraft(result.value[0]).meta).toBe('Saved locally');
    }
  });

  it('enriches active receipt drafts with latest local parse-job context', async () => {
    const loadReceiptParseJob = jest.fn(async () => ok(receiptJobFixture()));
    const result = await loadCaptureDraftRecoveryItems({
      listDrafts: jest.fn(async () => ok([receiptDraftFixture()])),
      loadReceiptParseJob,
    });

    expect(result.ok).toBe(true);
    expect(loadReceiptParseJob).toHaveBeenCalledWith('draft-receipt');
    if (result.ok) {
      expect(result.value[0].receiptParseStatus).toBe('loaded');
      expect(describeCaptureDraft(result.value[0]).meta).toBe('Saved locally - parsing queued');
    }
  });

  it('keeps receipt drafts recoverable when parse status lookup fails', async () => {
    const result = await loadCaptureDraftRecoveryItems({
      listDrafts: jest.fn(async () => ok([receiptDraftFixture()])),
      loadReceiptParseJob: jest.fn(async () =>
        err(createAppError('unavailable', 'Local receipt parsing data could not be opened.', 'retry')),
      ),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].receiptParseStatus).toBe('load_failed');
      expect(describeCaptureDraft(result.value[0]).description).toContain('still saved locally');
    }
  });
});
