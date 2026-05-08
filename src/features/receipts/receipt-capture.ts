import type { AppError } from '@/domain/common/app-error';
import { type AppResult, isErr, ok } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import {
  buildReceiptCaptureDraftPayload,
  toCaptureDraftPayload,
  type ReceiptCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import {
  expoReceiptCamera,
  type ReceiptCameraPort,
  type ReceiptPhotoSource,
} from '@/services/camera/camera.service';
import {
  persistReceiptImageReference,
  type PersistedReceiptImageReference,
} from '@/services/files/receipt-file-store';
import {
  saveActiveCaptureDraft,
  type SaveActiveCaptureDraftRequest,
} from '@/services/capture-drafts/capture-draft.service';

export type ReceiptCaptureOutcome =
  | {
      reason: 'camera_permission' | 'library_permission';
      status: 'permission_denied';
    }
  | {
      source: ReceiptPhotoSource;
      status: 'canceled';
    }
  | {
      draft: CaptureDraft;
      payload: ReceiptCaptureDraftPayload;
      source: ReceiptPhotoSource;
      status: 'draft_saved';
    };

export type ReceiptCaptureDependencies = {
  camera?: ReceiptCameraPort;
  now?: () => Date;
  persistImage?: typeof persistReceiptImageReference;
  saveDraft?: (input: SaveActiveCaptureDraftRequest) => Promise<AppResult<CaptureDraft>>;
};

export type ReceiptCaptureStatusNotice = {
  actionLabel: string;
  description: string;
  title: string;
  tone: 'neutral' | 'warning';
};

function noticeForPermissionDenied(reason: 'camera_permission' | 'library_permission'): ReceiptCaptureStatusNotice {
  return {
    actionLabel: 'Manual expense',
    description:
      reason === 'camera_permission'
        ? 'Camera access was not granted. You can still enter the expense manually.'
        : 'Photo access was not granted. You can still enter the expense manually.',
    title: 'Manual entry still works',
    tone: 'warning',
  };
}

export function receiptCaptureNoticeForOutcome(
  outcome: ReceiptCaptureOutcome,
): ReceiptCaptureStatusNotice {
  switch (outcome.status) {
    case 'permission_denied':
      return noticeForPermissionDenied(outcome.reason);
    case 'canceled':
      return {
        actionLabel: 'Try again',
        description: 'No receipt photo was saved. You can try again or enter the expense manually.',
        title: 'Receipt capture canceled',
        tone: 'neutral',
      };
    case 'draft_saved':
      return {
        actionLabel: 'Review draft',
        description: 'The receipt photo is saved privately as an expense draft. No expense was created yet.',
        title: 'Receipt draft saved',
        tone: 'neutral',
      };
    default:
      outcome satisfies never;
      return {
        actionLabel: 'Manual expense',
        description: 'Use manual expense entry while receipt capture is unavailable.',
        title: 'Receipt capture unavailable',
        tone: 'warning',
      };
  }
}

function buildPayloadFromPersistedImage(
  image: PersistedReceiptImageReference,
  source: ReceiptPhotoSource,
): ReceiptCaptureDraftPayload {
  return buildReceiptCaptureDraftPayload({
    capturedAt: image.capturedAt,
    contentType: image.contentType,
    originalFileName: image.originalFileName,
    retainedImageUri: image.retainedImageUri,
    sizeBytes: image.sizeBytes,
    source,
  });
}

export async function captureReceiptDraftFromSource(
  source: ReceiptPhotoSource,
  dependencies: ReceiptCaptureDependencies = {},
): Promise<AppResult<ReceiptCaptureOutcome>> {
  const camera = dependencies.camera ?? expoReceiptCamera;
  const photoResult = await (source === 'camera' ? camera.captureReceiptPhoto() : camera.chooseReceiptPhoto());

  if (isErr(photoResult)) {
    return photoResult;
  }

  if (photoResult.value.status === 'permission_denied') {
    return ok({
      reason: photoResult.value.reason,
      status: 'permission_denied',
    });
  }

  if (photoResult.value.status === 'canceled') {
    return ok({
      source,
      status: 'canceled',
    });
  }

  const capturedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const persisted = await (dependencies.persistImage ?? persistReceiptImageReference)({
    capturedAt,
    contentType: photoResult.value.asset.mimeType,
    originalFileName: photoResult.value.asset.fileName,
    sourceUri: photoResult.value.asset.uri,
  });

  if (isErr(persisted)) {
    return persisted;
  }

  const payload = buildPayloadFromPersistedImage(persisted.value, source);
  const draft = await (dependencies.saveDraft ?? saveActiveCaptureDraft)({
    kind: 'expense',
    payload: toCaptureDraftPayload(payload),
  });

  if (isErr(draft)) {
    return draft;
  }

  return ok({
    draft: draft.value,
    payload,
    source,
    status: 'draft_saved',
  });
}

export function receiptCaptureErrorNotice(error: AppError): ReceiptCaptureStatusNotice {
  return {
    actionLabel: error.recovery === 'retry' ? 'Try again' : 'Manual expense',
    description: 'Receipt capture did not finish. Your data was not sent anywhere, and manual entry is still available.',
    title: 'Receipt capture needs attention',
    tone: 'warning',
  };
}
