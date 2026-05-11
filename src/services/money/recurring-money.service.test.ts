import { createAppError } from '@/domain/common/app-error';
import { ok, type AppResult } from '@/domain/common/result';
import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyRecord, SaveManualMoneyRecordInput } from '@/domain/money/types';
import { parseRecurrenceRuleRow } from '@/domain/recurrence/schemas';
import type {
  RecurrenceException,
  RecurrenceRule,
  SaveRecurrenceExceptionInput,
  SaveRecurringMoneyRuleInput,
} from '@/domain/recurrence/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createRecurringMoneyRule,
  deleteRecurringMoneyRule,
  generateDueRecurringMoneyOccurrences,
  loadRecurringMoneyData,
  pauseRecurringMoneyRule,
  resumeRecurringMoneyRule,
  skipRecurringMoneyOccurrence,
  stopRecurringMoneyRule,
  updateRecurringMoneyRule,
  type RecurringMoneyServiceDependencies,
} from './recurring-money.service';

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

function createRule(input: SaveRecurringMoneyRuleInput): AppResult<RecurrenceRule> {
  return parseRecurrenceRuleRow(
    {
      amountMinor: input.amountMinor,
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      currencyCode: input.currencyCode,
      deletedAt: input.deletedAt ?? null,
      endsOnLocalDate: input.endsOnLocalDate ?? null,
      frequency: input.frequency,
      id: input.id,
      lastGeneratedLocalDate: input.lastGeneratedLocalDate ?? null,
      merchantOrSource: input.merchantOrSource ?? null,
      moneyKind: input.moneyKind,
      note: input.note ?? null,
      ownerKind: 'money',
      pausedAt: input.pausedAt ?? null,
      source: 'recurring',
      sourceOfTruth: 'manual',
      startsOnLocalDate: input.startsOnLocalDate,
      stoppedAt: input.stoppedAt ?? null,
      updatedAt: input.updatedAt,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );
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

function createDependencies({
  categories = [createCategoryTopic('category', 'cat-food', 'Food')],
  preferences = createPreferences() as UserPreferences | null,
  rules = [] as RecurrenceRule[],
  topics = [createCategoryTopic('topic', 'topic-campus', 'Campus')],
}: {
  categories?: CategoryTopicItem[];
  preferences?: UserPreferences | null;
  rules?: RecurrenceRule[];
  topics?: CategoryTopicItem[];
} = {}) {
  const records: MoneyRecord[] = [];
  const exceptions: RecurrenceException[] = [];
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
  const recurrenceRuleRepository = {
    createException: jest.fn(async (input: SaveRecurrenceExceptionInput) => {
      const existing = exceptions.find(
        (exception) =>
          exception.recurrenceRuleId === input.recurrenceRuleId &&
          exception.occurrenceLocalDate === input.occurrenceLocalDate,
      );

      if (existing) {
        return ok(existing);
      }

      const created = {
        action: input.action,
        createdAt: input.createdAt,
        id: input.id as never,
        moneyRecordId: (input.moneyRecordId ?? null) as never,
        occurrenceLocalDate: input.occurrenceLocalDate as never,
        recurrenceRuleId: input.recurrenceRuleId as never,
        updatedAt: input.updatedAt,
        workspaceId: input.workspaceId as never,
      } satisfies RecurrenceException;
      exceptions.push(created);

      return ok(created);
    }),
    createRule: jest.fn(async (input: SaveRecurringMoneyRuleInput) => {
      const created = createRule(input);

      if (created.ok) {
        rules.push(created.value);
      }

      return created;
    }),
    deleteRule: jest.fn(async (_workspaceId: string, id: string, deletedAt: string, updatedAt: string) => {
      const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!rule) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      Object.assign(rule, { deletedAt, updatedAt });
      return ok({ ...rule });
    }),
    getRule: jest.fn(async (_workspaceId: string, id: string) =>
      ok(rules.find((rule) => rule.id === id && rule.deletedAt === null) ?? null),
    ),
    listExceptions: jest.fn(async (_workspaceId: string, ruleId: string) =>
      ok(exceptions.filter((exception) => exception.recurrenceRuleId === ruleId)),
    ),
    listRules: jest.fn(async () => ok(rules.filter((rule) => rule.deletedAt === null))),
    pauseRule: jest.fn(async (_workspaceId: string, id: string, pausedAt: string, updatedAt: string) => {
      const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!rule) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      Object.assign(rule, { pausedAt, updatedAt });
      return ok({ ...rule });
    }),
    resumeRule: jest.fn(async (_workspaceId: string, id: string, updatedAt: string) => {
      const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!rule) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      Object.assign(rule, { pausedAt: null, updatedAt });
      return ok({ ...rule });
    }),
    stopRule: jest.fn(async (_workspaceId: string, id: string, stoppedAt: string, updatedAt: string) => {
      const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!rule) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      Object.assign(rule, { stoppedAt, updatedAt });
      return ok({ ...rule });
    }),
    updateLastGeneratedLocalDate: jest.fn(
      async (_workspaceId: string, id: string, lastGeneratedLocalDate: string, updatedAt: string) => {
        const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

        if (!rule) {
          return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
        }

        Object.assign(rule, { lastGeneratedLocalDate, updatedAt });
        return ok({ ...rule });
      },
    ),
    updateRule: jest.fn(async (input: SaveRecurringMoneyRuleInput) => {
      const index = rules.findIndex((rule) => rule.id === input.id && rule.deletedAt === null);

      if (index < 0) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      const updated = createRule({
        ...input,
        createdAt: rules[index].createdAt,
        lastGeneratedLocalDate: rules[index].lastGeneratedLocalDate,
      });

      if (updated.ok) {
        rules[index] = updated.value;
      }

      return updated;
    }),
  };
  const moneyRecordRepository = {
    createManualRecord: jest.fn(async (input: SaveManualMoneyRecordInput) => {
      const created = createMoneyRecord(input);

      if (created.ok) {
        records.push(created.value);
      }

      return created;
    }),
    deleteRecord: jest.fn(),
    findByRecurrenceOccurrence: jest.fn(async (_workspaceId: string, recurrenceRuleId: string, occurrenceDate: string) =>
      ok(
        records.find(
          (record) =>
            record.recurrenceRuleId === recurrenceRuleId &&
            record.recurrenceOccurrenceDate === occurrenceDate &&
            record.deletedAt === null,
        ) ?? null,
      ),
    ),
    getRecord: jest.fn(),
    listHistoryRecords: jest.fn(),
    listRecentRecords: jest.fn(),
    listRecordsForPeriod: jest.fn(),
    updateRecord: jest.fn(),
  };
  const dependencies: RecurringMoneyServiceDependencies = {
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createExceptionId: () => `exception-${exceptions.length + 1}`,
    createMoneyRecordId: () => `money-${records.length + 1}`,
    createMoneyRecordRepository: () => moneyRecordRepository as never,
    createPreferencesRepository: () => ({
      loadPreferences: jest.fn(async () => ok(preferences)),
      savePreferences: jest.fn(),
    }),
    createRecurrenceRuleId: () => `rule-${rules.length + 1}`,
    createRecurrenceRuleRepository: () => recurrenceRuleRepository as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    dependencies,
    exceptions,
    moneyRecordRepository,
    records,
    recurrenceRuleRepository,
    rules,
  };
}

function createRuleFixture(overrides: Partial<SaveRecurringMoneyRuleInput> = {}): RecurrenceRule {
  const result = createRule({
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD',
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'rule-1',
    merchantOrSource: 'Rent',
    moneyKind: 'expense',
    note: null,
    startsOnLocalDate: '2026-05-06',
    topicIds: ['topic-campus'],
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('rule fixture failed');
  }

  return result.value;
}

describe('recurring money service', () => {
  it('requires saved preferences before loading recurring money', async () => {
    const { dependencies } = createDependencies({ preferences: null });

    const result = await loadRecurringMoneyData(dependencies);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.recovery).toBe('settings');
    }
  });

  it('creates recurring money rules with active category and topics', async () => {
    const { dependencies, rules } = createDependencies();

    const result = await createRecurringMoneyRule(
      {
        amountMinor: 1250,
        categoryId: 'cat-food',
        frequency: 'monthly',
        kind: 'expense',
        merchantOrSource: 'Rent',
        startsOnLocalDate: '2026-05-31',
        topicIds: ['topic-campus'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      amountMinor: 1250,
      currencyCode: 'USD',
      frequency: 'monthly',
      source: 'recurring',
      sourceOfTruth: 'manual',
    });
  });

  it('rejects archived categories and invalid end dates', async () => {
    const { dependencies } = createDependencies({
      categories: [createCategoryTopic('category', 'cat-archived', 'Old')],
    });

    const archived = await createRecurringMoneyRule(
      {
        amountMinor: 1250,
        categoryId: 'cat-archived',
        frequency: 'daily',
        kind: 'expense',
        startsOnLocalDate: '2026-05-08',
      },
      dependencies,
    );
    const badEnd = await createRecurringMoneyRule(
      {
        amountMinor: 1250,
        endsOnLocalDate: '2026-05-07',
        frequency: 'daily',
        kind: 'expense',
        startsOnLocalDate: '2026-05-08',
      },
      dependencies,
    );

    expect(archived.ok).toBe(false);
    expect(badEnd.ok).toBe(false);
  });

  it('updates future recurrence templates without changing generated records', async () => {
    const rule = createRuleFixture({ lastGeneratedLocalDate: '2026-05-07' });
    const { dependencies, rules } = createDependencies({ rules: [rule] });

    const updated = await updateRecurringMoneyRule(
      {
        amountMinor: 2250,
        categoryId: 'cat-food',
        frequency: 'weekly',
        id: 'rule-1',
        kind: 'income',
        merchantOrSource: 'Campus job',
        startsOnLocalDate: '2026-05-08',
        topicIds: [],
      },
      dependencies,
    );

    expect(updated.ok).toBe(true);
    expect(rules[0]).toMatchObject({
      amountMinor: 2250,
      frequency: 'weekly',
      lastGeneratedLocalDate: '2026-05-07',
      moneyKind: 'income',
    });
  });

  it('pauses, resumes, stops, and deletes a recurring money rule', async () => {
    const rule = createRuleFixture();
    const { dependencies, rules } = createDependencies({ rules: [rule] });

    const paused = await pauseRecurringMoneyRule({ id: 'rule-1' }, dependencies);
    const resumed = await resumeRecurringMoneyRule({ id: 'rule-1' }, dependencies);
    const stopped = await stopRecurringMoneyRule({ id: 'rule-1' }, dependencies);
    const deleted = await deleteRecurringMoneyRule({ id: 'rule-1' }, dependencies);

    expect(paused.ok && paused.value.pausedAt).toBe(fixedNow.toISOString());
    expect(resumed.ok && resumed.value.pausedAt).toBeNull();
    expect(stopped.ok && stopped.value.stoppedAt).toBe(fixedNow.toISOString());
    expect(deleted.ok && deleted.value.deletedAt).toBe(fixedNow.toISOString());
    expect(rules[0].deletedAt).toBe(fixedNow.toISOString());
  });

  it('skips the next occurrence and excludes it from due generation', async () => {
    const rule = createRuleFixture({ startsOnLocalDate: '2026-05-08' });
    const { dependencies, exceptions, records } = createDependencies({ rules: [rule] });

    const skipped = await skipRecurringMoneyOccurrence({ id: 'rule-1' }, dependencies);
    const generated = await generateDueRecurringMoneyOccurrences({ throughLocalDate: '2026-05-10' }, dependencies);

    expect(skipped).toEqual({ ok: true, value: '2026-05-08' });
    expect(exceptions).toHaveLength(1);
    expect(generated.ok).toBe(true);
    expect(records.map((record) => record.localDate)).toEqual(['2026-05-09', '2026-05-10']);
  });

  it('generates due money records with recurrence links and prevents duplicates', async () => {
    const rule = createRuleFixture({ frequency: 'monthly', startsOnLocalDate: '2026-01-31' });
    const { dependencies, moneyRecordRepository, records, rules } = createDependencies({ rules: [rule] });

    const first = await generateDueRecurringMoneyOccurrences({ throughLocalDate: '2026-03-31' }, dependencies);
    const second = await generateDueRecurringMoneyOccurrences({ throughLocalDate: '2026-03-31' }, dependencies);

    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.generatedRecords.map((record) => record.localDate)).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
      ]);
    }
    expect(second).toEqual({
      ok: true,
      value: {
        generatedRecords: [],
        skippedExistingCount: 0,
      },
    });
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      recurrenceOccurrenceDate: '2026-01-31',
      recurrenceRuleId: 'rule-1',
      source: 'recurring',
      sourceOfTruth: 'manual',
    });
    expect(rules[0].lastGeneratedLocalDate).toBe('2026-03-31');
    expect(moneyRecordRepository.findByRecurrenceOccurrence).toHaveBeenCalled();
  });
});
