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
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type {
  CaptureDraft,
  CaptureDraftKind,
  CaptureDraftPayload,
  CaptureDraftSavedRecordKind,
} from '@/domain/capture-drafts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type SaveActiveCaptureDraftRequest = {
  kind: CaptureDraftKind;
  payload: CaptureDraftPayload;
};

export type MarkActiveCaptureDraftSavedRequest = {
  kind: CaptureDraftKind;
  savedRecordId: string;
  savedRecordKind: CaptureDraftSavedRecordKind;
};

export type CaptureDraftActionRequest = {
  id: string;
};

export type CaptureDraftServiceDependencies = {
  createDraftId?: () => string;
  createRepository?: (database: unknown) => CaptureDraftRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedCaptureDraftAccess = {
  now: Date;
  repository: CaptureDraftRepository;
};

function defaultCreateDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareCaptureDraftAccess({
  createRepository: createRepositoryDependency = (database) =>
    createCaptureDraftRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: CaptureDraftServiceDependencies = {}): Promise<AppResult<PreparedCaptureDraftAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local capture draft data could not be opened.', 'retry', cause));
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

export async function saveActiveCaptureDraft(
  input: SaveActiveCaptureDraftRequest,
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const timestamp = access.value.now.toISOString();
  const id = asEntityId((dependencies.createDraftId ?? defaultCreateDraftId)());

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Capture draft id was invalid.', 'retry', id.error));
  }

  return access.value.repository.upsertActiveDraft({
    id: id.value,
    kind: input.kind,
    payload: input.payload,
    timestamp,
    workspaceId: localWorkspaceId,
  });
}

export async function listActiveCaptureDrafts(
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft[]>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.repository.listActiveDrafts(localWorkspaceId);
}

export async function getActiveCaptureDraft(
  kind: CaptureDraftKind,
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft | null>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.repository.getActiveDraftByKind(localWorkspaceId, kind);
}

export async function discardCaptureDraft(
  input: CaptureDraftActionRequest,
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid capture draft.', 'edit', id.error));
  }

  return access.value.repository.discardDraft(localWorkspaceId, id.value, access.value.now.toISOString());
}

export async function keepCaptureDraft(
  input: CaptureDraftActionRequest,
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId(input.id);

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Choose a valid capture draft.', 'edit', id.error));
  }

  return access.value.repository.keepDraft(localWorkspaceId, id.value, access.value.now.toISOString());
}

export async function markActiveCaptureDraftSaved(
  input: MarkActiveCaptureDraftSavedRequest,
  dependencies: CaptureDraftServiceDependencies = {},
): Promise<AppResult<CaptureDraft | null>> {
  const access = await prepareCaptureDraftAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const savedRecordId = asEntityId(input.savedRecordId);

  if (!savedRecordId.ok) {
    return err(createAppError('validation_failed', 'Saved record id was invalid.', 'retry', savedRecordId.error));
  }

  return access.value.repository.markActiveDraftSavedByKind(localWorkspaceId, input.kind, {
    savedAt: access.value.now.toISOString(),
    savedRecordId: savedRecordId.value,
    savedRecordKind: input.savedRecordKind,
  });
}
