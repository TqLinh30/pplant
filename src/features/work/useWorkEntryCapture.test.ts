import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseWorkEntryRow } from '@/domain/work/schemas';
import type { WorkEntry } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createDefaultWorkEntryDraft,
  initialWorkEntryCaptureState,
  validateWorkEntryDraft,
  workEntryCaptureReducer,
} from './useWorkEntryCapture';

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
      id: 'cat-work',
      name: 'Work',
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

function createEntry(): WorkEntry {
  const result = parseWorkEntryRow({
    breakMinutes: 0,
    categoryId: 'cat-work',
    createdAt: fixedNow,
    deletedAt: null,
    durationMinutes: 120,
    earnedIncomeMinor: 3000,
    endedAtLocalDate: null,
    endedAtLocalTime: null,
    entryMode: 'hours',
    id: 'work-1',
    localDate: '2026-05-08',
    note: 'Library shift',
    paid: true,
    source: 'manual',
    sourceOfTruth: 'manual',
    startedAtLocalDate: null,
    startedAtLocalTime: null,
    updatedAt: fixedNow,
    wageCurrencyCode: 'USD',
    wageMinorPerHour: 1500,
    wageSource: 'default',
    workspaceId: localWorkspaceId,
  });

  if (!result.ok) {
    throw new Error('entry fixture failed');
  }

  return result.value;
}

describe('work entry capture state', () => {
  it('validates direct hours into service input', () => {
    const validation = validateWorkEntryDraft(
      {
        ...createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
        categoryId: 'cat-work',
        durationHours: '1.5',
        note: ' Library ',
        topicIds: ['topic-job'],
      },
      createPreferences(),
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        categoryId: 'cat-work',
        durationMinutes: 90,
        entryMode: 'hours',
        localDate: '2026-05-08',
        note: 'Library',
        paid: true,
        topicIds: ['topic-job'],
        wageMinorPerHour: null,
      });
    }
  });

  it('validates cross-midnight shifts and wage overrides', () => {
    const validation = validateWorkEntryDraft(
      {
        ...createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
        breakMinutes: '30',
        endedAtLocalDate: '2026-05-09',
        endedAtLocalTime: '01:15',
        entryMode: 'shift',
        startedAtLocalTime: '22:00',
        wageOverride: '21.00',
      },
      createPreferences(),
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toMatchObject({
        breakMinutes: 30,
        endedAtLocalDate: '2026-05-09',
        endedAtLocalTime: '01:15',
        entryMode: 'shift',
        startedAtLocalDate: '2026-05-08',
        startedAtLocalTime: '22:00',
        wageMinorPerHour: 2100,
      });
    }
  });

  it('returns field errors for invalid drafts and missing preferences', () => {
    const invalid = validateWorkEntryDraft(
      {
        ...createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
        durationHours: '0',
        localDate: '2026-02-30',
      },
      createPreferences(),
    );
    const missingPreferences = validateWorkEntryDraft(
      createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
      null,
    );

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors?.durationHours).toBeDefined();
      expect(invalid.fieldErrors?.localDate).toBeDefined();
    }
    expect(missingPreferences.ok).toBe(false);
    if (!missingPreferences.ok) {
      expect(missingPreferences.error.recovery).toBe('settings');
    }
  });

  it('loads, starts editing, and removes entries from recent list', () => {
    const entry = createEntry();
    const loaded = workEntryCaptureReducer(initialWorkEntryCaptureState, {
      data: {
        categories: [createCategory()],
        preferences: createPreferences(),
        recentEntries: [entry],
        topics: [],
      },
      type: 'load_succeeded',
    });
    const editing = workEntryCaptureReducer(loaded, {
      draft: {
        ...createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
        durationHours: '2',
      },
      entry,
      type: 'edit_started',
    });
    const deleted = workEntryCaptureReducer(editing, {
      entry,
      nextDraft: createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
      type: 'delete_succeeded',
    });

    expect(loaded.status).toBe('ready');
    expect(editing.editingEntryId).toBe('work-1');
    expect(deleted.recentEntries).toEqual([]);
    expect(deleted.status).toBe('deleted');
  });

  it('applies a recovered work draft for resume', () => {
    const recovered = workEntryCaptureReducer(initialWorkEntryCaptureState, {
      draft: {
        ...createDefaultWorkEntryDraft(new Date('2026-05-08T00:00:00.000Z')),
        durationHours: '2',
        note: 'Library',
      },
      type: 'draft_applied',
    });

    expect(recovered.status).toBe('ready');
    expect(recovered.editingEntryId).toBeNull();
    expect(recovered.draft.durationHours).toBe('2');
    expect(recovered.draft.note).toBe('Library');
  });
});
