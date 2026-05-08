import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { NormalizedReceiptParseResult, ReceiptParseJob } from '@/domain/receipts/types';
import {
  buildReceiptCaptureDraftPayload,
  markReceiptImageDeleted,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId, type WorkspaceId } from '@/domain/workspace/types';

import type { ReceiptParsingPort } from './receipt-parsing.port';
import {
  getLatestReceiptParseJobForDraft,
  runReceiptParseJob,
  startReceiptParseJob,
} from './receipt-parse-job.service';
import type { ReceiptParseJobRepository } from '@/data/repositories/receipt-parse-jobs.repository';
import type { CaptureDraftRepository } from '@/data/repositories/capture-drafts.repository';

const fixedNow = new Date('2026-05-08T00:00:00.000Z');

function parsedResult(overrides: Partial<NormalizedReceiptParseResult> = {}): NormalizedReceiptParseResult {
  return {
    categoryId: { confidence: 'high', source: 'estimated', value: 'category-food' },
    currency: 'USD',
    duplicateSuspected: false,
    lineItems: [
      {
        amountMinor: { confidence: 'high', source: 'parsed', value: 1200 },
        label: { confidence: 'high', source: 'parsed', value: 'Groceries' },
      },
    ],
    localDate: { confidence: 'high', source: 'parsed', value: '2026-05-08' },
    merchant: { confidence: 'high', source: 'parsed', value: 'Campus Market' },
    topicIds: { confidence: 'high', source: 'estimated', value: ['topic-food'] },
    totalMinor: { confidence: 'high', source: 'parsed', value: 1200 },
    unknownFields: [],
    ...overrides,
  };
}

function receiptDraft(id = 'draft-receipt'): CaptureDraft {
  return {
    createdAt: fixedNow.toISOString(),
    discardedAt: null,
    id: id as never,
    kind: 'expense',
    lastSavedAt: fixedNow.toISOString(),
    payload: toCaptureDraftPayload(
      buildReceiptCaptureDraftPayload({
        capturedAt: fixedNow.toISOString(),
        originalFileName: 'receipt.jpg',
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        source: 'camera',
      }),
    ),
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

class FakeReceiptParseJobRepository implements ReceiptParseJobRepository {
  jobs: ReceiptParseJob[] = [];

  async createPendingJob(input: Parameters<ReceiptParseJobRepository['createPendingJob']>[0]) {
    const job: ReceiptParseJob = {
      attemptCount: 0,
      completedAt: null,
      createdAt: input.requestedAt,
      deletedAt: null,
      id: input.id,
      lastErrorCategory: null,
      normalizedResult: null,
      receiptDraftId: input.receiptDraftId,
      requestedAt: input.requestedAt,
      retryWindowStartedAt: null,
      startedAt: null,
      status: 'pending',
      updatedAt: input.requestedAt,
      workspaceId: input.workspaceId,
    };

    this.jobs.push(job);

    return ok({ ...job });
  }

  async getJobById(_workspaceId: WorkspaceId, id: EntityId) {
    const job = this.jobs.find((candidate) => candidate.id === id && candidate.deletedAt === null);

    return ok(job ? { ...job } : null);
  }

  async getLatestJobForDraft(_workspaceId: WorkspaceId, receiptDraftId: EntityId) {
    const job = this.jobs
      .filter((candidate) => candidate.receiptDraftId === receiptDraftId && candidate.deletedAt === null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))[0];

    return ok(job ? { ...job } : null);
  }

  async listPendingOrRetryableJobs() {
    return ok(
      this.jobs.filter(
        (job) =>
          job.deletedAt === null &&
          (job.status === 'pending' ||
            job.status === 'running' ||
            job.status === 'failed' ||
            job.status === 'retry_exhausted'),
      ),
    );
  }

  async markFailed(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<ReceiptParseJobRepository['markFailed']>[2],
  ) {
    const job = this.requireJob(id);
    job.completedAt = input.completedAt;
    job.lastErrorCategory = input.lastErrorCategory;
    job.status = input.status;
    job.updatedAt = input.completedAt;

    return ok({ ...job });
  }

  async markDeleted(_workspaceId: WorkspaceId, id: EntityId, deletedAt: string) {
    const job = this.requireJob(id);
    job.deletedAt = deletedAt;
    job.updatedAt = deletedAt;

    return ok({ ...job });
  }

  async markParsed(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<ReceiptParseJobRepository['markParsed']>[2],
  ) {
    const job = this.requireJob(id);
    job.completedAt = input.completedAt;
    job.lastErrorCategory = null;
    job.normalizedResult = input.normalizedResult;
    job.status = input.status;
    job.updatedAt = input.completedAt;

    return ok({ ...job });
  }

  async markRunning(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<ReceiptParseJobRepository['markRunning']>[2],
  ) {
    const job = this.requireJob(id);
    job.attemptCount = input.attemptCount;
    job.completedAt = null;
    job.lastErrorCategory = null;
    job.retryWindowStartedAt = input.retryWindowStartedAt;
    job.startedAt = input.startedAt;
    job.status = 'running';
    job.updatedAt = input.startedAt;

    return ok({ ...job });
  }

  async markSaved(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<ReceiptParseJobRepository['markSaved']>[2],
  ) {
    const job = this.requireJob(id);
    job.completedAt = job.completedAt ?? input.savedAt;
    job.lastErrorCategory = null;
    job.status = input.status;
    job.updatedAt = input.savedAt;

    return ok({ ...job });
  }

  private requireJob(id: string): ReceiptParseJob {
    const job = this.jobs.find((candidate) => candidate.id === id);

    if (!job) {
      throw new Error('missing fake job');
    }

    return job;
  }
}

function dependencies(
  repository: FakeReceiptParseJobRepository,
  options: {
    drafts?: CaptureDraft[];
    now?: () => Date;
    parser?: ReceiptParsingPort;
  } = {},
) {
  const captureDraftRepository: Pick<CaptureDraftRepository, 'listActiveDrafts'> = {
    async listActiveDrafts() {
      return ok(options.drafts ?? [receiptDraft()]);
    },
  };

  return {
    captureDraftRepository,
    createJobId: () => `job-${repository.jobs.length + 1}`,
    now: options.now ?? (() => fixedNow),
    parser: options.parser,
    receiptParseJobRepository: repository,
  };
}

describe('receipt parse job service', () => {
  it('creates a pending job for an active receipt draft', async () => {
    const repository = new FakeReceiptParseJobRepository();

    const started = await startReceiptParseJob(
      {
        receiptDraftId: 'draft-receipt',
      },
      dependencies(repository),
    );
    const latest = await getLatestReceiptParseJobForDraft(
      {
        receiptDraftId: 'draft-receipt',
      },
      dependencies(repository),
    );

    expect(started.ok).toBe(true);
    expect(latest.ok).toBe(true);
    if (started.ok && latest.ok) {
      expect(started.value.status).toBe('pending');
      expect(started.value.receiptDraftId).toBe('draft-receipt');
      expect(latest.value?.id).toBe(started.value.id);
    }
  });

  it('does not start parsing when the retained receipt image was deleted', async () => {
    const repository = new FakeReceiptParseJobRepository();
    const payload = markReceiptImageDeleted(
      buildReceiptCaptureDraftPayload({
        capturedAt: fixedNow.toISOString(),
        retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
        source: 'camera',
      }),
      {
        deletedAt: fixedNow.toISOString(),
        deletionReason: 'user_deleted',
      },
    );
    const result = await startReceiptParseJob(
      { receiptDraftId: 'draft-receipt' },
      dependencies(repository, {
        drafts: [receiptDraft('draft-receipt'), { ...receiptDraft('deleted-receipt'), payload: toCaptureDraftPayload(payload) }],
      }),
    );

    expect(result.ok).toBe(true);

    const deleted = await startReceiptParseJob(
      { receiptDraftId: 'deleted-receipt' },
      dependencies(repository, {
        drafts: [{ ...receiptDraft('deleted-receipt'), payload: toCaptureDraftPayload(payload) }],
      }),
    );

    expect(deleted.ok).toBe(false);
    if (!deleted.ok) {
      expect(deleted.error.recovery).toBe('manual_entry');
      expect(deleted.error.message).not.toContain('file://');
    }
  });

  it('uses the default noop parser as a manual fallback and records only an error category', async () => {
    const repository = new FakeReceiptParseJobRepository();
    const started = await startReceiptParseJob({ receiptDraftId: 'draft-receipt' }, dependencies(repository));

    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const result = await runReceiptParseJob({ jobId: started.value.id }, dependencies(repository));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('failed');
      expect(result.value.attemptCount).toBe(1);
      expect(result.value.lastErrorCategory).toBe('unavailable');
      expect(result.value.normalizedResult).toBeNull();
    }
  });

  it('stores normalized proposals from an injected parser without creating final expense records', async () => {
    const repository = new FakeReceiptParseJobRepository();
    const parser: ReceiptParsingPort = {
      parseReceiptDraft: jest.fn(async () => ok(parsedResult())),
    };
    const started = await startReceiptParseJob({ receiptDraftId: 'draft-receipt' }, dependencies(repository, { parser }));

    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const result = await runReceiptParseJob({ jobId: started.value.id }, dependencies(repository, { parser }));

    expect(result.ok).toBe(true);
    expect(parser.parseReceiptDraft).toHaveBeenCalledWith({
      imageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      receiptDraftId: 'draft-receipt',
    });
    if (result.ok) {
      expect(result.value.status).toBe('parsed');
      expect(result.value.normalizedResult?.merchant.value).toBe('Campus Market');
      expect(result.value.normalizedResult?.categoryId.value).toBe('category-food');
    }
  });

  it('marks low confidence parser output for user review', async () => {
    const repository = new FakeReceiptParseJobRepository();
    const parser: ReceiptParsingPort = {
      parseReceiptDraft: jest.fn(async () =>
        ok(
          parsedResult({
            totalMinor: {
              confidence: 'unknown',
              source: 'parsed',
            },
            unknownFields: ['total'],
          }),
        ),
      ),
    };
    const started = await startReceiptParseJob({ receiptDraftId: 'draft-receipt' }, dependencies(repository, { parser }));

    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const result = await runReceiptParseJob({ jobId: started.value.id }, dependencies(repository, { parser }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('low_confidence');
      expect(result.value.normalizedResult?.unknownFields).toEqual(['total']);
    }
  });

  it('caps automatic failures at three within a day and allows explicit user retry', async () => {
    const repository = new FakeReceiptParseJobRepository();
    let currentNow = fixedNow;
    const parser: ReceiptParsingPort = {
      parseReceiptDraft: jest.fn(async () =>
        err(createAppError('unavailable', 'Parser unavailable for test.', 'manual_entry')),
      ),
    };
    const deps = () =>
      dependencies(repository, {
        now: () => currentNow,
        parser,
      });
    const started = await startReceiptParseJob({ receiptDraftId: 'draft-receipt' }, deps());

    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }

    const automatic1 = await runReceiptParseJob({ jobId: started.value.id }, deps());
    currentNow = new Date('2026-05-08T01:00:00.000Z');
    const automatic2 = await runReceiptParseJob({ jobId: started.value.id }, deps());
    currentNow = new Date('2026-05-08T02:00:00.000Z');
    const automatic3 = await runReceiptParseJob({ jobId: started.value.id }, deps());
    currentNow = new Date('2026-05-08T03:00:00.000Z');
    const automatic4 = await runReceiptParseJob({ jobId: started.value.id }, deps());
    const manual = await runReceiptParseJob({ jobId: started.value.id, userInitiated: true }, deps());

    expect(automatic1.ok).toBe(true);
    expect(automatic2.ok).toBe(true);
    expect(automatic3.ok).toBe(true);
    expect(automatic4.ok).toBe(true);
    expect(manual.ok).toBe(true);
    if (automatic1.ok && automatic2.ok && automatic3.ok && automatic4.ok && manual.ok) {
      expect(automatic1.value.status).toBe('failed');
      expect(automatic2.value.attemptCount).toBe(2);
      expect(automatic3.value.status).toBe('retry_exhausted');
      expect(automatic4.value.attemptCount).toBe(3);
      expect(manual.value.attemptCount).toBe(1);
      expect(manual.value.status).toBe('failed');
    }
  });
});
