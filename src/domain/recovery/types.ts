import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export type RecoveryTargetKind = 'reminder_occurrence' | 'task' | 'task_recurrence_occurrence';
export type RecoveryAction = 'complete' | 'dismiss' | 'edit' | 'pause' | 'reschedule' | 'snooze';

export type RecoveryEvent = {
  action: RecoveryAction;
  createdAt: string;
  id: EntityId;
  occurredAt: string;
  occurrenceLocalDate: LocalDate | null;
  targetId: EntityId;
  targetKind: RecoveryTargetKind;
  workspaceId: WorkspaceId;
};

export type SaveRecoveryEventInput = {
  action: RecoveryAction;
  createdAt: string;
  id: string;
  occurredAt: string;
  occurrenceLocalDate?: string | null;
  targetId: string;
  targetKind: RecoveryTargetKind;
  workspaceId: string;
};
