import type {
  ReflectionRelationship,
  ReflectionRelationshipId,
} from '@/domain/summaries/reflection-relationships';

import type {
  ReflectionInsightPreference,
  ReflectionPeriod,
} from './types';

export const globalInsightScopeKey = 'global';

export function periodInsightScopeKey(period: ReflectionPeriod): string {
  return `${period.kind}:${period.startDate}`;
}

function isMuted(
  preferences: ReflectionInsightPreference[],
  insightId: ReflectionRelationshipId,
): boolean {
  return preferences.some(
    (preference) =>
      preference.deletedAt === null &&
      preference.action === 'muted' &&
      preference.insightId === insightId &&
      preference.scopeKey === globalInsightScopeKey,
  );
}

function isDismissedForPeriod(input: {
  insightId: ReflectionRelationshipId;
  period: ReflectionPeriod;
  preferences: ReflectionInsightPreference[];
}): boolean {
  const scopeKey = periodInsightScopeKey(input.period);

  return input.preferences.some(
    (preference) =>
      preference.deletedAt === null &&
      preference.action === 'dismissed' &&
      preference.insightId === input.insightId &&
      preference.scopeKey === scopeKey,
  );
}

export function filterReflectionRelationshipsForPreferences(input: {
  period: ReflectionPeriod;
  preferences: ReflectionInsightPreference[];
  relationships: ReflectionRelationship[];
}): ReflectionRelationship[] {
  return input.relationships.filter(
    (relationship) =>
      !isMuted(input.preferences, relationship.id) &&
      !isDismissedForPeriod({
        insightId: relationship.id,
        period: input.period,
        preferences: input.preferences,
      }),
  );
}
