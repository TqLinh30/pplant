import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import { ensureLocalWorkspace, type EnsureLocalWorkspaceResult } from '@/services/workspace/workspace.service';

export type WorkspaceInitializationState =
  | { status: 'loading' }
  | { status: 'ready'; result: EnsureLocalWorkspaceResult }
  | { status: 'failed'; error: AppError };

export type WorkspaceInitializationAction =
  | { type: 'loading' }
  | { type: 'ready'; result: EnsureLocalWorkspaceResult }
  | { type: 'failed'; error: AppError };

export type WorkspaceInitializer = () => Promise<AppResult<EnsureLocalWorkspaceResult>>;

export const initialWorkspaceInitializationState: WorkspaceInitializationState = {
  status: 'loading',
};

export function workspaceInitializationReducer(
  _state: WorkspaceInitializationState,
  action: WorkspaceInitializationAction,
): WorkspaceInitializationState {
  switch (action.type) {
    case 'loading':
      return { status: 'loading' };
    case 'ready':
      return { status: 'ready', result: action.result };
    case 'failed':
      return { status: 'failed', error: action.error };
  }
}

export function useWorkspaceInitialization(initializer: WorkspaceInitializer = ensureLocalWorkspace) {
  const [state, dispatch] = useReducer(
    workspaceInitializationReducer,
    initialWorkspaceInitializationState,
  );
  const isMounted = useRef(false);

  const run = useCallback(() => {
    dispatch({ type: 'loading' });

    void initializer().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ type: 'ready', result: result.value });
        return;
      }

      dispatch({ type: 'failed', error: result.error });
    });
  }, [initializer]);

  useEffect(() => {
    isMounted.current = true;
    run();

    return () => {
      isMounted.current = false;
    };
  }, [run]);

  return {
    retry: run,
    state,
  };
}
