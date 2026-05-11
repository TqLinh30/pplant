import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { RecurrenceFrequency } from '@/domain/recurrence/types';
import type { WorkspaceId } from '@/domain/workspace/types';

export type TaskState = 'todo' | 'doing' | 'done';
export type TaskPriority = 'high' | 'low';
export type TaskSource = 'manual';
export type TaskSourceOfTruth = 'manual';
export type TaskRecurrenceKind = 'task' | 'habit';
export type TaskRecurrenceExceptionAction = 'skip';
export type TaskRecurrenceOccurrenceState = 'completed' | 'open' | 'skipped';
export type TaskTitle = string & { readonly __brand: 'TaskTitle' };
export type TaskNotes = string & { readonly __brand: 'TaskNotes' };

export type Task = {
  categoryId: EntityId | null;
  completedAt: string | null;
  createdAt: string;
  deadlineLocalDate: LocalDate | null;
  deletedAt: string | null;
  id: EntityId;
  notes: TaskNotes | null;
  priority: TaskPriority;
  source: TaskSource;
  sourceOfTruth: TaskSourceOfTruth;
  state: TaskState;
  title: TaskTitle;
  topicIds: EntityId[];
  updatedAt: string;
  userCorrectedAt: string | null;
  workspaceId: WorkspaceId;
};

export type SaveTaskInput = {
  categoryId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  deadlineLocalDate?: string | null;
  deletedAt?: string | null;
  id: string;
  notes?: string | null;
  priority: TaskPriority;
  source: TaskSource;
  sourceOfTruth: TaskSourceOfTruth;
  state: TaskState;
  title: string;
  topicIds: string[];
  updatedAt: string;
  userCorrectedAt?: string | null;
  workspaceId: string;
};

export type TaskRecurrenceRule = {
  categoryId: EntityId | null;
  createdAt: string;
  deletedAt: string | null;
  endsOnLocalDate: LocalDate | null;
  frequency: RecurrenceFrequency;
  id: EntityId;
  kind: TaskRecurrenceKind;
  notes: TaskNotes | null;
  pausedAt: string | null;
  priority: TaskPriority;
  source: TaskSource;
  sourceOfTruth: TaskSourceOfTruth;
  startsOnLocalDate: LocalDate;
  stoppedAt: string | null;
  stoppedOnLocalDate: LocalDate | null;
  title: TaskTitle;
  topicIds: EntityId[];
  updatedAt: string;
  userCorrectedAt: string | null;
  workspaceId: WorkspaceId;
};

export type TaskRecurrenceException = {
  action: TaskRecurrenceExceptionAction;
  createdAt: string;
  id: EntityId;
  occurrenceLocalDate: LocalDate;
  ruleId: EntityId;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type TaskRecurrenceCompletion = {
  completedAt: string;
  createdAt: string;
  deletedAt: string | null;
  id: EntityId;
  occurrenceLocalDate: LocalDate;
  ruleId: EntityId;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type TaskRecurrenceOccurrence = {
  completedAt: string | null;
  localDate: LocalDate;
  ruleId: EntityId;
  state: TaskRecurrenceOccurrenceState;
};

export type SaveTaskRecurrenceRuleInput = {
  categoryId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  endsOnLocalDate?: string | null;
  frequency: RecurrenceFrequency;
  id: string;
  kind: TaskRecurrenceKind;
  notes?: string | null;
  pausedAt?: string | null;
  priority: TaskPriority;
  source: TaskSource;
  sourceOfTruth: TaskSourceOfTruth;
  startsOnLocalDate: string;
  stoppedAt?: string | null;
  stoppedOnLocalDate?: string | null;
  title: string;
  topicIds: string[];
  updatedAt: string;
  userCorrectedAt?: string | null;
  workspaceId: string;
};

export type SaveTaskRecurrenceExceptionInput = {
  action: TaskRecurrenceExceptionAction;
  createdAt: string;
  id: string;
  occurrenceLocalDate: string;
  ruleId: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveTaskRecurrenceCompletionInput = {
  completedAt: string;
  createdAt: string;
  deletedAt?: string | null;
  id: string;
  occurrenceLocalDate: string;
  ruleId: string;
  updatedAt: string;
  workspaceId: string;
};
