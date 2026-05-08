import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { buildReceiptCaptureDraftPayload } from './captureDraftPayloads';
import {
  describeCaptureDraft,
  parseCaptureDraftResumeParam,
  routeForCaptureDraftResume,
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
    const receiptDraft = {
      ...draft,
      id: 'draft-receipt' as never,
      payload: buildReceiptCaptureDraftPayload({
        capturedAt: '2026-05-08T00:00:00.000Z',
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        source: 'camera',
      }),
    };
    const description = describeCaptureDraft(receiptDraft);

    expect(routeForCaptureDraftResume(receiptDraft, 'seq-1')).toBe('/receipt/draft-receipt');
    expect(description.title).toBe('Unfinished receipt expense');
    expect(description.description).not.toContain('file://');
  });

  it('describes drafts without exposing raw sensitive payload values', () => {
    const description = describeCaptureDraft(draft);

    expect(description.title).toBe('Unfinished expense');
    expect(description.description).toContain('Last saved');
    expect(description.description).not.toContain('12.50');
    expect(description.accessibilityLabel).toContain('Resume, discard, or keep');
  });
});
