import { err, ok } from '@/domain/common/result';
import { createAppError } from '@/domain/common/app-error';
import { createLocalWorkspace, localWorkspaceId, type Workspace } from '@/domain/workspace/types';
import type { MigrationReport } from '@/data/db/migrations/migrate';
import type { WorkspaceRepository } from '@/data/repositories/workspace.repository';

import { ensureLocalWorkspace } from './workspace.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');
const migrationReport: MigrationReport = {
  applied: 1,
  appliedMigrations: ['001_create_local_workspace'],
};

function mustCreateWorkspace(): Workspace {
  const result = createLocalWorkspace({ now: fixedNow });

  if (!result.ok) {
    throw new Error('test workspace fixture failed');
  }

  return result.value;
}

function createFakeRepository(initialRows: Workspace[] = []): WorkspaceRepository & {
  createCalls: number;
} {
  const rows = [...initialRows];

  return {
    createCalls: 0,
    async listWorkspaces() {
      return ok([...rows]);
    },
    async createLocalWorkspace(options) {
      this.createCalls += 1;
      const workspace = createLocalWorkspace(options);

      if (!workspace.ok) {
        return workspace;
      }

      rows.push(workspace.value);
      return ok(workspace.value);
    },
  };
}

describe('workspace initialization service', () => {
  it('runs migrations and creates a local workspace on first launch', async () => {
    const repository = createFakeRepository();

    const result = await ensureLocalWorkspace({
      createWorkspaceRepository: () => repository,
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspace.id).toBe(localWorkspaceId);
      expect(result.value.created).toBe(true);
      expect(result.value.migrationReport).toBe(migrationReport);
    }
    expect(repository.createCalls).toBe(1);
  });

  it('loads the existing workspace without creating duplicates', async () => {
    const existingWorkspace = mustCreateWorkspace();
    const repository = createFakeRepository([existingWorkspace]);

    const result = await ensureLocalWorkspace({
      createWorkspaceRepository: () => repository,
      migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspace).toEqual(existingWorkspace);
      expect(result.value.created).toBe(false);
    }
    expect(repository.createCalls).toBe(0);
  });

  it('returns a recoverable conflict when multiple local workspaces exist', async () => {
    const first = mustCreateWorkspace();
    const second = { ...first, id: 'other-local-workspace' as Workspace['id'] };
    const repository = createFakeRepository([first, second]);

    const result = await ensureLocalWorkspace({
      createWorkspaceRepository: () => repository,
      migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('conflict');
      expect(result.error.recovery).toBe('retry');
    }
  });

  it('stops before repository work when migration fails', async () => {
    const repository = createFakeRepository();

    const result = await ensureLocalWorkspace({
      createWorkspaceRepository: () => repository,
      migrateDatabase: async () =>
        err(createAppError('unavailable', 'Local data could not be prepared.', 'retry')),
      now: () => fixedNow,
      openDatabase: () => ({}),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('retry');
    }
    expect(repository.createCalls).toBe(0);
  });

  it('returns a recoverable local error when the database cannot open', async () => {
    const result = await ensureLocalWorkspace({
      createWorkspaceRepository: () => createFakeRepository(),
      migrateDatabase: async () => ok(migrationReport),
      now: () => fixedNow,
      openDatabase: () => {
        throw new Error('database unavailable');
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unavailable');
      expect(result.error.recovery).toBe('retry');
    }
  });
});
