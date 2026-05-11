import * as FileSystem from 'expo-file-system/legacy';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type PersistJournalImageReferenceInput = {
  capturedAt?: string;
  contentType?: string | null;
  originalFileName?: string | null;
  sourceUri: string;
};

export type PersistedJournalImageReference = {
  capturedAt: string;
  contentType: string | null;
  originalFileName: string | null;
  photoUri: string;
  sizeBytes: number | null;
  storageScope: 'app_private_documents';
};

export type JournalFileInfo = {
  exists: boolean;
  size?: number;
};

export type JournalFileSystemAdapter = {
  copyAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<JournalFileInfo>;
  makeDirectoryAsync(uri: string, options: { idempotent: boolean; intermediates: boolean }): Promise<void>;
};

export type JournalFileStoreDependencies = {
  createReferenceId?: () => string;
  fileSystem?: JournalFileSystemAdapter;
  now?: () => Date;
};

const defaultFileSystem: JournalFileSystemAdapter = {
  copyAsync: FileSystem.copyAsync,
  deleteAsync: FileSystem.deleteAsync,
  documentDirectory: FileSystem.documentDirectory,
  getInfoAsync: FileSystem.getInfoAsync,
  makeDirectoryAsync: FileSystem.makeDirectoryAsync,
};

function ensureTrailingSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}

function journalDirectoryFor(fileSystem: JournalFileSystemAdapter): string | null {
  if (!fileSystem.documentDirectory) {
    return null;
  }

  return `${ensureTrailingSlash(fileSystem.documentDirectory)}journal/`;
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

  return sanitized.length > 0 ? sanitized : 'journal';
}

function defaultReferenceId(): string {
  return `journal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function persistJournalImageReference(
  input: PersistJournalImageReferenceInput,
  dependencies: JournalFileStoreDependencies = {},
): Promise<AppResult<PersistedJournalImageReference>> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;
  const capturedAt = input.capturedAt ?? (dependencies.now ?? (() => new Date()))().toISOString();

  if (input.sourceUri.trim().length === 0) {
    return err(createAppError('validation_failed', 'Capture a journal photo before saving.', 'edit'));
  }

  const journalDirectory = journalDirectoryFor(fileSystem);

  if (!journalDirectory) {
    return err(createAppError('unavailable', 'Private journal photo storage is unavailable.', 'retry'));
  }

  const extension = sanitizeExtension(input.originalFileName ?? input.sourceUri);
  const referenceId = sanitizeReferenceId((dependencies.createReferenceId ?? defaultReferenceId)());
  const photoUri = `${journalDirectory}${referenceId}.${extension}`;

  try {
    await fileSystem.makeDirectoryAsync(journalDirectory, {
      idempotent: true,
      intermediates: true,
    });
    await fileSystem.copyAsync({
      from: input.sourceUri,
      to: photoUri,
    });

    const info = await fileSystem.getInfoAsync(photoUri);

    if (!info.exists) {
      return err(createAppError('unavailable', 'Journal photo could not be saved locally.', 'retry'));
    }

    return ok({
      capturedAt,
      contentType: input.contentType ?? null,
      originalFileName: input.originalFileName ?? null,
      photoUri,
      sizeBytes: typeof info.size === 'number' ? info.size : null,
      storageScope: 'app_private_documents',
    });
  } catch (cause) {
    return err(createAppError('unavailable', 'Journal photo could not be saved locally.', 'retry', cause));
  }
}

export async function deleteJournalImageReference(
  photoUri: string | null,
  dependencies: JournalFileStoreDependencies = {},
): Promise<AppResult<{ deleted: boolean; sizeBytes: number | null }>> {
  const fileSystem = dependencies.fileSystem ?? defaultFileSystem;

  if (!photoUri || photoUri.trim().length === 0) {
    return ok({ deleted: false, sizeBytes: null });
  }

  const journalDirectory = journalDirectoryFor(fileSystem);

  if (!journalDirectory) {
    return err(createAppError('unavailable', 'Private journal photo storage is unavailable.', 'retry'));
  }

  if (!photoUri.startsWith(journalDirectory)) {
    return err(createAppError('validation_failed', 'Journal photo is outside private storage.', 'edit'));
  }

  try {
    const info = await fileSystem.getInfoAsync(photoUri);

    if (!info.exists) {
      return ok({ deleted: false, sizeBytes: null });
    }

    await fileSystem.deleteAsync(photoUri, { idempotent: true });

    return ok({
      deleted: true,
      sizeBytes: typeof info.size === 'number' ? info.size : null,
    });
  } catch (cause) {
    return err(createAppError('unavailable', 'Journal photo could not be deleted locally.', 'retry', cause));
  }
}
