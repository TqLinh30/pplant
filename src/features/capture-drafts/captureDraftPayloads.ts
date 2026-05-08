import type { CaptureDraftKind, CaptureDraftPayload } from '@/domain/capture-drafts/types';
import type { MoneyRecordKind } from '@/domain/money/types';
import type { ReminderFrequency, ReminderOwnerKind } from '@/domain/reminders/types';
import type { TaskPriority, TaskState } from '@/domain/tasks/types';
import type { WorkEntryMode } from '@/domain/work/types';

export type MoneyCaptureDraftPayload = {
  amount: string;
  categoryId: string | null;
  kind: MoneyRecordKind;
  localDate: string;
  merchantOrSource: string;
  note: string;
  topicIds: string[];
};

export type TaskCaptureDraftPayload = {
  categoryId: string | null;
  deadlineLocalDate: string;
  notes: string;
  priority: TaskPriority;
  state: TaskState;
  title: string;
  topicIds: string[];
};

export type ReminderCaptureDraftPayload = {
  endsOnLocalDate: string;
  frequency: ReminderFrequency;
  notes: string;
  ownerKind: ReminderOwnerKind;
  reminderLocalTime: string;
  skipLocalDate: string;
  startsOnLocalDate: string;
  taskId: string | null;
  taskRecurrenceRuleId: string | null;
  title: string;
};

export type WorkCaptureDraftPayload = {
  breakMinutes: string;
  categoryId: string | null;
  durationHours: string;
  endedAtLocalDate: string;
  endedAtLocalTime: string;
  entryMode: WorkEntryMode;
  localDate: string;
  note: string;
  paid: boolean;
  startedAtLocalDate: string;
  startedAtLocalTime: string;
  topicIds: string[];
  wageOverride: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown, fallback: string | null = null): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasTopicsOrCategory(draft: { categoryId: string | null; topicIds: string[] }): boolean {
  return draft.categoryId !== null || draft.topicIds.length > 0;
}

export function isMoneyCaptureDraftMeaningful(
  draft: MoneyCaptureDraftPayload,
  defaultDraft: MoneyCaptureDraftPayload,
): boolean {
  return (
    hasText(draft.amount) ||
    hasText(draft.merchantOrSource) ||
    hasText(draft.note) ||
    hasTopicsOrCategory(draft) ||
    draft.localDate !== defaultDraft.localDate
  );
}

export function isTaskCaptureDraftMeaningful(
  draft: TaskCaptureDraftPayload,
  defaultDraft: TaskCaptureDraftPayload,
): boolean {
  return (
    hasText(draft.title) ||
    hasText(draft.notes) ||
    hasText(draft.deadlineLocalDate) ||
    hasTopicsOrCategory(draft) ||
    draft.priority !== defaultDraft.priority ||
    draft.state !== defaultDraft.state
  );
}

export function isReminderCaptureDraftMeaningful(
  draft: ReminderCaptureDraftPayload,
  defaultDraft: ReminderCaptureDraftPayload,
): boolean {
  return (
    hasText(draft.title) ||
    hasText(draft.notes) ||
    hasText(draft.endsOnLocalDate) ||
    hasText(draft.skipLocalDate) ||
    draft.frequency !== defaultDraft.frequency ||
    draft.ownerKind !== defaultDraft.ownerKind ||
    draft.reminderLocalTime !== defaultDraft.reminderLocalTime ||
    draft.startsOnLocalDate !== defaultDraft.startsOnLocalDate ||
    draft.taskId !== defaultDraft.taskId ||
    draft.taskRecurrenceRuleId !== defaultDraft.taskRecurrenceRuleId
  );
}

export function isWorkCaptureDraftMeaningful(
  draft: WorkCaptureDraftPayload,
  defaultDraft: WorkCaptureDraftPayload,
): boolean {
  return (
    hasText(draft.durationHours) ||
    hasText(draft.startedAtLocalTime) ||
    hasText(draft.endedAtLocalTime) ||
    hasText(draft.wageOverride) ||
    hasText(draft.note) ||
    hasTopicsOrCategory(draft) ||
    draft.breakMinutes !== defaultDraft.breakMinutes ||
    draft.endedAtLocalDate !== defaultDraft.endedAtLocalDate ||
    draft.entryMode !== defaultDraft.entryMode ||
    draft.localDate !== defaultDraft.localDate ||
    draft.paid !== defaultDraft.paid ||
    draft.startedAtLocalDate !== defaultDraft.startedAtLocalDate
  );
}

export function toCaptureDraftPayload<TDraft extends CaptureDraftPayload>(draft: TDraft): CaptureDraftPayload {
  return JSON.parse(JSON.stringify(draft)) as CaptureDraftPayload;
}

export function parseMoneyCaptureDraftPayload(
  kind: Extract<CaptureDraftKind, 'expense' | 'income'>,
  payload: CaptureDraftPayload,
  defaultDraft: MoneyCaptureDraftPayload,
): MoneyCaptureDraftPayload {
  if (!isRecord(payload)) {
    return { ...defaultDraft, kind };
  }

  return {
    amount: asString(payload.amount, defaultDraft.amount),
    categoryId: asNullableString(payload.categoryId, defaultDraft.categoryId),
    kind,
    localDate: asString(payload.localDate, defaultDraft.localDate),
    merchantOrSource: asString(payload.merchantOrSource, defaultDraft.merchantOrSource),
    note: asString(payload.note, defaultDraft.note),
    topicIds: asStringArray(payload.topicIds),
  };
}

export function parseTaskCaptureDraftPayload(
  payload: CaptureDraftPayload,
  defaultDraft: TaskCaptureDraftPayload,
): TaskCaptureDraftPayload {
  if (!isRecord(payload)) {
    return defaultDraft;
  }

  const priority = payload.priority === 'low' || payload.priority === 'high'
    ? payload.priority
    : defaultDraft.priority;
  const state = payload.state === 'todo' || payload.state === 'doing' || payload.state === 'done'
    ? payload.state
    : defaultDraft.state;

  return {
    categoryId: asNullableString(payload.categoryId, defaultDraft.categoryId),
    deadlineLocalDate: asString(payload.deadlineLocalDate, defaultDraft.deadlineLocalDate),
    notes: asString(payload.notes, defaultDraft.notes),
    priority,
    state,
    title: asString(payload.title, defaultDraft.title),
    topicIds: asStringArray(payload.topicIds),
  };
}

export function parseReminderCaptureDraftPayload(
  payload: CaptureDraftPayload,
  defaultDraft: ReminderCaptureDraftPayload,
): ReminderCaptureDraftPayload {
  if (!isRecord(payload)) {
    return defaultDraft;
  }

  const frequency =
    payload.frequency === 'once' ||
    payload.frequency === 'daily' ||
    payload.frequency === 'weekly' ||
    payload.frequency === 'monthly'
      ? payload.frequency
      : defaultDraft.frequency;
  const ownerKind =
    payload.ownerKind === 'standalone' ||
    payload.ownerKind === 'task' ||
    payload.ownerKind === 'task_recurrence'
      ? payload.ownerKind
      : defaultDraft.ownerKind;

  return {
    endsOnLocalDate: asString(payload.endsOnLocalDate, defaultDraft.endsOnLocalDate),
    frequency,
    notes: asString(payload.notes, defaultDraft.notes),
    ownerKind,
    reminderLocalTime: asString(payload.reminderLocalTime, defaultDraft.reminderLocalTime),
    skipLocalDate: asString(payload.skipLocalDate, defaultDraft.skipLocalDate),
    startsOnLocalDate: asString(payload.startsOnLocalDate, defaultDraft.startsOnLocalDate),
    taskId: asNullableString(payload.taskId, defaultDraft.taskId),
    taskRecurrenceRuleId: asNullableString(payload.taskRecurrenceRuleId, defaultDraft.taskRecurrenceRuleId),
    title: asString(payload.title, defaultDraft.title),
  };
}

export function parseWorkCaptureDraftPayload(
  payload: CaptureDraftPayload,
  defaultDraft: WorkCaptureDraftPayload,
): WorkCaptureDraftPayload {
  if (!isRecord(payload)) {
    return defaultDraft;
  }

  const entryMode = payload.entryMode === 'hours' || payload.entryMode === 'shift'
    ? payload.entryMode
    : defaultDraft.entryMode;

  return {
    breakMinutes: asString(payload.breakMinutes, defaultDraft.breakMinutes),
    categoryId: asNullableString(payload.categoryId, defaultDraft.categoryId),
    durationHours: asString(payload.durationHours, defaultDraft.durationHours),
    endedAtLocalDate: asString(payload.endedAtLocalDate, defaultDraft.endedAtLocalDate),
    endedAtLocalTime: asString(payload.endedAtLocalTime, defaultDraft.endedAtLocalTime),
    entryMode,
    localDate: asString(payload.localDate, defaultDraft.localDate),
    note: asString(payload.note, defaultDraft.note),
    paid: typeof payload.paid === 'boolean' ? payload.paid : defaultDraft.paid,
    startedAtLocalDate: asString(payload.startedAtLocalDate, defaultDraft.startedAtLocalDate),
    startedAtLocalTime: asString(payload.startedAtLocalTime, defaultDraft.startedAtLocalTime),
    topicIds: asStringArray(payload.topicIds),
    wageOverride: asString(payload.wageOverride, defaultDraft.wageOverride),
  };
}
