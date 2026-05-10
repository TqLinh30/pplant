import { createJournalEntryRepository } from './journal-entries.repository';
import type { JournalEntryRow } from '@/domain/journal/types';
import { localWorkspaceId } from '@/domain/workspace/types';

class FakeJournalClient {
  readonly executedSql: string[] = [];
  rows: JournalEntryRow[] = [];

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO journal_entries')) {
      const [
        id,
        workspaceId,
        localDate,
        localTime,
        capturedAt,
        moodId,
        note,
        photoUri,
        contentType,
        originalFileName,
        sizeBytes,
        storageScope,
        createdAt,
        updatedAt,
      ] = params;

      this.rows.push({
        capturedAt: capturedAt as string,
        contentType: contentType as string | null,
        createdAt: createdAt as string,
        deletedAt: null,
        id: id as string,
        localDate: localDate as string,
        localTime: localTime as string,
        moodId: moodId as string,
        note: note as string | null,
        originalFileName: originalFileName as string | null,
        photoUri: photoUri as string,
        sizeBytes: sizeBytes as number | null,
        storageScope: storageScope as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE journal_entries')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const row = this.rows.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (row) {
        row.deletedAt = deletedAt as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    const [workspaceId, id] = params;
    const includeDeleted = !source.includes('deleted_at IS NULL');
    const row =
      this.rows.find(
        (candidate) =>
          candidate.workspaceId === workspaceId &&
          candidate.id === id &&
          (includeDeleted || candidate.deletedAt === null),
      ) ?? null;

    return row as T | null;
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    const [workspaceId, first, second] = params;
    let rows = this.rows.filter((row) => row.workspaceId === workspaceId && row.deletedAt === null);

    if (source.includes('local_date = ?')) {
      rows = rows.filter((row) => row.localDate === first);
      rows = rows.sort(
        (left, right) =>
          right.localTime.localeCompare(left.localTime) ||
          right.capturedAt.localeCompare(left.capturedAt) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      );
    } else if (source.includes('local_date >= ?')) {
      rows = rows.filter((row) => row.localDate >= (first as string) && row.localDate < (second as string));
      rows = rows.sort(
        (left, right) =>
          left.localDate.localeCompare(right.localDate) ||
          left.localTime.localeCompare(right.localTime) ||
          left.capturedAt.localeCompare(right.capturedAt) ||
          left.id.localeCompare(right.id),
      );
    }

    return rows as T[];
  }
}

const fixedNow = '2026-05-10T02:00:00.000Z';

function createRepository() {
  const client = new FakeJournalClient();
  const repository = createJournalEntryRepository({ $client: client } as never);

  return {
    client,
    repository,
  };
}

describe('journal entry repository', () => {
  it('creates and lists journal entries by date with newest local time first', async () => {
    const { repository } = createRepository();

    await repository.createEntry({
      capturedAt: '2026-05-10T01:17:00.000Z',
      contentType: 'image/jpeg',
      createdAt: fixedNow,
      id: 'journal-1' as never,
      localDate: '2026-05-10' as never,
      localTime: '08:17',
      moodId: 'sleepy',
      note: 'Chưa biết nên làm gì',
      originalFileName: 'first.jpg',
      photoUri: 'file:///journal/first.jpg',
      sizeBytes: 1200,
      storageScope: 'app_private_documents',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    await repository.createEntry({
      capturedAt: '2026-05-10T02:17:00.000Z',
      contentType: 'image/jpeg',
      createdAt: fixedNow,
      id: 'journal-2' as never,
      localDate: '2026-05-10' as never,
      localTime: '09:17',
      moodId: 'excited',
      note: 'Có việc để làm rồi',
      originalFileName: 'second.jpg',
      photoUri: 'file:///journal/second.jpg',
      sizeBytes: 1400,
      storageScope: 'app_private_documents',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });

    const entries = await repository.listEntriesForDate(localWorkspaceId, '2026-05-10' as never);

    expect(entries.ok).toBe(true);
    if (entries.ok) {
      expect(entries.value.map((entry) => entry.id)).toEqual(['journal-2', 'journal-1']);
    }
  });

  it('soft deletes entries and hides them from day and month lists', async () => {
    const { repository } = createRepository();

    await repository.createEntry({
      capturedAt: fixedNow,
      contentType: 'image/jpeg',
      createdAt: fixedNow,
      id: 'journal-1' as never,
      localDate: '2026-05-10' as never,
      localTime: '09:17',
      moodId: 'love',
      note: null,
      originalFileName: null,
      photoUri: 'file:///journal/photo.jpg',
      sizeBytes: null,
      storageScope: 'app_private_documents',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });

    const deleted = await repository.deleteEntry(localWorkspaceId, 'journal-1' as never, {
      now: new Date('2026-05-10T03:00:00.000Z'),
    });
    const dayEntries = await repository.listEntriesForDate(localWorkspaceId, '2026-05-10' as never);
    const monthEntries = await repository.listEntriesForMonth(localWorkspaceId, {
      endDateExclusive: '2026-06-01' as never,
      startDate: '2026-05-01' as never,
    });

    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.value.deletedAt).toBe('2026-05-10T03:00:00.000Z');
    }
    expect(dayEntries).toEqual({ ok: true, value: [] });
    expect(monthEntries).toEqual({ ok: true, value: [] });
  });
});
