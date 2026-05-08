import type { NormalizedReceiptParseResult, ReceiptParseJobRow } from '@/domain/receipts/types';
import { localWorkspaceId } from '@/domain/workspace/types';

import { createReceiptParseJobRepository } from './receipt-parse-jobs.repository';

const fixedNow = '2026-05-08T00:00:00.000Z';

const parsedResult: NormalizedReceiptParseResult = {
  categoryId: {
    confidence: 'medium',
    source: 'estimated',
    value: 'category-food',
  },
  currency: 'USD',
  duplicateSuspected: false,
  lineItems: [
    {
      amountMinor: { confidence: 'high', source: 'parsed', value: 825 },
      label: { confidence: 'high', source: 'parsed', value: 'Lunch' },
    },
  ],
  localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
  merchant: { confidence: 'high', source: 'parsed', value: 'Campus Cafe' },
  topicIds: { confidence: 'medium', source: 'estimated', value: ['topic-food'] },
  totalMinor: { confidence: 'high', source: 'parsed', value: 825 },
  unknownFields: [],
};

class FakeReceiptParseJobClient {
  readonly executedSql: string[] = [];
  rows: ReceiptParseJobRow[] = [];

  runSync(source: string, ...params: unknown[]): unknown {
    this.executedSql.push(source);

    if (source.includes('INSERT INTO receipt_parse_jobs')) {
      const [id, workspaceId, receiptDraftId, requestedAt, createdAt, updatedAt] = params;

      this.rows.push({
        attemptCount: 0,
        completedAt: null,
        createdAt: createdAt as string,
        deletedAt: null,
        id: id as string,
        lastErrorCategory: null,
        receiptDraftId: receiptDraftId as string,
        requestedAt: requestedAt as string,
        resultJson: null,
        retryWindowStartedAt: null,
        startedAt: null,
        status: 'pending',
        updatedAt: updatedAt as string,
        workspaceId: workspaceId as string,
      });

      return { changes: 1 };
    }

    if (source.includes("status = 'running'")) {
      const [attemptCount, retryWindowStartedAt, startedAt, updatedAt, workspaceId, id] = params;
      const row = this.findRow(workspaceId as string, id as string);

      if (row) {
        row.attemptCount = attemptCount as number;
        row.completedAt = null;
        row.lastErrorCategory = null;
        row.retryWindowStartedAt = retryWindowStartedAt as string;
        row.startedAt = startedAt as string;
        row.status = 'running';
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('result_json = ?')) {
      const [status, completedAt, resultJson, updatedAt, workspaceId, id] = params;
      const row = this.findRow(workspaceId as string, id as string);

      if (row) {
        row.completedAt = completedAt as string;
        row.lastErrorCategory = null;
        row.resultJson = resultJson as string;
        row.status = status as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('last_error_category = ?')) {
      const [status, completedAt, lastErrorCategory, updatedAt, workspaceId, id] = params;
      const row = this.findRow(workspaceId as string, id as string);

      if (row) {
        row.completedAt = completedAt as string;
        row.lastErrorCategory = lastErrorCategory as string;
        row.status = status as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('completed_at = COALESCE')) {
      const [status, savedAt, updatedAt, workspaceId, id] = params;
      const row = this.findRow(workspaceId as string, id as string);

      if (row) {
        row.completedAt = row.completedAt ?? (savedAt as string);
        row.lastErrorCategory = null;
        row.status = status as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    if (source.includes('deleted_at = ?')) {
      const [deletedAt, updatedAt, workspaceId, id] = params;
      const row = this.findRow(workspaceId as string, id as string);

      if (row) {
        row.deletedAt = deletedAt as string;
        row.updatedAt = updatedAt as string;
      }

      return { changes: row ? 1 : 0 };
    }

    return { changes: 0 };
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    if (source.includes('receipt_draft_id = ?')) {
      const [workspaceId, receiptDraftId] = params;

      return (
        (this.rows
          .filter(
            (row) =>
              row.workspaceId === workspaceId &&
              row.receiptDraftId === receiptDraftId &&
              row.deletedAt === null,
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))[0] as
          | T
          | undefined) ?? null
      );
    }

    const [workspaceId, id] = params;

    return (this.findRow(workspaceId as string, id as string) as T | undefined) ?? null;
  }

  getAllSync<T>(_source: string, ...params: unknown[]): T[] {
    const [workspaceId] = params;

    return this.rows
      .filter(
        (row) =>
          row.workspaceId === workspaceId &&
          row.deletedAt === null &&
          (row.status === 'pending' ||
            row.status === 'running' ||
            row.status === 'failed' ||
            row.status === 'retry_exhausted'),
      )
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.id.localeCompare(right.id))
      .map((row) => row as T);
  }

  private findRow(workspaceId: string, id: string): ReceiptParseJobRow | undefined {
    return this.rows.find((row) => row.workspaceId === workspaceId && row.id === id);
  }
}

describe('receipt parse job repository', () => {
  it('creates a pending job and transitions to running and parsed', async () => {
    const client = new FakeReceiptParseJobClient();
    const repository = createReceiptParseJobRepository({ $client: client } as never);

    const pending = await repository.createPendingJob({
      id: 'job-1' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const running = await repository.markRunning(localWorkspaceId, 'job-1' as never, {
      attemptCount: 1,
      retryWindowStartedAt: '2026-05-08T00:01:00.000Z',
      startedAt: '2026-05-08T00:01:00.000Z',
    });
    const parsed = await repository.markParsed(localWorkspaceId, 'job-1' as never, {
      completedAt: '2026-05-08T00:02:00.000Z',
      normalizedResult: parsedResult,
      status: 'parsed',
    });

    expect(pending.ok).toBe(true);
    expect(running.ok).toBe(true);
    expect(parsed.ok).toBe(true);
    if (pending.ok && running.ok && parsed.ok) {
      expect(pending.value.status).toBe('pending');
      expect(running.value).toMatchObject({ attemptCount: 1, status: 'running' });
      expect(parsed.value.status).toBe('parsed');
      expect(parsed.value.normalizedResult?.merchant.value).toBe('Campus Cafe');
    }
  });

  it('loads the latest job for a receipt draft and lists retryable work', async () => {
    const client = new FakeReceiptParseJobClient();
    const repository = createReceiptParseJobRepository({ $client: client } as never);

    await repository.createPendingJob({
      id: 'job-old' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    await repository.createPendingJob({
      id: 'job-new' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: '2026-05-08T00:03:00.000Z',
      workspaceId: localWorkspaceId,
    });
    await repository.markFailed(localWorkspaceId, 'job-new' as never, {
      completedAt: '2026-05-08T00:04:00.000Z',
      lastErrorCategory: 'unavailable',
      status: 'failed',
    });
    const latest = await repository.getLatestJobForDraft(localWorkspaceId, 'draft-receipt' as never);
    const retryable = await repository.listPendingOrRetryableJobs(localWorkspaceId);

    expect(latest.ok).toBe(true);
    expect(retryable.ok).toBe(true);
    if (latest.ok && retryable.ok) {
      expect(latest.value?.id).toBe('job-new');
      expect(latest.value?.lastErrorCategory).toBe('unavailable');
      expect(retryable.value.map((job) => job.id)).toEqual(['job-old', 'job-new']);
    }
  });

  it('marks retry exhaustion without writing parsed result data', async () => {
    const client = new FakeReceiptParseJobClient();
    const repository = createReceiptParseJobRepository({ $client: client } as never);

    await repository.createPendingJob({
      id: 'job-1' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const exhausted = await repository.markFailed(localWorkspaceId, 'job-1' as never, {
      completedAt: '2026-05-08T00:03:00.000Z',
      lastErrorCategory: 'unavailable',
      status: 'retry_exhausted',
    });

    expect(exhausted.ok).toBe(true);
    if (exhausted.ok) {
      expect(exhausted.value.status).toBe('retry_exhausted');
      expect(exhausted.value.normalizedResult).toBeNull();
    }
  });

  it('soft-deletes receipt parse jobs so recovery listings ignore them', async () => {
    const client = new FakeReceiptParseJobClient();
    const repository = createReceiptParseJobRepository({ $client: client } as never);

    await repository.createPendingJob({
      id: 'job-1' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    const deleted = await repository.markDeleted(
      localWorkspaceId,
      'job-1' as never,
      '2026-05-08T00:05:00.000Z',
    );
    const retryable = await repository.listPendingOrRetryableJobs(localWorkspaceId);

    expect(deleted.ok).toBe(true);
    expect(retryable.ok).toBe(true);
    if (deleted.ok && retryable.ok) {
      expect(deleted.value.deletedAt).toBe('2026-05-08T00:05:00.000Z');
      expect(retryable.value).toEqual([]);
    }
  });

  it('marks a parsed job saved after receipt review without deleting parse result data', async () => {
    const client = new FakeReceiptParseJobClient();
    const repository = createReceiptParseJobRepository({ $client: client } as never);

    await repository.createPendingJob({
      id: 'job-1' as never,
      receiptDraftId: 'draft-receipt' as never,
      requestedAt: fixedNow,
      workspaceId: localWorkspaceId,
    });
    await repository.markRunning(localWorkspaceId, 'job-1' as never, {
      attemptCount: 1,
      retryWindowStartedAt: '2026-05-08T00:01:00.000Z',
      startedAt: '2026-05-08T00:01:00.000Z',
    });
    await repository.markParsed(localWorkspaceId, 'job-1' as never, {
      completedAt: '2026-05-08T00:02:00.000Z',
      normalizedResult: parsedResult,
      status: 'parsed',
    });
    const saved = await repository.markSaved(localWorkspaceId, 'job-1' as never, {
      savedAt: '2026-05-08T00:03:00.000Z',
      status: 'saved',
    });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.value.status).toBe('saved');
      expect(saved.value.completedAt).toBe('2026-05-08T00:02:00.000Z');
      expect(saved.value.normalizedResult?.totalMinor.value).toBe(825);
    }
  });
});
