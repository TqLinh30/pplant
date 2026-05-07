import { eq } from 'drizzle-orm';

import type { PplantDatabase } from '@/data/db/client';
import { workspaces } from '@/data/db/schema';
import type { RepositoryWriteOptions } from '@/data/repositories';
import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';
import { parseWorkspaceRow } from '@/domain/workspace/schemas';
import { createLocalWorkspace, localWorkspaceId, type Workspace } from '@/domain/workspace/types';

export type WorkspaceRepository = {
  listWorkspaces(): Promise<AppResult<Workspace[]>>;
  createLocalWorkspace(options: RepositoryWriteOptions): Promise<AppResult<Workspace>>;
};

export function createWorkspaceRepository(database: PplantDatabase): WorkspaceRepository {
  return {
    async listWorkspaces() {
      try {
        const rows = database.select().from(workspaces).all();
        const parsedRows: Workspace[] = [];

        for (const row of rows) {
          const parsed = parseWorkspaceRow(row);

          if (!parsed.ok) {
            return parsed;
          }

          parsedRows.push(parsed.value);
        }

        return ok(parsedRows);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local workspace data could not be loaded.', 'retry', cause));
      }
    },

    async createLocalWorkspace({ now }) {
      const workspace = createLocalWorkspace({ now });

      if (!workspace.ok) {
        return workspace;
      }

      try {
        database.insert(workspaces).values(workspace.value).run();

        const persisted = database
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, localWorkspaceId))
          .get();

        if (!persisted) {
          return err(createAppError('unavailable', 'Local workspace could not be confirmed.', 'retry'));
        }

        return parseWorkspaceRow(persisted);
      } catch (cause) {
        return err(createAppError('unavailable', 'Local workspace could not be created.', 'retry', cause));
      }
    },
  };
}
