import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import { asRecurrenceFrequency } from '@/domain/recurrence/schemas';
import { asWorkspaceId } from '@/domain/workspace/types';

import { asOptionalTaskRecurrenceLocalDate, asTaskRecurrenceKind } from './task-recurrence';
import type {
  Task,
  TaskNotes,
  TaskPriority,
  TaskRecurrenceCompletion,
  TaskRecurrenceException,
  TaskRecurrenceRule,
  TaskState,
  TaskTitle,
} from './types';

export const taskStateSchema = z.enum(['todo', 'doing', 'done']);
export const taskPrioritySchema = z.enum(['high', 'low']);

export const maxTaskTitleLength = 120;
export const maxTaskNotesLength = 500;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const taskRowSchema = z.object({
  categoryId: z.string().nullable(),
  completedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  deadlineLocalDate: z.string().nullable(),
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  notes: z.string().nullable(),
  priority: taskPrioritySchema,
  source: z.literal('manual'),
  sourceOfTruth: z.literal('manual'),
  state: taskStateSchema,
  title: z.string(),
  updatedAt: isoTimestampSchema,
  userCorrectedAt: isoTimestampSchema.nullable(),
  workspaceId: z.string().min(1),
});

export type TaskRow = z.infer<typeof taskRowSchema>;

export const taskRecurrenceRuleRowSchema = z.object({
  categoryId: z.string().nullable(),
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  endsOnLocalDate: z.string().nullable(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  id: z.string().min(1),
  kind: z.enum(['task', 'habit']),
  notes: z.string().nullable(),
  pausedAt: isoTimestampSchema.nullable(),
  priority: taskPrioritySchema,
  source: z.literal('manual'),
  sourceOfTruth: z.literal('manual'),
  startsOnLocalDate: z.string(),
  stoppedAt: isoTimestampSchema.nullable(),
  stoppedOnLocalDate: z.string().nullable(),
  title: z.string(),
  updatedAt: isoTimestampSchema,
  userCorrectedAt: isoTimestampSchema.nullable(),
  workspaceId: z.string().min(1),
});

export const taskRecurrenceExceptionRowSchema = z.object({
  action: z.literal('skip'),
  createdAt: isoTimestampSchema,
  id: z.string().min(1),
  occurrenceLocalDate: z.string(),
  ruleId: z.string().min(1),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export const taskRecurrenceCompletionRowSchema = z.object({
  completedAt: isoTimestampSchema,
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  id: z.string().min(1),
  occurrenceLocalDate: z.string(),
  ruleId: z.string().min(1),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type TaskRecurrenceRuleRow = z.infer<typeof taskRecurrenceRuleRowSchema>;
export type TaskRecurrenceExceptionRow = z.infer<typeof taskRecurrenceExceptionRowSchema>;
export type TaskRecurrenceCompletionRow = z.infer<typeof taskRecurrenceCompletionRowSchema>;

export function asTaskState(value: string): AppResult<TaskState> {
  if (value === 'todo' || value === 'doing' || value === 'done') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose To Do, Doing, or Done.', 'edit'));
}

export function asTaskPriority(value: string): AppResult<TaskPriority> {
  if (value === 'high' || value === 'low') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose high or low priority.', 'edit'));
}

export function asTaskTitle(value: string | null | undefined): AppResult<TaskTitle> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Task title is required.', 'edit'));
  }

  if (normalized.length > maxTaskTitleLength) {
    return err(createAppError('validation_failed', `Task title must be ${maxTaskTitleLength} characters or fewer.`, 'edit'));
  }

  return ok(normalized as TaskTitle);
}

export function asTaskNotes(value: string | null | undefined): AppResult<TaskNotes | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  if (normalized.length > maxTaskNotesLength) {
    return err(createAppError('validation_failed', `Task notes must be ${maxTaskNotesLength} characters or fewer.`, 'edit'));
  }

  return ok(normalized as TaskNotes);
}

export function asOptionalTaskDeadline(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

export function parseTaskRow(row: unknown, topicIds: string[] = []): AppResult<Task> {
  const parsed = taskRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local task data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const title = asTaskTitle(parsed.data.title);
  const notes = asTaskNotes(parsed.data.notes);
  const deadlineLocalDate = asOptionalTaskDeadline(parsed.data.deadlineLocalDate);
  const categoryId = asOptionalMoneyRecordCategoryId(parsed.data.categoryId);
  const parsedTopicIds = asMoneyRecordTopicIds(topicIds);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!title.ok) {
    return title;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!deadlineLocalDate.ok) {
    return deadlineLocalDate;
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!parsedTopicIds.ok) {
    return parsedTopicIds;
  }

  if (parsed.data.state === 'done' && parsed.data.completedAt === null) {
    return err(createAppError('validation_failed', 'Done tasks need a completion timestamp.', 'retry'));
  }

  if (parsed.data.state !== 'done' && parsed.data.completedAt !== null) {
    return err(createAppError('validation_failed', 'Open tasks cannot have a completion timestamp.', 'retry'));
  }

  return ok({
    categoryId: categoryId.value,
    completedAt: parsed.data.completedAt,
    createdAt: parsed.data.createdAt,
    deadlineLocalDate: deadlineLocalDate.value,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    notes: notes.value,
    priority: parsed.data.priority,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    state: parsed.data.state,
    title: title.value,
    topicIds: parsedTopicIds.value as EntityId[],
    updatedAt: parsed.data.updatedAt,
    userCorrectedAt: parsed.data.userCorrectedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseTaskRecurrenceRuleRow(
  row: unknown,
  topicIds: string[] = [],
): AppResult<TaskRecurrenceRule> {
  const parsed = taskRecurrenceRuleRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local task recurrence rule data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const kind = asTaskRecurrenceKind(parsed.data.kind);
  const title = asTaskTitle(parsed.data.title);
  const notes = asTaskNotes(parsed.data.notes);
  const priority = asTaskPriority(parsed.data.priority);
  const frequency = asRecurrenceFrequency(parsed.data.frequency);
  const startsOnLocalDate = asLocalDate(parsed.data.startsOnLocalDate);
  const endsOnLocalDate = asOptionalTaskRecurrenceLocalDate(parsed.data.endsOnLocalDate);
  const stoppedOnLocalDate = asOptionalTaskRecurrenceLocalDate(parsed.data.stoppedOnLocalDate);
  const categoryId = asOptionalMoneyRecordCategoryId(parsed.data.categoryId);
  const parsedTopicIds = asMoneyRecordTopicIds(topicIds);

  if (!id.ok) {
    return id;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!kind.ok) {
    return kind;
  }

  if (!title.ok) {
    return title;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!priority.ok) {
    return priority;
  }

  if (!frequency.ok) {
    return frequency;
  }

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (endsOnLocalDate.value && endsOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'End date must be on or after the start date.', 'edit'));
  }

  if (!stoppedOnLocalDate.ok) {
    return stoppedOnLocalDate;
  }

  if (stoppedOnLocalDate.value && stoppedOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'Stop date must be on or after the start date.', 'edit'));
  }

  if ((parsed.data.stoppedAt === null) !== (stoppedOnLocalDate.value === null)) {
    return err(createAppError('validation_failed', 'Stopped series need both stop timestamp and stop date.', 'retry'));
  }

  if (!categoryId.ok) {
    return categoryId;
  }

  if (!parsedTopicIds.ok) {
    return parsedTopicIds;
  }

  return ok({
    categoryId: categoryId.value,
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: frequency.value,
    id: id.value,
    kind: kind.value,
    notes: notes.value,
    pausedAt: parsed.data.pausedAt,
    priority: priority.value,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    startsOnLocalDate: startsOnLocalDate.value,
    stoppedAt: parsed.data.stoppedAt,
    stoppedOnLocalDate: stoppedOnLocalDate.value,
    title: title.value,
    topicIds: parsedTopicIds.value as EntityId[],
    updatedAt: parsed.data.updatedAt,
    userCorrectedAt: parsed.data.userCorrectedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseTaskRecurrenceExceptionRow(row: unknown): AppResult<TaskRecurrenceException> {
  const parsed = taskRecurrenceExceptionRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local task recurrence exception data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const ruleId = asEntityId(parsed.data.ruleId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const occurrenceLocalDate = asLocalDate(parsed.data.occurrenceLocalDate);

  if (!id.ok) {
    return id;
  }

  if (!ruleId.ok) {
    return ruleId;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  return ok({
    action: parsed.data.action,
    createdAt: parsed.data.createdAt,
    id: id.value,
    occurrenceLocalDate: occurrenceLocalDate.value,
    ruleId: ruleId.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseTaskRecurrenceCompletionRow(row: unknown): AppResult<TaskRecurrenceCompletion> {
  const parsed = taskRecurrenceCompletionRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local task recurrence completion data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const ruleId = asEntityId(parsed.data.ruleId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const occurrenceLocalDate = asLocalDate(parsed.data.occurrenceLocalDate);

  if (!id.ok) {
    return id;
  }

  if (!ruleId.ok) {
    return ruleId;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  return ok({
    completedAt: parsed.data.completedAt,
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    id: id.value,
    occurrenceLocalDate: occurrenceLocalDate.value,
    ruleId: ruleId.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
