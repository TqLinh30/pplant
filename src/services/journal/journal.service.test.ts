import type { JournalEntryRepository, JournalMonthRange } from '@/data/repositories/journal-entries.repository';
import type { LocalDate } from '@/domain/common/date-rules';
import { ok, type AppResult } from '@/domain/common/result';
import type { JournalEntry, SaveJournalEntryInput } from '@/domain/journal/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { loadJournalOverview, saveJournalEntry } from './journal.service';

class FakeJournalRepository implements JournalEntryRepository {
  readonly entries: JournalEntry[] = [];

  async createEntry(input: SaveJournalEntryInput): Promise<AppResult<JournalEntry>> {
    const entry: JournalEntry = {
      capturedAt: input.capturedAt,
      contentType: input.contentType ?? null,
      createdAt: input.createdAt,
      deletedAt: null,
      id: input.id,
      localDate: input.localDate,
      localTime: input.localTime,
      moodId: input.moodId,
      note: input.note ?? null,
      originalFileName: input.originalFileName ?? null,
      photoUri: input.photoUri,
      sizeBytes: input.sizeBytes ?? null,
      storageScope: input.storageScope,
      updatedAt: input.updatedAt,
      workspaceId: input.workspaceId,
    };

    this.entries.push(entry);
    return ok(entry);
  }

  async deleteEntry(): Promise<AppResult<JournalEntry>> {
    throw new Error('not needed');
  }

  async getEntry(): Promise<AppResult<JournalEntry | null>> {
    throw new Error('not needed');
  }

  async listEntriesForDate(_workspaceId: typeof localWorkspaceId, localDate: LocalDate): Promise<AppResult<JournalEntry[]>> {
    return ok(this.entries.filter((entry) => entry.localDate === localDate && entry.deletedAt === null));
  }

  async listEntriesForMonth(_workspaceId: typeof localWorkspaceId, range: JournalMonthRange): Promise<AppResult<JournalEntry[]>> {
    return ok(
      this.entries.filter(
        (entry) =>
          entry.localDate >= range.startDate &&
          entry.localDate < range.endDateExclusive &&
          entry.deletedAt === null,
      ),
    );
  }
}

function dependencies(repository: FakeJournalRepository) {
  return {
    createEntryId: () => 'journal-1',
    createRepository: () => repository,
    migrateDatabase: async () => ok({ applied: 0, appliedMigrations: [] }),
    now: () => new Date('2026-05-10T02:30:00.000Z'),
    openDatabase: () => ({}),
  };
}

describe('journal service', () => {
  it('saves a journal entry with required photo and mood metadata', async () => {
    const repository = new FakeJournalRepository();

    const result = await saveJournalEntry(
      {
        moodId: 'excited',
        note: 'Có việc để làm rồi',
        photo: {
          capturedAt: '2026-05-10T09:17:00.000',
          contentType: 'image/jpeg',
          originalFileName: 'moment.jpg',
          photoUri: 'file:///journal/moment.jpg',
          sizeBytes: 2048,
          storageScope: 'app_private_documents',
        },
      },
      dependencies(repository),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(
        expect.objectContaining({
          id: 'journal-1',
          localDate: '2026-05-10',
          localTime: '09:17',
          moodId: 'excited',
          note: 'Có việc để làm rồi',
          photoUri: 'file:///journal/moment.jpg',
        }),
      );
    }
  });

  it('rejects invalid mood and missing photo uri', async () => {
    const invalidMood = await saveJournalEntry(
      {
        moodId: 'unknown',
        photo: {
          capturedAt: '2026-05-10T09:17:00.000',
          contentType: 'image/jpeg',
          originalFileName: 'moment.jpg',
          photoUri: 'file:///journal/moment.jpg',
          sizeBytes: 2048,
          storageScope: 'app_private_documents',
        },
      },
      dependencies(new FakeJournalRepository()),
    );
    const missingPhoto = await saveJournalEntry(
      {
        moodId: 'love',
        photo: {
          capturedAt: '2026-05-10T09:17:00.000',
          contentType: null,
          originalFileName: null,
          photoUri: '',
          sizeBytes: null,
          storageScope: 'app_private_documents',
        },
      },
      dependencies(new FakeJournalRepository()),
    );

    expect(invalidMood.ok).toBe(false);
    if (!invalidMood.ok) {
      expect(invalidMood.error.code).toBe('validation_failed');
    }
    expect(missingPhoto.ok).toBe(false);
    if (!missingPhoto.ok) {
      expect(missingPhoto.error.message).toContain('photo');
    }
  });

  it('loads day entries and month statistics', async () => {
    const repository = new FakeJournalRepository();

    await repository.createEntry({
      capturedAt: '2026-05-10T02:17:00.000Z',
      contentType: 'image/jpeg',
      createdAt: '2026-05-10T02:30:00.000Z',
      id: 'journal-1' as never,
      localDate: '2026-05-10' as never,
      localTime: '09:17',
      moodId: 'love',
      note: null,
      originalFileName: null,
      photoUri: 'file:///journal/one.jpg',
      sizeBytes: null,
      storageScope: 'app_private_documents',
      updatedAt: '2026-05-10T02:30:00.000Z',
      workspaceId: localWorkspaceId,
    });
    await repository.createEntry({
      capturedAt: '2026-05-11T02:17:00.000Z',
      contentType: 'image/jpeg',
      createdAt: '2026-05-11T02:30:00.000Z',
      id: 'journal-2' as never,
      localDate: '2026-05-11' as never,
      localTime: '09:17',
      moodId: 'excited',
      note: null,
      originalFileName: null,
      photoUri: 'file:///journal/two.jpg',
      sizeBytes: null,
      storageScope: 'app_private_documents',
      updatedAt: '2026-05-11T02:30:00.000Z',
      workspaceId: localWorkspaceId,
    });

    const result = await loadJournalOverview(
      { localDate: '2026-05-10', monthDate: new Date('2026-05-01T00:00:00') },
      dependencies(repository),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries).toHaveLength(1);
      expect(result.value.monthSummary.totalCount).toBe(2);
      expect(result.value.monthSummary.moodBreakdown.map((item) => item.moodId)).toEqual(['love', 'excited']);
    }
  });
});
