import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate, type LocalDate } from '@/domain/common/date-rules';
import { asEntityId } from '@/domain/common/ids';
import { err, isErr, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import {
  reflectionPeriodKinds,
  reflectionPromptIds,
  reflectionSourceOfTruths,
  reflectionSources,
  reflectionStates,
  type Reflection,
  type ReflectionPeriod,
  type ReflectionPromptId,
  type ReflectionRow,
  type SaveReflectionInput,
} from './types';

const maxPromptTextLength = 160;
const maxResponseTextLength = 1000;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

const reflectionPeriodKindSchema = z.enum(reflectionPeriodKinds);
const reflectionPromptIdSchema = z.enum(reflectionPromptIds);
const reflectionStateSchema = z.enum(reflectionStates);
const reflectionSourceSchema = z.enum(reflectionSources);
const reflectionSourceOfTruthSchema = z.enum(reflectionSourceOfTruths);

const rawPeriodSchema = z.object({
  endDateExclusive: z.string().min(1),
  kind: reflectionPeriodKindSchema,
  startDate: z.string().min(1),
});

const rawSaveReflectionInputSchema = z.object({
  id: z.string().min(1),
  period: rawPeriodSchema,
  promptId: reflectionPromptIdSchema,
  promptText: z.string().min(1).max(maxPromptTextLength),
  responseText: z.string().nullable().optional(),
  state: reflectionStateSchema,
  timestamp: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

const reflectionRowSchema = z.object({
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  periodEndDateExclusive: z.string().min(1),
  periodKind: reflectionPeriodKindSchema,
  periodStartDate: z.string().min(1),
  promptId: reflectionPromptIdSchema,
  promptText: z.string().min(1).max(maxPromptTextLength),
  responseText: z.string().nullable(),
  source: reflectionSourceSchema,
  sourceOfTruth: reflectionSourceOfTruthSchema,
  state: reflectionStateSchema,
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

function parsePeriod(input: {
  endDateExclusive: string;
  kind: (typeof reflectionPeriodKinds)[number];
  startDate: string;
}): AppResult<ReflectionPeriod> {
  const startDate = asLocalDate(input.startDate);
  const endDateExclusive = asLocalDate(input.endDateExclusive);

  if (isErr(startDate)) {
    return startDate;
  }

  if (isErr(endDateExclusive)) {
    return endDateExclusive;
  }

  if (startDate.value >= endDateExclusive.value) {
    return err(createAppError('validation_failed', 'Reflection period end must be after start.', 'edit'));
  }

  return ok({
    endDateExclusive: endDateExclusive.value,
    kind: input.kind,
    startDate: startDate.value,
  });
}

function normalizeResponseText(
  state: (typeof reflectionStates)[number],
  value: string | null | undefined,
): AppResult<string | null> {
  if (state === 'skipped') {
    return ok(null);
  }

  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Reflection answer cannot be empty.', 'edit'));
  }

  if (normalized.length > maxResponseTextLength) {
    return err(createAppError('validation_failed', 'Reflection answer is too long.', 'edit'));
  }

  return ok(normalized);
}

function normalizePromptText(value: string): string {
  return value.trim();
}

export function parseSaveReflectionInput(input: unknown): AppResult<SaveReflectionInput> {
  const parsed = rawSaveReflectionInputSchema.safeParse(input);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Reflection input is invalid.', 'edit', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const period = parsePeriod(parsed.data.period);
  const responseText = normalizeResponseText(parsed.data.state, parsed.data.responseText);
  const promptText = normalizePromptText(parsed.data.promptText);

  if (isErr(id)) {
    return id;
  }

  if (isErr(workspaceId)) {
    return workspaceId;
  }

  if (isErr(period)) {
    return period;
  }

  if (isErr(responseText)) {
    return responseText;
  }

  if (promptText.length === 0) {
    return err(createAppError('validation_failed', 'Reflection prompt cannot be empty.', 'edit'));
  }

  return ok({
    id: id.value,
    period: period.value,
    promptId: parsed.data.promptId,
    promptText,
    responseText: responseText.value,
    source: 'manual',
    sourceOfTruth: 'manual',
    state: parsed.data.state,
    timestamp: parsed.data.timestamp,
    workspaceId: workspaceId.value,
  });
}

export function parseReflectionRow(row: ReflectionRow): AppResult<Reflection> {
  const parsed = reflectionRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local reflection data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const period = parsePeriod({
    endDateExclusive: parsed.data.periodEndDateExclusive,
    kind: parsed.data.periodKind,
    startDate: parsed.data.periodStartDate,
  });
  const responseText = normalizeResponseText(parsed.data.state, parsed.data.responseText);

  if (isErr(id)) {
    return id;
  }

  if (isErr(workspaceId)) {
    return workspaceId;
  }

  if (isErr(period)) {
    return period;
  }

  if (isErr(responseText)) {
    return responseText;
  }

  return ok({
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    period: period.value,
    promptId: parsed.data.promptId as ReflectionPromptId,
    promptText: parsed.data.promptText,
    responseText: responseText.value,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    state: parsed.data.state,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function reflectionPeriodFromSummaryPeriod(input: {
  endDateExclusive: LocalDate;
  kind: 'month' | 'week';
  startDate: LocalDate;
}): ReflectionPeriod {
  return {
    endDateExclusive: input.endDateExclusive,
    kind: input.kind,
    startDate: input.startDate,
  };
}
