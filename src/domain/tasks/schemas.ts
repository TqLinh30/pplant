import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asMoneyRecordTopicIds, asOptionalMoneyRecordCategoryId } from '@/domain/money/schemas';
import { asWorkspaceId } from '@/domain/workspace/types';

import type { Task, TaskNotes, TaskPriority, TaskState, TaskTitle } from './types';

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
