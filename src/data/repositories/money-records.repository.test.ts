import { createMoneyRecordRepository } from './money-records.repository';
import type { MoneyRecordRow } from '@/domain/money/schemas';
import type { SaveManualMoneyRecordInput } from '@/domain/money/types';
import { localWorkspaceId } from '@/domain/workspace/types';

const fixedNow = '2026-05-08T00:00:00.000Z';

type TopicRow = {
  createdAt: string;
  moneyRecordId: string;
  topicId: string;
  workspaceId: string;
};

class FakeMoneyRecordClient {
  readonly executedSql: string[] = [];
  records: MoneyRecordRow[] = [];
  topics: TopicRow[] = [];
  failOnTopicInsert = false;

  execSync(source: string): void {
    this.executedSql.push(source);
  }

  withTransactionSync(task: () => void): void {
    const recordsSnapshot = this.records.map((record) => ({ ...record }));
    const topicsSnapshot = this.topics.map((topic) => ({ ...topic }));

    try {
      task();
    } catch (cause) {
      this.records = recordsSnapshot;
      this.topics = topicsSnapshot;
      throw cause;
    }
  }

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO money_records')) {
      const [
        id,
        workspaceId,
        kind,
        amountMinor,
        currencyCode,
        localDate,
        categoryId,
        merchantOrSource,
        note,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        createdAt,
        updatedAt,
        deletedAt,
      ] = params;

      this.records.push({
        amountMinor: amountMinor as number,
        categoryId: categoryId as string | null,
        createdAt: createdAt as string,
        currencyCode: currencyCode as string,
        deletedAt: deletedAt as string | null,
        id: id as string,
        kind: kind as 'expense' | 'income',
        localDate: localDate as string,
        merchantOrSource: merchantOrSource as string | null,
        note: note as string | null,
        source: sourceValue as 'manual' | 'receipt',
        sourceOfTruth: sourceOfTruth as 'manual' | 'parsed',
        updatedAt: updatedAt as string,
        userCorrectedAt: userCorrectedAt as string | null,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('INSERT INTO money_record_topics')) {
      if (this.failOnTopicInsert) {
        throw new Error('topic insert failed');
      }

      const [moneyRecordId, topicId, workspaceId, createdAt] = params;

      this.topics.push({
        createdAt: createdAt as string,
        moneyRecordId: moneyRecordId as string,
        topicId: topicId as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes('UPDATE money_records') && source.includes('user_corrected_at')) {
      const [
        kind,
        amountMinor,
        currencyCode,
        localDate,
        categoryId,
        merchantOrSource,
        note,
        sourceValue,
        sourceOfTruth,
        userCorrectedAt,
        updatedAt,
        workspaceId,
        id,
      ] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        Object.assign(record, {
          amountMinor: amountMinor as number,
          categoryId: categoryId as string | null,
          currencyCode: currencyCode as string,
          kind: kind as 'expense' | 'income',
          localDate: localDate as string,
          merchantOrSource: merchantOrSource as string | null,
          note: note as string | null,
          source: sourceValue as 'manual' | 'receipt',
          sourceOfTruth: sourceOfTruth as 'manual' | 'parsed',
          updatedAt: updatedAt as string,
          userCorrectedAt: userCorrectedAt as string | null,
        });

        return { changes: 1 };
      }

      return { changes: 0 };
    }

    if (source.includes('UPDATE money_records') && source.includes('deleted_at = ?')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const record = this.records.find(
        (candidate) => candidate.workspaceId === workspaceId && candidate.id === id && candidate.deletedAt === null,
      );

      if (record) {
        record.deletedAt = deletedAt as string;
        record.updatedAt = updatedAt as string;
        return { changes: 1 };
      }

      return { changes: 0 };
    }

    if (source.includes('DELETE FROM money_record_topics')) {
      const [workspaceId, moneyRecordId] = params;
      this.topics = this.topics.filter(
        (topic) => topic.workspaceId !== workspaceId || topic.moneyRecordId !== moneyRecordId,
      );

      return { changes: 1 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(_source: string, ...params: unknown[]): T | null {
    if (_source.includes('COUNT(*) AS totalCount')) {
      return { totalCount: this.filterHistoryRows(_source, params).length } as T;
    }

    const [workspaceId, id] = params;
    const includeDeleted = !_source.includes('deleted_at IS NULL');
    const record =
      this.records.find(
        (candidate) =>
          candidate.workspaceId === workspaceId &&
          candidate.id === id &&
          (includeDeleted || candidate.deletedAt === null),
      ) ?? null;

    return record as T | null;
  }

  private filterHistoryRows(source: string, params: unknown[]): MoneyRecordRow[] {
    const [workspaceId] = params;
    let paramIndex = 1;
    const kind = source.includes('kind = ?') ? (params[paramIndex++] as string) : null;
    const dateFrom = source.includes('local_date >= ?') ? (params[paramIndex++] as string) : null;
    const dateTo = source.includes('local_date <= ?') ? (params[paramIndex++] as string) : null;
    const categoryId = source.includes('category_id = ?') ? (params[paramIndex++] as string) : null;
    const topicId = source.includes('history_topics.topic_id = ?') ? (params[paramIndex++] as string) : null;
    const merchantSearch = source.includes('LIKE ?')
      ? String(params[paramIndex++]).replace(/%/g, '').toLowerCase()
      : null;
    const amountMin = source.includes('amount_minor >= ?') ? (params[paramIndex++] as number) : null;
    const amountMax = source.includes('amount_minor <= ?') ? (params[paramIndex++] as number) : null;

    return this.records.filter((record) => {
      const topicMatched =
        !topicId ||
        this.topics.some(
          (topic) =>
            topic.workspaceId === workspaceId &&
            topic.moneyRecordId === record.id &&
            topic.topicId === topicId,
        );

      return (
        record.workspaceId === workspaceId &&
        record.deletedAt === null &&
        (!kind || record.kind === kind) &&
        (!dateFrom || record.localDate >= dateFrom) &&
        (!dateTo || record.localDate <= dateTo) &&
        (!categoryId || record.categoryId === categoryId) &&
        topicMatched &&
        (!merchantSearch || (record.merchantOrSource ?? '').toLowerCase().includes(merchantSearch)) &&
        (amountMin === null || record.amountMinor >= amountMin) &&
        (amountMax === null || record.amountMinor <= amountMax)
      );
    });
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    if (source.includes('SELECT topic_id AS topicId')) {
      const [workspaceId, moneyRecordId] = params;

      return this.topics
        .filter((topic) => topic.workspaceId === workspaceId && topic.moneyRecordId === moneyRecordId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.topicId.localeCompare(right.topicId))
        .map((topic) => ({ topicId: topic.topicId }) as T);
    }

    const [workspaceId, firstOption, secondOption] = params;

    if (source.includes('OFFSET ?')) {
      const limit = params[params.length - 2] as number;
      const offset = params[params.length - 1] as number;
      let rows = this.filterHistoryRows(source, params.slice(0, -2));

      if (source.includes('amount_minor DESC')) {
        rows = rows.sort((left, right) => right.amountMinor - left.amountMinor || right.localDate.localeCompare(left.localDate));
      } else if (source.includes('amount_minor ASC')) {
        rows = rows.sort((left, right) => left.amountMinor - right.amountMinor || right.localDate.localeCompare(left.localDate));
      } else if (source.includes('local_date ASC')) {
        rows = rows.sort((left, right) => left.localDate.localeCompare(right.localDate) || left.id.localeCompare(right.id));
      } else {
        rows = rows.sort((left, right) => right.localDate.localeCompare(left.localDate) || right.id.localeCompare(left.id));
      }

      return rows.slice(offset, offset + limit).map((record) => ({ ...record }) as T);
    }

    if (source.includes('local_date >= ?')) {
      return this.records
        .filter(
          (record) =>
            record.workspaceId === workspaceId &&
            record.deletedAt === null &&
            record.localDate >= (firstOption as string) &&
            record.localDate < (secondOption as string),
        )
        .sort(
          (left, right) =>
            left.localDate.localeCompare(right.localDate) ||
            left.createdAt.localeCompare(right.createdAt) ||
            left.id.localeCompare(right.id),
        )
        .map((record) => ({ ...record }) as T);
    }

    return this.records
      .filter((record) => record.workspaceId === workspaceId && record.deletedAt === null)
      .sort(
        (left, right) =>
          right.localDate.localeCompare(left.localDate) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      )
      .slice(0, firstOption as number)
      .map((record) => ({ ...record }) as T);
  }
}

function createInput(overrides: Partial<SaveManualMoneyRecordInput> = {}): SaveManualMoneyRecordInput {
  return {
    amountMinor: 1250,
    categoryId: 'cat-food',
    createdAt: fixedNow,
    currencyCode: 'USD',
    deletedAt: null,
    id: 'money-1',
    kind: 'expense',
    localDate: '2026-05-08',
    merchantOrSource: 'Campus cafe',
    note: 'Lunch',
    source: 'manual',
    sourceOfTruth: 'manual',
    topicIds: ['topic-campus'],
    updatedAt: fixedNow,
    userCorrectedAt: null,
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function createRepository(client: FakeMoneyRecordClient) {
  return createMoneyRecordRepository({ $client: client } as never);
}

describe('money records repository', () => {
  it('creates a manual money record with topics and loads it by id', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    const created = await repository.createManualRecord(createInput());
    const loaded = await repository.getRecord(localWorkspaceId, 'money-1' as never);

    expect(created.ok).toBe(true);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value?.amountMinor).toBe(1250);
      expect(loaded.value?.topicIds).toEqual(['topic-campus']);
      expect(loaded.value?.sourceOfTruth).toBe('manual');
    }
  });

  it('lists recent records for the workspace', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(createInput({ id: 'money-old', localDate: '2026-05-07', topicIds: [] }));
    await repository.createManualRecord(createInput({ id: 'money-new', localDate: '2026-05-08', topicIds: [] }));

    const listed = await repository.listRecentRecords(localWorkspaceId, { limit: 10 });

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.map((record) => record.id)).toEqual(['money-new', 'money-old']);
    }
  });

  it('updates a record, preserves its original source, and atomically replaces topics', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(
      createInput({
        source: 'receipt',
        sourceOfTruth: 'parsed',
        topicIds: ['topic-old'],
      }),
    );

    const updated = await repository.updateRecord(
      createInput({
        amountMinor: 2250,
        merchantOrSource: 'Bookstore',
        note: 'Supplies',
        source: 'manual',
        sourceOfTruth: 'manual',
        topicIds: ['topic-campus', 'topic-study'],
        updatedAt: '2026-05-08T01:00:00.000Z',
        userCorrectedAt: '2026-05-08T01:00:00.000Z',
      }),
    );

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.value.amountMinor).toBe(2250);
      expect(updated.value.source).toBe('receipt');
      expect(updated.value.sourceOfTruth).toBe('manual');
      expect(updated.value.topicIds).toEqual(['topic-campus', 'topic-study']);
      expect(updated.value.userCorrectedAt).toBe('2026-05-08T01:00:00.000Z');
    }
    expect(client.topics.map((topic) => topic.topicId)).toEqual(['topic-campus', 'topic-study']);
  });

  it('rolls back record updates when replacement topic writes fail', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(createInput({ topicIds: ['topic-old'] }));
    client.failOnTopicInsert = true;

    const result = await repository.updateRecord(createInput({ amountMinor: 2250, topicIds: ['topic-new'] }));

    expect(result.ok).toBe(false);
    expect(client.records[0].amountMinor).toBe(1250);
    expect(client.topics.map((topic) => topic.topicId)).toEqual(['topic-old']);
  });

  it('soft deletes records and hides them from normal queries', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(createInput());

    const deleted = await repository.deleteRecord(localWorkspaceId, 'money-1' as never, {
      now: new Date('2026-05-08T02:00:00.000Z'),
    });
    const active = await repository.getRecord(localWorkspaceId, 'money-1' as never);
    const includeDeleted = await repository.getRecord(localWorkspaceId, 'money-1' as never, {
      includeDeleted: true,
    });

    expect(deleted.ok).toBe(true);
    expect(active).toEqual({ ok: true, value: null });
    expect(includeDeleted.ok).toBe(true);
    if (includeDeleted.ok) {
      expect(includeDeleted.value?.deletedAt).toBe('2026-05-08T02:00:00.000Z');
    }
  });

  it('lists active records for a budget period only', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(createInput({ id: 'money-before', localDate: '2026-04-30', topicIds: [] }));
    await repository.createManualRecord(createInput({ id: 'money-in', localDate: '2026-05-08', topicIds: [] }));
    await repository.createManualRecord(createInput({ id: 'money-after', localDate: '2026-06-01', topicIds: [] }));
    await repository.deleteRecord(localWorkspaceId, 'money-in' as never, {
      now: new Date('2026-05-08T02:00:00.000Z'),
    });
    await repository.createManualRecord(createInput({ id: 'money-active', localDate: '2026-05-09', topicIds: [] }));

    const listed = await repository.listRecordsForPeriod(localWorkspaceId, {
      endDateExclusive: '2026-06-01' as never,
      startDate: '2026-05-01' as never,
    });

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.map((record) => record.id)).toEqual(['money-active']);
    }
  });

  it('filters, sorts, and paginates money history records', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(
      createInput({
        amountMinor: 500,
        id: 'money-coffee',
        localDate: '2026-05-09',
        merchantOrSource: 'Campus cafe',
        topicIds: ['topic-campus'],
      }),
    );
    await repository.createManualRecord(
      createInput({
        amountMinor: 2500,
        id: 'money-books',
        localDate: '2026-05-10',
        merchantOrSource: 'Bookstore',
        topicIds: ['topic-study'],
      }),
    );
    await repository.createManualRecord(
      createInput({
        amountMinor: 4000,
        id: 'money-income',
        kind: 'income',
        localDate: '2026-05-11',
        merchantOrSource: 'Campus job',
        topicIds: ['topic-campus'],
      }),
    );

    const filtered = await repository.listHistoryRecords(localWorkspaceId, {
      amountMinorMax: 5000,
      amountMinorMin: 1000,
      categoryId: 'cat-food',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      kind: null,
      limit: 1,
      merchantOrSource: 'store',
      offset: 0,
      sort: 'amount_desc',
      topicId: 'topic-study',
    });

    expect(filtered.ok).toBe(true);
    if (filtered.ok) {
      expect(filtered.value.totalCount).toBe(1);
      expect(filtered.value.hasMore).toBe(false);
      expect(filtered.value.records.map((record) => record.id)).toEqual(['money-books']);
    }
  });

  it('returns pagination metadata for money history pages', async () => {
    const client = new FakeMoneyRecordClient();
    const repository = createRepository(client);

    await repository.createManualRecord(createInput({ id: 'money-1', localDate: '2026-05-09', topicIds: [] }));
    await repository.createManualRecord(createInput({ id: 'money-2', localDate: '2026-05-10', topicIds: [] }));
    await repository.createManualRecord(createInput({ id: 'money-3', localDate: '2026-05-11', topicIds: [] }));

    const page = await repository.listHistoryRecords(localWorkspaceId, {
      limit: 2,
      offset: 0,
      sort: 'date_desc',
    });

    expect(page.ok).toBe(true);
    if (page.ok) {
      expect(page.value.records.map((record) => record.id)).toEqual(['money-3', 'money-2']);
      expect(page.value.totalCount).toBe(3);
      expect(page.value.hasMore).toBe(true);
    }
  });

  it('does not leave a partial final record when topic writes fail', async () => {
    const client = new FakeMoneyRecordClient();
    client.failOnTopicInsert = true;
    const repository = createRepository(client);

    const result = await repository.createManualRecord(createInput());

    expect(result.ok).toBe(false);
    expect(client.records).toEqual([]);
    expect(client.topics).toEqual([]);
  });
});
