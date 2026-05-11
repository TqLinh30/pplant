import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseRecurrenceRuleRow } from '@/domain/recurrence/schemas';
import type { RecurrenceRule } from '@/domain/recurrence/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { RecurringMoneyData, RecurringMoneyRuleView } from '@/services/money/recurring-money.service';

import {
  createDefaultRecurringMoneyDraft,
  initialRecurringMoneyState,
  recurringMoneyReducer,
  validateRecurringMoneyDraft,
} from './useRecurringMoney';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createPreferences(): UserPreferences {
  const result = parseUserPreferencesRow({
    createdAt: fixedNow,
    currencyCode: 'USD',
    defaultHourlyWageCurrencyCode: 'USD',
    defaultHourlyWageMinor: 1500,
    locale: 'en-US',
    monthlyBudgetResetDay: 1,
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('preferences fixture failed');
  }

  return result.value;
}

function createCategory(): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow,
      id: 'cat-rent',
      name: 'Rent',
      sortOrder: 0,
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    },
    'category',
  );

  if (!result.ok) {
    throw new Error('category fixture failed');
  }

  return result.value;
}

function createRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  const result = parseRecurrenceRuleRow(
    {
      amountMinor: 1250,
      categoryId: 'cat-rent',
      createdAt: fixedNow,
      currencyCode: 'USD',
      deletedAt: null,
      endsOnLocalDate: null,
      frequency: 'monthly',
      id: 'rule-1',
      lastGeneratedLocalDate: null,
      merchantOrSource: 'Campus rent',
      moneyKind: 'expense',
      note: 'Dorm',
      ownerKind: 'money',
      pausedAt: null,
      source: 'recurring',
      sourceOfTruth: 'manual',
      startsOnLocalDate: '2026-05-08',
      stoppedAt: null,
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
      ...overrides,
    },
    ['topic-campus'],
  );

  if (!result.ok) {
    throw new Error('rule fixture failed');
  }

  return result.value;
}

function createData(rules: RecurringMoneyRuleView[] = []): RecurringMoneyData {
  return {
    categories: [createCategory()],
    preferences: createPreferences(),
    rules,
    topics: [],
  };
}

describe('recurring money capture state', () => {
  it('validates a recurring money draft into service input', () => {
    const validation = validateRecurringMoneyDraft(
      {
        amount: '12.50',
        categoryId: 'cat-rent',
        endsOnLocalDate: '',
        frequency: 'monthly',
        kind: 'expense',
        merchantOrSource: ' Campus rent ',
        note: ' Dorm ',
        startsOnLocalDate: '2026-05-08',
        topicIds: ['topic-campus'],
      },
      createPreferences(),
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        amountMinor: 1250,
        categoryId: 'cat-rent',
        endsOnLocalDate: null,
        frequency: 'monthly',
        kind: 'expense',
        merchantOrSource: 'Campus rent',
        note: 'Dorm',
        startsOnLocalDate: '2026-05-08',
        topicIds: ['topic-campus'],
      });
    }
  });

  it('returns field errors for invalid recurring money drafts', () => {
    const invalid = validateRecurringMoneyDraft(
      {
        amount: '0',
        categoryId: '',
        endsOnLocalDate: '2026-05-07',
        frequency: 'yearly' as never,
        kind: 'expense',
        merchantOrSource: 'x'.repeat(81),
        note: 'x'.repeat(241),
        startsOnLocalDate: '2026-05-08',
        topicIds: ['topic-campus', 'topic-campus'],
      },
      createPreferences(),
    );
    const missingPreferences = validateRecurringMoneyDraft(
      createDefaultRecurringMoneyDraft(new Date('2026-05-08T00:00:00.000Z')),
      null,
    );

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors?.amount).toBeDefined();
      expect(invalid.fieldErrors?.endsOnLocalDate).toBeDefined();
      expect(invalid.fieldErrors?.frequency).toBeDefined();
      expect(invalid.fieldErrors?.merchantOrSource).toBeDefined();
      expect(invalid.fieldErrors?.note).toBeDefined();
      expect(invalid.fieldErrors?.topicIds).toBeDefined();
    }
    expect(missingPreferences.ok).toBe(false);
    if (!missingPreferences.ok) {
      expect(missingPreferences.error.recovery).toBe('settings');
    }
  });

  it('loads recurring money data and starts editing a rule', () => {
    const view = {
      nextOccurrences: ['2026-06-08' as never, '2026-07-08' as never],
      rule: createRule(),
    };
    const loaded = recurringMoneyReducer(initialRecurringMoneyState, {
      data: createData([view]),
      type: 'load_succeeded',
    });
    const editing = recurringMoneyReducer(loaded, {
      amount: '12.50',
      type: 'edit_started',
      view,
    });

    expect(loaded.status).toBe('ready');
    expect(loaded.rules).toEqual([view]);
    expect(editing.editingRuleId).toBe('rule-1');
    expect(editing.draft).toMatchObject({
      amount: '12.50',
      categoryId: 'cat-rent',
      frequency: 'monthly',
      startsOnLocalDate: '2026-05-08',
    });
  });

  it('records generated and skipped action results after refreshing data', () => {
    const data = createData();
    const generated = recurringMoneyReducer(initialRecurringMoneyState, {
      data,
      generatedCount: 2,
      mutation: 'generated',
      skippedExistingCount: 1,
      type: 'action_succeeded',
    });
    const skipped = recurringMoneyReducer(generated, {
      data,
      mutation: 'skipped',
      skippedDate: '2026-05-15',
      type: 'action_succeeded',
    });

    expect(generated.status).toBe('saved');
    expect(generated.generatedCount).toBe(2);
    expect(generated.skippedExistingCount).toBe(1);
    expect(skipped.lastMutation).toBe('skipped');
    expect(skipped.skippedDate).toBe('2026-05-15');
  });

  it('returns to ready state after action failures', () => {
    const error = createAppError('unavailable', 'Recurring money failed.', 'retry');
    const failed = recurringMoneyReducer(
      {
        ...initialRecurringMoneyState,
        status: 'saving',
      },
      {
        error,
        type: 'action_failed',
      },
    );

    expect(failed.status).toBe('ready');
    expect(failed.actionError).toBe(error);
  });
});
