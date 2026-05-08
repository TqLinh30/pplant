import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyHistoryPage, MoneyHistoryQuery, MoneyRecord, SaveManualMoneyRecordInput } from '@/domain/money/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { loadMoneyHistory, type MoneyHistoryServiceDependencies } from './money-history.service';

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
      archivedAt: kind === 'category' && id === 'cat-archived' ? fixedNow.toISOString() : null,
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

function createRecord(overrides: Partial<SaveManualMoneyRecordInput> = {}): MoneyRecord {
  const result = parseMoneyRecordRow(
    {
      amountMinor: overrides.amountMinor ?? 1250,
      categoryId: overrides.categoryId ?? 'cat-food',
      createdAt: fixedNow.toISOString(),
      currencyCode: 'USD',
      deletedAt: overrides.deletedAt ?? null,
      id: overrides.id ?? 'money-1',
      kind: overrides.kind ?? 'expense',
      localDate: overrides.localDate ?? '2026-05-08',
      merchantOrSource: overrides.merchantOrSource ?? 'Campus cafe',
      note: overrides.note ?? null,
      recurrenceOccurrenceDate: overrides.recurrenceOccurrenceDate ?? null,
      recurrenceRuleId: overrides.recurrenceRuleId ?? null,
      source: overrides.source ?? 'manual',
      sourceOfTruth: overrides.sourceOfTruth ?? 'manual',
      updatedAt: fixedNow.toISOString(),
      userCorrectedAt: overrides.userCorrectedAt ?? null,
      workspaceId: localWorkspaceId,
    },
    overrides.topicIds ?? [],
  );

  if (!result.ok) {
    throw new Error('money fixture failed');
  }

  return result.value;
}

function createDependencies({
  categories = [
    createCategoryTopic('category', 'cat-food', 'Food'),
    createCategoryTopic('category', 'cat-archived', 'Archived'),
  ],
  migrationResult = ok({ applied: 0, appliedMigrations: [] }),
  preferences = createPreferences() as UserPreferences | null,
  records = [
    createRecord({ amountMinor: 1000, id: 'money-food', localDate: '2026-05-08', topicIds: ['topic-campus'] }),
    createRecord({
      amountMinor: 5000,
      id: 'money-income',
      kind: 'income',
      localDate: '2026-05-09',
      merchantOrSource: 'Campus job',
    }),
  ],
  topics = [createCategoryTopic('topic', 'topic-campus', 'Campus')],
}: {
  categories?: CategoryTopicItem[];
  migrationResult?: AppResult<{ applied: number; appliedMigrations: string[] }>;
  preferences?: UserPreferences | null;
  records?: MoneyRecord[];
  topics?: CategoryTopicItem[];
} = {}) {
  const listHistoryRecords = jest.fn(async (_workspaceId: string, query: MoneyHistoryQuery): Promise<AppResult<MoneyHistoryPage>> => {
    const filtered = records
      .filter((record) => record.deletedAt === null)
      .filter((record) => !query.kind || record.kind === query.kind)
      .filter((record) => !query.categoryId || record.categoryId === query.categoryId)
      .filter((record) => !query.topicId || record.topicIds.includes(query.topicId as never))
      .filter((record) => !query.merchantOrSource || (record.merchantOrSource ?? '').toLowerCase().includes(query.merchantOrSource.toLowerCase()))
      .filter((record) => query.amountMinorMin === null || query.amountMinorMin === undefined || record.amountMinor >= query.amountMinorMin)
      .filter((record) => query.amountMinorMax === null || query.amountMinorMax === undefined || record.amountMinor <= query.amountMinorMax);
    const sorted = [...filtered].sort((left, right) =>
      query.sort === 'amount_desc'
        ? right.amountMinor - left.amountMinor
        : right.localDate.localeCompare(left.localDate),
    );
    const pageRecords = sorted.slice(query.offset, query.offset + query.limit);

    return ok({
      hasMore: query.offset + pageRecords.length < sorted.length,
      limit: query.limit,
      offset: query.offset,
      records: pageRecords,
      totalCount: sorted.length,
    });
  });
  const dependencies: MoneyHistoryServiceDependencies = {
    createCategoryTopicRepository: () =>
      ({
        archiveItem: jest.fn(),
        createItem: jest.fn(),
        findItem: jest.fn(),
        listItems: jest.fn(async (kind: CategoryTopicKind) => ok(kind === 'category' ? categories : topics)),
        updateName: jest.fn(),
        updateSortOrders: jest.fn(),
      }) as never,
    createMoneyRecordRepository: () =>
      ({
        createManualRecord: jest.fn(),
        deleteRecord: jest.fn(),
        getRecord: jest.fn(),
        listHistoryRecords,
        listRecentRecords: jest.fn(),
        listRecordsForPeriod: jest.fn(),
        updateRecord: jest.fn(),
      }) as never,
    createPreferencesRepository: () =>
      ({
        loadPreferences: jest.fn(async () => ok(preferences)),
        savePreferences: jest.fn(),
      }) as never,
    migrateDatabase: jest.fn(async () => migrationResult),
    now: () => fixedNow,
    openDatabase: jest.fn(() => ({})),
  };

  return { dependencies, listHistoryRecords };
}

describe('money history service', () => {
  it('loads history with labels, pagination, and summaries', async () => {
    const { dependencies, listHistoryRecords } = createDependencies();

    const result = await loadMoneyHistory({ limit: 1, sort: 'amount_desc', summaryMode: 'week' }, dependencies);

    expect(result.ok).toBe(true);
    expect(listHistoryRecords).toHaveBeenCalledWith(
      localWorkspaceId,
      expect.objectContaining({
        limit: 1,
        offset: 0,
        sort: 'amount_desc',
      }),
    );
    if (result.ok) {
      expect(result.value.categories.map((category) => category.id)).toContain('cat-archived');
      expect(result.value.records.map((record) => record.id)).toEqual(['money-income']);
      expect(result.value.page.hasMore).toBe(true);
      expect(result.value.summaries[0]).toMatchObject({
        incomeAmountMinor: 5000,
        key: '2026-05-04',
      });
    }
  });

  it('preserves corrected receipt provenance and summarizes the corrected saved value', async () => {
    const correctedReceipt = createRecord({
      amountMinor: 2350,
      id: 'corrected-receipt',
      merchantOrSource: 'Corrected bookstore',
      source: 'receipt',
      sourceOfTruth: 'manual',
      userCorrectedAt: fixedNow.toISOString(),
    });
    const { dependencies } = createDependencies({ records: [correctedReceipt] });

    const result = await loadMoneyHistory({ summaryMode: 'day' }, dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.records[0]).toMatchObject({
        amountMinor: 2350,
        id: 'corrected-receipt',
        source: 'receipt',
        sourceOfTruth: 'manual',
        userCorrectedAt: fixedNow.toISOString(),
      });
      expect(result.value.summaries[0]).toMatchObject({
        expenseAmountMinor: 2350,
        recordCount: 1,
      });
    }
  });

  it('validates filters before querying records', async () => {
    const { dependencies, listHistoryRecords } = createDependencies();

    const invalidDate = await loadMoneyHistory({ dateFrom: '2026-02-30' }, dependencies);
    const invalidAmountRange = await loadMoneyHistory({ amountMinorMax: 100, amountMinorMin: 200 }, dependencies);

    expect(invalidDate.ok).toBe(false);
    expect(invalidAmountRange.ok).toBe(false);
    expect(listHistoryRecords).not.toHaveBeenCalled();
  });

  it('requires preferences and maps migration failures', async () => {
    const missingPreferences = await loadMoneyHistory({}, createDependencies({ preferences: null }).dependencies);
    const migrationFailure = await loadMoneyHistory(
      {},
      createDependencies({
        migrationResult: {
          ok: false,
          error: createAppError('unavailable', 'migration failed', 'retry'),
        },
      }).dependencies,
    );

    expect(missingPreferences.ok).toBe(false);
    expect(migrationFailure.ok).toBe(false);
    if (!missingPreferences.ok) {
      expect(missingPreferences.error.recovery).toBe('settings');
    }
    if (!migrationFailure.ok) {
      expect(migrationFailure.error.recovery).toBe('retry');
    }
  });
});
