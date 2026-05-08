import type {
  TaskRecurrenceCompletionRow,
  TaskRecurrenceExceptionRow,
  TaskRecurrenceRuleRow,
} from '@/domain/tasks/schemas';
import type { SaveTaskRecurrenceRuleInput } from '@/domain/tasks/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createTaskRecurrenceRepository } from './task-recurrence.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

type RuleTopicRow = {
  createdAt: string;
  ruleId: string;
  topicId: string;
  workspaceId: string;
};

class FakeTaskRecurrenceClient {
  readonly executedSql: string[] = [];
  completions: TaskRecurrenceCompletionRow[] = [];
  exceptions: TaskRecurrenceExceptionRow[] = [];
  rules: TaskRecurrenceRuleRow[] = [];
  topics: RuleTopicRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const completions = this.completions.map((completion) => ({ ...completion }));
    const exceptions = this.exceptions.map((exception) => ({ ...exception }));
    const rules = this.rules.map((rule) => ({ ...rule }));
    const topics = this.topics.map((topic) => ({ ...topic }));

    try {
      task();
    } catch (cause) {
      this.completions = completions;
      this.exceptions = exceptions;
      this.rules = rules;
      this.topics = topics;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO task_recurrence_rules')) {
      const [
        id,
        workspaceId,
        kind,
        title,
        notes,
        priority,
        frequency,
        startsOnLocalDate,
        endsOnLocalDate,
        categoryId,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        pausedAt,
        stoppedAt,
        stoppedOnLocalDate,
        deletedAt,
        createdAt,
        updatedAt,
      ] = params;

      this.rules.push({
        categoryId: categoryId as string | null,
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        endsOnLocalDate: endsOnLocalDate as string | null,
        frequency: frequency as 'daily' | 'weekly' | 'monthly',
        id: id as string,
        kind: kind as 'task' | 'habit',
        notes: notes as string | null,
        pausedAt: pausedAt as string | null,
        priority: priority as 'high' | 'low',
        source: sourceValue as 'manual',
        sourceOfTruth: sourceOfTruth as 'manual',
        startsOnLocalDate: startsOnLocalDate as string,
        stoppedAt: stoppedAt as string | null,
        stoppedOnLocalDate: stoppedOnLocalDate as string | null,
        title: title as string,
        updatedAt: updatedAt as string,
        userCorrectedAt: userCorrectedAt as string | null,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO task_recurrence_topics')) {
      const [ruleId, topicId, workspaceId, createdAt] = params;
      this.topics.push({
        createdAt: createdAt as string,
        ruleId: ruleId as string,
        topicId: topicId as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('DELETE FROM task_recurrence_topics')) {
      const [workspaceId, ruleId] = params;
      this.topics = this.topics.filter((topic) => topic.workspaceId !== workspaceId || topic.ruleId !== ruleId);

      return { changes: 1 };
    }

    if (source.includes('UPDATE task_recurrence_rules') && source.includes('kind = ?')) {
      const [
        kind,
        title,
        notes,
        priority,
        frequency,
        startsOnLocalDate,
        endsOnLocalDate,
        categoryId,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        pausedAt,
        stoppedAt,
        stoppedOnLocalDate,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const rule = this.rules.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (rule) {
        Object.assign(rule, {
          categoryId,
          endsOnLocalDate,
          frequency,
          kind,
          notes,
          pausedAt,
          priority,
          source: sourceValue,
          sourceOfTruth,
          startsOnLocalDate,
          stoppedAt,
          stoppedOnLocalDate,
          title,
          updatedAt,
          userCorrectedAt,
        });
      }

      return { changes: rule ? 1 : 0 };
    }

    if (source.includes('UPDATE task_recurrence_rules')) {
      const workspaceId = params[params.length - 2];
      const id = params[params.length - 1];
      const rule = this.rules.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (!rule) {
        return { changes: 0 };
      }

      if (source.includes('paused_at = NULL')) {
        rule.pausedAt = null;
        rule.updatedAt = params[0] as string;
      } else if (source.includes('paused_at = ?')) {
        rule.pausedAt = params[0] as string;
        rule.updatedAt = params[1] as string;
      } else if (source.includes('stopped_at = ?')) {
        rule.stoppedAt = params[0] as string;
        rule.stoppedOnLocalDate = params[1] as string;
        rule.updatedAt = params[2] as string;
      } else if (source.includes('deleted_at = ?')) {
        rule.deletedAt = params[0] as string;
        rule.updatedAt = params[1] as string;
      }

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO task_recurrence_exceptions')) {
      const [id, ruleId, workspaceId, occurrenceLocalDate, action, createdAt, updatedAt] = params;
      this.exceptions.push({
        action: action as 'skip',
        createdAt: createdAt as string,
        id: id as string,
        occurrenceLocalDate: occurrenceLocalDate as string,
        ruleId: ruleId as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO task_recurrence_completions')) {
      const [id, ruleId, workspaceId, occurrenceLocalDate, completedAt, createdAt, updatedAt, deletedAt] = params;
      this.completions.push({
        completedAt: completedAt as string,
        createdAt: createdAt as string,
        deletedAt: deletedAt as string | null,
        id: id as string,
        occurrenceLocalDate: occurrenceLocalDate as string,
        ruleId: ruleId as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE task_recurrence_completions') && source.includes('deleted_at = NULL')) {
      const [completedAt, updatedAt, workspaceId, ruleId, occurrenceLocalDate] = params;
      const completion = this.completions.find(
        (candidate) =>
          candidate.workspaceId === workspaceId &&
          candidate.ruleId === ruleId &&
          candidate.occurrenceLocalDate === occurrenceLocalDate,
      );

      if (completion) {
        completion.completedAt = completedAt as string;
        completion.deletedAt = null;
        completion.updatedAt = updatedAt as string;
      }

      return { changes: completion ? 1 : 0 };
    }

    if (source.includes('UPDATE task_recurrence_completions')) {
      const [deletedAt, updatedAt, workspaceId, ruleId, occurrenceLocalDate] = params;
      const completion = this.completions.find(
        (candidate) =>
          candidate.workspaceId === workspaceId &&
          candidate.ruleId === ruleId &&
          candidate.occurrenceLocalDate === occurrenceLocalDate &&
          candidate.deletedAt === null,
      );

      if (completion) {
        completion.deletedAt = deletedAt as string;
        completion.updatedAt = updatedAt as string;
      }

      return { changes: completion ? 1 : 0 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('FROM task_recurrence_exceptions')) {
      const [workspaceId, ruleId, occurrenceLocalDate, action] = params;

      return (
        (this.exceptions.find(
          (exception) =>
            exception.workspaceId === workspaceId &&
            exception.ruleId === ruleId &&
            exception.occurrenceLocalDate === occurrenceLocalDate &&
            exception.action === action,
        ) as T | undefined) ?? null
      );
    }

    if (source.includes('FROM task_recurrence_completions')) {
      const [workspaceId, ruleId, occurrenceLocalDate] = params;
      const includeDeleted = !source.includes('deleted_at IS NULL');

      return (
        (this.completions.find(
          (completion) =>
            completion.workspaceId === workspaceId &&
            completion.ruleId === ruleId &&
            completion.occurrenceLocalDate === occurrenceLocalDate &&
            (includeDeleted || completion.deletedAt === null),
        ) as T | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;
    const includeDeleted = !source.includes('deleted_at IS NULL');

    return (
      (this.rules.find(
        (rule) => rule.workspaceId === workspaceId && rule.id === id && (includeDeleted || rule.deletedAt === null),
      ) as T | undefined) ?? null
    );
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('SELECT topic_id AS topicId')) {
      const [workspaceId, ruleId] = params;

      return this.topics
        .filter((topic) => topic.workspaceId === workspaceId && topic.ruleId === ruleId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.topicId.localeCompare(right.topicId))
        .map((topic) => ({ topicId: topic.topicId }) as T);
    }

    if (source.includes('FROM task_recurrence_exceptions')) {
      const [workspaceId, ruleId] = params;

      return this.exceptions
        .filter((exception) => exception.workspaceId === workspaceId && exception.ruleId === ruleId)
        .sort((left, right) => left.occurrenceLocalDate.localeCompare(right.occurrenceLocalDate))
        .map((exception) => ({ ...exception }) as T);
    }

    if (source.includes('FROM task_recurrence_completions')) {
      const [workspaceId, ruleId] = params;

      return this.completions
        .filter(
          (completion) =>
            completion.workspaceId === workspaceId && completion.ruleId === ruleId && completion.deletedAt === null,
        )
        .sort((left, right) => left.occurrenceLocalDate.localeCompare(right.occurrenceLocalDate))
        .map((completion) => ({ ...completion }) as T);
    }

    const [workspaceId] = params;

    return this.rules
      .filter((rule) => rule.workspaceId === workspaceId && rule.deletedAt === null)
      .sort((left, right) => left.startsOnLocalDate.localeCompare(right.startsOnLocalDate))
      .map((rule) => ({ ...rule }) as T);
  }
}

function createInput(overrides: Partial<SaveTaskRecurrenceRuleInput> = {}): SaveTaskRecurrenceRuleInput {
  return {
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
    topicIds: ['topic-class'],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRepository(client: FakeTaskRecurrenceClient) {
  return createTaskRecurrenceRepository({ $client: client } as never);
}

describe('task recurrence repository', () => {
  it('creates and lists recurring tasks with topics in dedicated tables', async () => {
    const client = new FakeTaskRecurrenceClient();
    const repository = createRepository(client);

    const created = await repository.createRule(createInput());
    const listed = await repository.listRules(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
      expect(listed.value[0]).toMatchObject({
        frequency: 'daily',
        kind: 'habit',
        title: 'Study streak',
        topicIds: ['topic-class'],
      });
    }
    expect(client.executedSql.join('\n')).toContain('task_recurrence_rules');
    expect(client.executedSql.join('\n')).not.toContain(' recurrence_rules ');
    expect(client.executedSql.join('\n')).not.toContain(' money_records ');
  });

  it('updates templates and atomically replaces recurrence topics', async () => {
    const client = new FakeTaskRecurrenceClient();
    const repository = createRepository(client);

    await repository.createRule(createInput({ topicIds: ['topic-old'] }));

    const updated = await repository.updateRule(
      createInput({
        frequency: 'weekly',
        kind: 'task',
        priority: 'low',
        title: 'Weekly planning',
        topicIds: ['topic-plan'],
        updatedAt: '2026-05-08T01:00:00.000Z',
        userCorrectedAt: '2026-05-08T01:00:00.000Z',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value).toMatchObject({
        frequency: 'weekly',
        kind: 'task',
        priority: 'low',
        topicIds: ['topic-plan'],
      });
    }
    expect(client.topics.map((topic) => topic.topicId)).toEqual(['topic-plan']);
  });

  it('pauses, resumes, stops with a local date, and soft deletes recurrence rules', async () => {
    const client = new FakeTaskRecurrenceClient();
    const repository = createRepository(client);

    await repository.createRule(createInput());

    const paused = await repository.pauseRule(localWorkspaceId, 'rule-study' as never, fixedNow, fixedNow);
    const resumed = await repository.resumeRule(localWorkspaceId, 'rule-study' as never, '2026-05-08T01:00:00.000Z');
    const stopped = await repository.stopRule(
      localWorkspaceId,
      'rule-study' as never,
      '2026-05-08T02:00:00.000Z',
      '2026-05-08',
      '2026-05-08T02:00:00.000Z',
    );
    const deleted = await repository.deleteRule(
      localWorkspaceId,
      'rule-study' as never,
      '2026-05-08T03:00:00.000Z',
      '2026-05-08T03:00:00.000Z',
    );
    const active = await repository.getRule(localWorkspaceId, 'rule-study' as never);

    expect(paused.ok && paused.value.pausedAt).toBe(fixedNow);
    expect(resumed.ok && resumed.value.pausedAt).toBeNull();
    expect(stopped.ok && stopped.value.stoppedOnLocalDate).toBe('2026-05-08');
    expect(deleted.ok && deleted.value.deletedAt).toBe('2026-05-08T03:00:00.000Z');
    expect(active).toEqual({ ok: true, value: null });
  });

  it('stores skip exceptions idempotently', async () => {
    const client = new FakeTaskRecurrenceClient();
    const repository = createRepository(client);

    await repository.createRule(createInput());

    const first = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-1',
      occurrenceLocalDate: '2026-05-09',
      ruleId: 'rule-study',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const duplicate = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-2',
      occurrenceLocalDate: '2026-05-09',
      ruleId: 'rule-study',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const listed = await repository.listExceptions(localWorkspaceId, 'rule-study' as never);

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    expect(client.exceptions).toHaveLength(1);
    expect(listed.ok && listed.value[0].id).toBe('exception-1');
  });

  it('marks, undoes, and reactivates daily completion rows separately from tasks', async () => {
    const client = new FakeTaskRecurrenceClient();
    const repository = createRepository(client);

    await repository.createRule(createInput());

    const first = await repository.markCompletion({
      completedAt: '2026-05-08T12:00:00.000Z',
      createdAt: fixedNow,
      id: 'completion-1',
      occurrenceLocalDate: '2026-05-08',
      ruleId: 'rule-study',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const undone = await repository.undoCompletion(
      localWorkspaceId,
      'rule-study' as never,
      '2026-05-08',
      '2026-05-08T13:00:00.000Z',
      '2026-05-08T13:00:00.000Z',
    );
    const reactivated = await repository.markCompletion({
      completedAt: '2026-05-08T14:00:00.000Z',
      createdAt: fixedNow,
      id: 'completion-2',
      occurrenceLocalDate: '2026-05-08',
      ruleId: 'rule-study',
      updatedAt: '2026-05-08T14:00:00.000Z',
      workspaceId: localWorkspaceId,
    });
    const listed = await repository.listCompletions(localWorkspaceId, 'rule-study' as never);

    expect(first.ok && first.value.id).toBe('completion-1');
    expect(undone.ok && undone.value.deletedAt).toBe('2026-05-08T13:00:00.000Z');
    expect(reactivated.ok && reactivated.value.id).toBe('completion-1');
    expect(reactivated.ok && reactivated.value.completedAt).toBe('2026-05-08T14:00:00.000Z');
    expect(listed.ok && listed.value).toHaveLength(1);
    expect(client.executedSql.join('\n')).not.toContain('INSERT INTO tasks');
  });
});
