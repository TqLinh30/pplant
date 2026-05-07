import { createAppError } from '@/domain/common/app-error';
import { createLocalWorkspace } from '@/domain/workspace/types';
import type { EnsureLocalWorkspaceResult } from '@/services/workspace/workspace.service';

import {
  initialWorkspaceInitializationState,
  workspaceInitializationReducer,
} from './useWorkspaceInitialization';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function createReadyResult(): EnsureLocalWorkspaceResult {
  const workspace = createLocalWorkspace({ now: fixedNow });

  if (!workspace.ok) {
    throw new Error('workspace fixture failed');
  }

  return {
    workspace: workspace.value,
    migrationReport: {
      applied: 0,
      appliedMigrations: [],
    },
    created: false,
  };
}

describe('workspace initialization state', () => {
  it('moves from loading to ready with the initialized workspace', () => {
    const result = createReadyResult();

    const nextState = workspaceInitializationReducer(initialWorkspaceInitializationState, {
      type: 'ready',
      result,
    });

    expect(nextState).toEqual({
      status: 'ready',
      result,
    });
  });

  it('moves to a recoverable failed state', () => {
    const error = createAppError('unavailable', 'Local data could not be prepared.', 'retry');

    const nextState = workspaceInitializationReducer(initialWorkspaceInitializationState, {
      type: 'failed',
      error,
    });

    expect(nextState).toEqual({
      status: 'failed',
      error,
    });
  });

  it('can reset to loading for retry', () => {
    const ready = workspaceInitializationReducer(initialWorkspaceInitializationState, {
      type: 'ready',
      result: createReadyResult(),
    });

    expect(workspaceInitializationReducer(ready, { type: 'loading' })).toEqual({ status: 'loading' });
  });
});
