import type { EntityId } from '@/domain/common/ids';
import type { LocalDate } from '@/domain/common/date-rules';
import type { ReflectionRelationshipId } from '@/domain/summaries/reflection-relationships';
import type { WorkspaceId } from '@/domain/workspace/types';

export const reflectionPeriodKinds = ['month', 'week'] as const;
export const reflectionPromptIds = ['remember_period', 'noticed_pair', 'next_review_ease'] as const;
export const reflectionStates = ['answered', 'skipped'] as const;
export const reflectionSources = ['manual'] as const;
export const reflectionSourceOfTruths = ['manual'] as const;
export const reflectionInsightPreferenceActions = ['dismissed', 'muted'] as const;
export const reflectionInsightPreferenceScopeKeys = ['global'] as const;

export type ReflectionPeriodKind = (typeof reflectionPeriodKinds)[number];
export type ReflectionPromptId = (typeof reflectionPromptIds)[number];
export type ReflectionState = (typeof reflectionStates)[number];
export type ReflectionSource = (typeof reflectionSources)[number];
export type ReflectionSourceOfTruth = (typeof reflectionSourceOfTruths)[number];
export type ReflectionInsightPreferenceAction = (typeof reflectionInsightPreferenceActions)[number];

export type ReflectionPeriod = {
  endDateExclusive: LocalDate;
  kind: ReflectionPeriodKind;
  startDate: LocalDate;
};

export type ReflectionPrompt = {
  helperText: string;
  id: ReflectionPromptId;
  optional: true;
  text: string;
};

export type Reflection = {
  createdAt: string;
  deletedAt: string | null;
  id: EntityId;
  period: ReflectionPeriod;
  promptId: ReflectionPromptId;
  promptText: string;
  responseText: string | null;
  source: ReflectionSource;
  sourceOfTruth: ReflectionSourceOfTruth;
  state: ReflectionState;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReflectionRow = {
  createdAt: string;
  deletedAt: string | null;
  id: string;
  periodEndDateExclusive: string;
  periodKind: string;
  periodStartDate: string;
  promptId: string;
  promptText: string;
  responseText: string | null;
  source: string;
  sourceOfTruth: string;
  state: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveReflectionInput = {
  id: EntityId;
  period: ReflectionPeriod;
  promptId: ReflectionPromptId;
  promptText: string;
  responseText: string | null;
  source: ReflectionSource;
  sourceOfTruth: ReflectionSourceOfTruth;
  state: ReflectionState;
  timestamp: string;
  workspaceId: WorkspaceId;
};

export type ReflectionInsightPreference = {
  action: ReflectionInsightPreferenceAction;
  createdAt: string;
  deletedAt: string | null;
  id: EntityId;
  insightId: ReflectionRelationshipId;
  periodKind: ReflectionPeriodKind | null;
  periodStartDate: LocalDate | null;
  scopeKey: string;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

export type ReflectionInsightPreferenceRow = {
  action: string;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  insightId: string;
  periodKind: string | null;
  periodStartDate: string | null;
  scopeKey: string;
  updatedAt: string;
  workspaceId: string;
};

export type SaveReflectionInsightPreferenceInput = {
  action: ReflectionInsightPreferenceAction;
  id: EntityId;
  insightId: ReflectionRelationshipId;
  period: ReflectionPeriod | null;
  timestamp: string;
  workspaceId: WorkspaceId;
};
