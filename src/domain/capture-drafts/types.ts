import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export const captureDraftKinds = ['expense', 'income', 'task', 'reminder', 'work'] as const;
export const captureDraftStatuses = ['active', 'saved', 'discarded'] as const;
export const captureDraftSavedRecordKinds = ['money_record', 'task', 'reminder', 'work_entry'] as const;

export type CaptureDraftKind = (typeof captureDraftKinds)[number];
export type CaptureDraftStatus = (typeof captureDraftStatuses)[number];
export type CaptureDraftSavedRecordKind = (typeof captureDraftSavedRecordKinds)[number];
export type CaptureDraftPayload = Record<string, unknown>;

export type CaptureDraft = {
  createdAt: string;
  discardedAt: string | null;
  id: EntityId;
  kind: CaptureDraftKind;
  lastSavedAt: string;
  payload: CaptureDraftPayload;
  savedAt: string | null;
  savedRecordId: EntityId | null;
  savedRecordKind: CaptureDraftSavedRecordKind | null;
  status: CaptureDraftStatus;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type CaptureDraftRow = {
  createdAt: string;
  discardedAt: string | null;
  id: string;
  kind: string;
  lastSavedAt: string;
  payloadJson: string;
  savedAt: string | null;
  savedRecordId: string | null;
  savedRecordKind: string | null;
  status: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveActiveCaptureDraftInput = {
  id: EntityId;
  kind: CaptureDraftKind;
  payload: CaptureDraftPayload;
  savedRecordId?: null;
  savedRecordKind?: null;
  timestamp: string;
  workspaceId: WorkspaceId;
};

export type MarkCaptureDraftSavedInput = {
  savedAt: string;
  savedRecordId: EntityId;
  savedRecordKind: CaptureDraftSavedRecordKind;
};
