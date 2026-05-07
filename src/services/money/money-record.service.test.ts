import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyRecord, SaveManualMoneyRecordInput } from '@/domain/money/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createManualMoneyRecord,
  loadManualMoneyCaptureData,
  type MoneyRecordServiceDependencies,
} from './money-record.service';

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

function createMoneyRecord(input: SaveManualMoneyRecordInput): AppResult<MoneyRecord> {
  return parseMoneyRecordRow(
    {
      amountMinor: input.amountMinor,
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      currencyCode: input.currencyCode,
      deletedAt: input.deletedAt ?? null,
      id: input.id,
      kind: input.kind,
      localDate: input.localDate,
      merchantOrSource: input.merchantOrSource ?? null,
      note: input.note ?? null,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      updatedAt: input.updatedAt,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
}

function createDependencies({
  categories = [createCategoryTopic('category', 'cat-food', 'Food')],
  migrationResult = ok({ applied: 0, appliedMigrations: [] }),
  preferences = createPreferences() as UserPreferences | null,
  recentRecords = [] as MoneyRecord[],
  topics = [createCategoryTopic('topic', 'topic-campus', 'Campus')],
}: {
  categories?: CategoryTopicItem[];
  migrationResult?: AppResult<{ applied: number; appliedMigrations: string[] }>;
  preferences?: UserPreferences | null;
  recentRecords?: MoneyRecord[];
  topics?: CategoryTopicItem[];
} = {}) {
  const createManualRecord = jest.fn(async (input: SaveManualMoneyRecordInput) => createMoneyRecord(input));
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
  const dependencies: MoneyRecordServiceDependencies = {
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createId: () => 'money-created',
    createMoneyRecordRepository: () =>
      ({
        createManualRecord,
        getRecord: jest.fn(),
        listRecentRecords: jest.fn(async () => ok(recentRecords)),
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

  return { createManualRecord, dependencies };
}

describe('money record service', () => {
  it('loads preferences, category/topic options, and recent records', async () => {
    const { dependencies } = createDependencies();

    const result = await loadManualMoneyCaptureData(dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.preferences.currencyCode).toBe('USD');
      expect(result.value.categories[0].id).toBe('cat-food');
      expect(result.value.topics[0].id).toBe('topic-campus');
    }
  });

  it('requires saved preferences before creating manual money records', async () => {
    const { dependencies } = createDependencies({ preferences: null });

    const result = await createManualMoneyRecord(
      {
        amountMinor: 1250,
        kind: 'expense',
        localDate: '2026-05-08',
      },
      dependencies,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('creates a valid manual record using saved preference currency and active metadata', async () => {
    const { createManualRecord, dependencies } = createDependencies();

    const result = await createManualMoneyRecord(
      {
        amountMinor: 1250,
        categoryId: 'cat-food',
        kind: 'expense',
        localDate: '2026-05-08',
        merchantOrSource: ' Campus cafe ',
        note: ' Lunch ',
        topicIds: ['topic-campus'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(createManualRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: 'USD',
        id: 'money-created',
        source: 'manual',
        sourceOfTruth: 'manual',
        topicIds: ['topic-campus'],
      }),
    );
    if (result.ok) {
      expect(result.value.merchantOrSource).toBe('Campus cafe');
      expect(result.value.note).toBe('Lunch');
    }
  });

  it('rejects invalid amount, date, category, and topic input before persistence', async () => {
    const { createManualRecord, dependencies } = createDependencies();
    const invalidAmount = await createManualMoneyRecord(
      { amountMinor: 0, kind: 'expense', localDate: '2026-05-08' },
      dependencies,
    );
    const invalidDate = await createManualMoneyRecord(
      { amountMinor: 100, kind: 'expense', localDate: '2026-02-30' },
      dependencies,
    );
    const invalidCategory = await createManualMoneyRecord(
      { amountMinor: 100, categoryId: 'missing', kind: 'expense', localDate: '2026-05-08' },
      dependencies,
    );
    const invalidTopic = await createManualMoneyRecord(
      { amountMinor: 100, kind: 'expense', localDate: '2026-05-08', topicIds: ['missing'] },
      dependencies,
    );

    expect(invalidAmount.ok).toBe(false);
    expect(invalidDate.ok).toBe(false);
    expect(invalidCategory.ok).toBe(false);
    expect(invalidTopic.ok).toBe(false);
    expect(createManualRecord).not.toHaveBeenCalled();
  });

  it('maps open and migration failures to retryable errors', async () => {
    const openFailure = await loadManualMoneyCaptureData({
      openDatabase: () => {
        throw new Error('open failed');
      },
    });
    const migrationFailure = await loadManualMoneyCaptureData(
      createDependencies({
        migrationResult: {
          ok: false,
          error: createAppError('unavailable', 'migration failed', 'retry'),
        },
      }).dependencies,
    );

    expect(openFailure.ok).toBe(false);
    expect(migrationFailure.ok).toBe(false);
    if (!openFailure.ok) {
      expect(openFailure.error.recovery).toBe('retry');
    }
    if (!migrationFailure.ok) {
      expect(migrationFailure.error.recovery).toBe('retry');
    }
  });
});
