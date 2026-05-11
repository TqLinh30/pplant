import { createRecurrenceRuleRepository } from './recurrence-rules.repository';
import type { RecurrenceExceptionRow, RecurrenceRuleRow } from '@/domain/recurrence/schemas';
import type { SaveRecurringMoneyRuleInput } from '@/domain/recurrence/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const fixedNow = '2026-05-08T00:00:00.000Z';

type RuleTopicRow = {
  createdAt: string;
  recurrenceRuleId: string;
  topicId: string;
  workspaceId: string;
};

class FakeRecurrenceRuleClient {
  readonly executedSql: string[] = [];
  rules: RecurrenceRuleRow[] = [];
  topics: RuleTopicRow[] = [];
  exceptions: RecurrenceExceptionRow[] = [];

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const rules = this.rules.map((rule) => ({ ...rule }));
    const topics = this.topics.map((topic) => ({ ...topic }));
    const exceptions = this.exceptions.map((exception) => ({ ...exception }));

    try {
      task();
    } catch (cause) {
      this.rules = rules;
      this.topics = topics;
      this.exceptions = exceptions;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO recurrence_rules')) {
      const [
        id,
        workspaceId,
        ownerKind,
        frequency,
        startsOnLocalDate,
        endsOnLocalDate,
        lastGeneratedLocalDate,
        pausedAt,
        stoppedAt,
        deletedAt,
        moneyKind,
        amountMinor,
        currencyCode,
        categoryId,
        merchantOrSource,
        note,
        sourceValue,
        sourceOfTruth,
        createdAt,
        updatedAt,
      ] = params;

      this.rules.push({
        amountMinor: amountMinor as number,
        categoryId: categoryId as string | null,
        createdAt: createdAt as string,
        currencyCode: currencyCode as string,
        deletedAt: deletedAt as string | null,
        endsOnLocalDate: endsOnLocalDate as string | null,
        frequency: frequency as 'daily' | 'weekly' | 'monthly',
        id: id as string,
        lastGeneratedLocalDate: lastGeneratedLocalDate as string | null,
        merchantOrSource: merchantOrSource as string | null,
        moneyKind: moneyKind as 'expense' | 'income',
        note: note as string | null,
        ownerKind: ownerKind as 'money',
        pausedAt: pausedAt as string | null,
        source: sourceValue as 'recurring',
        sourceOfTruth: sourceOfTruth as 'manual',
        startsOnLocalDate: startsOnLocalDate as string,
        stoppedAt: stoppedAt as string | null,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO recurrence_rule_topics')) {
      const [recurrenceRuleId, topicId, workspaceId, createdAt] = params;
      this.topics.push({
        createdAt: createdAt as string,
        recurrenceRuleId: recurrenceRuleId as string,
        topicId: topicId as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('DELETE FROM recurrence_rule_topics')) {
      const [workspaceId, recurrenceRuleId] = params;
      this.topics = this.topics.filter(
        (topic) => topic.workspaceId !== workspaceId || topic.recurrenceRuleId !== recurrenceRuleId,
      );

      return { changes: 1 };
    }

    if (source.includes('UPDATE recurrence_rules') && source.includes('frequency = ?')) {
      const [
        frequency,
        startsOnLocalDate,
        endsOnLocalDate,
        moneyKind,
        amountMinor,
        currencyCode,
        categoryId,
        merchantOrSource,
        note,
        sourceValue,
        sourceOfTruth,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const rule = this.rules.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (rule) {
        Object.assign(rule, {
          amountMinor,
          categoryId,
          currencyCode,
          endsOnLocalDate,
          frequency,
          merchantOrSource,
          moneyKind,
          note,
          source: sourceValue,
          sourceOfTruth,
          startsOnLocalDate,
          updatedAt,
        });
      }

      return { changes: rule ? 1 : 0 };
    }

    if (source.includes('UPDATE recurrence_rules')) {
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
        rule.updatedAt = params[1] as string;
      } else if (source.includes('deleted_at = ?')) {
        rule.deletedAt = params[0] as string;
        rule.updatedAt = params[1] as string;
      } else if (source.includes('last_generated_local_date = ?')) {
        rule.lastGeneratedLocalDate = params[0] as string;
        rule.updatedAt = params[1] as string;
      }

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO recurrence_exceptions')) {
      const [id, recurrenceRuleId, workspaceId, occurrenceLocalDate, action, moneyRecordId, createdAt, updatedAt] =
        params;
      this.exceptions.push({
        action: action as 'skip',
        createdAt: createdAt as string,
        id: id as string,
        moneyRecordId: moneyRecordId as string | null,
        occurrenceLocalDate: occurrenceLocalDate as string,
        recurrenceRuleId: recurrenceRuleId as string,
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('FROM recurrence_exceptions')) {
      const [workspaceId, recurrenceRuleId, occurrenceLocalDate] = params;

      return (
        (this.exceptions.find(
          (exception) =>
            exception.workspaceId === workspaceId &&
            exception.recurrenceRuleId === recurrenceRuleId &&
            exception.occurrenceLocalDate === occurrenceLocalDate,
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
      const [workspaceId, recurrenceRuleId] = params;

      return this.topics
        .filter((topic) => topic.workspaceId === workspaceId && topic.recurrenceRuleId === recurrenceRuleId)
        .map((topic) => ({ topicId: topic.topicId }) as T);
    }

    if (source.includes('FROM recurrence_exceptions')) {
      const [workspaceId, recurrenceRuleId] = params;

      return this.exceptions
        .filter((exception) => exception.workspaceId === workspaceId && exception.recurrenceRuleId === recurrenceRuleId)
        .sort((left, right) => left.occurrenceLocalDate.localeCompare(right.occurrenceLocalDate))
        .map((exception) => ({ ...exception }) as T);
    }

    const [workspaceId] = params;

    return this.rules
      .filter((rule) => rule.workspaceId === workspaceId && rule.ownerKind === 'money' && rule.deletedAt === null)
      .sort((left, right) => left.startsOnLocalDate.localeCompare(right.startsOnLocalDate))
      .map((rule) => ({ ...rule }) as T);
  }
}

function createInput(overrides: Partial<SaveRecurringMoneyRuleInput> = {}): SaveRecurringMoneyRuleInput {
  return {
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow,
    currencyCode: 'USD',
    endsOnLocalDate: null,
    frequency: 'monthly',
    id: 'rule-rent',
    merchantOrSource: 'Rent',
    moneyKind: 'expense',
    note: 'Dorm',
    startsOnLocalDate: '2026-05-08',
    topicIds: ['topic-campus'],
    updatedAt: fixedNow,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRepository(client: FakeRecurrenceRuleClient) {
  return createRecurrenceRuleRepository({ $client: client } as never);
}

describe('recurrence rules repository', () => {
  it('creates and lists recurring money rules with topics', async () => {
    const client = new FakeRecurrenceRuleClient();
    const repository = createRepository(client);

    const created = await repository.createRule(createInput());
    const listed = await repository.listRules(localWorkspaceId);

    expect(created.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.map((rule) => rule.id)).toEqual(['rule-rent']);
      expect(listed.value[0].topicIds).toEqual(['topic-campus']);
      expect(listed.value[0].source).toBe('recurring');
    }
  });

  it('updates future template fields and atomically replaces topics', async () => {
    const client = new FakeRecurrenceRuleClient();
    const repository = createRepository(client);

    await repository.createRule(createInput({ lastGeneratedLocalDate: '2026-05-08', topicIds: ['topic-old'] }));

    const updated = await repository.updateRule(
      createInput({
        amountMinor: 2250,
        frequency: 'weekly',
        merchantOrSource: 'Campus job',
        moneyKind: 'income',
        topicIds: ['topic-campus', 'topic-income'],
        updatedAt: '2026-05-09T00:00:00.000Z',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.amountMinor).toBe(2250);
      expect(updated.value.frequency).toBe('weekly');
      expect(updated.value.lastGeneratedLocalDate).toBe('2026-05-08');
      expect(updated.value.topicIds).toEqual(['topic-campus', 'topic-income']);
    }
  });

  it('pauses, resumes, stops, soft deletes, and updates last generated date', async () => {
    const client = new FakeRecurrenceRuleClient();
    const repository = createRepository(client);

    await repository.createRule(createInput());

    const paused = await repository.pauseRule(
      localWorkspaceId,
      'rule-rent' as never,
      '2026-05-08T01:00:00.000Z',
      '2026-05-08T01:00:00.000Z',
    );
    const resumed = await repository.resumeRule(
      localWorkspaceId,
      'rule-rent' as never,
      '2026-05-08T02:00:00.000Z',
    );
    const generated = await repository.updateLastGeneratedLocalDate(
      localWorkspaceId,
      'rule-rent' as never,
      '2026-05-08',
      '2026-05-08T03:00:00.000Z',
    );
    const stopped = await repository.stopRule(
      localWorkspaceId,
      'rule-rent' as never,
      '2026-05-08T04:00:00.000Z',
      '2026-05-08T04:00:00.000Z',
    );
    const deleted = await repository.deleteRule(
      localWorkspaceId,
      'rule-rent' as never,
      '2026-05-08T05:00:00.000Z',
      '2026-05-08T05:00:00.000Z',
    );

    expect(paused.ok && paused.value.pausedAt).toBe('2026-05-08T01:00:00.000Z');
    expect(resumed.ok && resumed.value.pausedAt).toBeNull();
    expect(generated.ok && generated.value.lastGeneratedLocalDate).toBe('2026-05-08');
    expect(stopped.ok && stopped.value.stoppedAt).toBe('2026-05-08T04:00:00.000Z');
    expect(deleted.ok && deleted.value.deletedAt).toBe('2026-05-08T05:00:00.000Z');
    expect(client.rules[0].deletedAt).toBe('2026-05-08T05:00:00.000Z');
  });

  it('stores skip exceptions idempotently', async () => {
    const client = new FakeRecurrenceRuleClient();
    const repository = createRepository(client);

    await repository.createRule(createInput());

    const first = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-1',
      occurrenceLocalDate: '2026-06-08',
      recurrenceRuleId: 'rule-rent',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const duplicate = await repository.createException({
      action: 'skip',
      createdAt: fixedNow,
      id: 'exception-2',
      occurrenceLocalDate: '2026-06-08',
      recurrenceRuleId: 'rule-rent',
      updatedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const listed = await repository.listExceptions(localWorkspaceId, 'rule-rent' as never);

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    expect(client.exceptions).toHaveLength(1);
    expect(listed.ok && listed.value[0].id).toBe('exception-1');
  });
});
