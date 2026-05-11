import type { MoneyRecord } from '@/domain/money/types';

export type MoneyRecordChangeMutation = 'created' | 'deleted' | 'updated';

export type MoneyRecordChangeEvent = {
  mutation: MoneyRecordChangeMutation;
  record: MoneyRecord;
  version: number;
};

type MoneyRecordChangeListener = (event: MoneyRecordChangeEvent) => void;

let currentVersion = 0;
const listeners = new Set<MoneyRecordChangeListener>();

export function getMoneyRecordChangeVersion(): number {
  return currentVersion;
}

export function notifyMoneyRecordsChanged(
  mutation: MoneyRecordChangeMutation,
  record: MoneyRecord,
): MoneyRecordChangeEvent {
  currentVersion += 1;
  const event = {
    mutation,
    record,
    version: currentVersion,
  };

  listeners.forEach((listener) => {
    listener(event);
  });

  return event;
}

export function subscribeMoneyRecordsChanged(listener: MoneyRecordChangeListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
