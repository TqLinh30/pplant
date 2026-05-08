import * as FileSystem from 'expo-file-system/legacy';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type ReceiptImageRetentionPolicy =
  | 'delete_after_expense_saved'
  | 'keep_until_saved_or_discarded'
  | 'keep_until_user_deletes';

export type PersistReceiptImageReferenceInput = {
  capturedAt?: string;
  contentType?: string | null;
  originalFileName?: string | null;
  sourceUri: string;
};

export type PersistedReceiptImageReference = {
  capturedAt: string;
  contentType: string | null;
  originalFileName: string | null;
  retainedImageUri: string;
  retentionAnchor: 'capture_draft';
  retentionPolicy: ReceiptImageRetentionPolicy;
  sizeBytes: number | null;
  storageScope: 'app_private_documents';
};

export type ReceiptFileInfo = {
  exists: boolean;
  size?: number;
};

export type ReceiptFileSystemAdapter = {
  copyAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<ReceiptFileInfo>;
  makeDirectoryAsync(uri: string, options: { idempotent: boolean; intermediates: boolean }): Promise<void>;
};

export type ReceiptFileStoreDependencies = {
  createReferenceId?: () => string;
  fileSystem?: ReceiptFileSystemAdapter;
  now?: () => Date;
};

const defaultFileSystem: ReceiptFileSystemAdapter = {
  copyAsync: FileSystem.copyAsync,
  deleteAsync: FileSystem.deleteAsync,
  documentDirectory: FileSystem.documentDirectory,
  getInfoAsync: FileSystem.getInfoAsync,
  makeDirectoryAsync: FileSystem.makeDirectoryAsync,
};

function normalizeInput(input: PersistReceiptImageReferenceInput | string): PersistReceiptImageReferenceInput {
  if (typeof input === 'string') {
    return { sourceUri: input };
  }

  return input;
}

function ensureTrailingSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}

function receiptDirectoryFor(fileSystem: ReceiptFileSystemAdapter): string | null {
  if (!fileSystem.documentDirectory) {
    return null;
  }

  return `${ensureTrailingSlash(fileSystem.documentDirectory)}receipts/`;
}

function sanitizeExtension(input: string | null | undefined): string {
  const value = input ?? '';
  const withoutQuery = value.split(/[?#]/)[0] ?? '';
  const match = withoutQuery.match(/\.([a-zA-Z0-9]{1,8})$/);

  if (!match) {
    return 'jpg';
  }

  const extension = match[1].toLowerCase();

  if (['heic', 'jpeg', 'jpg', 'png', 'webp'].includes(extension)) {
    return extension;
  }

  return 'jpg';
}

function sanitizeReferenceId(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  return sanitized.length > 0 ? sanitized : 'receipt';
}

function defaultReferenceId(): string {
  return `receipt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function persistReceiptImageReference(
  rawInput: PersistReceiptImageReferenceInput | string,
  dependencies: ReceiptFileStoreDependencies = {},
): Promise<AppResult<PersistedReceiptImageReference>> {
  const input = normalizeInput(rawInput);
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const capturedAt = input.capturedAt ?? (dependencies.now ?? (() => new Date()))().toISOString();

  if (input.sourceUri.trim().length === 0) {
    return err(createAppError('validation_failed', 'Choose a receipt image to save.', 'edit'));
  }

  const receiptDirectory = receiptDirectoryFor(fileSystem);

  if (!receiptDirectory) {
    return err(createAppError('unavailable', 'Private receipt storage is unavailable.', 'manual_entry'));
  }

  const extension = sanitizeExtension(input.originalFileName ?? input.sourceUri);
  const referenceId = sanitizeReferenceId((dependencies.createReferenceId ?? defaultReferenceId)());
  const retainedImageUri = `${receiptDirectory}${referenceId}.${extension}`;

  try {
    await fileSystem.makeDirectoryAsync(receiptDirectory, {
      idempotent: true,
      intermediates: true,
    });
    await fileSystem.copyAsync({
      from: input.sourceUri,
      to: retainedImageUri,
    });

    const info = await fileSystem.getInfoAsync(retainedImageUri);

    if (!info.exists) {
      return err(createAppError('unavailable', 'Receipt image could not be saved locally.', 'manual_entry'));
    }

    return ok({
      capturedAt,
      contentType: input.contentType ?? null,
      originalFileName: input.originalFileName ?? null,
      retainedImageUri,
      retentionAnchor: 'capture_draft',
      retentionPolicy: 'keep_until_user_deletes',
      sizeBytes: typeof info.size === 'number' ? info.size : null,
      storageScope: 'app_private_documents',
    });
  } catch {
    return err(createAppError('unavailable', 'Receipt image could not be saved locally.', 'manual_entry'));
  }
}

export async function deleteReceiptImageReference(
  retainedImageUri: string | null,
  dependencies: ReceiptFileStoreDependencies = {},
): Promise<AppResult<{ deleted: boolean; sizeBytes: number | null }>> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;

  if (!retainedImageUri || retainedImageUri.trim().length === 0) {
    return ok({ deleted: false, sizeBytes: null });
  }

  const receiptDirectory = receiptDirectoryFor(fileSystem);

  if (!receiptDirectory) {
    return err(createAppError('unavailable', 'Private receipt storage is unavailable.', 'retry'));
  }

  if (!retainedImageUri.startsWith(receiptDirectory)) {
    return err(createAppError('validation_failed', 'Receipt image is outside private receipt storage.', 'edit'));
  }

  try {
    const info = await fileSystem.getInfoAsync(retainedImageUri);

    if (!info.exists) {
      return ok({ deleted: false, sizeBytes: null });
    }

    await fileSystem.deleteAsync(retainedImageUri, { idempotent: true });

    return ok({
      deleted: true,
      sizeBytes: typeof info.size === 'number' ? info.size : null,
    });
  } catch {
    return err(createAppError('unavailable', 'Receipt image could not be deleted locally.', 'retry'));
  }
}
