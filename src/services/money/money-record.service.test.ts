import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { parseBudgetRulesRow, parseSavingsGoalRow } from '@/domain/budgets/schemas';
import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyRecord, SaveManualMoneyRecordInput } from '@/domain/money/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createManualMoneyRecord,
  deleteMoneyRecord,
  editManualMoneyRecord,
  loadManualMoneyCaptureData,
  loadManualMoneyRecordForEdit,
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

function createBudgetRules(): BudgetRules {
  const result = parseBudgetRulesRow({
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    monthlyBudgetAmountMinor: 5000,
    overBudgetBehavior: 'allow_negative_warning',
    resetDaySource: 'preferences',
    rolloverPolicy: 'savings_fund',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('budget fixture failed');
  }

  return result.value;
}

function createSavingsGoal(): SavingsGoal {
  const result = parseSavingsGoalRow({
    archivedAt: null,
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    currentAmountMinor: 2500,
    id: 'goal-supplies',
    name: 'Supplies',
    targetAmountMinor: 10000,
    targetDate: null,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('savings fixture failed');
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
      recurrenceOccurrenceDate: input.recurrenceOccurrenceDate ?? null,
      recurrenceRuleId: input.recurrenceRuleId ?? null,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      updatedAt: input.updatedAt,
      userCorrectedAt: input.userCorrectedAt ?? null,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
}

function createMoneyRecordFixture(overrides: Partial<SaveManualMoneyRecordInput> = {}): MoneyRecord {
  const result = createMoneyRecord({
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    deletedAt: null,
    id: 'money-1',
    kind: 'expense',
    localDate: '2026-05-08',
    merchantOrSource: 'Campus cafe',
    note: 'Lunch',
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: ['topic-campus'],
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('money fixture failed');
  }

  return result.value;
}

function createDependencies({
  budgetRules = createBudgetRules() as BudgetRules | null,
  categories = [createCategoryTopic('category', 'cat-food', 'Food')],
  migrationResult = ok({ applied: 0, appliedMigrations: [] }),
  preferences = createPreferences() as UserPreferences | null,
  recentRecords = [] as MoneyRecord[],
  savingsGoals = [createSavingsGoal()],
  topics = [createCategoryTopic('topic', 'topic-campus', 'Campus')],
}: {
  budgetRules?: BudgetRules | null;
  categories?: CategoryTopicItem[];
  migrationResult?: AppResult<{ applied: number; appliedMigrations: string[] }>;
  preferences?: UserPreferences | null;
  recentRecords?: MoneyRecord[];
  savingsGoals?: SavingsGoal[];
  topics?: CategoryTopicItem[];
} = {}) {
  const records = [...recentRecords];
  const createManualRecord = jest.fn(async (input: SaveManualMoneyRecordInput) => {
    const created = createMoneyRecord(input);

    if (created.ok) {
      records.push(created.value);
    }

    return created;
  });
  const updateRecord = jest.fn(async (input: SaveManualMoneyRecordInput) => {
    const index = records.findIndex(
      (record) => record.workspaceId === input.workspaceId && record.id === input.id && record.deletedAt === null,
    );

    if (index < 0) {
      return {
        ok: false as const,
        error: createAppError('not_found', 'Money record was not found.', 'edit'),
      };
    }

    const updated = createMoneyRecord({
      ...input,
      createdAt: records[index].createdAt,
      source: records[index].source,
      sourceOfTruth: 'manual',
      userCorrectedAt: input.userCorrectedAt ?? input.updatedAt,
    });

    if (updated.ok) {
      records[index] = updated.value;
    }

    return updated;
  });
  const deleteRecord = jest.fn(async (_workspaceId: string, id: string, { now }: { now: Date }) => {
    const index = records.findIndex((record) => record.id === id && record.deletedAt === null);

    if (index < 0) {
      return {
        ok: false as const,
        error: createAppError('not_found', 'Money record was not found.', 'edit'),
      };
    }

    records[index] = {
      ...records[index],
      deletedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return ok(records[index]);
  });
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
  const budgetPlanningRepository = {
    createSavingsGoal: jest.fn(),
    findSavingsGoal: jest.fn(),
    listSavingsGoals: jest.fn(async () => ok(savingsGoals)),
    loadBudgetRules: jest.fn(async () => ok(budgetRules)),
    saveBudgetRules: jest.fn(),
    updateSavingsGoal: jest.fn(),
  };
  const moneyRecordRepository = {
    createManualRecord,
    deleteRecord,
    getRecord: jest.fn(async (_workspaceId: string, id: string) => {
      return ok(records.find((record) => record.id === id && record.deletedAt === null) ?? null);
    }),
    listRecentRecords: jest.fn(async () => ok(records.filter((record) => record.deletedAt === null))),
    listRecordsForPeriod: jest.fn(async (_workspaceId: string, period: { startDate: string; endDateExclusive: string }) =>
      ok(
        records.filter(
          (record) =>
            record.deletedAt === null &&
            record.localDate >= period.startDate &&
            record.localDate < period.endDateExclusive,
        ),
      ),
    ),
    updateRecord,
  };
  const dependencies: MoneyRecordServiceDependencies = {
    createBudgetPlanningRepository: () => budgetPlanningRepository as never,
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createId: () => 'money-created',
    createMoneyRecordRepository: () => moneyRecordRepository as never,
    createPreferencesRepository: () =>
      ({
        loadPreferences: jest.fn(async () => ok(preferences)),
        savePreferences: jest.fn(),
      }) as never,
    migrateDatabase: jest.fn(async () => migrationResult),
    now: () => fixedNow,
    openDatabase: jest.fn(() => ({})),
  };

  return { budgetPlanningRepository, createManualRecord, deleteRecord, dependencies, records, updateRecord };
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

  it('loads a specific active money record for editing', async () => {
    const record = createMoneyRecordFixture({ id: 'money-edit' });
    const { dependencies } = createDependencies({ recentRecords: [record] });

    const result = await loadManualMoneyRecordForEdit({ id: record.id }, dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.record.id).toBe(record.id);
      expect(result.value.preferences.currencyCode).toBe('USD');
      expect(result.value.categories[0].id).toBe('cat-food');
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

  it('edits records, stores manual correction provenance, and recalculates planning summaries', async () => {
    const receiptRecord = createMoneyRecordFixture({
      amountMinor: 1000,
      source: 'receipt',
      sourceOfTruth: 'parsed',
      topicIds: [],
    });
    const { dependencies, updateRecord } = createDependencies({
      recentRecords: [receiptRecord],
    });

    const result = await editManualMoneyRecord(
      {
        amountMinor: 2000,
        categoryId: 'cat-food',
        id: receiptRecord.id,
        kind: 'expense',
        localDate: '2026-05-08',
        merchantOrSource: ' Bookstore ',
        note: ' Corrected total ',
        topicIds: ['topic-campus'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(updateRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'receipt',
        sourceOfTruth: 'manual',
        userCorrectedAt: fixedNow.toISOString(),
      }),
    );
    if (result.ok) {
      expect(result.value.record.source).toBe('receipt');
      expect(result.value.record.sourceOfTruth).toBe('manual');
      expect(result.value.record.userCorrectedAt).toBe(fixedNow.toISOString());
      expect(result.value.record.merchantOrSource).toBe('Bookstore');
      expect(result.value.planningSummaries).toHaveLength(1);
      expect(result.value.planningSummaries[0].expenseAmountMinor).toBe(2000);
      expect(result.value.planningSummaries[0].budgetStatus?.remainingMinor).toBe(3000);
      expect(result.value.planningSummaries[0].savingsProgress[0]).toMatchObject({
        currentAmountMinor: 2500,
        progressBasisPoints: 2500,
      });
    }
  });

  it('recalculates each distinct affected period after date edits', async () => {
    const existing = createMoneyRecordFixture({
      id: 'money-moving',
      localDate: '2026-04-30',
      topicIds: [],
    });
    const { dependencies } = createDependencies({
      recentRecords: [existing],
    });

    const result = await editManualMoneyRecord(
      {
        amountMinor: 1250,
        id: existing.id,
        kind: 'expense',
        localDate: '2026-05-08',
        topicIds: [],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.planningSummaries.map((summary) => summary.period.startDate)).toEqual([
        '2026-04-01',
        '2026-05-01',
      ]);
    }
  });

  it('soft deletes records and recalculates summaries from remaining active records', async () => {
    const deletedCandidate = createMoneyRecordFixture({ amountMinor: 1200, id: 'money-delete' });
    const remaining = createMoneyRecordFixture({ amountMinor: 700, id: 'money-remaining' });
    const { dependencies, records } = createDependencies({
      recentRecords: [deletedCandidate, remaining],
    });

    const result = await deleteMoneyRecord({ id: deletedCandidate.id }, dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.record.deletedAt).toBe(fixedNow.toISOString());
      expect(result.value.planningSummaries[0].expenseAmountMinor).toBe(700);
      expect(records.find((record) => record.id === deletedCandidate.id)?.deletedAt).toBe(fixedNow.toISOString());
    }
  });

  it('returns not_found for missing or already deleted records', async () => {
    const deleted = createMoneyRecordFixture({
      deletedAt: fixedNow.toISOString(),
      id: 'money-deleted',
    });
    const { dependencies } = createDependencies({
      recentRecords: [deleted],
    });

    const editMissing = await editManualMoneyRecord(
      {
        amountMinor: 100,
        id: 'missing',
        kind: 'expense',
        localDate: '2026-05-08',
      },
      dependencies,
    );
    const deleteAlreadyDeleted = await deleteMoneyRecord({ id: deleted.id }, dependencies);

    expect(editMissing.ok).toBe(false);
    expect(deleteAlreadyDeleted.ok).toBe(false);
    if (!editMissing.ok) {
      expect(editMissing.error.code).toBe('not_found');
    }
    if (!deleteAlreadyDeleted.ok) {
      expect(deleteAlreadyDeleted.error.code).toBe('not_found');
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
