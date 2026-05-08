import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { ok } from '@/domain/common/result';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseWorkEntryRow } from '@/domain/work/schemas';
import type { WorkEntry, WorkHistoryQuery } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { loadWorkHistory, type WorkHistoryServiceDependencies } from './work-history.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function createPreferences(): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 1500,
    locale: 'en-US',
    monthlyBudgetResetDay: 1,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createCategoryTopic(kind: CategoryTopicKind, id: string, name: string): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow.toISOString(),
      id,
      name,
      sortOrder: 0,
      updatedAt: fixedNow.toISOString(),
      workspaceId: localWorkspaceId,
    },
    kind,
  );

  if (!result.ok) {
    throw new Error('category/topic fixture failed');
  }

  return result.value;
}

function createEntry(overrides: Record<string, unknown> = {}): WorkEntry {
  const topicIds = Array.isArray(overrides.topicIds) ? (overrides.topicIds as string[]) : [];
  const { topicIds: _topicIds, ...rowOverrides } = overrides;
  const result = parseWorkEntryRow(
    {
      breakMinutes: 0,
      categoryId: 'cat-work',
      createdAt: fixedNow.toISOString(),
      deletedAt: null,
      durationMinutes: 120,
      earnedIncomeMinor: 3000,
      endedAtLocalDate: null,
      endedAtLocalTime: null,
      entryMode: 'hours',
      id: 'work-1',
      localDate: '2026-05-08',
      note: 'Library',
      paid: true,
      source: 'manual',
      sourceOfTruth: 'manual',
      startedAtLocalDate: null,
      startedAtLocalTime: null,
      updatedAt: fixedNow.toISOString(),
      wageCurrencyCode: 'USD',
      wageMinorPerHour: 1500,
      wageSource: 'default',
      workspaceId: localWorkspaceId,
      ...rowOverrides,
    },
    topicIds,
  );

  if (!result.ok) {
    throw new Error('entry fixture failed');
  }

  return result.value;
}

function createDependencies({
  entries = [
    createEntry(),
    createEntry({
      durationMinutes: 60,
      earnedIncomeMinor: 0,
      id: 'work-2',
      localDate: '2026-05-09',
      note: 'Volunteer',
      paid: false,
    }),
  ],
  preferences = createPreferences() as UserPreferences | null,
}: {
  entries?: WorkEntry[];
  preferences?: UserPreferences | null;
} = {}) {
  const categories = [createCategoryTopic('category', 'cat-work', 'Work')];
  const topics = [createCategoryTopic('topic', 'topic-job', 'Job')];
  const filterEntries = (query: WorkHistoryQuery) =>
    entries.filter(
      (entry) =>
        entry.deletedAt === null &&
        (!query.entryMode || entry.entryMode === query.entryMode) &&
        (!query.paid || entry.paid === (query.paid === 'paid')) &&
        (!query.dateFrom || entry.localDate >= query.dateFrom) &&
        (!query.dateTo || entry.localDate <= query.dateTo) &&
        (!query.categoryId || entry.categoryId === query.categoryId) &&
        (!query.topicId || entry.topicIds.includes(query.topicId)) &&
        (!query.noteSearch || (entry.note ?? '').toLowerCase().includes(query.noteSearch.toLowerCase())),
    );
  const workEntryRepository = {
    createEntry: jest.fn(),
    deleteEntry: jest.fn(),
    getEntry: jest.fn(),
    listHistoryEntries: jest.fn(async (_workspaceId: string, query: WorkHistoryQuery) => {
      const filtered = filterEntries(query);
      const pageRecords = filtered.slice(query.offset, query.offset + query.limit);

      return ok({
        hasMore: query.offset + pageRecords.length < filtered.length,
        limit: query.limit,
        offset: query.offset,
        records: pageRecords,
        totalCount: filtered.length,
      });
    }),
    listRecentEntries: jest.fn(),
    updateEntry: jest.fn(),
  };
  const dependencies: WorkHistoryServiceDependencies = {
    createCategoryTopicRepository: () => ({
      archiveItem: jest.fn(),
      createItem: jest.fn(),
      findItem: jest.fn(),
      listItems: jest.fn(async (kind: CategoryTopicKind) => ok(kind === 'category' ? categories : topics)),
      updateName: jest.fn(),
      updateSortOrders: jest.fn(),
    } as never),
    createPreferencesRepository: () => ({
      loadPreferences: jest.fn(async () => ok(preferences)),
      savePreferences: jest.fn(),
    }),
    createWorkEntryRepository: () => workEntryRepository as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    dependencies,
    workEntryRepository,
  };
}

describe('work history service', () => {
  it('requires preferences before loading work history', async () => {
    const { dependencies } = createDependencies({ preferences: null });

    const result = await loadWorkHistory({}, dependencies);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('loads work history records and day summaries', async () => {
    const { dependencies } = createDependencies();

    const result = await loadWorkHistory({ summaryMode: 'day' }, dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.records).toHaveLength(2);
      expect(result.value.summaries).toEqual([
        expect.objectContaining({ earnedIncomeMinor: 0, key: '2026-05-09', totalDurationMinutes: 60 }),
        expect.objectContaining({ earnedIncomeMinor: 3000, key: '2026-05-08', totalDurationMinutes: 120 }),
      ]);
    }
  });

  it('filters by mode, paid state, dates, category, topic, and note search', async () => {
    const { dependencies } = createDependencies({
      entries: [
        createEntry({ id: 'work-1', note: 'Library', topicIds: ['topic-job'] }),
        createEntry({
          endedAtLocalDate: '2026-05-10',
          endedAtLocalTime: '12:00',
          entryMode: 'shift',
          id: 'work-2',
          localDate: '2026-05-10',
          note: 'Cafe',
          startedAtLocalDate: '2026-05-10',
          startedAtLocalTime: '10:00',
          topicIds: [],
        }),
      ],
    });

    const result = await loadWorkHistory(
      {
        categoryId: 'cat-work',
        dateFrom: '2026-05-08',
        dateTo: '2026-05-08',
        entryMode: 'hours',
        noteSearch: 'lib',
        paid: 'paid',
        topicId: 'topic-job',
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.records.map((entry) => entry.id)).toEqual(['work-1']);
      expect(result.value.page.totalCount).toBe(1);
    }
  });

  it('rejects invalid date ranges and paginates records', async () => {
    const { dependencies, workEntryRepository } = createDependencies();

    const invalid = await loadWorkHistory({ dateFrom: '2026-05-09', dateTo: '2026-05-08' }, dependencies);
    const page = await loadWorkHistory({ limit: 1, offset: 1 }, dependencies);

    expect(invalid.ok).toBe(false);
    expect(page.ok).toBe(true);
    if (page.ok) {
      expect(page.value.records).toHaveLength(1);
    }
    expect(workEntryRepository.listHistoryEntries).toHaveBeenCalled();
  });
});
