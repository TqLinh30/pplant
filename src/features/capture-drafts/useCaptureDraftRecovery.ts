import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AppError } from '@/domain/common/app-error';
import type { AppResult } from '@/domain/common/result';
import { ok } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import {
  discardCaptureDraft,
  keepCaptureDraft,
  listActiveCaptureDrafts,
} from '@/services/capture-drafts/capture-draft.service';
import { getLatestReceiptParseJobForDraft } from '@/services/receipt-parsing/receipt-parse-job.service';

import {
  toCaptureDraftRecoveryItem,
  type CaptureDraftRecoveryItem,
} from './capture-draft-recovery';
import { isReceiptCaptureDraftPayload } from './captureDraftPayloads';

type CaptureDraftRecoveryStatus = 'failed' | 'loading' | 'ready';

export type CaptureDraftRecoveryState = {
  actionError: AppError | null;
  items: CaptureDraftRecoveryItem[];
  loadError: AppError | null;
  status: CaptureDraftRecoveryStatus;
};

export type CaptureDraftRecoveryServices = {
  discardDraft?: (id: string) => Promise<{ ok: true; value: CaptureDraft } | { ok: false; error: AppError }>;
  keepDraft?: (id: string) => Promise<{ ok: true; value: CaptureDraft } | { ok: false; error: AppError }>;
  listDrafts?: () => Promise<{ ok: true; value: CaptureDraft[] } | { ok: false; error: AppError }>;
  listRecoveryItems?: () => Promise<AppResult<CaptureDraftRecoveryItem[]>>;
  loadReceiptParseJob?: (receiptDraftId: string) => Promise<AppResult<ReceiptParseJob | null>>;
};

export async function loadCaptureDraftRecoveryItems({
  listDrafts = listActiveCaptureDrafts,
  loadReceiptParseJob = (receiptDraftId) => getLatestReceiptParseJobForDraft({ receiptDraftId }),
}: Pick<CaptureDraftRecoveryServices, 'listDrafts' | 'loadReceiptParseJob'> = {}): Promise<AppResult<CaptureDraftRecoveryItem[]>> {
  const drafts = await listDrafts();

  if (!drafts.ok) {
    return drafts;
  }

  const items = await Promise.all(
    drafts.value.map(async (draft) => {
      if (draft.kind !== 'expense' || !isReceiptCaptureDraftPayload(draft.payload)) {
        return toCaptureDraftRecoveryItem(draft);
      }

      const latestJob = await loadReceiptParseJob(draft.id);

      if (!latestJob.ok) {
        return toCaptureDraftRecoveryItem(draft, {
          receiptParseJob: null,
          receiptParseStatus: 'load_failed',
        });
      }

      return toCaptureDraftRecoveryItem(draft, {
        receiptParseJob: latestJob.value,
        receiptParseStatus: latestJob.value ? 'loaded' : 'not_started',
      });
    }),
  );

  return ok(items);
}

export function useCaptureDraftRecovery(services: CaptureDraftRecoveryServices = {}) {
  const [state, setState] = useState<CaptureDraftRecoveryState>({
    actionError: null,
    items: [],
    loadError: null,
    status: 'loading',
  });
  const isMounted = useRef(false);
  const listRecoveryItems = useMemo(
    () =>
      services.listRecoveryItems ??
      (() =>
        loadCaptureDraftRecoveryItems({
          listDrafts: services.listDrafts,
          loadReceiptParseJob: services.loadReceiptParseJob,
        })),
    [services.listDrafts, services.listRecoveryItems, services.loadReceiptParseJob],
  );
  const keepDraftDependency = services.keepDraft ?? ((id: string) => keepCaptureDraft({ id }));
  const discardDraftDependency = services.discardDraft ?? ((id: string) => discardCaptureDraft({ id }));

  const reload = useCallback(() => {
    setState((current) => ({
      ...current,
      actionError: null,
      loadError: null,
      status: current.items.length > 0 ? 'ready' : 'loading',
    }));
    void listRecoveryItems().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        setState({
          actionError: null,
          items: result.value,
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
  }, [listRecoveryItems]);

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
