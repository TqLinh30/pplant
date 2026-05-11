import type { Href } from 'expo-router';

import type { CaptureDraft, CaptureDraftKind } from '@/domain/capture-drafts/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import { isReceiptCaptureDraftPayload } from './captureDraftPayloads';

export type CaptureDraftRecoveryReceiptParseStatus =
  | 'load_failed'
  | 'loaded'
  | 'not_applicable'
  | 'not_started';

export type CaptureDraftRecoveryItem = {
  draft: CaptureDraft;
  receiptParseJob: ReceiptParseJob | null;
  receiptParseStatus: CaptureDraftRecoveryReceiptParseStatus;
};

export type CaptureDraftDescription = {
  accessibilityLabel: string;
  description: string;
  meta: string;
  title: string;
};

export function parseCaptureDraftResumeParam(value: string | string[] | undefined): CaptureDraftKind | null {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === 'expense' ||
    normalized === 'income' ||
    normalized === 'task' ||
    normalized === 'reminder' ||
    normalized === 'work'
  ) {
    return normalized;
  }

  return null;
}

export function labelForCaptureDraftKind(kind: CaptureDraftKind): string {
  switch (kind) {
    case 'expense':
      return 'Expense';
    case 'income':
      return 'Income';
    case 'task':
      return 'Task';
    case 'reminder':
      return 'Reminder';
    case 'work':
      return 'Work entry';
    default:
      kind satisfies never;
      return 'Draft';
  }
}

export function toCaptureDraftRecoveryItem(
  draft: CaptureDraft,
  options: Partial<Omit<CaptureDraftRecoveryItem, 'draft'>> = {},
): CaptureDraftRecoveryItem {
  const isReceiptDraft = draft.kind === 'expense' && isReceiptCaptureDraftPayload(draft.payload);

  return {
    draft,
    receiptParseJob: options.receiptParseJob ?? null,
    receiptParseStatus: isReceiptDraft
      ? options.receiptParseStatus ?? (options.receiptParseJob ? 'loaded' : 'not_started')
      : 'not_applicable',
  };
}

function isRecoveryItem(value: CaptureDraft | CaptureDraftRecoveryItem): value is CaptureDraftRecoveryItem {
  return 'draft' in value && 'receiptParseStatus' in value;
}

function receiptParseStatusCopy(item: CaptureDraftRecoveryItem): {
  description: string;
  meta: string;
  statusLabel: string;
} | null {
  if (item.receiptParseStatus === 'not_applicable') {
    return null;
  }

  if (item.receiptParseStatus === 'load_failed') {
    return {
      description: 'Parsing status could not load. The receipt draft is still saved locally, and manual expense entry works now.',
      meta: 'Saved locally - parsing status unavailable',
      statusLabel: 'Parsing status unavailable',
    };
  }

  if (item.receiptParseStatus === 'not_started' || !item.receiptParseJob) {
    return {
      description: 'Receipt parsing can wait for later. Manual expense entry works now.',
      meta: 'Saved locally - parsing not started',
      statusLabel: 'Parsing not started',
    };
  }

  switch (item.receiptParseJob.status) {
    case 'pending':
      return {
        description: 'Receipt parsing is queued. You can resume later or enter the expense manually now.',
        meta: 'Saved locally - parsing queued',
        statusLabel: 'Parsing queued',
      };
    case 'running':
      return {
        description: 'Receipt parsing was in progress. If services are unavailable, resume later or enter manually now.',
        meta: 'Saved locally - parsing in progress',
        statusLabel: 'Parsing in progress',
      };
    case 'failed':
      return {
        description: 'Parsing did not finish. Manual expense entry still works now.',
        meta: 'Saved locally - parsing needs attention',
        statusLabel: 'Parsing needs attention',
      };
    case 'retry_exhausted':
      return {
        description: 'Automatic parsing is paused after the retry limit. Manual expense entry still works now.',
        meta: 'Saved locally - automatic parsing paused',
        statusLabel: 'Automatic parsing paused',
      };
    case 'parsed':
      return {
        description: 'Parsed fields are ready for review. Nothing was saved as an expense automatically.',
        meta: 'Saved locally - review ready',
        statusLabel: 'Review ready',
      };
    case 'low_confidence':
      return {
        description: 'Parsed fields need review before saving. Manual expense entry remains available.',
        meta: 'Saved locally - review needed',
        statusLabel: 'Review needed',
      };
    case 'reviewed':
      return {
        description: 'Receipt fields were reviewed. Save the corrected expense when ready.',
        meta: 'Saved locally - reviewed receipt',
        statusLabel: 'Reviewed receipt',
      };
    case 'saved':
      return {
        description: 'The reviewed receipt was saved as an expense. This draft should disappear after recovery reloads.',
        meta: 'Saved locally - receipt expense saved',
        statusLabel: 'Receipt saved',
      };
    default:
      item.receiptParseJob.status satisfies never;
      return {
        description: 'Receipt parsing needs attention. Manual expense entry remains available.',
        meta: 'Saved locally - parsing needs attention',
        statusLabel: 'Parsing needs attention',
      };
  }
}

export function describeCaptureDraft(input: CaptureDraft | CaptureDraftRecoveryItem): CaptureDraftDescription {
  const item = isRecoveryItem(input) ? input : toCaptureDraftRecoveryItem(input);
  const draft = item.draft;
  const label = draft.kind === 'expense' && isReceiptCaptureDraftPayload(draft.payload)
    ? 'Receipt expense'
    : labelForCaptureDraftKind(draft.kind);
  const receiptCopy = receiptParseStatusCopy(item);
  const title = `Unfinished ${label.toLowerCase()}`;
  const meta = receiptCopy?.meta ?? 'Saved locally';
  const description = receiptCopy
    ? `Last saved ${draft.updatedAt}. ${receiptCopy.description}`
    : `Last saved ${draft.updatedAt}. This draft is saved locally and can be resumed after restart.`;

  return {
    accessibilityLabel: `${title} draft. ${meta}. Resume, discard, or keep for later.`,
    description,
    meta,
    title,
  };
}

function appendSequence(route: string, sequence: string): Href {
  return `${route}${route.includes('?') ? '&' : '?'}draftSeq=${encodeURIComponent(sequence)}` as Href;
}

export function routeForCaptureDraftResume(draft: CaptureDraft, sequence: string = String(Date.now())): Href {
  switch (draft.kind) {
    case 'expense':
      if (isReceiptCaptureDraftPayload(draft.payload)) {
        return `/receipt/${encodeURIComponent(draft.id)}` as Href;
      }

      return appendSequence('/(tabs)/capture?draft=expense', sequence);
    case 'income':
      return appendSequence('/(tabs)/capture?draft=income', sequence);
    case 'task':
      return appendSequence('/task/new?draft=task', sequence);
    case 'reminder':
      return appendSequence('/reminder/new?draft=reminder', sequence);
    case 'work':
      return appendSequence('/work/new?draft=work', sequence);
    default:
      draft.kind satisfies never;
      return '/(tabs)/capture' as Href;
  }
}
