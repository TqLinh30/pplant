import { migrateDatabase, workspaceMigrationId, type MigrationClient } from './migrate';

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

describe('workspace migrations', () => {
  it('applies the workspace migration once and tracks it', async () => {
    const client = new FakeMigrationClient();

    const firstRun = await migrateDatabase({ $client: client }, fixedNow);
    const secondRun = await migrateDatabase({ $client: client }, fixedNow);

    expect(firstRun).toEqual({
      ok: true,
      value: {
        applied: 1,
        appliedMigrations: [workspaceMigrationId],
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
    expect(client.executedSql.join('\n')).toContain('CREATE TABLE IF NOT EXISTS workspaces');
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
