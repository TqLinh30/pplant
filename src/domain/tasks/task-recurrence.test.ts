import { localWorkspaceId } from '@/domain/workspace/types';

import { buildTaskRecurrenceOccurrences } from './task-recurrence';
import {
  parseTaskRecurrenceCompletionRow,
  parseTaskRecurrenceExceptionRow,
  parseTaskRecurrenceRuleRow,
} from './schemas';
import type { TaskRecurrenceCompletion, TaskRecurrenceException, TaskRecurrenceRule } from './types';

const fixedNow = '2026-05-08T00:00:00.000Z';

function createRule(overrides: Record<string, unknown> = {}): TaskRecurrenceRule {
  const result = parseTaskRecurrenceRuleRow(
    {
      categoryId: 'cat-study',
      createdAt: fixedNow,
      deletedAt: null,
      endsOnLocalDate: null,
      frequency: 'daily',
      id: 'rule-study',
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

function createException(overrides: Record<string, unknown> = {}): TaskRecurrenceException {
  const result = parseTaskRecurrenceExceptionRow({
    action: 'skip',
    createdAt: fixedNow,
    id: 'exception-1',
    occurrenceLocalDate: '2026-05-09',
    ruleId: 'rule-study',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('exception fixture failed');
  }

  return result.value;
}

function createCompletion(overrides: Record<string, unknown> = {}): TaskRecurrenceCompletion {
  const result = parseTaskRecurrenceCompletionRow({
    completedAt: '2026-05-08T12:00:00.000Z',
    createdAt: fixedNow,
    deletedAt: null,
    id: 'completion-1',
    occurrenceLocalDate: '2026-05-08',
    ruleId: 'rule-study',
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  });

  if (!result.ok) {
    throw new Error('completion fixture failed');
  }

  return result.value;
}

describe('task recurrence domain', () => {
  it('parses task recurrence rows with separate completion and exception data', () => {
    const rule = createRule();
    const exception = createException();
    const completion = createCompletion();

    expect(rule).toMatchObject({
      frequency: 'daily',
      kind: 'habit',
      source: 'manual',
      sourceOfTruth: 'manual',
      topicIds: ['topic-class'],
    });
    expect(exception.action).toBe('skip');
    expect(completion.deletedAt).toBeNull();
  });

  it('builds virtual occurrences with completion and skip state without materializing tasks', () => {
    const result = buildTaskRecurrenceOccurrences({
      completions: [createCompletion()],
      exceptions: [createException()],
      fromLocalDate: '2026-05-08',
      maxCount: 4,
      rule: createRule(),
      throughLocalDate: '2026-05-11',
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          completedAt: '2026-05-08T12:00:00.000Z',
          localDate: '2026-05-08',
          ruleId: 'rule-study',
          state: 'completed',
        },
        {
          completedAt: null,
          localDate: '2026-05-09',
          ruleId: 'rule-study',
          state: 'skipped',
        },
        {
          completedAt: null,
          localDate: '2026-05-10',
          ruleId: 'rule-study',
          state: 'open',
        },
        {
          completedAt: null,
          localDate: '2026-05-11',
          ruleId: 'rule-study',
          state: 'open',
        },
      ],
    });
  });

  it('honors monthly clamp, stopped date, and paused state deterministically', () => {
    const monthly = buildTaskRecurrenceOccurrences({
      completions: [],
      exceptions: [],
      maxCount: 4,
      rule: createRule({
        frequency: 'monthly',
        startsOnLocalDate: '2024-02-29',
        stoppedAt: '2024-05-08T00:00:00.000Z',
        stoppedOnLocalDate: '2024-05-29',
      }),
      throughLocalDate: '2024-12-31',
    });
    const paused = buildTaskRecurrenceOccurrences({
      completions: [],
      exceptions: [],
      maxCount: 4,
      rule: createRule({ pausedAt: fixedNow }),
      throughLocalDate: '2026-05-31',
    });

    expect(monthly.ok && monthly.value.map((occurrence) => occurrence.localDate)).toEqual([
      '2024-02-29',
      '2024-03-29',
      '2024-04-29',
      '2024-05-29',
    ]);
    expect(paused).toEqual({ ok: true, value: [] });
  });

  it('rejects invalid end and stop dates in local recurrence data', () => {
    const invalidEnd = parseTaskRecurrenceRuleRow({
      ...createRule(),
      endsOnLocalDate: '2026-05-07',
    });
    const invalidStopPair = parseTaskRecurrenceRuleRow({
      ...createRule(),
      stoppedAt: fixedNow,
      stoppedOnLocalDate: null,
    });

    expect(invalidEnd.ok).toBe(false);
    expect(invalidStopPair.ok).toBe(false);
  });
});
