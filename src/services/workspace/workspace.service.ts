import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import { migrateDatabase, type MigrationDatabase, type MigrationReport } from '@/data/db/migrations/migrate';
import { createWorkspaceRepository, type WorkspaceRepository } from '@/data/repositories/workspace.repository';
import { createAppError } from '@/domain/common/app-error';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { Workspace } from '@/domain/workspace/types';

export type EnsureLocalWorkspaceResult = {
  workspace: Workspace;
  migrationReport: MigrationReport;
  created: boolean;
};

export type EnsureLocalWorkspaceDependencies = {
  openDatabase?: () => unknown;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  createWorkspaceRepository?: (database: unknown) => WorkspaceRepository;
  now?: () => Date;
};

export async function ensureLocalWorkspace({
  openDatabase: openDatabaseDependency = openPplantDatabase,
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  createWorkspaceRepository: createWorkspaceRepositoryDependency = (database) =>
    createWorkspaceRepository(database as PplantDatabase),
  now: nowDependency = () => new Date(),
}: EnsureLocalWorkspaceDependencies = {}): Promise<AppResult<EnsureLocalWorkspaceResult>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local workspace data could not be opened. Please try again.',
        'retry',
        cause,
      ),
    );
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  const repository = createWorkspaceRepositoryDependency(database);
  const existingWorkspaces = await repository.listWorkspaces();

  if (isErr(existingWorkspaces)) {
    return existingWorkspaces;
  }

  if (existingWorkspaces.value.length === 1) {
    return ok({
      workspace: existingWorkspaces.value[0],
      migrationReport: migrationResult.value,
      created: false,
    });
  }

  if (existingWorkspaces.value.length > 1) {
    return err(
      createAppError(
        'conflict',
        'Pplant found more than one local workspace. Please try again.',
        'retry',
      ),
    );
  }

  const createdWorkspace = await repository.createLocalWorkspace({ now });

  if (isErr(createdWorkspace)) {
    return createdWorkspace;
  }

  return ok({
    workspace: createdWorkspace.value,
    migrationReport: migrationResult.value,
    created: true,
  });
}
