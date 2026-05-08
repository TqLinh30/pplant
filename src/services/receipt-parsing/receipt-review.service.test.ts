import type { CaptureDraftRepository } from '@/data/repositories/capture-drafts.repository';
import type { CategoryTopicRepository } from '@/data/repositories/category-topic.repository';
import type { MoneyRecordRepository } from '@/data/repositories/money-records.repository';
import type { ReceiptParseJobRepository } from '@/data/repositories/receipt-parse-jobs.repository';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { createAppError } from '@/domain/common/app-error';
import type { EntityId } from '@/domain/common/ids';
import { err, ok } from '@/domain/common/result';
import type { CurrencyCode } from '@/domain/common/money';
import type { LocalDate } from '@/domain/common/date-rules';
import type { MoneyRecord } from '@/domain/money/types';
import type { UserPreferences } from '@/domain/preferences/types';
import type { NormalizedReceiptParseResult, ReceiptParseJob } from '@/domain/receipts/types';
import {
  buildReceiptCaptureDraftPayload,
  toCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId, type WorkspaceId } from '@/domain/workspace/types';

import {
  loadReceiptReviewData,
  saveCorrectedReceiptExpense,
  type ReceiptReviewServiceDependencies,
} from './receipt-review.service';

const fixedNow = new Date('2026-05-08T12:00:00.000Z');

function parsedResult(overrides: Partial<NormalizedReceiptParseResult> = {}): NormalizedReceiptParseResult {
  return {
    categoryId: { confidence: 'medium', source: 'estimated', value: 'category-food' },
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
    topicIds: { confidence: 'medium', source: 'estimated', value: ['topic-food'] },
    totalMinor: { confidence: 'high', source: 'parsed', value: 1200 },
    unknownFields: [],
    ...overrides,
  };
}

function receiptDraft(overrides: Partial<CaptureDraft> = {}): CaptureDraft {
  return {
    createdAt: fixedNow.toISOString(),
    discardedAt: null,
    id: 'draft-receipt' as EntityId,
    kind: 'expense',
    lastSavedAt: fixedNow.toISOString(),
    payload: toCaptureDraftPayload(
      buildReceiptCaptureDraftPayload({
        capturedAt: fixedNow.toISOString(),
        originalFileName: 'receipt.jpg',
        retainedImageUri: 'file:///private/receipt.jpg',
        source: 'camera',
      }),
    ),
    savedAt: null,
    savedRecordId: null,
    savedRecordKind: null,
    status: 'active',
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
    ...overrides,
  };
}

function receiptJob(
  status: ReceiptParseJob['status'] = 'parsed',
  result: NormalizedReceiptParseResult | null = parsedResult(),
): ReceiptParseJob {
  return {
    attemptCount: 1,
    completedAt: fixedNow.toISOString(),
    createdAt: fixedNow.toISOString(),
    deletedAt: null,
    id: 'job-receipt' as EntityId,
    lastErrorCategory: null,
    normalizedResult: result,
    receiptDraftId: 'draft-receipt' as EntityId,
    requestedAt: fixedNow.toISOString(),
    retryWindowStartedAt: null,
    startedAt: fixedNow.toISOString(),
    status,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

function preferences(): UserPreferences {
  return {
    createdAt: fixedNow.toISOString(),
    currencyCode: 'USD' as CurrencyCode,
    defaultHourlyWage: {
      amountMinor: 1500,
      currency: 'USD' as CurrencyCode,
    },
    locale: 'en-US' as never,
    monthlyBudgetResetDay: 1 as never,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

function categoryTopic(id: string, kind: CategoryTopicKind, name: string): CategoryTopicItem {
  return {
    archivedAt: null,
    createdAt: fixedNow.toISOString(),
    id: id as EntityId,
    kind,
    name: name as never,
    sortOrder: 1,
    updatedAt: fixedNow.toISOString(),
    workspaceId: localWorkspaceId,
  };
}

class FakeCaptureDraftRepository implements Pick<CaptureDraftRepository, 'listActiveDrafts' | 'markDraftSaved'> {
  constructor(public drafts: CaptureDraft[] = [receiptDraft()]) {}

  async listActiveDrafts() {
    return ok(this.drafts.filter((draft) => draft.status === 'active').map((draft) => ({ ...draft })));
  }

  async markDraftSaved(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<CaptureDraftRepository['markDraftSaved']>[2],
  ) {
    const draft = this.drafts.find((candidate) => candidate.id === id && candidate.status === 'active');

    if (!draft) {
      return err(createAppError('not_found', 'Capture draft was not found.', 'edit'));
    }

    draft.status = 'saved';
    draft.savedAt = input.savedAt;
    draft.savedRecordKind = input.savedRecordKind;
    draft.savedRecordId = input.savedRecordId;
    draft.updatedAt = input.savedAt;

    return ok({ ...draft });
  }
}

class FakeReceiptParseJobRepository implements ReceiptParseJobRepository {
  constructor(public jobs: ReceiptParseJob[] = [receiptJob()]) {}

  async createPendingJob(_input: Parameters<ReceiptParseJobRepository['createPendingJob']>[0]) {
    return err(createAppError('unavailable', 'Not used in receipt review tests.', 'none'));
  }

  async getJobById(_workspaceId: WorkspaceId, id: EntityId) {
    const job = this.jobs.find((candidate) => candidate.id === id && candidate.deletedAt === null);

    return ok(job ? { ...job } : null);
  }

  async getLatestJobForDraft(_workspaceId: WorkspaceId, receiptDraftId: EntityId) {
    const job = this.jobs.find(
      (candidate) => candidate.receiptDraftId === receiptDraftId && candidate.deletedAt === null,
    );

    return ok(job ? { ...job } : null);
  }

  async listPendingOrRetryableJobs() {
    return ok([]);
  }

  async markFailed(
    _workspaceId: WorkspaceId,
    _id: EntityId,
    _input: Parameters<ReceiptParseJobRepository['markFailed']>[2],
  ) {
    return err(createAppError('unavailable', 'Not used in receipt review tests.', 'none'));
  }

  async markParsed(
    _workspaceId: WorkspaceId,
    _id: EntityId,
    _input: Parameters<ReceiptParseJobRepository['markParsed']>[2],
  ) {
    return err(createAppError('unavailable', 'Not used in receipt review tests.', 'none'));
  }

  async markRunning(
    _workspaceId: WorkspaceId,
    _id: EntityId,
    _input: Parameters<ReceiptParseJobRepository['markRunning']>[2],
  ) {
    return err(createAppError('unavailable', 'Not used in receipt review tests.', 'none'));
  }

  async markSaved(
    _workspaceId: WorkspaceId,
    id: EntityId,
    input: Parameters<ReceiptParseJobRepository['markSaved']>[2],
  ) {
    const job = this.jobs.find((candidate) => candidate.id === id);

    if (!job) {
      return err(createAppError('not_found', 'Receipt parse job was not found.', 'retry'));
    }

    job.status = input.status;
    job.completedAt = job.completedAt ?? input.savedAt;
    job.lastErrorCategory = null;
    job.updatedAt = input.savedAt;

    return ok({ ...job });
  }
}

class FakeCategoryTopicRepository implements Pick<CategoryTopicRepository, 'findItem' | 'listItems'> {
  constructor(
    public categories: CategoryTopicItem[] = [categoryTopic('category-food', 'category', 'Food')],
    public topics: CategoryTopicItem[] = [categoryTopic('topic-food', 'topic', 'Food topic')],
  ) {}

  async findItem(kind: CategoryTopicKind, _workspaceId: WorkspaceId, id: EntityId) {
    const collection = kind === 'category' ? this.categories : this.topics;

    return ok(collection.find((item) => item.id === id) ?? null);
  }

  async listItems(kind: CategoryTopicKind) {
    return ok((kind === 'category' ? this.categories : this.topics).filter((item) => item.archivedAt === null));
  }
}

class FakeMoneyRecordRepository implements Pick<MoneyRecordRepository, 'createManualRecord'> {
  records: MoneyRecord[] = [];

  async createManualRecord(input: Parameters<MoneyRecordRepository['createManualRecord']>[0]) {
    const record: MoneyRecord = {
      amountMinor: input.amountMinor,
      categoryId: (input.categoryId ?? null) as EntityId | null,
      createdAt: input.createdAt,
      currencyCode: input.currencyCode as CurrencyCode,
      deletedAt: input.deletedAt ?? null,
      id: input.id as EntityId,
      kind: input.kind,
      localDate: input.localDate as LocalDate,
      merchantOrSource: input.merchantOrSource as MoneyRecord['merchantOrSource'],
      note: input.note as MoneyRecord['note'],
      recurrenceOccurrenceDate: null,
      recurrenceRuleId: null,
      source: input.source,
      sourceOfTruth: input.sourceOfTruth,
      topicIds: input.topicIds as EntityId[],
      updatedAt: input.updatedAt,
      userCorrectedAt: input.userCorrectedAt ?? null,
      workspaceId: input.workspaceId as WorkspaceId,
    };

    this.records.push(record);

    return ok(record);
  }
}

function dependencies(options: {
  captureDraftRepository?: FakeCaptureDraftRepository;
  categoryTopicRepository?: FakeCategoryTopicRepository;
  moneyRecordRepository?: FakeMoneyRecordRepository;
  preferencesValue?: UserPreferences | null;
  receiptParseJobRepository?: FakeReceiptParseJobRepository;
} = {}): ReceiptReviewServiceDependencies {
  const preferencesValue = options.preferencesValue === undefined ? preferences() : options.preferencesValue;

  return {
    captureDraftRepository: options.captureDraftRepository ?? new FakeCaptureDraftRepository(),
    categoryTopicRepository: options.categoryTopicRepository ?? new FakeCategoryTopicRepository(),
    createMoneyRecordId: () => 'money-from-receipt',
    moneyRecordRepository: options.moneyRecordRepository ?? new FakeMoneyRecordRepository(),
    now: () => fixedNow,
    preferencesRepository: {
      async loadPreferences() {
        return ok(preferencesValue);
      },
    },
    receiptParseJobRepository: options.receiptParseJobRepository ?? new FakeReceiptParseJobRepository(),
  };
}

describe('receipt review service', () => {
  it('loads review data from an active receipt draft and parsed job', async () => {
    const result = await loadReceiptReviewData({ receiptDraftId: 'draft-receipt' }, dependencies());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.reviewDraft.merchant).toBe('Campus Market');
      expect(result.value.reviewDraft.totalAmount).toBe('12.00');
      expect(result.value.categories).toHaveLength(1);
      expect(result.value.topics).toHaveLength(1);
    }
  });

  it('saves a corrected receipt as a receipt-sourced manual source-of-truth expense', async () => {
    const moneyRepository = new FakeMoneyRecordRepository();
    const captureRepository = new FakeCaptureDraftRepository();
    const jobRepository = new FakeReceiptParseJobRepository();
    const loaded = await loadReceiptReviewData(
      { receiptDraftId: 'draft-receipt' },
      dependencies({ captureDraftRepository: captureRepository, moneyRecordRepository: moneyRepository, receiptParseJobRepository: jobRepository }),
    );

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const result = await saveCorrectedReceiptExpense(
      {
        parseJobId: loaded.value.parseJob.id,
        receiptDraftId: loaded.value.draft.id,
        reviewDraft: {
          ...loaded.value.reviewDraft,
          merchant: 'Campus Store',
          totalAmount: '15.25',
        },
      },
      dependencies({ captureDraftRepository: captureRepository, moneyRecordRepository: moneyRepository, receiptParseJobRepository: jobRepository }),
    );

    expect(result.ok).toBe(true);
    expect(moneyRepository.records).toHaveLength(1);
    if (result.ok) {
      expect(result.value.record.amountMinor).toBe(1525);
      expect(result.value.record.source).toBe('receipt');
      expect(result.value.record.sourceOfTruth).toBe('manual');
      expect(result.value.record.userCorrectedAt).toBe(fixedNow.toISOString());
      expect(result.value.draft.status).toBe('saved');
      expect(result.value.draft.savedRecordKind).toBe('money_record');
      expect(result.value.draft.savedRecordId).toBe(result.value.record.id);
      expect(result.value.parseJob.status).toBe('saved');
      expect(result.value.parseJob.normalizedResult?.merchant.value).toBe('Campus Market');
    }
  });

  it('allows total-only save when line items are ignored', async () => {
    const moneyRepository = new FakeMoneyRecordRepository();
    const loaded = await loadReceiptReviewData(
      { receiptDraftId: 'draft-receipt' },
      dependencies({ moneyRecordRepository: moneyRepository }),
    );

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const result = await saveCorrectedReceiptExpense(
      {
        parseJobId: loaded.value.parseJob.id,
        receiptDraftId: loaded.value.draft.id,
        reviewDraft: {
          ...loaded.value.reviewDraft,
          ignoreLineItems: true,
          lineItems: [{ amount: 'not money', id: 'line-1', ignored: false, label: 'Long description' }],
        },
      },
      dependencies({ moneyRecordRepository: moneyRepository }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ignoredLineItems).toBe(true);
      expect(result.value.record.amountMinor).toBe(1200);
    }
  });

  it('rejects unreviewable parse states without creating a money record', async () => {
    const moneyRepository = new FakeMoneyRecordRepository();
    const result = await saveCorrectedReceiptExpense(
      {
        parseJobId: 'job-receipt',
        receiptDraftId: 'draft-receipt',
        reviewDraft: {
          categoryId: null,
          currency: 'USD',
          ignoreLineItems: true,
          lineItems: [],
          localDate: '2026-05-08',
          merchant: '',
          note: '',
          topicIds: [],
          totalAmount: '12.00',
        },
      },
      dependencies({
        moneyRecordRepository: moneyRepository,
        receiptParseJobRepository: new FakeReceiptParseJobRepository([receiptJob('failed', null)]),
      }),
    );

    expect(result.ok).toBe(false);
    expect(moneyRepository.records).toHaveLength(0);
    if (!result.ok) {
      expect(result.error.message).not.toContain('file:///private/receipt.jpg');
      expect(result.error.code).toBe('validation_failed');
    }
  });

  it('returns field errors for invalid corrected receipt input', async () => {
    const moneyRepository = new FakeMoneyRecordRepository();
    const loaded = await loadReceiptReviewData(
      { receiptDraftId: 'draft-receipt' },
      dependencies({ moneyRecordRepository: moneyRepository }),
    );

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const result = await saveCorrectedReceiptExpense(
      {
        parseJobId: loaded.value.parseJob.id,
        receiptDraftId: loaded.value.draft.id,
        reviewDraft: {
          ...loaded.value.reviewDraft,
          totalAmount: '0',
        },
      },
      dependencies({ moneyRecordRepository: moneyRepository }),
    );

    expect(result.ok).toBe(false);
    expect(moneyRepository.records).toHaveLength(0);
    if (!result.ok) {
      expect(result.fieldErrors?.totalAmount).toBeTruthy();
    }
  });
});
