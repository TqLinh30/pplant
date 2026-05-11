import * as ImagePicker from 'expo-image-picker';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type ReceiptPhotoSource = 'camera' | 'library';
export type CameraPhotoSource = ReceiptPhotoSource;

export type ReceiptPhotoAsset = {
  fileName: string | null;
  mimeType: string | null;
  uri: string;
};
export type CameraPhotoAsset = ReceiptPhotoAsset;

export type ReceiptPhotoSelectionOutcome =
  | { reason: 'camera_permission'; status: 'permission_denied' }
  | { reason: 'library_permission'; status: 'permission_denied' }
  | { source: ReceiptPhotoSource; status: 'canceled' }
  | { asset: ReceiptPhotoAsset; source: ReceiptPhotoSource; status: 'selected' };
export type CameraPhotoSelectionOutcome = ReceiptPhotoSelectionOutcome;

export type ReceiptCameraPort = {
  captureReceiptPhoto(): Promise<AppResult<ReceiptPhotoSelectionOutcome>>;
  chooseReceiptPhoto(): Promise<AppResult<ReceiptPhotoSelectionOutcome>>;
};

export type PhotoCameraPort = {
  capturePhoto(): Promise<AppResult<CameraPhotoSelectionOutcome>>;
  choosePhoto(): Promise<AppResult<CameraPhotoSelectionOutcome>>;
};

function normalizeAsset(asset: ImagePicker.ImagePickerAsset): ReceiptPhotoAsset {
  return {
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    uri: asset.uri,
  };
}

function imagePickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    allowsEditing: false,
    mediaTypes: ['images'],
    quality: 0.85,
  };
}

function firstAsset(
  result: ImagePicker.ImagePickerResult,
  source: ReceiptPhotoSource,
): ReceiptPhotoSelectionOutcome {
  if (result.canceled) {
    return { source, status: 'canceled' };
  }

  const asset = result.assets[0];

  if (!asset) {
    return { source, status: 'canceled' };
  }

  return {
    asset: normalizeAsset(asset),
    source,
    status: 'selected',
  };
}

export const expoPhotoCamera: PhotoCameraPort = {
  async capturePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        return ok({ reason: 'camera_permission', status: 'permission_denied' });
      }

      const result = await ImagePicker.launchCameraAsync(imagePickerOptions());

      return ok(firstAsset(result, 'camera'));
    } catch (cause) {
      return err(createAppError('unavailable', 'Camera could not open.', 'manual_entry', cause));
    }
  },

  async choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);

      if (!permission.granted) {
        return ok({ reason: 'library_permission', status: 'permission_denied' });
      }

      const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions());

      return ok(firstAsset(result, 'library'));
    } catch (cause) {
      return err(createAppError('unavailable', 'Photo picker could not open.', 'manual_entry', cause));
    }
  },
};

export const expoReceiptCamera: ReceiptCameraPort = {
  captureReceiptPhoto: expoPhotoCamera.capturePhoto,
  chooseReceiptPhoto: expoPhotoCamera.choosePhoto,
};

export async function captureReceiptImage(): Promise<AppResult<ReceiptPhotoAsset>> {
  const result = await expoReceiptCamera.captureReceiptPhoto();

  if (!result.ok) {
    return result;
  }

  if (result.value.status !== 'selected') {
    return err(createAppError('unavailable', 'No receipt photo was selected.', 'manual_entry'));
  }

  return ok(result.value.asset);
}
