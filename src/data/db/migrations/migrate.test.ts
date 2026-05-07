import {
  migrateDatabase,
  preferencesMigrationId,
  workspaceMigrationId,
  type MigrationClient,
} from './migrate';

class FakeMigrationClient implements MigrationClient {
  readonly executedSql: string[] = [];
  readonly appliedMigrations = new Set<string>();
  failOnExec = false;

  execSync(source: string): void {
    if (this.failOnExec) {
      throw new Error('sqlite unavailable');
    }

    this.executedSql.push(source);
  }

  getFirstSync<T>(_source: string, ...params: unknown[]): T | null {
    const [migrationId] = params;

    if (typeof migrationId === 'string' && this.appliedMigrations.has(migrationId)) {
      return { id: migrationId } as T;
    }

    return null;
  }

  runSync(_source: string, ...params: unknown[]): unknown {
    const [migrationId] = params;

    if (typeof migrationId === 'string') {
      this.appliedMigrations.add(migrationId);
    }

    return { changes: 1 };
  }
}

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

describe('local database migrations', () => {
  it('applies local migrations once and tracks them', async () => {
    const client = new FakeMigrationClient();

    const firstRun = await migrateDatabase({ $client: client }, fixedNow);
    const secondRun = await migrateDatabase({ $client: client }, fixedNow);

    expect(firstRun).toEqual({
      ok: true,
      value: {
        applied: 2,
        appliedMigrations: [workspaceMigrationId, preferencesMigrationId],
      },
    });
    expect(secondRun).toEqual({
      ok: true,
      value: {
        applied: 0,
        appliedMigrations: [],
      },
    });
    expect(client.appliedMigrations.has(workspaceMigrationId)).toBe(true);
    expect(client.appliedMigrations.has(preferencesMigrationId)).toBe(true);
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS workspaces');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS user_preferences');
    expect(client.executedSql.join('\n')).not.toContain('DROP TABLE');
  });

  it('preserves already applied migrations and only runs missing ones', async () => {
    const client = new FakeMigrationClient();
    client.appliedMigrations.add(workspaceMigrationId);

    const result = await migrateDatabase({ $client: client }, fixedNow);

    expect(result).toEqual({
      ok: true,
      value: {
        applied: 1,
        appliedMigrations: [preferencesMigrationId],
      },
    });
    expect(client.executedSql.join('\n')).not.toContain('CREATE TABLE IF NOT EXISTS workspaces');
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS user_preferences');
  });

  it('returns a retryable local error when migration setup fails', async () => {
    const client = new FakeMigrationClient();
    client.failOnExec = true;

    const result = await migrateDatabase({ $client: client }, fixedNow);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });

  it('returns a retryable local error when the default database cannot open', async () => {
    const result = await migrateDatabase(undefined, fixedNow, () => {
      throw new Error('sqlite open failed');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });
});
