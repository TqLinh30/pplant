import type { Href } from 'expo-router';

import type { CaptureDraft, CaptureDraftKind } from '@/domain/capture-drafts/types';
import { isReceiptCaptureDraftPayload } from './captureDraftPayloads';

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

export function describeCaptureDraft(draft: CaptureDraft): {
  accessibilityLabel: string;
  description: string;
  title: string;
} {
  const label = draft.kind === 'expense' && isReceiptCaptureDraftPayload(draft.payload)
    ? 'Receipt expense'
    : labelForCaptureDraftKind(draft.kind);

  return {
    accessibilityLabel: `Unfinished ${label.toLowerCase()} draft. Resume, discard, or keep for later.`,
    description: `Last saved ${draft.updatedAt}. Resume when ready, discard it, or keep it for later.`,
    title: `Unfinished ${label.toLowerCase()}`,
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
