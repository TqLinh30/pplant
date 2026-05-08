import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok } from '@/domain/common/result';
import {
  buildReceiptCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId, type WorkspaceId } from '@/domain/workspace/types';

import {
  cleanupAbandonedReceiptDrafts,
  deleteReceiptDraftImage,
  setReceiptDraftRetentionPolicy,
} from './receipt-retention.service';

const now = new Date('2026-05-08T12:00:00.000Z');

function receiptDraft(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    createdAt: '2026-04-01T12:00:00.000Z',
    discardedAt: null,
    id: 'draft-receipt' as EntityId,
    kind: 'expense',
    lastSavedAt: '2026-04-01T12:00:00.000Z',
    payload: toCaptureDraftPayload(
      buildReceiptCaptureDraftPayload({
        capturedAt: '2026-04-01T12:00:00.000Z',
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        sizeBytes: 2048,
        source: 'camera',
      }),
    ),
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: '2026-04-01T12:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

class FakeRetentionRepository {
  constructor(public drafts: CaptureDraft[] = [receiptDraft()]) {}

  async discardDraft(_workspaceId: WorkspaceId, id: EntityId, timestamp: string) {
    const draft = this.drafts.find((candidate) => candidate.id === id && candidate.status === 'active');

    if (!draft) {
      return err(createAppError('not_found', 'Capture draft was not found.', 'edit'));
    }

    draft.status = 'discarded';
    draft.discardedAt = timestamp;
    draft.updatedAt = timestamp;

    return ok({ ...draft });
  }

  async getDraft(_workspaceId: WorkspaceId, id: EntityId) {
    const draft = this.drafts.find((candidate) => candidate.id === id);

    return ok(draft ? { ...draft } : null);
  }

  async listActiveDraftsUpdatedBefore(_workspaceId: WorkspaceId, beforeTimestamp: string) {
    return ok(
      this.drafts
        .filter((draft) => draft.status === 'active' && draft.updatedAt < beforeTimestamp)
        .map((draft) => ({ ...draft })),
    );
  }

  async updateDraftPayload(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: { payload: CaptureDraft['payload']; timestamp: string },
  ) {
    const draft = this.drafts.find((candidate) => candidate.id === id);

    if (!draft) {
      return err(createAppError('not_found', 'Capture draft was not found.', 'edit'));
    }

    draft.payload = input.payload;
    draft.updatedAt = input.timestamp;

    return ok({ ...draft });
  }
}

describe('receipt retention service', () => {
  it('updates receipt retention policy without deleting the image', async () => {
    const repository = new FakeRetentionRepository();
    const result = await setReceiptDraftRetentionPolicy(
      {
        draftId: 'draft-receipt',
        retentionPolicy: 'delete_after_expense_saved',
      },
      {
        now: () => now,
        repository,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = parseReceiptCaptureDraftPayload(result.value.payload);

      expect(payload.ok).toBe(true);
      if (payload.ok) {
        expect(payload.value.receipt.retentionPolicy).toBe('delete_after_expense_saved');
        expect(payload.value.receipt.retentionStatus).toBe('retained');
      }
    }
  });

  it('deletes a retained receipt image while keeping the saved money record link', async () => {
    const repository = new FakeRetentionRepository([
      receiptDraft({
        savedAt: now.toISOString(),
        savedRecordId: 'money-1' as EntityId,
        savedRecordKind: 'money_record',
        status: 'saved',
      }),
    ]);
    const result = await deleteReceiptDraftImage(
      { draftId: 'draft-receipt' },
      {
        deleteImage: jest.fn(async () => ok({ deleted: true, sizeBytes: 2048 })),
        now: () => now,
        repository,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = parseReceiptCaptureDraftPayload(result.value.draft.payload);

      expect(result.value.deleted).toBe(true);
      expect(result.value.deletedBytes).toBe(2048);
      expect(result.value.draft.savedRecordId).toBe('money-1');
      expect(payload.ok).toBe(true);
      if (payload.ok) {
        expect(payload.value.receipt.retainedImageUri).toBeNull();
        expect(payload.value.receipt.retentionStatus).toBe('deleted');
        expect(payload.value.receipt.deletionReason).toBe('user_deleted');
      }
    }
  });

  it('cleans abandoned active receipt drafts older than 30 days only', async () => {
    const repository = new FakeRetentionRepository([
      receiptDraft({ id: 'old-receipt' as EntityId, updatedAt: '2026-04-01T12:00:00.000Z' }),
      receiptDraft({ id: 'recent-receipt' as EntityId, updatedAt: '2026-05-01T12:00:00.000Z' }),
      receiptDraft({
        id: 'saved-receipt' as EntityId,
        savedAt: '2026-04-01T12:00:00.000Z',
        savedRecordId: 'money-1' as EntityId,
        savedRecordKind: 'money_record',
        status: 'saved',
        updatedAt: '2026-04-01T12:00:00.000Z',
      }),
      {
        ...receiptDraft({ id: 'old-task' as EntityId, updatedAt: '2026-04-01T12:00:00.000Z' }),
        kind: 'task',
        payload: { title: 'Essay' },
      },
    ]);
    const deleteImage = jest.fn(async () => ok({ deleted: true, sizeBytes: 2048 }));
    const result = await cleanupAbandonedReceiptDrafts({
      deleteImage,
      now: () => now,
      repository,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cleaned).toBe(1);
      expect(result.value.cleanedBytes).toBe(2048);
      expect(result.value.thresholdDays).toBe(30);
    }
    expect(repository.drafts.find((draft) => draft.id === 'old-receipt')?.status).toBe('discarded');
    expect(repository.drafts.find((draft) => draft.id === 'recent-receipt')?.status).toBe('active');
    expect(repository.drafts.find((draft) => draft.id === 'saved-receipt')?.status).toBe('saved');
    expect(repository.drafts.find((draft) => draft.id === 'old-task')?.status).toBe('active');
    expect(deleteImage).toHaveBeenCalledTimes(1);
  });
});
