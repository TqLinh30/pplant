import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { ReceiptParseJob, ReceiptParseJobStatus } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { buildReceiptCaptureDraftPayload } from './captureDraftPayloads';
import {
  describeCaptureDraft,
  parseCaptureDraftResumeParam,
  routeForCaptureDraftResume,
  toCaptureDraftRecoveryItem,
} from './capture-draft-recovery';

const draft: CaptureDraft = {
  createdAt: '2026-05-08T00:00:00.000Z',
  discardedAt: null,
  id: 'draft-expense' as never,
  kind: 'expense',
  lastSavedAt: '2026-05-08T00:00:00.000Z',
  payload: { amount: '12.50' },
  savedAt: null,
  savedRecordId: null,
  savedRecordKind: null,
  status: 'active',
  updatedAt: '2026-05-08T00:01:00.000Z',
  workspaceId: localWorkspaceId,
};

function receiptDraftFixture(): CaptureDraft {
  return {
    ...draft,
    id: 'draft-receipt' as never,
    payload: buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-08T00:00:00.000Z',
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      source: 'camera',
    }),
  };
}

function receiptJobFixture(status: ReceiptParseJobStatus): ReceiptParseJob {
  return {
    attemptCount: status === 'retry_exhausted' ? 3 : 1,
    completedAt: null,
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'receipt-job-1' as never,
    lastErrorCategory: status === 'failed' || status === 'retry_exhausted' ? 'unavailable' : null,
    normalizedResult: null,
    receiptDraftId: 'draft-receipt' as never,
    requestedAt: '2026-05-08T00:00:00.000Z',
    retryWindowStartedAt: null,
    startedAt: null,
    status,
    updatedAt: '2026-05-08T00:01:00.000Z',
    workspaceId: localWorkspaceId,
  };
}

describe('capture draft recovery helpers', () => {
  it('parses only supported draft resume params', () => {
    expect(parseCaptureDraftResumeParam('expense')).toBe('expense');
    expect(parseCaptureDraftResumeParam(['task'])).toBe('task');
    expect(parseCaptureDraftResumeParam('receipt')).toBeNull();
    expect(parseCaptureDraftResumeParam(undefined)).toBeNull();
  });

  it('routes active drafts back to existing capture surfaces', () => {
    expect(routeForCaptureDraftResume(draft, 'seq-1')).toBe('/(tabs)/capture?draft=expense&draftSeq=seq-1');
    expect(routeForCaptureDraftResume({ ...draft, kind: 'income' }, 'seq-2')).toBe(
      '/(tabs)/capture?draft=income&draftSeq=seq-2',
    );
    expect(routeForCaptureDraftResume({ ...draft, kind: 'task' }, 'seq-3')).toBe('/task/new?draft=task&draftSeq=seq-3');
    expect(routeForCaptureDraftResume({ ...draft, kind: 'reminder' }, 'seq-4')).toBe(
      '/reminder/new?draft=reminder&draftSeq=seq-4',
    );
    expect(routeForCaptureDraftResume({ ...draft, kind: 'work' }, 'seq-5')).toBe('/work/new?draft=work&draftSeq=seq-5');
  });

  it('routes receipt expense drafts to the receipt draft screen', () => {
    const receiptDraft = receiptDraftFixture();
    const description = describeCaptureDraft(receiptDraft);

    expect(routeForCaptureDraftResume(receiptDraft, 'seq-1')).toBe('/receipt/draft-receipt');
    expect(description.title).toBe('Unfinished receipt expense');
    expect(description.meta).toBe('Saved locally - parsing not started');
    expect(description.description).toContain('Manual expense entry works now');
    expect(description.description).not.toContain('file://');
  });

  it('describes drafts without exposing raw sensitive payload values', () => {
    const description = describeCaptureDraft(draft);

    expect(description.title).toBe('Unfinished expense');
    expect(description.meta).toBe('Saved locally');
    expect(description.description).toContain('saved locally');
    expect(description.description).not.toContain('12.50');
    expect(description.accessibilityLabel).toContain('Resume, discard, or keep');
  });

  it.each([
    ['pending', 'Saved locally - parsing queued', 'queued'],
    ['running', 'Saved locally - parsing in progress', 'in progress'],
    ['failed', 'Saved locally - parsing needs attention', 'did not finish'],
    ['retry_exhausted', 'Saved locally - automatic parsing paused', 'retry limit'],
    ['parsed', 'Saved locally - review ready', 'ready for review'],
    ['low_confidence', 'Saved locally - review needed', 'need review'],
    ['reviewed', 'Saved locally - reviewed receipt', 'were reviewed'],
    ['saved', 'Saved locally - receipt expense saved', 'saved as an expense'],
  ] satisfies [ReceiptParseJobStatus, string, string][])(
    'labels receipt draft parse status %s without exposing sensitive payload',
    (status, meta, descriptionText) => {
      const item = toCaptureDraftRecoveryItem(receiptDraftFixture(), {
        receiptParseJob: receiptJobFixture(status),
        receiptParseStatus: 'loaded',
      });
      const description = describeCaptureDraft(item);

      expect(description.meta).toBe(meta);
      expect(description.description).toContain(descriptionText);
      expect(description.description).not.toContain('file://');
    },
  );

  it('labels receipt parse status load failures while keeping the draft recoverable', () => {
    const item = toCaptureDraftRecoveryItem(receiptDraftFixture(), {
      receiptParseJob: null,
      receiptParseStatus: 'load_failed',
    });
    const description = describeCaptureDraft(item);

    expect(description.meta).toBe('Saved locally - parsing status unavailable');
    expect(description.description).toContain('still saved locally');
    expect(description.description).toContain('manual expense entry works now');
  });
});
