import { z } from 'zod';

import { createAppError } from '@/domain/common/app-error';
import { asLocalDate } from '@/domain/common/date-rules';
import { asEntityId, type EntityId } from '@/domain/common/ids';
import { err, ok, type AppResult } from '@/domain/common/result';
import { asWorkspaceId } from '@/domain/workspace/types';

import type {
  Reminder,
  ReminderException,
  ReminderFrequency,
  ReminderLocalTime,
  ReminderNotes,
  ReminderOccurrence,
  ReminderOwnerKind,
  ReminderPermissionStatus,
  ReminderScheduleState,
  ReminderScheduledNotification,
  ReminderTitle,
} from './types';

export const reminderDeliveryStateSchema = z.enum([
  'scheduled',
  'sent',
  'missed',
  'snoozed',
  'paused',
  'disabled',
  'dismissed',
  'complete',
]);

export const reminderOwnerKindSchema = z.enum(['standalone', 'task', 'task_recurrence']);
export const reminderFrequencySchema = z.enum(['once', 'daily', 'weekly', 'monthly']);
export const reminderPermissionStatusSchema = z.enum(['unknown', 'undetermined', 'granted', 'denied', 'unavailable']);
export const reminderScheduleStateSchema = z.enum([
  'scheduled',
  'snoozed',
  'paused',
  'disabled',
  'permission_denied',
  'unavailable',
  'failed',
  'local_only',
]);
export const reminderExceptionActionSchema = z.enum(['skip']);

export const maxReminderTitleLength = 120;
export const maxReminderNotesLength = 500;

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO timestamp.',
});

export const reminderRowSchema = z.object({
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  endsOnLocalDate: z.string().nullable(),
  frequency: reminderFrequencySchema,
  id: z.string().min(1),
  notes: z.string().nullable(),
  ownerKind: reminderOwnerKindSchema,
  permissionStatus: reminderPermissionStatusSchema,
  reminderLocalTime: z.string(),
  scheduleState: reminderScheduleStateSchema,
  source: z.literal('manual'),
  sourceOfTruth: z.literal('manual'),
  startsOnLocalDate: z.string(),
  taskId: z.string().nullable(),
  taskRecurrenceRuleId: z.string().nullable(),
  title: z.string(),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export const reminderExceptionRowSchema = z.object({
  action: reminderExceptionActionSchema,
  createdAt: isoTimestampSchema,
  id: z.string().min(1),
  occurrenceLocalDate: z.string(),
  reminderId: z.string().min(1),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export const reminderScheduledNotificationRowSchema = z.object({
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  deliveryState: reminderDeliveryStateSchema,
  fireAtLocal: z.string(),
  id: z.string().min(1),
  occurrenceLocalDate: z.string(),
  reminderId: z.string().min(1),
  scheduleAttemptedAt: isoTimestampSchema,
  scheduleErrorCategory: z.string().nullable(),
  scheduledNotificationId: z.string().min(1),
  updatedAt: isoTimestampSchema,
  workspaceId: z.string().min(1),
});

export type ReminderRow = z.infer<typeof reminderRowSchema>;
export type ReminderExceptionRow = z.infer<typeof reminderExceptionRowSchema>;
export type ReminderScheduledNotificationRow = z.infer<typeof reminderScheduledNotificationRowSchema>;

export function asReminderOwnerKind(value: string): AppResult<ReminderOwnerKind> {
  if (value === 'standalone' || value === 'task' || value === 'task_recurrence') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose standalone, task, or recurring task reminder owner.', 'edit'));
}

export function asReminderFrequency(value: string): AppResult<ReminderFrequency> {
  if (value === 'once' || value === 'daily' || value === 'weekly' || value === 'monthly') {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Choose one-time, daily, weekly, or monthly reminder frequency.', 'edit'));
}

export function asReminderPermissionStatus(value: string): AppResult<ReminderPermissionStatus> {
  if (
    value === 'unknown' ||
    value === 'undetermined' ||
    value === 'granted' ||
    value === 'denied' ||
    value === 'unavailable'
  ) {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Reminder permission status is invalid.', 'retry'));
}

export function asReminderScheduleState(value: string): AppResult<ReminderScheduleState> {
  if (
    value === 'scheduled' ||
    value === 'snoozed' ||
    value === 'paused' ||
    value === 'disabled' ||
    value === 'permission_denied' ||
    value === 'unavailable' ||
    value === 'failed' ||
    value === 'local_only'
  ) {
    return ok(value);
  }

  return err(createAppError('validation_failed', 'Reminder schedule state is invalid.', 'retry'));
}

export function asReminderTitle(value: string | null | undefined): AppResult<ReminderTitle> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return err(createAppError('validation_failed', 'Reminder title is required.', 'edit'));
  }

  if (normalized.length > maxReminderTitleLength) {
    return err(createAppError('validation_failed', `Reminder title must be ${maxReminderTitleLength} characters or fewer.`, 'edit'));
  }

  return ok(normalized as ReminderTitle);
}

export function asReminderNotes(value: string | null | undefined): AppResult<ReminderNotes | null> {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  if (normalized.length > maxReminderNotesLength) {
    return err(createAppError('validation_failed', `Reminder notes must be ${maxReminderNotesLength} characters or fewer.`, 'edit'));
  }

  return ok(normalized as ReminderNotes);
}

export function asOptionalReminderLocalDate(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return ok(null);
  }

  return asLocalDate(normalized);
}

export function asReminderLocalTime(value: string | null | undefined): AppResult<ReminderLocalTime> {
  const normalized = value?.trim() ?? '';
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);

  if (!match) {
    return err(createAppError('validation_failed', 'Reminder time must use HH:mm in 24-hour format.', 'edit'));
  }

  return ok(normalized as ReminderLocalTime);
}

export function asReminderFireAtLocal(value: string): AppResult<ReminderOccurrence['fireAtLocal']> {
  const [localDate, localTime] = value.split('T');

  if (!localDate || !localTime) {
    return err(createAppError('validation_failed', 'Reminder fire time must use YYYY-MM-DDTHH:mm format.', 'retry'));
  }

  const parsedDate = asLocalDate(localDate);
  const parsedTime = asReminderLocalTime(localTime);

  if (!parsedDate.ok) {
    return parsedDate;
  }

  if (!parsedTime.ok) {
    return parsedTime;
  }

  return ok(`${parsedDate.value}T${parsedTime.value}` as ReminderOccurrence['fireAtLocal']);
}

export function combineReminderFireAtLocal(localDate: string, localTime: string): AppResult<ReminderOccurrence['fireAtLocal']> {
  const parsedDate = asLocalDate(localDate);
  const parsedTime = asReminderLocalTime(localTime);

  if (!parsedDate.ok) {
    return parsedDate;
  }

  if (!parsedTime.ok) {
    return parsedTime;
  }

  return ok(`${parsedDate.value}T${parsedTime.value}` as ReminderOccurrence['fireAtLocal']);
}

function parseOptionalEntityId(value: string | null): AppResult<EntityId | null> {
  if (value === null) {
    return ok(null);
  }

  return asEntityId(value);
}

export function parseReminderRow(row: unknown): AppResult<Reminder> {
  const parsed = reminderRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local reminder data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const title = asReminderTitle(parsed.data.title);
  const notes = asReminderNotes(parsed.data.notes);
  const startsOnLocalDate = asLocalDate(parsed.data.startsOnLocalDate);
  const endsOnLocalDate = asOptionalReminderLocalDate(parsed.data.endsOnLocalDate);
  const reminderLocalTime = asReminderLocalTime(parsed.data.reminderLocalTime);
  const taskId = parseOptionalEntityId(parsed.data.taskId);
  const taskRecurrenceRuleId = parseOptionalEntityId(parsed.data.taskRecurrenceRuleId);

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

  if (!startsOnLocalDate.ok) {
    return startsOnLocalDate;
  }

  if (!endsOnLocalDate.ok) {
    return endsOnLocalDate;
  }

  if (endsOnLocalDate.value && endsOnLocalDate.value < startsOnLocalDate.value) {
    return err(createAppError('validation_failed', 'End date must be on or after the start date.', 'edit'));
  }

  if (!reminderLocalTime.ok) {
    return reminderLocalTime;
  }

  if (!taskId.ok) {
    return taskId;
  }

  if (!taskRecurrenceRuleId.ok) {
    return taskRecurrenceRuleId;
  }

  if (parsed.data.ownerKind === 'standalone' && (taskId.value !== null || taskRecurrenceRuleId.value !== null)) {
    return err(createAppError('validation_failed', 'Standalone reminders cannot have a task owner.', 'retry'));
  }

  if (parsed.data.ownerKind === 'task' && (!taskId.value || taskRecurrenceRuleId.value !== null)) {
    return err(createAppError('validation_failed', 'Task reminders need exactly one task owner.', 'retry'));
  }

  if (parsed.data.ownerKind === 'task_recurrence' && (!taskRecurrenceRuleId.value || taskId.value !== null)) {
    return err(createAppError('validation_failed', 'Recurring task reminders need exactly one recurring task owner.', 'retry'));
  }

  if (parsed.data.frequency === 'once' && endsOnLocalDate.value !== null) {
    return err(createAppError('validation_failed', 'One-time reminders cannot have an end date.', 'edit'));
  }

  return ok({
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    endsOnLocalDate: endsOnLocalDate.value,
    frequency: parsed.data.frequency,
    id: id.value,
    notes: notes.value,
    ownerKind: parsed.data.ownerKind,
    permissionStatus: parsed.data.permissionStatus,
    reminderLocalTime: reminderLocalTime.value,
    scheduleState: parsed.data.scheduleState,
    source: parsed.data.source,
    sourceOfTruth: parsed.data.sourceOfTruth,
    startsOnLocalDate: startsOnLocalDate.value,
    taskId: taskId.value,
    taskRecurrenceRuleId: taskRecurrenceRuleId.value,
    title: title.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseReminderExceptionRow(row: unknown): AppResult<ReminderException> {
  const parsed = reminderExceptionRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local reminder exception data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const reminderId = asEntityId(parsed.data.reminderId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const occurrenceLocalDate = asLocalDate(parsed.data.occurrenceLocalDate);

  if (!id.ok) {
    return id;
  }

  if (!reminderId.ok) {
    return reminderId;
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
    reminderId: reminderId.value,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}

export function parseReminderScheduledNotificationRow(row: unknown): AppResult<ReminderScheduledNotification> {
  const parsed = reminderScheduledNotificationRowSchema.safeParse(row);

  if (!parsed.success) {
    return err(createAppError('validation_failed', 'Local scheduled reminder data is invalid.', 'retry', parsed.error));
  }

  const id = asEntityId(parsed.data.id);
  const reminderId = asEntityId(parsed.data.reminderId);
  const workspaceId = asWorkspaceId(parsed.data.workspaceId);
  const occurrenceLocalDate = asLocalDate(parsed.data.occurrenceLocalDate);
  const fireAtLocal = asReminderFireAtLocal(parsed.data.fireAtLocal);

  if (!id.ok) {
    return id;
  }

  if (!reminderId.ok) {
    return reminderId;
  }

  if (!workspaceId.ok) {
    return workspaceId;
  }

  if (!occurrenceLocalDate.ok) {
    return occurrenceLocalDate;
  }

  if (!fireAtLocal.ok) {
    return fireAtLocal;
  }

  return ok({
    createdAt: parsed.data.createdAt,
    deletedAt: parsed.data.deletedAt,
    deliveryState: parsed.data.deliveryState,
    fireAtLocal: fireAtLocal.value,
    id: id.value,
    occurrenceLocalDate: occurrenceLocalDate.value,
    reminderId: reminderId.value,
    scheduleAttemptedAt: parsed.data.scheduleAttemptedAt,
    scheduleErrorCategory: parsed.data.scheduleErrorCategory,
    scheduledNotificationId: parsed.data.scheduledNotificationId,
    updatedAt: parsed.data.updatedAt,
    workspaceId: workspaceId.value,
  });
}
