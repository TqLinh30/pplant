import { calculateJournalMonthSummary } from './summary';
import type { JournalEntry } from './types';
import { localWorkspaceId } from '@/domain/workspace/types';

function entry(input: Partial<JournalEntry> & Pick<JournalEntry, 'id' | 'localDate' | 'moodId'>): JournalEntry {
  return {
    capturedAt: '2026-05-10T02:00:00.000Z',
    contentType: 'image/jpeg',
    createdAt: '2026-05-10T02:00:00.000Z',
    deletedAt: null,
    localTime: '09:00',
    note: null,
    originalFileName: 'photo.jpg',
    photoUri: `file:///journal/${input.id}.jpg`,
    sizeBytes: 1200,
    storageScope: 'app_private_documents',
    updatedAt: '2026-05-10T02:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...input,
  };
}

describe('journal month summary', () => {
  it('calculates mood percentages and dominant mood per day', () => {
    const summary = calculateJournalMonthSummary([
      entry({ id: 'journal-1' as never, localDate: '2026-05-10' as never, moodId: 'love' }),
      entry({ id: 'journal-2' as never, localDate: '2026-05-10' as never, moodId: 'excited' }),
      entry({ id: 'journal-3' as never, localDate: '2026-05-11' as never, moodId: 'love' }),
      entry({ deletedAt: '2026-05-12T00:00:00.000Z', id: 'journal-4' as never, localDate: '2026-05-12' as never, moodId: 'tired' }),
    ]);

    expect(summary.totalCount).toBe(3);
    expect(summary.moodBreakdown).toEqual([
      expect.objectContaining({ count: 2, moodId: 'love', percent: 67 }),
      expect.objectContaining({ count: 1, moodId: 'excited', percent: 33 }),
    ]);
    expect(summary.dayMoods).toEqual([
      expect.objectContaining({ count: 1, localDate: '2026-05-10', moodId: 'love' }),
      expect.objectContaining({ count: 1, localDate: '2026-05-11', moodId: 'love' }),
    ]);
  });

  it('returns stable empty summary for an empty month', () => {
    expect(calculateJournalMonthSummary([])).toEqual({
      dayMoods: [],
      moodBreakdown: [],
      totalCount: 0,
    });
  });
});
