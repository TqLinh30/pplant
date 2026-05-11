import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { parseUserPreferencesRow } from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import { parseWorkEntryRow } from '@/domain/work/schemas';
import { calculateWorkHistorySummaries } from '@/domain/work/work-history';
import type { WorkEntry, WorkHistoryPage } from '@/domain/work/types';
import { localWorkspaceId } from '@/domain/workspace/types';
import type { WorkHistoryData } from '@/services/work/work-history.service';

import {
  buildWorkHistoryRequest,
  initialWorkHistoryState,
  workHistoryReducer,
} from './useWorkHistory';

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

function createEntry(id = 'work-1'): WorkEntry {
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
    id,
    localDate: '2026-05-08',
    note: 'Library',
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

function createData(records: WorkEntry[]): WorkHistoryData {
  const page: WorkHistoryPage = {
    hasMore: false,
    limit: 20,
    offset: 0,
    records,
    totalCount: records.length,
  };

  return {
    categories: [createCategory()],
    page,
    preferences: createPreferences(),
    query: {
      categoryId: null,
      dateFrom: null,
      dateTo: null,
      entryMode: null,
      limit: 20,
      noteSearch: null,
      offset: 0,
      paid: null,
      sort: 'date_desc',
      topicId: null,
    },
    records,
    summaries: calculateWorkHistorySummaries(records, 'day'),
    summaryMode: 'day',
    topics: [],
  };
}

describe('work history state', () => {
  it('builds work history requests from filter state', () => {
    const state = workHistoryReducer(
      workHistoryReducer(
        workHistoryReducer(initialWorkHistoryState, { entryMode: 'shift', type: 'entry_mode_changed' }),
        { paid: 'paid', type: 'paid_changed' },
      ),
      { field: 'noteSearch', type: 'filter_field_changed', value: 'Cafe' },
    );
    const request = buildWorkHistoryRequest({
      ...state,
      filterDraft: {
        ...state.filterDraft,
        categoryId: 'cat-work',
        dateFrom: '2026-05-01',
        topicId: 'topic-job',
      },
      sort: 'earned_desc',
      summaryMode: 'week',
    });

    expect(request.ok).toBe(true);
    if (request.ok) {
      expect(request.value).toMatchObject({
        categoryId: 'cat-work',
        dateFrom: '2026-05-01',
        entryMode: 'shift',
        noteSearch: 'Cafe',
        paid: 'paid',
        sort: 'earned_desc',
        summaryMode: 'week',
        topicId: 'topic-job',
      });
    }
  });

  it('loads data, appends pages, and clears filters', () => {
    const first = createEntry('work-1');
    const second = createEntry('work-2');
    const loaded = workHistoryReducer(initialWorkHistoryState, {
      append: false,
      data: createData([first]),
      type: 'load_succeeded',
    });
    const appended = workHistoryReducer(loaded, {
      append: true,
      data: createData([second]),
      type: 'load_succeeded',
    });
    const cleared = workHistoryReducer(
      {
        ...appended,
        filterDraft: {
          ...appended.filterDraft,
          dateFrom: '2026-05-01',
          noteSearch: 'Cafe',
        },
      },
      { type: 'clear_filters' },
    );

    expect(loaded.status).toBe('ready');
    expect(appended.data?.records.map((entry) => entry.id)).toEqual(['work-1', 'work-2']);
    expect(cleared.filterDraft.dateFrom).toBe('');
    expect(cleared.filterDraft.noteSearch).toBe('');
  });
});
