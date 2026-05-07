import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import { migrateDatabase, type MigrationDatabase, type MigrationReport } from '@/data/db/migrations/migrate';
import {
  createPreferencesRepository,
  type PreferencesRepository,
} from '@/data/repositories/preferences.repository';
import { createAppError } from '@/domain/common/app-error';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

export type SaveUserPreferencesRequest = {
  currencyCode: string;
  defaultHourlyWageMinor: number;
  locale: string;
  monthlyBudgetResetDay: number;
};

export type PreferencesServiceDependencies = {
  createPreferencesRepository?: (database: unknown) => PreferencesRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
};

type PreparedPreferencesAccess = {
  now: Date;
  repository: PreferencesRepository;
};

async function preparePreferencesAccess({
  createPreferencesRepository: createPreferencesRepositoryDependency = (database) =>
    createPreferencesRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
}: PreferencesServiceDependencies = {}): Promise<AppResult<PreparedPreferencesAccess>> {
  const now = nowDependency();
  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local preferences data could not be opened. Please try again.',
        'retry',
        cause,
      ),
    );
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    now,
    repository: createPreferencesRepositoryDependency(database),
  });
}

export async function loadUserPreferences(
  dependencies: PreferencesServiceDependencies = {},
): Promise<AppResult<UserPreferences>> {
  const access = await preparePreferencesAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const result = await access.value.repository.loadPreferences(localWorkspaceId);

  if (isErr(result)) {
    return result;
  }

  if (!result.value) {
    return err(
      createAppError(
        'not_found',
        'Preferences have not been saved yet.',
        'settings',
      ),
    );
  }

  return ok(result.value);
}

export async function saveUserPreferences(
  input: SaveUserPreferencesRequest,
  dependencies: PreferencesServiceDependencies = {},
): Promise<AppResult<UserPreferences>> {
  const access = await preparePreferencesAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.repository.savePreferences(
    {
      ...input,
      defaultHourlyWageCurrencyCode: input.currencyCode,
      workspaceId: localWorkspaceId,
    },
    { now: access.value.now },
  );
}
