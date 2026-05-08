import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export type TaskState = 'todo' | 'doing' | 'done';
export type TaskPriority = 'high' | 'low';
export type TaskSource = 'manual';
export type TaskSourceOfTruth = 'manual';
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
