import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import {
  discardCaptureDraft,
  keepCaptureDraft,
  listActiveCaptureDrafts,
} from '@/services/capture-drafts/capture-draft.service';

type CaptureDraftRecoveryStatus = 'failed' | 'loading' | 'ready';

export type CaptureDraftRecoveryState = {
  actionError: AppError | null;
  drafts: CaptureDraft[];
  loadError: AppError | null;
  status: CaptureDraftRecoveryStatus;
};

export type CaptureDraftRecoveryServices = {
  discardDraft?: (id: string) => Promise<{ ok: true; value: CaptureDraft } | { ok: false; error: AppError }>;
  keepDraft?: (id: string) => Promise<{ ok: true; value: CaptureDraft } | { ok: false; error: AppError }>;
  listDrafts?: () => Promise<{ ok: true; value: CaptureDraft[] } | { ok: false; error: AppError }>;
};

export function useCaptureDraftRecovery(services: CaptureDraftRecoveryServices = {}) {
  const [state, setState] = useState<CaptureDraftRecoveryState>({
    actionError: null,
    drafts: [],
    loadError: null,
    status: 'loading',
  });
  const isMounted = useRef(false);
  const listDrafts = services.listDrafts ?? listActiveCaptureDrafts;
  const keepDraftDependency = services.keepDraft ?? ((id: string) => keepCaptureDraft({ id }));
  const discardDraftDependency = services.discardDraft ?? ((id: string) => discardCaptureDraft({ id }));

  const reload = useCallback(() => {
    setState((current) => ({
      ...current,
      actionError: null,
      loadError: null,
      status: current.drafts.length > 0 ? 'ready' : 'loading',
    }));
    void listDrafts().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        setState({
          actionError: null,
          drafts: result.value,
          loadError: null,
          status: 'ready',
        });
        return;
      }

      setState((current) => ({
        ...current,
        loadError: result.error,
        status: 'failed',
      }));
    });
  }, [listDrafts]);

  const runAction = useCallback(
    (id: string, action: (draftId: string) => ReturnType<NonNullable<CaptureDraftRecoveryServices['keepDraft']>>) => {
      setState((current) => ({ ...current, actionError: null }));
      void action(id).then((result) => {
        if (!isMounted.current) {
          return;
        }

        if (!result.ok) {
          setState((current) => ({ ...current, actionError: result.error }));
          return;
        }

        reload();
      });
    },
    [reload],
  );

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    discardDraft: (id: string) => runAction(id, discardDraftDependency),
    keepDraft: (id: string) => runAction(id, keepDraftDependency),
    reload,
    state,
  };
}
