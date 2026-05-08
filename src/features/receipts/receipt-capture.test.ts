import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { asEntityId } from '@/domain/common/ids';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { ReceiptCameraPort } from '@/services/camera/camera.service';
import type { PersistedReceiptImageReference } from '@/services/files/receipt-file-store';

import {
  captureReceiptDraftFromSource,
  receiptCaptureNoticeForOutcome,
} from './receipt-capture';

const now = '2026-05-08T10:00:00.000Z';

function draftFixture(payload: CaptureDraft['payload']): CaptureDraft {
  const id = asEntityId('draft-receipt-1');

  if (!id.ok) {
    throw new Error('draft id fixture failed');
  }

  return {
    createdAt: now,
    discardedAt: null,
    id: id.value,
    kind: 'expense',
    lastSavedAt: now,
    payload,
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: now,
    workspaceId: localWorkspaceId,
  };
}

function createCamera(overrides: Partial<ReceiptCameraPort> = {}): ReceiptCameraPort {
  return {
    captureReceiptPhoto: jest.fn(async () =>
      ok({
        asset: {
          fileName: 'receipt.jpg',
          mimeType: 'image/jpeg',
          uri: 'file:///camera/tmp/receipt.jpg',
        },
        source: 'camera' as const,
        status: 'selected' as const,
      }),
    ),
    chooseReceiptPhoto: jest.fn(async () =>
      ok({
        source: 'library' as const,
        status: 'canceled' as const,
      }),
    ),
    ...overrides,
  };
}

function persistedImage(): PersistedReceiptImageReference {
  return {
    capturedAt: now,
    contentType: 'image/jpeg',
    originalFileName: 'receipt.jpg',
    retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
    retentionAnchor: 'capture_draft',
    retentionPolicy: 'keep_until_saved_or_discarded',
    sizeBytes: 1234,
    storageScope: 'app_private_documents',
  };
}

describe('receipt capture orchestration', () => {
  it('saves a selected receipt photo as an active expense draft only', async () => {
    const saveDraft = jest.fn(async (input): Promise<AppResult<CaptureDraft>> => ok(draftFixture(input.payload)));
    const result = await captureReceiptDraftFromSource('camera', {
      camera: createCamera(),
      now: () => new Date(now),
      persistImage: jest.fn(async () => ok(persistedImage())),
      saveDraft,
    });

    expect(result.ok).toBe(true);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0]).toMatchObject({
      kind: 'expense',
      payload: {
        captureMode: 'receipt',
        kind: 'expense',
        moneyKind: 'expense',
        receipt: {
          parsingState: 'draft',
          retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        },
      },
    });
    if (result.ok && result.value.status === 'draft_saved') {
      expect(result.value.draft.kind).toBe('expense');
      expect(result.value.payload.amount).toBe('');
      const notice = receiptCaptureNoticeForOutcome(result.value);
      expect(notice.description).toContain('saved locally');
      expect(notice.description).toContain('Parsing can wait');
      expect(notice.description).toContain('manual expense entry works now');
    }
  });

  it('keeps manual fallback visible when permission is denied', async () => {
    const saveDraft = jest.fn();
    const result = await captureReceiptDraftFromSource('camera', {
      camera: createCamera({
        captureReceiptPhoto: jest.fn(async () =>
          ok({
            reason: 'camera_permission' as const,
            status: 'permission_denied' as const,
          }),
        ),
      }),
      saveDraft,
    });

    expect(result.ok).toBe(true);
    expect(saveDraft).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.value.status).toBe('permission_denied');
      expect(receiptCaptureNoticeForOutcome(result.value).actionLabel).toBe('Manual expense');
    }
  });

  it('does not save a draft when the picker is canceled', async () => {
    const saveDraft = jest.fn();
    const result = await captureReceiptDraftFromSource('library', {
      camera: createCamera(),
      saveDraft,
    });

    expect(result.ok).toBe(true);
    expect(saveDraft).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.value.status).toBe('canceled');
      expect(receiptCaptureNoticeForOutcome(result.value).description).toContain('No receipt photo was saved');
    }
  });

  it('returns redacted service errors without saving a final expense', async () => {
    const result = await captureReceiptDraftFromSource('camera', {
      camera: createCamera(),
      persistImage: jest.fn(async () =>
        err(createAppError('unavailable', 'Receipt image could not be saved locally.', 'manual_entry')),
      ),
      saveDraft: jest.fn(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain('file://');
      expect(result.error.recovery).toBe('manual_entry');
    }
  });
});
