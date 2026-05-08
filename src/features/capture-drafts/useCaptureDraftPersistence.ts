import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import type { AppResult } from '@/domain/common/result';
import type {
  CaptureDraft,
  CaptureDraftKind,
  CaptureDraftPayload,
} from '@/domain/capture-drafts/types';
import {
  saveActiveCaptureDraft,
  type SaveActiveCaptureDraftRequest,
} from '@/services/capture-drafts/capture-draft.service';

export type CaptureDraftPersistenceOptions<TDraft> = {
  debounceMs?: number;
  draft: TDraft;
  enabled?: boolean;
  isMeaningful: (draft: TDraft) => boolean;
  kind: CaptureDraftKind;
  saveDraft?: (input: SaveActiveCaptureDraftRequest) => Promise<AppResult<CaptureDraft>>;
  toPayload: (draft: TDraft) => CaptureDraftPayload;
};

export function useCaptureDraftPersistence<TDraft>({
  debounceMs = 600,
  draft,
  enabled = true,
  isMeaningful,
  kind,
  saveDraft = saveActiveCaptureDraft,
  toPayload,
}: CaptureDraftPersistenceOptions<TDraft>) {
  const lastSavedKey = useRef<string | null>(null);
  const persistRef = useRef<() => void>(() => undefined);
  const payload = useMemo(() => {
    if (!enabled || !isMeaningful(draft)) {
      return null;
    }

    return toPayload(draft);
  }, [draft, enabled, isMeaningful, toPayload]);
  const payloadKey = useMemo(() => (payload ? JSON.stringify(payload) : null), [payload]);

  const persistDraftNow = useCallback(() => {
    if (!payload || !payloadKey || lastSavedKey.current === payloadKey) {
      return;
    }

    lastSavedKey.current = payloadKey;
    void saveDraft({ kind, payload }).then((result) => {
      if (!result.ok) {
        lastSavedKey.current = null;
      }
    });
  }, [kind, payload, payloadKey, saveDraft]);

  useEffect(() => {
    persistRef.current = persistDraftNow;
  }, [persistDraftNow]);

  useEffect(() => {
    if (!payloadKey) {
      return undefined;
    }

    const timeout = setTimeout(persistDraftNow, debounceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [debounceMs, payloadKey, persistDraftNow]);

  useEffect(
    () => () => {
      persistRef.current();
    },
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        persistDraftNow();
      }
    });

    return () => subscription.remove();
  }, [persistDraftNow]);

  return {
    persistDraftNow,
  };
}
