import { openPplantDatabase } from '@/data/db/client';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type MigrationReport = {
  applied: number;
  appliedMigrations: string[];
};

export type MigrationClient = {
  execSync(source: string): void;
  getFirstSync<T>(source: string, ...params: unknown[]): T | null;
  runSync(source: string, ...params: unknown[]): unknown;
};

export type MigrationDatabase = {
  $client: MigrationClient;
};

export type OpenMigrationDatabase = () => MigrationDatabase;

export const workspaceMigrationId = '001_create_local_workspace';

const createMigrationTrackingTableSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);
`;

const workspaceMigrationSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1
);
`;

const migrations = [
  {
    id: workspaceMigrationId,
    sql: workspaceMigrationSql,
  },
] as const;

function hasMigration(client: MigrationClient, migrationId: string): boolean {
  return client.getFirstSync<{ id: string }>(
    'SELECT id FROM schema_migrations WHERE id = ? LIMIT 1',
    migrationId,
  ) !== null;
}

function recordMigration(client: MigrationClient, migrationId: string, now: Date): void {
  client.runSync('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', migrationId, now.toISOString());
}

export async function migrateDatabase(
  database?: MigrationDatabase,
  now: Date = new Date(),
  openDatabase: OpenMigrationDatabase = openPplantDatabase,
): Promise<AppResult<MigrationReport>> {
  try {
    const client = (database ?? openDatabase()).$client;
    const appliedMigrations: string[] = [];

    client.execSync(createMigrationTrackingTableSql);

    for (const migration of migrations) {
      if (hasMigration(client, migration.id)) {
        continue;
      }

      client.execSync(migration.sql);
      recordMigration(client, migration.id, now);
      appliedMigrations.push(migration.id);
    }

    return ok({
      applied: appliedMigrations.length,
      appliedMigrations,
    });
  } catch (cause) {
    return err(
      createAppError(
        'unavailable',
        'Local data could not be prepared. Please try again.',
        'retry',
        cause,
      ),
    );
  }
}
