import type { JournalEntry } from '@/domain/journal/types';

export type JournalEntryChangeMutation = 'created' | 'deleted';

export type JournalEntryChangeEvent = {
  entry: JournalEntry;
  mutation: JournalEntryChangeMutation;
  version: number;
};

type JournalEntryChangeListener = (event: JournalEntryChangeEvent) => void;

let currentVersion = 0;
const listeners = new Set<JournalEntryChangeListener>();

export function getJournalEntryChangeVersion(): number {
  return currentVersion;
}

export function notifyJournalEntriesChanged(
  mutation: JournalEntryChangeMutation,
  entry: JournalEntry,
): JournalEntryChangeEvent {
  currentVersion += 1;
  const event = {
    entry,
    mutation,
    version: currentVersion,
  };

  listeners.forEach((listener) => {
    listener(event);
  });

  return event;
}

export function subscribeJournalEntriesChanged(listener: JournalEntryChangeListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
