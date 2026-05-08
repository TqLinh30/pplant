import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createCaptureDraftRepository,
  type CaptureDraftRepository,
} from '@/data/repositories/capture-drafts.repository';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import {
  markReceiptImageDeleted,
  parseReceiptCaptureDraftPayload,
  receiptDraftHasRetainedImage,
  toCaptureDraftPayload,
  updateReceiptRetentionPolicy,
  type ReceiptCaptureDraftPayload,
  type ReceiptImageRetentionDeletionReason,
  type ReceiptImageRetentionPolicy,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId } from '@/domain/workspace/types';

import { deleteReceiptImageReference } from './receipt-file-store';

export type DeleteReceiptDraftImageRequest = {
  deletionReason?: ReceiptImageRetentionDeletionReason;
  draftId: string;
};

export type SetReceiptDraftRetentionPolicyRequest = {
  draftId: string;
  retentionPolicy: ReceiptImageRetentionPolicy;
};

export type ReceiptImageDeletionResult = {
  deleted: boolean;
  deletedBytes: number;
  draft: CaptureDraft;
};

export type ReceiptRetentionCleanupReport = {
  cleaned: number;
  cleanedBytes: number;
  cutoff: string;
  skipped: number;
  thresholdDays: number;
};

type ReceiptRetentionRepository = Pick<
  CaptureDraftRepository,
  'discardDraft' | 'getDraft' | 'listActiveDraftsUpdatedBefore' | 'updateDraftPayload'
>;

export type ReceiptRetentionServiceDependencies = {
  createRepository?: (database: unknown) => ReceiptRetentionRepository;
  deleteImage?: typeof deleteReceiptImageReference;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
  repository?: ReceiptRetentionRepository;
};

type PreparedRetentionAccess = {
  now: Date;
  repository: ReceiptRetentionRepository;
};

async function prepareRetentionAccess({
  createRepository: createRepositoryDependency = (database) =>
    createCaptureDraftRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
  repository,
}: ReceiptRetentionServiceDependencies = {}): Promise<AppResult<PreparedRetentionAccess>> {
  const now = nowDependency();

  if (repository) {
    return ok({ now, repository });
  }

  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local receipt retention data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    now,
    repository: createRepositoryDependency(database),
  });
}

function parseReceiptDraftPayload(draft: CaptureDraft): AppResult<ReceiptCaptureDraftPayload> {
  if (draft.kind !== 'expense') {
    return err(createAppError('validation_failed', 'Choose a receipt draft.', 'edit'));
  }

  return parseReceiptCaptureDraftPayload(draft.payload);
}

async function loadReceiptDraft(
  repository: ReceiptRetentionRepository,
  draftId: string,
): Promise<AppResult<CaptureDraft>> {
  const id = asEntityId(draftId);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt draft.', 'edit', id.error));
  }

  const draft = await repository.getDraft(localWorkspaceId, id.value);

  if (isErr(draft)) {
    return draft;
  }

  if (!draft.value) {
    return err(createAppError('not_found', 'Receipt draft was not found.', 'edit'));
  }

  return ok(draft.value);
}

export async function setReceiptDraftRetentionPolicy(
  input: SetReceiptDraftRetentionPolicyRequest,
  dependencies: ReceiptRetentionServiceDependencies = {},
): Promise<AppResult<CaptureDraft>> {
  const access = await prepareRetentionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const draft = await loadReceiptDraft(access.value.repository, input.draftId);

  if (isErr(draft)) {
    return draft;
  }

  const payload = parseReceiptDraftPayload(draft.value);

  if (isErr(payload)) {
    return payload;
  }

  return access.value.repository.updateDraftPayload(localWorkspaceId, draft.value.id, {
    payload: toCaptureDraftPayload(updateReceiptRetentionPolicy(payload.value, input.retentionPolicy)),
    timestamp: access.value.now.toISOString(),
  });
}

export async function deleteReceiptDraftImage(
  input: DeleteReceiptDraftImageRequest,
  dependencies: ReceiptRetentionServiceDependencies = {},
): Promise<AppResult<ReceiptImageDeletionResult>> {
  const access = await prepareRetentionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const draft = await loadReceiptDraft(access.value.repository, input.draftId);

  if (isErr(draft)) {
    return draft;
  }

  const payload = parseReceiptDraftPayload(draft.value);

  if (isErr(payload)) {
    return payload;
  }

  if (!receiptDraftHasRetainedImage(payload.value)) {
    return ok({ deleted: false, deletedBytes: 0, draft: draft.value });
  }

  const deletion = await (dependencies.deleteImage ?? deleteReceiptImageReference)(
    payload.value.receipt.retainedImageUri,
  );

  if (isErr(deletion)) {
    return deletion;
  }

  const deletedAt = access.value.now.toISOString();
  const updatedPayload = markReceiptImageDeleted(payload.value, {
    deletedAt,
    deletionReason: input.deletionReason ?? 'user_deleted',
  });
  const updatedDraft = await access.value.repository.updateDraftPayload(localWorkspaceId, draft.value.id, {
    payload: toCaptureDraftPayload(updatedPayload),
    timestamp: deletedAt,
  });

  if (isErr(updatedDraft)) {
    return updatedDraft;
  }

  return ok({
    deleted: deletion.value.deleted,
    deletedBytes: deletion.value.sizeBytes ?? payload.value.receipt.sizeBytes ?? 0,
    draft: updatedDraft.value,
  });
}

export async function cleanupAbandonedReceiptDrafts(
  dependencies: ReceiptRetentionServiceDependencies & { thresholdDays?: number } = {},
): Promise<AppResult<ReceiptRetentionCleanupReport>> {
  const access = await prepareRetentionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const thresholdDays = dependencies.thresholdDays ?? 30;
  const cutoffDate = new Date(access.value.now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);
  const cutoff = cutoffDate.toISOString();
  const candidates = await access.value.repository.listActiveDraftsUpdatedBefore(localWorkspaceId, cutoff);

  if (isErr(candidates)) {
    return candidates;
  }

  let cleaned = 0;
  let cleanedBytes = 0;
  let skipped = 0;

  for (const draft of candidates.value) {
    const payload = parseReceiptDraftPayload(draft);

    if (isErr(payload) || !receiptDraftHasRetainedImage(payload.value) || draft.savedRecordId !== null) {
      skipped += 1;
      continue;
    }

    const deleted = await deleteReceiptDraftImage(
      {
        deletionReason: 'abandoned_cleanup',
        draftId: draft.id,
      },
      {
        ...dependencies,
        now: () => access.value.now,
        repository: access.value.repository,
      },
    );

    if (isErr(deleted)) {
      return deleted;
    }

    const discarded = await access.value.repository.discardDraft(
      localWorkspaceId,
      draft.id,
      access.value.now.toISOString(),
    );

    if (isErr(discarded)) {
      return discarded;
    }

    cleaned += 1;
    cleanedBytes += deleted.value.deletedBytes;
  }

  return ok({
    cleaned,
    cleanedBytes,
    cutoff,
    skipped,
    thresholdDays,
  });
}
