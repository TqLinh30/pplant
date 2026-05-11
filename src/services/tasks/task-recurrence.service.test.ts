import { parseCategoryTopicRow } from '@/domain/categories/schemas';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import { ok } from '@/domain/common/result';
import { parseTaskRecurrenceCompletionRow, parseTaskRecurrenceExceptionRow, parseTaskRecurrenceRuleRow } from '@/domain/tasks/schemas';
import type {
  SaveTaskRecurrenceCompletionInput,
  SaveTaskRecurrenceExceptionInput,
  SaveTaskRecurrenceRuleInput,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceRule,
} from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import {
  completeTaskRecurrenceOccurrence,
  createTaskRecurrenceRule,
  deleteTaskRecurrenceRule,
  loadTaskRecurrenceData,
  pauseTaskRecurrenceRule,
  resumeTaskRecurrenceRule,
  skipTaskRecurrenceOccurrence,
  stopTaskRecurrenceRule,
  undoTaskRecurrenceCompletion,
  updateTaskRecurrenceRule,
  type TaskRecurrenceServiceDependencies,
} from './task-recurrence.service';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

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

function createRule(input: SaveTaskRecurrenceRuleInput): TaskRecurrenceRule {
  const result = parseTaskRecurrenceRuleRow(
    {
      categoryId: input.categoryId ?? null,
      createdAt: input.createdAt,
      deletedAt: input.deletedAt ?? null,
      endsOnLocalDate: input.endsOnLocalDate ?? null,
      frequency: input.frequency,
      id: input.id,
      kind: input.kind,
      notes: input.notes ?? null,
      pausedAt: input.pausedAt ?? null,
      priority: input.priority,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      startsOnLocalDate: input.startsOnLocalDate,
      stoppedAt: input.stoppedAt ?? null,
      stoppedOnLocalDate: input.stoppedOnLocalDate ?? null,
      title: input.title,
      updatedAt: input.updatedAt,
      userCorrectedAt: input.userCorrectedAt ?? null,
      workspaceId: input.workspaceId,
    },
    input.topicIds,
  );

  if (!result.ok) {
    throw new Error('rule fixture failed');
  }

  return result.value;
}

function createRuleFixture(overrides: Partial<SaveTaskRecurrenceRuleInput> = {}): TaskRecurrenceRule {
  return createRule({
    categoryId: 'cat-study',
    createdAt: fixedNow.toISOString(),
    deletedAt: null,
    endsOnLocalDate: null,
    frequency: 'daily',
    id: 'rule-1',
    kind: 'habit',
    notes: null,
    pausedAt: null,
    priority: 'high',
    source: 'manual',
    sourceOfTruth: 'manual',
    startsOnLocalDate: '2026-05-08',
    stoppedAt: null,
    stoppedOnLocalDate: null,
    title: 'Study streak',
    topicIds: ['topic-class'],
    updatedAt: fixedNow.toISOString(),
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  });
}

function createDependencies({
  categories = [createCategoryTopic('category', 'cat-study', 'Study')],
  rules = [] as TaskRecurrenceRule[],
  topics = [createCategoryTopic('topic', 'topic-class', 'Class')],
}: {
  categories?: CategoryTopicItem[];
  rules?: TaskRecurrenceRule[];
  topics?: CategoryTopicItem[];
} = {}) {
  const completions: TaskRecurrenceCompletion[] = [];
  const exceptions: TaskRecurrenceException[] = [];
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
  const taskRecurrenceRepository = {
    createException: jest.fn(async (input: SaveTaskRecurrenceExceptionInput) => {
      const existing = exceptions.find(
        (exception) =>
          exception.ruleId === input.ruleId &&
          exception.occurrenceLocalDate === input.occurrenceLocalDate &&
          exception.action === input.action,
      );

      if (existing) {
        return ok(existing);
      }

      const parsed = parseTaskRecurrenceExceptionRow({
        action: input.action,
        createdAt: input.createdAt,
        id: input.id,
        occurrenceLocalDate: input.occurrenceLocalDate,
        ruleId: input.ruleId,
        updatedAt: input.updatedAt,
        workspaceId: input.workspaceId,
      });

      if (parsed.ok) {
        exceptions.push(parsed.value);
      }

      return parsed;
    }),
    createRule: jest.fn(async (input: SaveTaskRecurrenceRuleInput) => {
      const created = createRule(input);
      rules.push(created);

      return ok(created);
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
    listCompletions: jest.fn(async (_workspaceId: string, ruleId: string) =>
      ok(completions.filter((completion) => completion.ruleId === ruleId && completion.deletedAt === null)),
    ),
    listExceptions: jest.fn(async (_workspaceId: string, ruleId: string) =>
      ok(exceptions.filter((exception) => exception.ruleId === ruleId)),
    ),
    listRules: jest.fn(async () => ok(rules.filter((rule) => rule.deletedAt === null))),
    markCompletion: jest.fn(async (input: SaveTaskRecurrenceCompletionInput) => {
      const existing = completions.find(
        (completion) => completion.ruleId === input.ruleId && completion.occurrenceLocalDate === input.occurrenceLocalDate,
      );

      if (existing) {
        Object.assign(existing, {
          completedAt: input.completedAt,
          deletedAt: null,
          updatedAt: input.updatedAt,
        });
        return ok(existing);
      }

      const parsed = parseTaskRecurrenceCompletionRow({
        completedAt: input.completedAt,
        createdAt: input.createdAt,
        deletedAt: input.deletedAt ?? null,
        id: input.id,
        occurrenceLocalDate: input.occurrenceLocalDate,
        ruleId: input.ruleId,
        updatedAt: input.updatedAt,
        workspaceId: input.workspaceId,
      });

      if (parsed.ok) {
        completions.push(parsed.value);
      }

      return parsed;
    }),
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
    stopRule: jest.fn(async (_workspaceId: string, id: string, stoppedAt: string, stoppedOnLocalDate: string, updatedAt: string) => {
      const rule = rules.find((candidate) => candidate.id === id && candidate.deletedAt === null);

      if (!rule) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      Object.assign(rule, { stoppedAt, stoppedOnLocalDate, updatedAt });
      return ok({ ...rule });
    }),
    undoCompletion: jest.fn(
      async (_workspaceId: string, ruleId: string, occurrenceLocalDate: string, deletedAt: string, updatedAt: string) => {
        const completion = completions.find(
          (candidate) =>
            candidate.ruleId === ruleId && candidate.occurrenceLocalDate === occurrenceLocalDate && candidate.deletedAt === null,
        );

        if (!completion) {
          return { ok: false as const, error: createAppError('not_found', 'Missing completion.', 'edit') };
        }

        Object.assign(completion, { deletedAt, updatedAt });
        return ok({ ...completion });
      },
    ),
    updateRule: jest.fn(async (input: SaveTaskRecurrenceRuleInput) => {
      const index = rules.findIndex((rule) => rule.id === input.id && rule.deletedAt === null);

      if (index < 0) {
        return { ok: false as const, error: createAppError('not_found', 'Missing rule.', 'edit') };
      }

      const updated = createRule({
        ...input,
        createdAt: rules[index].createdAt,
      });
      rules[index] = updated;

      return ok(updated);
    }),
  };
  const dependencies: TaskRecurrenceServiceDependencies = {
    createCategoryTopicRepository: () => categoryTopicRepository as never,
    createCompletionId: () => `completion-${completions.length + 1}`,
    createExceptionId: () => `exception-${exceptions.length + 1}`,
    createRuleId: () => `rule-${rules.length + 1}`,
    createTaskRecurrenceRepository: () => taskRecurrenceRepository as never,
    migrateDatabase: jest.fn(async () => ok({ applied: 0, appliedMigrations: [] })),
    now: () => fixedNow,
    openDatabase: () => ({}),
  };

  return {
    completions,
    dependencies,
    exceptions,
    rules,
    taskRecurrenceRepository,
  };
}

describe('task recurrence service', () => {
  it('loads recurring task data with virtual occurrence previews', async () => {
    const rule = createRuleFixture({ frequency: 'monthly', startsOnLocalDate: '2026-01-31' });
    const { dependencies } = createDependencies({ rules: [rule] });

    const result = await loadTaskRecurrenceData(dependencies);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categories).toHaveLength(1);
      expect(result.value.topics).toHaveLength(1);
      expect(result.value.rules[0].occurrences.map((occurrence) => occurrence.localDate).slice(0, 2)).toEqual([
        '2026-05-31',
        '2026-06-30',
      ]);
    }
  });

  it('creates recurring task and habit templates with active category and topics', async () => {
    const { dependencies, rules } = createDependencies();

    const result = await createTaskRecurrenceRule(
      {
        categoryId: 'cat-study',
        frequency: 'weekly',
        kind: 'task',
        priority: 'low',
        startsOnLocalDate: '2026-05-08',
        title: 'Weekly review',
        topicIds: ['topic-class'],
      },
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(rules).toHaveLength(1);
    if (result.ok) {
      expect(result.value.rule).toMatchObject({
        frequency: 'weekly',
        kind: 'task',
        source: 'manual',
        sourceOfTruth: 'manual',
        title: 'Weekly review',
      });
      expect(result.value.view.occurrences.map((occurrence) => occurrence.localDate).slice(0, 2)).toEqual([
        '2026-05-08',
        '2026-05-15',
      ]);
    }
  });

  it('rejects archived categories, archived topics, and invalid end dates', async () => {
    const { dependencies: archivedCategoryDependencies } = createDependencies({
      categories: [createCategoryTopic('category', 'cat-archived', 'Old')],
    });
    const { dependencies: archivedTopicDependencies } = createDependencies({
      topics: [createCategoryTopic('topic', 'topic-archived', 'Old')],
    });

    const archivedCategory = await createTaskRecurrenceRule(
      {
        categoryId: 'cat-archived',
        frequency: 'daily',
        kind: 'habit',
        priority: 'high',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      archivedCategoryDependencies,
    );
    const archivedTopic = await createTaskRecurrenceRule(
      {
        frequency: 'daily',
        kind: 'habit',
        priority: 'high',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
        topicIds: ['topic-archived'],
      },
      archivedTopicDependencies,
    );
    const badEnd = await createTaskRecurrenceRule(
      {
        endsOnLocalDate: '2026-05-07',
        frequency: 'daily',
        kind: 'habit',
        priority: 'high',
        startsOnLocalDate: '2026-05-08',
        title: 'Study',
      },
      createDependencies().dependencies,
    );

    expect(archivedCategory.ok).toBe(false);
    expect(archivedTopic.ok).toBe(false);
    expect(badEnd.ok).toBe(false);
  });

  it('updates templates and records manual correction timestamps', async () => {
    const rule = createRuleFixture();
    const { dependencies, rules } = createDependencies({ rules: [rule] });

    const updated = await updateTaskRecurrenceRule(
      {
        categoryId: 'cat-study',
        frequency: 'monthly',
        id: 'rule-1',
        kind: 'task',
        priority: 'low',
        startsOnLocalDate: '2026-05-31',
        title: 'Monthly planning',
        topicIds: [],
      },
      dependencies,
    );

    expect(updated.ok).toBe(true);
    expect(rules[0]).toMatchObject({
      frequency: 'monthly',
      kind: 'task',
      priority: 'low',
      title: 'Monthly planning',
      userCorrectedAt: fixedNow.toISOString(),
    });
  });

  it('pauses, resumes, stops with today as local date, and deletes recurring rules', async () => {
    const rule = createRuleFixture();
    const { dependencies, rules } = createDependencies({ rules: [rule] });

    const paused = await pauseTaskRecurrenceRule({ id: 'rule-1' }, dependencies);
    const resumed = await resumeTaskRecurrenceRule({ id: 'rule-1' }, dependencies);
    const stopped = await stopTaskRecurrenceRule({ id: 'rule-1' }, dependencies);
    const deleted = await deleteTaskRecurrenceRule({ id: 'rule-1' }, dependencies);

    expect(paused.ok && paused.value.rule.pausedAt).toBe(fixedNow.toISOString());
    expect(resumed.ok && resumed.value.rule.pausedAt).toBeNull();
    expect(stopped.ok && stopped.value.rule.stoppedOnLocalDate).toBe('2026-05-08');
    expect(deleted.ok && deleted.value.rule.deletedAt).toBe(fixedNow.toISOString());
    expect(rules[0].deletedAt).toBe(fixedNow.toISOString());
  });

  it('skips, completes, and undoes virtual occurrences without creating tasks', async () => {
    const rule = createRuleFixture();
    const { completions, dependencies, exceptions } = createDependencies({ rules: [rule] });

    const skipped = await skipTaskRecurrenceOccurrence({ id: 'rule-1' }, dependencies);
    const completed = await completeTaskRecurrenceOccurrence(
      { id: 'rule-1', occurrenceLocalDate: '2026-05-09' },
      dependencies,
    );
    const undone = await undoTaskRecurrenceCompletion({ id: 'rule-1', occurrenceLocalDate: '2026-05-09' }, dependencies);

    expect(skipped).toEqual({ ok: true, value: '2026-05-08' });
    expect(completed).toEqual({ ok: true, value: '2026-05-09' });
    expect(undone).toEqual({ ok: true, value: '2026-05-09' });
    expect(exceptions).toHaveLength(1);
    expect(completions[0].deletedAt).toBe(fixedNow.toISOString());
  });

  it('does not complete skipped occurrences', async () => {
    const rule = createRuleFixture();
    const { dependencies } = createDependencies({ rules: [rule] });

    await skipTaskRecurrenceOccurrence({ id: 'rule-1' }, dependencies);
    const result = await completeTaskRecurrenceOccurrence(
      { id: 'rule-1', occurrenceLocalDate: '2026-05-08' },
      dependencies,
    );

    expect(result.ok).toBe(false);
  });
});
