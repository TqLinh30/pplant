import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem } from '@/domain/categories/types';
import { parseTaskRecurrenceRuleRow } from '@/domain/tasks/schemas';
import type { TaskRecurrenceRule } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  createDefaultTaskRecurrenceDraft,
  initialTaskRecurrenceState,
  taskRecurrenceReducer,
  validateTaskRecurrenceDraft,
} from './useTaskRecurrence';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createCategory(): CategoryTopicItem {
  const result = parseCategoryTopicRow(
    {
      archivedAt: null,
      createdAt: fixedNow,
      id: 'cat-study',
      name: 'Study',
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

function createRuleFixture(overrides: Record<string, unknown> = {}): TaskRecurrenceRule {
  const result = parseTaskRecurrenceRuleRow(
    {
      categoryId: 'cat-study',
      createdAt: fixedNow,
      deletedAt: null,
      endsOnLocalDate: null,
      frequency: 'weekly',
      id: 'rule-1',
      kind: 'habit',
      notes: 'Review flashcards',
      pausedAt: null,
      priority: 'high',
      source: 'manual',
      sourceOfTruth: 'manual',
      startsOnLocalDate: '2026-05-08',
      stoppedAt: null,
      stoppedOnLocalDate: null,
      title: 'Study streak',
      updatedAt: fixedNow,
      userCorrectedAt: null,
      workspaceId: localWorkspaceId,
      ...overrides,
    },
    ['topic-class'],
  );

  if (!result.ok) {
    throw new Error('rule fixture failed');
  }

  return result.value;
}

describe('task recurrence state', () => {
  it('validates recurring task drafts into service input', () => {
    const validation = validateTaskRecurrenceDraft({
      ...createDefaultTaskRecurrenceDraft(new Date(fixedNow)),
      categoryId: 'cat-study',
      endsOnLocalDate: '2026-06-08',
      frequency: 'daily',
      kind: 'habit',
      notes: '  Review flashcards  ',
      priority: 'low',
      startsOnLocalDate: '2026-05-08',
      title: '  Study streak  ',
      topicIds: ['topic-class'],
    });

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.value).toEqual({
        categoryId: 'cat-study',
        endsOnLocalDate: '2026-06-08',
        frequency: 'daily',
        kind: 'habit',
        notes: 'Review flashcards',
        priority: 'low',
        startsOnLocalDate: '2026-05-08',
        title: 'Study streak',
        topicIds: ['topic-class'],
      });
    }
  });

  it('returns field errors for invalid recurrence drafts', () => {
    const validation = validateTaskRecurrenceDraft({
      ...createDefaultTaskRecurrenceDraft(new Date(fixedNow)),
      endsOnLocalDate: '2026-05-07',
      startsOnLocalDate: '2026-05-08',
      title: '',
      topicIds: ['topic-class', 'topic-class'],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.fieldErrors?.endsOnLocalDate).toBeDefined();
      expect(validation.fieldErrors?.title).toBeDefined();
      expect(validation.fieldErrors?.topicIds).toBeDefined();
    }
  });

  it('loads recurrence data, starts editing, saves, and tracks occurrence actions', () => {
    const rule = createRuleFixture();
    const loaded = taskRecurrenceReducer(initialTaskRecurrenceState, {
      data: {
        categories: [createCategory()],
        rules: [
          {
            occurrences: [
              {
                completedAt: null,
                localDate: rule.startsOnLocalDate,
                ruleId: rule.id,
                state: 'open',
              },
            ],
            rule,
          },
        ],
        topics: [],
      },
      type: 'load_succeeded',
    });
    const editing = taskRecurrenceReducer(loaded, {
      type: 'edit_started',
      view: loaded.rules[0],
    });
    const saved = taskRecurrenceReducer(editing, {
      data: {
        categories: loaded.categories,
        rules: [{ occurrences: [], rule: createRuleFixture({ title: 'Updated study streak' }) }],
        topics: [],
      },
      mutation: 'updated',
      nextDraft: createDefaultTaskRecurrenceDraft(new Date(fixedNow)),
      type: 'action_succeeded',
    });
    const completed = taskRecurrenceReducer(saved, {
      data: {
        categories: loaded.categories,
        rules: saved.rules,
        topics: [],
      },
      mutation: 'completed',
      occurrenceDate: '2026-05-08',
      type: 'action_succeeded',
    });

    expect(loaded.status).toBe('ready');
    expect(editing.editingRuleId).toBe('rule-1');
    expect(saved.rules[0].rule.title).toBe('Updated study streak');
    expect(saved.status).toBe('saved');
    expect(completed.lastMutation).toBe('completed');
    expect(completed.occurrenceDate).toBe('2026-05-08');
  });
});
