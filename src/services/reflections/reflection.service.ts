import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createReflectionRepository,
  type ReflectionRepository,
} from '@/data/repositories/reflections.repository';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type {
  Reflection,
  ReflectionPeriod,
  ReflectionPromptId,
  ReflectionState,
} from '@/domain/reflections/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type SaveReflectionPromptRequest = {
  period: ReflectionPeriod;
  promptId: ReflectionPromptId;
  promptText: string;
  responseText?: string | null;
  state: ReflectionState;
};

export type ListPeriodReflectionsRequest = {
  period: ReflectionPeriod;
};

export type ReflectionServiceDependencies = {
  createId?: () => string;
  createRepository?: (database: unknown) => ReflectionRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedReflectionAccess = {
  now: Date;
  repository: ReflectionRepository;
};

function defaultCreateReflectionId(): string {
  return `reflection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareReflectionAccess({
  createRepository: createRepositoryDependency = (database) =>
    createReflectionRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: ReflectionServiceDependencies = {}): Promise<AppResult<PreparedReflectionAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local reflection data could not be opened.', 'retry', cause));
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

export async function saveReflectionPrompt(
  input: SaveReflectionPromptRequest,
  dependencies: ReflectionServiceDependencies = {},
): Promise<AppResult<Reflection>> {
  const access = await prepareReflectionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const id = asEntityId((dependencies.createId ?? defaultCreateReflectionId)());

  if (!id.ok) {
    return err(createAppError('validation_failed', 'Reflection id was invalid.', 'retry', id.error));
  }

  return access.value.repository.saveReflection({
    id: id.value,
    period: input.period,
    promptId: input.promptId,
    promptText: input.promptText,
    responseText: input.responseText ?? null,
    state: input.state,
    timestamp: access.value.now.toISOString(),
    workspaceId: localWorkspaceId,
  });
}

export async function listPeriodReflections(
  input: ListPeriodReflectionsRequest,
  dependencies: ReflectionServiceDependencies = {},
): Promise<AppResult<Reflection[]>> {
  const access = await prepareReflectionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.repository.listReflectionsForPeriod(localWorkspaceId, input.period);
}

export async function listRecentReflections(
  dependencies: ReflectionServiceDependencies = {},
  options: { limit?: number } = {},
): Promise<AppResult<Reflection[]>> {
  const access = await prepareReflectionAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.repository.listRecentReflections(localWorkspaceId, options);
}
