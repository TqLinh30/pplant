import type { AppError } from '@/domain/common/app-error';
import { isErr, ok, type AppResult } from '@/domain/common/result';
import { expoPhotoCamera, type PhotoCameraPort } from '@/services/camera/camera.service';
import {
  persistJournalImageReference,
  type PersistedJournalImageReference,
} from '@/services/files/journal-file-store';

export type JournalPhotoCaptureOutcome =
  | {
      reason: 'camera_permission';
      status: 'permission_denied';
    }
  | {
      status: 'canceled';
    }
  | {
      photo: PersistedJournalImageReference;
      status: 'photo_saved';
    };

export type JournalPhotoCaptureDependencies = {
  camera?: PhotoCameraPort;
  now?: () => Date;
  persistImage?: typeof persistJournalImageReference;
};

export type JournalCaptureNotice = {
  description: string;
  title: string;
  tone: 'neutral' | 'warning';
};

export async function captureJournalPhoto(
  dependencies: JournalPhotoCaptureDependencies = {},
): Promise<AppResult<JournalPhotoCaptureOutcome>> {
  const camera = dependencies.camera ?? expoPhotoCamera;
  const photoResult = await camera.capturePhoto();

  if (isErr(photoResult)) {
    return photoResult;
  }

  if (photoResult.value.status === 'permission_denied') {
    return ok({
      reason: 'camera_permission',
      status: 'permission_denied',
    });
  }

  if (photoResult.value.status === 'canceled') {
    return ok({
      status: 'canceled',
    });
  }

  const capturedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const persisted = await (dependencies.persistImage ?? persistJournalImageReference)({
    capturedAt,
    contentType: photoResult.value.asset.mimeType,
    originalFileName: photoResult.value.asset.fileName,
    sourceUri: photoResult.value.asset.uri,
  });

  if (isErr(persisted)) {
    return persisted;
  }

  return ok({
    photo: persisted.value,
    status: 'photo_saved',
  });
}

export function journalCaptureNoticeForOutcome(outcome: JournalPhotoCaptureOutcome): JournalCaptureNotice {
  switch (outcome.status) {
    case 'permission_denied':
      return {
        description: 'Camera access was not granted. Journal entries need a photo, so you can try again after allowing camera access.',
        title: 'Camera needed',
        tone: 'warning',
      };
    case 'canceled':
      return {
        description: 'No photo was saved. Take a photo when you are ready to create the journal entry.',
        title: 'Photo canceled',
        tone: 'neutral',
      };
    case 'photo_saved':
      return {
        description: 'Choose the mood that matches this moment, then save the entry.',
        title: 'Photo ready',
        tone: 'neutral',
      };
    default:
      outcome satisfies never;
      return {
        description: 'Take a photo to continue.',
        title: 'Photo needed',
        tone: 'warning',
      };
  }
}

export function journalCaptureErrorNotice(error: AppError): JournalCaptureNotice {
  return {
    description: error.recovery === 'edit'
      ? 'Check the entry details and try again.'
      : 'Your journal entry was not saved. Try taking the photo again when ready.',
    title: 'Journal capture needs attention',
    tone: 'warning',
  };
}
