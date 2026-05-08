import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { ok } from '@/domain/common/result';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseWorkEntryRow } from '@/domain/work/schemas';
import type { SaveWorkEntryInput, WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createWorkEntry,
  deleteWorkEntry,
  editWorkEntry,
  loadWorkEntryCaptureData,
  type WorkEntryServiceDependencies,
} from './work-entry.service';

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
      archivedAt: id.includes('archived') ? fixedNow.toISOString() : null,
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

function createEntry(input: SaveWorkEntryInput): WorkEntry {
  const result = parseWorkEntryRow(
    {
      breakMinutes: input.breakMinutes,
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      deletedAt: input.deletedAt ?? null,
      durationMinutes: input.durationMinutes,
      earnedIncomeMinor: input.earnedIncomeMinor,
      endedAtLocalDate: input.endedAtLocalDate ?? null,
      endedAtLocalTime: input.endedAtLocalTime ?? null,
      entryMode: input.entryMode,
      id: input.id,
      localDate: input.localDate,
      note: input.note ?? null,
      paid: input.paid,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      startedAtLocalDate: input.startedAtLocalDate ?? null,
      startedAtLocalTime: input.startedAtLocalTime ?? null,
      updatedAt: input.updatedAt,
      wageCurrencyCode: input.wageCurrencyCode,
      wageMinorPerHour: input.wageMinorPerHour,
      wageSource: input.wageSource,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );

  if (!result.ok) {
    throw new Error('entry fixture failed');
  }

  return result.value;
}

function createDependencies({
  categories = [createCategoryTopic('category', 'cat-work', 'Work')],
  preferences = createPreferences() as UserPreferences | null,
  topics = [createCategoryTopic('topic', 'topic-job', 'Job')],
}: {
  categories?: CategoryTopicItem[];
  preferences?: UserPreferences | null;
  topics?: CategoryTopicItem[];
} = {}) {
  const entries: WorkEntry[] = [];
  const categoryTopicRepository = {
    archiveItem: jest.fn(),
    createItem: jest.fn(),
    findItem: jest.fn(async (kind: CategoryTopicKind, _workspaceId: string, id: string) => {
      const items = kind === 'category' ? categories : topics;

      return ok(items.find((item) => item.id === id) ?? null);
    }),
    listItems: jest.fn(async (kind: CategoryTopicKind) => ok(kind === 'category' ? categories : topics)),
    updateName: jest.fn(),
    updateSortOrders: jest.fn(),
  };
  const workEntryRepository = {
    createEntry: jest.fn(async (input: SaveWorkEntryInput) => {
      const entry = createEntry(input);
      entries.push(entry);
      return ok(entry);
    }),
    deleteEntry: jest.fn(async (_workspaceId: string, id: string, { now }: { now: Date }) => {
      const entry = entries.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!entry) {
        return { ok: false as const, error: createAppError('not_found', 'Missing entry.', 'edit') };
      }

      Object.assign(entry, {
        deletedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      return ok({ ...entry });
    }),
    getEntry: jest.fn(async (_workspaceId: string, id: string) =>
      ok(entries.find((entry) => entry.id === id && entry.deletedAt === null) ?? null),
    ),
    listRecentEntries: jest.fn(async () => ok(entries.filter((entry) => entry.deletedAt === null))),
    updateEntry: jest.fn(async (input: SaveWorkEntryInput) => {
      const index = entries.findIndex((entry) => entry.id === input.id && entry.deletedAt === null);

      if (index < 0) {
        return { ok: false as const, error: createAppError('not_found', 'Missing entry.', 'edit') };
      }

      const updated = createEntry({
        ...input,
        createdAt: entries[index].createdAt,
      });
      entries[index] = updated;

      return ok(updated);
    }),
  };
  const dependencies: WorkEntryServiceDependencies = {
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createId: () => `work-${entries.length + 1}`,
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
    entries,
    workEntryRepository,
  };
}

describe('work entry service', () => {
  it('requires saved preferences before loading work entry capture', async () => {
    const { dependencies } = createDependencies({ preferences: null });

    const result = await loadWorkEntryCaptureData(dependencies);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('creates direct-hour entries with default wage snapshots', async () => {
    const { dependencies, entries } = createDependencies();

    const result = await createWorkEntry(
      {
        categoryId: 'cat-work',
        durationMinutes: 90,
        entryMode: 'hours',
        localDate: '2026-05-08',
        note: 'Library shift',
        paid: true,
        topicIds: ['topic-job'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      durationMinutes: 90,
      earnedIncomeMinor: 2250,
      wageMinorPerHour: 1500,
      wageSource: 'default',
    });
  });

  it('creates shift entries across midnight with override wage snapshots', async () => {
    const { dependencies } = createDependencies();

    const result = await createWorkEntry(
      {
        breakMinutes: 30,
        entryMode: 'shift',
        endedAtLocalDate: '2026-05-09',
        endedAtLocalTime: '01:15',
        paid: true,
        startedAtLocalDate: '2026-05-08',
        startedAtLocalTime: '22:00',
        wageMinorPerHour: 2100,
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        durationMinutes: 165,
        earnedIncomeMinor: 5775,
        localDate: '2026-05-08',
        wageSource: 'override',
      });
    }
  });

  it('stores unpaid entries with zero earned income while preserving wage snapshot', async () => {
    const { dependencies } = createDependencies();

    const result = await createWorkEntry(
      {
        durationMinutes: 120,
        entryMode: 'hours',
        localDate: '2026-05-08',
        paid: false,
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        earnedIncomeMinor: 0,
        paid: false,
        wageMinorPerHour: 1500,
      });
    }
  });

  it('rejects archived categories and invalid shift breaks', async () => {
    const { dependencies } = createDependencies({
      categories: [createCategoryTopic('category', 'cat-archived', 'Old')],
    });

    const archived = await createWorkEntry(
      {
        categoryId: 'cat-archived',
        durationMinutes: 60,
        entryMode: 'hours',
        localDate: '2026-05-08',
        paid: true,
      },
      dependencies,
    );
    const badBreak = await createWorkEntry(
      {
        breakMinutes: 60,
        entryMode: 'shift',
        endedAtLocalDate: '2026-05-08',
        endedAtLocalTime: '13:00',
        paid: true,
        startedAtLocalDate: '2026-05-08',
        startedAtLocalTime: '12:00',
      },
      dependencies,
    );

    expect(archived.ok).toBe(false);
    expect(badBreak.ok).toBe(false);
  });

  it('edits and soft deletes work entries without changing default preferences', async () => {
    const { dependencies, entries } = createDependencies();
    const created = await createWorkEntry(
      {
        durationMinutes: 60,
        entryMode: 'hours',
        localDate: '2026-05-08',
        paid: true,
      },
      dependencies,
    );

    if (!created.ok) {
      throw new Error('create failed');
    }

    const edited = await editWorkEntry(
      {
        durationMinutes: 120,
        entryMode: 'hours',
        id: created.value.id,
        localDate: '2026-05-08',
        paid: true,
        wageMinorPerHour: 2000,
      },
      dependencies,
    );
    const deleted = await deleteWorkEntry({ id: created.value.id }, dependencies);

    expect(edited.ok).toBe(true);
    if (edited.ok) {
      expect(edited.value).toMatchObject({
        earnedIncomeMinor: 4000,
        wageMinorPerHour: 2000,
        wageSource: 'override',
      });
    }
    expect(deleted.ok).toBe(true);
    expect(entries[0].deletedAt).toBe(fixedNow.toISOString());
  });
});
