import type { ReflectionRelationship } from '@/domain/summaries/reflection-relationships';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  filterReflectionRelationshipsForPreferences,
  globalInsightScopeKey,
  periodInsightScopeKey,
} from './insight-preferences';
import { parseSaveReflectionInsightPreferenceInput } from './schemas';
import type { ReflectionInsightPreference, ReflectionPeriod } from './types';

const weekPeriod: ReflectionPeriod = {
  endDateExclusive: '2026-05-11' as never,
  kind: 'week',
  startDate: '2026-05-04' as never,
};

function relationship(id: ReflectionRelationship['id']): ReflectionRelationship {
  return {
    description: 'Saved records are shown together for reflection.',
    id,
    missingReason: null,
    primary: {
      count: 1,
      kind: 'count',
      label: 'Primary',
    },
    secondary: {
      count: 1,
      kind: 'count',
      label: 'Secondary',
    },
    state: 'ready',
    title: id,
  };
}

function preference(overrides: Partial<ReflectionInsightPreference>): ReflectionInsightPreference {
  return {
    action: 'dismissed',
    createdAt: '2026-05-08T00:00:00.000Z',
    deletedAt: null,
    id: 'preference-1' as never,
    insightId: 'money_time',
    periodKind: 'week',
    periodStartDate: '2026-05-04' as never,
    scopeKey: periodInsightScopeKey(weekPeriod),
    updatedAt: '2026-05-08T00:00:00.000Z',
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

describe('reflection insight preferences', () => {
  it('builds stable period and global scope keys', () => {
    expect(periodInsightScopeKey(weekPeriod)).toBe('week:2026-05-04');
    expect(globalInsightScopeKey).toBe('global');
  });

  it('filters dismissed insights only for the matching period and muted insights globally', () => {
    const relationships = [
      relationship('money_time'),
      relationship('work_savings'),
      relationship('tasks_reminders'),
    ];
    const preferences = [
      preference({ action: 'dismissed', insightId: 'money_time' }),
      preference({
        action: 'muted',
        insightId: 'tasks_reminders',
        periodKind: null,
        periodStartDate: null,
        scopeKey: globalInsightScopeKey,
      }),
    ];

    const currentPeriod = filterReflectionRelationshipsForPreferences({
      period: weekPeriod,
      preferences,
      relationships,
    });
    const futurePeriod = filterReflectionRelationshipsForPreferences({
      period: {
        endDateExclusive: '2026-05-18' as never,
        kind: 'week',
        startDate: '2026-05-11' as never,
      },
      preferences,
      relationships,
    });

    expect(currentPeriod.map((item) => item.id)).toEqual(['work_savings']);
    expect(futurePeriod.map((item) => item.id)).toEqual(['money_time', 'work_savings']);
  });

  it('validates dismissed and muted preference save inputs', () => {
    const dismissed = parseSaveReflectionInsightPreferenceInput({
      action: 'dismissed',
      id: 'preference-1',
      insightId: 'money_time',
      period: weekPeriod,
      timestamp: '2026-05-08T00:00:00.000Z',
      workspaceId: localWorkspaceId,
    });
    const muted = parseSaveReflectionInsightPreferenceInput({
      action: 'muted',
      id: 'preference-2',
      insightId: 'work_savings',
      period: null,
      timestamp: '2026-05-08T00:00:00.000Z',
      workspaceId: localWorkspaceId,
    });

    expect(dismissed.ok).toBe(true);
    expect(muted.ok).toBe(true);
    if (dismissed.ok && muted.ok) {
      expect(dismissed.value.scopeKey).toBe('week:2026-05-04');
      expect(muted.value.scopeKey).toBe('global');
    }
  });

  it('rejects invalid preference actions and missing dismiss periods', () => {
    const invalidCases = [
      {
        action: 'hidden',
        id: 'preference-1',
        insightId: 'money_time',
        period: weekPeriod,
        timestamp: '2026-05-08T00:00:00.000Z',
        workspaceId: localWorkspaceId,
      },
      {
        action: 'dismissed',
        id: 'preference-1',
        insightId: 'money_time',
        period: null,
        timestamp: '2026-05-08T00:00:00.000Z',
        workspaceId: localWorkspaceId,
      },
    ];

    for (const input of invalidCases) {
      expect(parseSaveReflectionInsightPreferenceInput(input).ok).toBe(false);
    }
  });
});
