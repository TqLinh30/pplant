import type { Href } from 'expo-router';

export type EndOfDayReviewEditableKind = 'money' | 'reminder' | 'task' | 'work';

export type EndOfDayReviewRouteOptions = {
  sequence?: string;
};

function encode(value: string): string {
  return encodeURIComponent(value);
}

function appendReviewParams(route: string, options: EndOfDayReviewRouteOptions = {}): Href {
  const separator = route.includes('?') ? '&' : '?';
  const sequence = options.sequence ? `&editSeq=${encode(options.sequence)}` : '';

  return `${route}${separator}returnTo=review${sequence}` as Href;
}

export function routeForEndOfDayReviewEdit(
  kind: EndOfDayReviewEditableKind,
  id: string,
  options?: EndOfDayReviewRouteOptions,
): Href {
  switch (kind) {
    case 'money':
      return appendReviewParams(`/(tabs)/capture?editMoneyRecordId=${encode(id)}`, options);
    case 'task':
      return appendReviewParams(`/task/${encode(id)}`, options);
    case 'reminder':
      return appendReviewParams(`/reminder/${encode(id)}`, options);
    case 'work':
      return appendReviewParams(`/work/${encode(id)}`, options);
    default:
      kind satisfies never;
      return '/(tabs)/review' as Href;
  }
}

export function isReturnToReviewParam(value: string | string[] | undefined): boolean {
  const first = Array.isArray(value) ? value[0] : value;

  return first === 'review';
}

export function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
