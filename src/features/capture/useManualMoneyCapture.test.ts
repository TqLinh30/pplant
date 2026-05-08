import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { parseMoneyRecordRow } from '@/domain/money/schemas';
import type { MoneyRecord } from '@/domain/money/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createDefaultManualMoneyCaptureDraft,
  initialManualMoneyCaptureState,
  manualMoneyCaptureReducer,
  validateManualMoneyCaptureDraft,
} from './useManualMoneyCapture';

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
      id: 'cat-food',
      name: 'Food',
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

function createRecord(): MoneyRecord {
  const result = parseMoneyRecordRow({
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow,
    currencyCode: 'USD',
    deletedAt: null,
    id: 'money-1',
    kind: 'expense',
    localDate: '2026-05-08',
    merchantOrSource: 'Campus cafe',
    note: null,
    source: 'manual',
    sourceOfTruth: 'manual',
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('money fixture failed');
  }

  return result.value;
}

describe('manual money capture state', () => {
  it('loads capture data into ready state', () => {
    const preferences = createPreferences();
    const category = createCategory();
    const record = createRecord();
    const state = manualMoneyCaptureReducer(initialManualMoneyCaptureState, {
      data: {
        categories: [category],
        preferences,
        recentRecords: [record],
        topics: [],
      },
      type: 'load_succeeded',
    });

    expect(state.status).toBe('ready');
    expect(state.preferences?.currencyCode).toBe('USD');
    expect(state.categories).toEqual([category]);
    expect(state.recentRecords).toEqual([record]);
  });

  it('validates a valid draft into service input', () => {
    const validation = validateManualMoneyCaptureDraft(
      {
        amount: '12.50',
        categoryId: 'cat-food',
        kind: 'expense',
        localDate: '2026-05-08',
        merchantOrSource: ' Campus cafe ',
        note: ' Lunch ',
        topicIds: ['topic-campus'],
      },
      createPreferences(),
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        amountMinor: 1250,
        categoryId: 'cat-food',
        kind: 'expense',
        localDate: '2026-05-08',
        merchantOrSource: 'Campus cafe',
        note: 'Lunch',
        topicIds: ['topic-campus'],
      });
    }
  });

  it('returns field errors for invalid draft values and no preferences', () => {
    const missingPreferences = validateManualMoneyCaptureDraft(
      createDefaultManualMoneyCaptureDraft(new Date('2026-05-08T00:00:00.000Z')),
      null,
    );
    const invalid = validateManualMoneyCaptureDraft(
      {
        amount: '0',
        categoryId: '',
        kind: 'expense',
        localDate: '2026-02-30',
        merchantOrSource: 'x'.repeat(81),
        note: 'x'.repeat(241),
        topicIds: ['topic-campus', 'topic-campus'],
      },
      createPreferences(),
    );

    expect(missingPreferences.ok).toBe(false);
    if (!missingPreferences.ok) {
      expect(missingPreferences.error.recovery).toBe('settings');
    }
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors?.amount).toBeDefined();
      expect(invalid.fieldErrors?.localDate).toBeDefined();
      expect(invalid.fieldErrors?.merchantOrSource).toBeDefined();
      expect(invalid.fieldErrors?.note).toBeDefined();
      expect(invalid.fieldErrors?.topicIds).toBeDefined();
    }
  });

  it('toggles topics and clears topic field errors', () => {
    const failed = manualMoneyCaptureReducer(initialManualMoneyCaptureState, {
      fieldErrors: { topicIds: 'Choose each topic only once.' },
      type: 'validation_failed',
    });
    const selected = manualMoneyCaptureReducer(failed, {
      topicId: 'topic-campus',
      type: 'topic_toggled',
    });
    const deselected = manualMoneyCaptureReducer(selected, {
      topicId: 'topic-campus',
      type: 'topic_toggled',
    });

    expect(selected.draft.topicIds).toEqual(['topic-campus']);
    expect(selected.fieldErrors.topicIds).toBeUndefined();
    expect(deselected.draft.topicIds).toEqual([]);
  });

  it('prepends saved records and clears amount after successful save', () => {
    const record = createRecord();
    const state = manualMoneyCaptureReducer(
      {
        ...initialManualMoneyCaptureState,
        draft: {
          ...initialManualMoneyCaptureState.draft,
          amount: '12.50',
          kind: 'income',
        },
        recentRecords: [],
      },
      {
        mutation: 'created',
        nextDraft: createDefaultManualMoneyCaptureDraft(new Date('2026-05-08T00:00:00.000Z')),
        record,
        type: 'save_succeeded',
      },
    );

    expect(state.status).toBe('saved');
    expect(state.savedRecord).toEqual(record);
    expect(state.recentRecords).toEqual([record]);
    expect(state.draft.amount).toBe('');
    expect(state.draft.kind).toBe('income');
  });

  it('starts and cancels editing from a recent record', () => {
    const record = createRecord();
    const editing = manualMoneyCaptureReducer(
      {
        ...initialManualMoneyCaptureState,
        recentRecords: [record],
      },
      {
        amount: '12.50',
        record,
        type: 'edit_started',
      },
    );
    const cancelled = manualMoneyCaptureReducer(editing, {
      nextDraft: createDefaultManualMoneyCaptureDraft(new Date('2026-05-08T00:00:00.000Z')),
      type: 'edit_cancelled',
    });

    expect(editing.editingRecordId).toBe('money-1');
    expect(editing.draft).toMatchObject({
      amount: '12.50',
      categoryId: 'cat-food',
      localDate: '2026-05-08',
      merchantOrSource: 'Campus cafe',
    });
    expect(cancelled.editingRecordId).toBeNull();
    expect(cancelled.draft.amount).toBe('');
  });

  it('replaces recent records after edit save and removes them after delete', () => {
    const record = createRecord();
    const edited = {
      ...record,
      amountMinor: 2250,
      merchantOrSource: 'Bookstore' as never,
      updatedAt: '2026-05-08T01:00:00.000Z',
      userCorrectedAt: '2026-05-08T01:00:00.000Z',
    };
    const editing = manualMoneyCaptureReducer(
      {
        ...initialManualMoneyCaptureState,
        editingRecordId: record.id,
        recentRecords: [record],
      },
      {
        mutation: 'updated',
        nextDraft: createDefaultManualMoneyCaptureDraft(new Date('2026-05-08T00:00:00.000Z')),
        record: edited,
        type: 'save_succeeded',
      },
    );
    const deleted = manualMoneyCaptureReducer(editing, {
      nextDraft: createDefaultManualMoneyCaptureDraft(new Date('2026-05-08T00:00:00.000Z')),
      record: edited,
      type: 'delete_succeeded',
    });

    expect(editing.editingRecordId).toBeNull();
    expect(editing.lastMutation).toBe('updated');
    expect(editing.recentRecords[0].amountMinor).toBe(2250);
    expect(deleted.status).toBe('deleted');
    expect(deleted.lastMutation).toBe('deleted');
    expect(deleted.recentRecords).toEqual([]);
  });
});
