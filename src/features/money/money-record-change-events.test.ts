import type { MoneyRecord } from '@/domain/money/types';

import {
  getMoneyRecordChangeVersion,
  notifyMoneyRecordsChanged,
  subscribeMoneyRecordsChanged,
} from './money-record-change-events';

const record = {
  amountMinor: 100,
  categoryId: null,
  createdAt: '2026-05-09T00:00:00.000Z',
  currencyCode: 'TWD',
  deletedAt: null,
  id: 'money-1',
  kind: 'expense',
  localDate: '2026-05-09',
  merchantOrSource: null,
  note: null,
  recurrenceOccurrenceDate: null,
  recurrenceRuleId: null,
  source: 'manual',
  sourceOfTruth: 'manual',
  topicIds: [],
  updatedAt: '2026-05-09T00:00:00.000Z',
  userCorrectedAt: null,
  workspaceId: 'local',
} as unknown as MoneyRecord;

describe('money record change events', () => {
  it('notifies subscribers and stops after unsubscribe', () => {
    const seen: string[] = [];
    const beforeVersion = getMoneyRecordChangeVersion();
    const unsubscribe = subscribeMoneyRecordsChanged((event) => {
      seen.push(`${event.mutation}:${event.record.id}:${event.version}`);
    });

    const event = notifyMoneyRecordsChanged('created', record);

    expect(event.version).toBe(beforeVersion + 1);
    expect(seen).toEqual([`created:${record.id}:${event.version}`]);

    unsubscribe();
    notifyMoneyRecordsChanged('deleted', record);

    expect(seen).toEqual([`created:${record.id}:${event.version}`]);
  });
});
