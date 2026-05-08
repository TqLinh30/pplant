import type { LocalDate } from '@/domain/common/date-rules';
import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export type ReminderDeliveryState =
  | 'scheduled'
  | 'sent'
  | 'missed'
  | 'snoozed'
  | 'paused'
  | 'disabled'
  | 'dismissed'
  | 'complete';

export type ReminderOwnerKind = 'standalone' | 'task' | 'task_recurrence';
export type ReminderFrequency = 'daily' | 'monthly' | 'once' | 'weekly';
export type ReminderPermissionStatus = 'denied' | 'granted' | 'undetermined' | 'unavailable' | 'unknown';
export type ReminderScheduleState =
  | 'disabled'
  | 'failed'
  | 'local_only'
  | 'paused'
  | 'permission_denied'
  | 'scheduled'
  | 'snoozed'
  | 'unavailable';
export type ReminderExceptionAction = 'skip';
export type ReminderOccurrenceState = 'open' | 'skipped';
export type ReminderSource = 'manual';
export type ReminderSourceOfTruth = 'manual';
export type ReminderTitle = string & { readonly __brand: 'ReminderTitle' };
export type ReminderNotes = string & { readonly __brand: 'ReminderNotes' };
export type ReminderLocalTime = string & { readonly __brand: 'ReminderLocalTime' };
export type ReminderFireAtLocal = string & { readonly __brand: 'ReminderFireAtLocal' };

export type Reminder = {
  createdAt: string;
  deletedAt: string | null;
  endsOnLocalDate: LocalDate | null;
  frequency: ReminderFrequency;
  id: EntityId;
  notes: ReminderNotes | null;
  ownerKind: ReminderOwnerKind;
  permissionStatus: ReminderPermissionStatus;
  reminderLocalTime: ReminderLocalTime;
  scheduleState: ReminderScheduleState;
  source: ReminderSource;
  sourceOfTruth: ReminderSourceOfTruth;
  startsOnLocalDate: LocalDate;
  taskId: EntityId | null;
  taskRecurrenceRuleId: EntityId | null;
  title: ReminderTitle;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReminderException = {
  action: ReminderExceptionAction;
  createdAt: string;
  id: EntityId;
  occurrenceLocalDate: LocalDate;
  reminderId: EntityId;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReminderScheduledNotification = {
  createdAt: string;
  deletedAt: string | null;
  deliveryState: ReminderDeliveryState;
  fireAtLocal: ReminderFireAtLocal;
  id: EntityId;
  occurrenceLocalDate: LocalDate;
  reminderId: EntityId;
  scheduleAttemptedAt: string;
  scheduleErrorCategory: string | null;
  scheduledNotificationId: string;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReminderOccurrence = {
  fireAtLocal: ReminderFireAtLocal;
  localDate: LocalDate;
  reminderId: EntityId;
  state: ReminderOccurrenceState;
};

export type SaveReminderInput = {
  createdAt: string;
  deletedAt?: string | null;
  endsOnLocalDate?: string | null;
  frequency: ReminderFrequency;
  id: string;
  notes?: string | null;
  ownerKind: ReminderOwnerKind;
  permissionStatus: ReminderPermissionStatus;
  reminderLocalTime: string;
  scheduleState: ReminderScheduleState;
  source: ReminderSource;
  sourceOfTruth: ReminderSourceOfTruth;
  startsOnLocalDate: string;
  taskId?: string | null;
  taskRecurrenceRuleId?: string | null;
  title: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveReminderExceptionInput = {
  action: ReminderExceptionAction;
  createdAt: string;
  id: string;
  occurrenceLocalDate: string;
  reminderId: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveReminderScheduledNotificationInput = {
  createdAt: string;
  deletedAt?: string | null;
  deliveryState: ReminderDeliveryState;
  fireAtLocal: string;
  id: string;
  occurrenceLocalDate: string;
  reminderId: string;
  scheduleAttemptedAt: string;
  scheduleErrorCategory?: string | null;
  scheduledNotificationId: string;
  updatedAt: string;
  workspaceId: string;
};
