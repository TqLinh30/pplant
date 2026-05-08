import { openPplantDatabase, type PplantDatabase } from '@/data/db/client';
import {
  migrateDatabase,
  type MigrationDatabase,
  type MigrationReport,
} from '@/data/db/migrations/migrate';
import {
  createCaptureDraftRepository,
  type CaptureDraftRepository,
} from '@/data/repositories/capture-drafts.repository';
import {
  createReceiptParseJobRepository,
  type ReceiptParseJobRepository,
} from '@/data/repositories/receipt-parse-jobs.repository';
import { createAppError } from '@/domain/common/app-error';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import { hasLowConfidenceFields } from '@/domain/receipts/normalize-parse-result';
import {
  evaluateReceiptParseRetry,
  receiptParseFailureStatus,
} from '@/domain/receipts/retry-policy';
import { parseNormalizedReceiptParseResult } from '@/domain/receipts/schemas';
import type { NormalizedReceiptParseResult, ReceiptParseJob } from '@/domain/receipts/types';
import {
  isReceiptCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
  receiptDraftHasRetainedImage,
} from '@/features/capture-drafts/captureDraftPayloads';
import { localWorkspaceId } from '@/domain/workspace/types';

import { noopReceiptParser } from './noop-receipt-parser';
import type { ReceiptParsingPort } from './receipt-parsing.port';

export type StartReceiptParseJobRequest = {
  receiptDraftId: string;
};

export type RunReceiptParseJobRequest = {
  jobId: string;
  userInitiated?: boolean;
};

export type ReceiptParseJobServiceDependencies = {
  captureDraftRepository?: Pick<CaptureDraftRepository, 'listActiveDrafts'>;
  createCaptureDraftRepository?: (database: unknown) => Pick<CaptureDraftRepository, 'listActiveDrafts'>;
  createJobId?: () => string;
  createReceiptParseJobRepository?: (database: unknown) => ReceiptParseJobRepository;
  migrateDatabase?: (database: unknown, now: Date) => Promise<AppResult<MigrationReport>>;
  now?: () => Date;
  openDatabase?: () => unknown;
  parser?: ReceiptParsingPort;
  receiptParseJobRepository?: ReceiptParseJobRepository;
};

type PreparedReceiptParseJobAccess = {
  captureDraftRepository: Pick<CaptureDraftRepository, 'listActiveDrafts'>;
  now: Date;
  receiptParseJobRepository: ReceiptParseJobRepository;
};

type ReceiptDraftForParsing = {
  draft: CaptureDraft;
  retainedImageUri: string;
};

function defaultCreateJobId(): string {
  return `receipt-parse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function prepareReceiptParseJobAccess({
  captureDraftRepository,
  createCaptureDraftRepository: createCaptureDraftRepositoryDependency = (database) =>
    createCaptureDraftRepository(database as PplantDatabase),
  createReceiptParseJobRepository: createReceiptParseJobRepositoryDependency = (database) =>
    createReceiptParseJobRepository(database as PplantDatabase),
  migrateDatabase: migrateDatabaseDependency = (database, now) =>
    migrateDatabase(database as MigrationDatabase, now),
  now: nowDependency = () => new Date(),
  openDatabase: openDatabaseDependency = openPplantDatabase,
  receiptParseJobRepository,
}: ReceiptParseJobServiceDependencies = {}): Promise<AppResult<PreparedReceiptParseJobAccess>> {
  const now = nowDependency();

  if (captureDraftRepository && receiptParseJobRepository) {
    return ok({
      captureDraftRepository,
      now,
      receiptParseJobRepository,
    });
  }

  let database: unknown;

  try {
    database = openDatabaseDependency();
  } catch (cause) {
    return err(createAppError('unavailable', 'Local receipt parsing data could not be opened.', 'retry', cause));
  }

  const migrationResult = await migrateDatabaseDependency(database, now);

  if (isErr(migrationResult)) {
    return migrationResult;
  }

  return ok({
    captureDraftRepository: captureDraftRepository ?? createCaptureDraftRepositoryDependency(database),
    now,
    receiptParseJobRepository:
      receiptParseJobRepository ?? createReceiptParseJobRepositoryDependency(database),
  });
}

async function findReceiptDraftForParsing(
  access: PreparedReceiptParseJobAccess,
  receiptDraftId: string,
): Promise<AppResult<ReceiptDraftForParsing>> {
  const parsedId = asEntityId(receiptDraftId);

  if (!parsedId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt draft.', 'edit', parsedId.error));
  }

  const activeDrafts = await access.captureDraftRepository.listActiveDrafts(localWorkspaceId);

  if (isErr(activeDrafts)) {
    return activeDrafts;
  }

  const draft = activeDrafts.value.find(
    (candidate) => candidate.id === parsedId.value && candidate.kind === 'expense',
  );

  if (!draft || !isReceiptCaptureDraftPayload(draft.payload)) {
    return err(createAppError('not_found', 'Receipt draft is no longer active.', 'manual_entry'));
  }

  const payload = parseReceiptCaptureDraftPayload(draft.payload);

  if (isErr(payload)) {
    return payload;
  }

  if (!receiptDraftHasRetainedImage(payload.value)) {
    return err(createAppError('validation_failed', 'Receipt image is no longer retained. Manual expense entry remains available.', 'manual_entry'));
  }

  const retainedImageUri = payload.value.receipt.retainedImageUri;

  if (retainedImageUri === null) {
    return err(createAppError('validation_failed', 'Receipt image is no longer retained. Manual expense entry remains available.', 'manual_entry'));
  }

  return ok({
    draft,
    retainedImageUri,
  });
}

async function parseWithPort(
  parser: ReceiptParsingPort,
  request: { imageUri: string; receiptDraftId: string },
): Promise<AppResult<NormalizedReceiptParseResult>> {
  try {
    return await parser.parseReceiptDraft(request);
  } catch {
    return err(createAppError('unavailable', 'Receipt parsing did not finish.', 'manual_entry'));
  }
}

export async function startReceiptParseJob(
  input: StartReceiptParseJobRequest,
  dependencies: ReceiptParseJobServiceDependencies = {},
): Promise<AppResult<ReceiptParseJob>> {
  const access = await prepareReceiptParseJobAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const receiptDraft = await findReceiptDraftForParsing(access.value, input.receiptDraftId);

  if (isErr(receiptDraft)) {
    return receiptDraft;
  }

  const jobId = asEntityId((dependencies.createJobId ?? defaultCreateJobId)());

  if (!jobId.ok) {
    return err(createAppError('validation_failed', 'Receipt parse job id was invalid.', 'retry', jobId.error));
  }

  return access.value.receiptParseJobRepository.createPendingJob({
    id: jobId.value,
    receiptDraftId: receiptDraft.value.draft.id,
    requestedAt: access.value.now.toISOString(),
    workspaceId: localWorkspaceId,
  });
}

export async function getLatestReceiptParseJobForDraft(
  input: StartReceiptParseJobRequest,
  dependencies: ReceiptParseJobServiceDependencies = {},
): Promise<AppResult<ReceiptParseJob | null>> {
  const receiptDraftId = asEntityId(input.receiptDraftId);

  if (!receiptDraftId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt draft.', 'edit', receiptDraftId.error));
  }

  const access = await prepareReceiptParseJobAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  return access.value.receiptParseJobRepository.getLatestJobForDraft(
    localWorkspaceId,
    receiptDraftId.value,
  );
}

export async function runReceiptParseJob(
  input: RunReceiptParseJobRequest,
  dependencies: ReceiptParseJobServiceDependencies = {},
): Promise<AppResult<ReceiptParseJob>> {
  const jobId = asEntityId(input.jobId);

  if (!jobId.ok) {
    return err(createAppError('validation_failed', 'Choose a valid receipt parse job.', 'edit', jobId.error));
  }

  const access = await prepareReceiptParseJobAccess(dependencies);

  if (isErr(access)) {
    return access;
  }

  const job = await access.value.receiptParseJobRepository.getJobById(localWorkspaceId, jobId.value);

  if (isErr(job)) {
    return job;
  }

  if (!job.value) {
    return err(createAppError('not_found', 'Receipt parse job was not found.', 'retry'));
  }

  if (
    job.value.status === 'parsed' ||
    job.value.status === 'low_confidence' ||
    job.value.status === 'reviewed' ||
    job.value.status === 'saved' ||
    job.value.status === 'running'
  ) {
    return ok(job.value);
  }

  if (job.value.status === 'retry_exhausted' && !input.userInitiated) {
    return ok(job.value);
  }

  const receiptDraft = await findReceiptDraftForParsing(access.value, job.value.receiptDraftId);

  if (isErr(receiptDraft)) {
    return receiptDraft;
  }

  const retryDecision = evaluateReceiptParseRetry(
    {
      attemptCount: job.value.attemptCount,
      retryWindowStartedAt: job.value.retryWindowStartedAt,
    },
    access.value.now,
    { userInitiated: input.userInitiated },
  );

  if (!retryDecision.allowed) {
    return access.value.receiptParseJobRepository.markFailed(localWorkspaceId, job.value.id, {
      completedAt: access.value.now.toISOString(),
      lastErrorCategory: job.value.lastErrorCategory ?? 'unavailable',
      status: 'retry_exhausted',
    });
  }

  const timestamp = access.value.now.toISOString();
  const running = await access.value.receiptParseJobRepository.markRunning(localWorkspaceId, job.value.id, {
    attemptCount: retryDecision.nextAttemptCount,
    retryWindowStartedAt: retryDecision.nextRetryWindowStartedAt,
    startedAt: timestamp,
  });

  if (isErr(running)) {
    return running;
  }

  const parsed = await parseWithPort(dependencies.parser ?? noopReceiptParser, {
    imageUri: receiptDraft.value.retainedImageUri,
    receiptDraftId: receiptDraft.value.draft.id,
  });

  if (isErr(parsed)) {
    return access.value.receiptParseJobRepository.markFailed(localWorkspaceId, job.value.id, {
      completedAt: access.value.now.toISOString(),
      lastErrorCategory: parsed.error.code,
      status: receiptParseFailureStatus(retryDecision.nextAttemptCount),
    });
  }

  const normalized = parseNormalizedReceiptParseResult(parsed.value);

  if (isErr(normalized)) {
    return access.value.receiptParseJobRepository.markFailed(localWorkspaceId, job.value.id, {
      completedAt: access.value.now.toISOString(),
      lastErrorCategory: 'validation_failed',
      status: receiptParseFailureStatus(retryDecision.nextAttemptCount),
    });
  }

  return access.value.receiptParseJobRepository.markParsed(localWorkspaceId, job.value.id, {
    completedAt: access.value.now.toISOString(),
    normalizedResult: normalized.value,
    status: hasLowConfidenceFields(normalized.value) ? 'low_confidence' : 'parsed',
  });
}
