import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };

export type Workspace = {
  id: WorkspaceId;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
};

export type CreateLocalWorkspaceOptions = {
  now: Date;
};

export const localWorkspaceId = 'local-workspace' as WorkspaceId;
export const currentWorkspaceSchemaVersion = 1;

export function asWorkspaceId(value: string): AppResult<WorkspaceId> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Workspace id cannot be empty.', 'retry'));
  }

  return ok(normalized as WorkspaceId);
}

export function createLocalWorkspace({ now }: CreateLocalWorkspaceOptions): AppResult<Workspace> {
  const timestamp = now.toISOString();

  return ok({
    id: localWorkspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: currentWorkspaceSchemaVersion,
  });
}
