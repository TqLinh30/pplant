import type { EntityId } from '@/domain/common/ids';
import type { WorkspaceId } from '@/domain/workspace/types';

export type CategoryTopicKind = 'category' | 'topic';
export type CategoryTopicName = string & { readonly __brand: 'CategoryTopicName' };

export type CategoryTopicItem = {
  id: EntityId;
  kind: CategoryTopicKind;
  workspaceId: WorkspaceId;
  name: CategoryTopicName;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type SaveCategoryTopicInput = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type CategoryTopicSortOrderAssignment = {
  id: EntityId;
  sortOrder: number;
};

export type CategoryTopicUsageSummary = {
  totalCount: number;
  moneyRecordCount: number;
  workEntryCount: number;
  taskCount: number;
  reflectionCount: number;
};

export type CategoryTopicDeletionImpact = {
  kind: CategoryTopicKind;
  itemId: EntityId;
  itemName: CategoryTopicName;
  usage: CategoryTopicUsageSummary;
  canKeepHistory: boolean;
  canReassign: boolean;
};

export type DeleteCategoryTopicMode = 'archive' | 'cancel' | 'reassign';
