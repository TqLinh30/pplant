import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { err, ok, type AppResult } from '@/domain/common/result';

import { asWorkspaceId, type Workspace } from './types';

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const workspaceRowSchema = z.object({
  id: z.string().min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  schemaVersion: z.number().int().positive(),
});

export type WorkspaceRow = z.infer<typeof workspaceRowSchema>;

export function parseWorkspaceRow(row: unknown): AppResult<Workspace> {
  const result = workspaceRowSchema.safeParse(row);

  if (!result.success) {
    return err(createAppError('validation_failed', 'Local workspace data is invalid.', 'retry', result.error));
  }

  const workspaceId = asWorkspaceId(result.data.id);

  if (!workspaceId.ok) {
    return workspaceId;
  }

  return ok({
    ...result.data,
    id: workspaceId.value,
  });
}
